import "server-only";

import { Agent } from "@mastra/core/agent";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { mcp } from "./mcp-tools";
import {
  diagramSpecSchema,
  mermaidDiagramSchema,
  createMermaidMarkdownBlock,
  type DiagramSpec,
  type MermaidDiagram,
} from "./diagram-schemas";
import { getDiagramTypeExamples } from "./diagram-tools";
import { Mastra } from "@mastra/core";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import ora from "ora";
import { PinoLogger } from "@mastra/loggers";
import { MDocument } from "@mastra/rag";
import { embedMany, embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { UpstashVector } from "@mastra/upstash";
import { rerank } from "@mastra/rag";
import pdfParse from "pdf-parse";
import { parseOfficeAsync } from "officeparser";

// Set up persistent memory
const mastraMemory = new Memory({
  storage: new LibSQLStore({ url: "file:./memory.db" }),
});

const store = new UpstashVector({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

// Initialize Convex client for workflow step updates
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Helper function to update workflow step in Convex
async function updateWorkflowStep(
  mastraWorkflowId: string,
  currentStep: string,
  status?: string
) {
  try {
    // Get workflow by Mastra ID
    const workflow = await convex.query(api.workflows.getWorkflowByMastraId, {
      mastraWorkflowId,
    });

    if (workflow) {
      // Update report step
      await convex.mutation(api.reports.updateCurrentStep, {
        reportId: workflow.reportId,
        currentStep,
      });

      // Update workflow step if status provided
      if (status) {
        await convex.mutation(api.workflows.updateWorkflowStatus, {
          workflowId: workflow._id,
          currentStep,
          status: status as any,
        });
      }
    }
  } catch (error) {
    console.error("Failed to update workflow step:", error);
  }
}

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const reportAgent = new Agent({
  name: "reportAgent",
  instructions: `You are an expert report agent that generates coherent, comprehensive reports based on user context and files. 

Your key responsibilities:
- Generate well-structured, professional reports with multiple chapters that flow logically
- Maintain consistency in terminology, tone, and concepts throughout the report
- Build upon information presented in earlier chapters to create a cohesive narrative
- Avoid redundancy by referencing previous content instead of repeating it
- Use tools like Tavily for web searches, Context7 for documentation, and Deep Graph MCP for github repositories to gather accurate, current information
- Create content that feels natural and human-written, not AI-generated

CRITICAL CONTENT REQUIREMENTS:
- ALWAYS generate FULL, DETAILED chapters with comprehensive content (1000-3000 words per chapter)
- Each section within a chapter should be 200-500 words minimum
- Include practical examples, code snippets, technical specifications, and real-world use cases
- Write educational content that teaches concepts, not summaries of search results
- Never write minimal responses like "The search results confirm..." - instead write the actual information
- Provide in-depth technical explanations with examples

When generating content:
- Ensure each chapter connects logically to the previous ones
- Use consistent terminology and definitions throughout
- Reference earlier chapters when expanding on concepts
- Provide smooth transitions between topics
- Maintain a professional yet accessible writing style
- Include code examples, diagrams descriptions, and practical applications
- Write as if creating a professional technical documentation or textbook`,
  model: google("gemini-2.0-flash-lite"),
  tools: await mcp.getTools(),
  memory: mastraMemory,
});

const chapterSchema = z.object({
  title: z.string(),
  description: z.string(),
  sections: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),
});

const planSchema = z.object({
  title: z.string(),
  chapters: z.array(chapterSchema),
});

const initialDataSchema = z.object({
  reportId: z.string(),
  userContext: z.string(),
  attachedFiles: z.array(z.instanceof(File)),
});

const spinner = ora("Generating report chapters");

const chunkDocuments = createStep({
  id: "generateReportChapters",
  description: "Generate report main chapters needed for the report",
  inputSchema: initialDataSchema,
  outputSchema: initialDataSchema,
  execute: async ({ inputData, runId }) => {
    // const workflowId = runId;
    // await updateWorkflowStep(workflowId, "reading_documents");

    const { attachedFiles } = inputData;

    if (attachedFiles.length === 0) {
      return inputData;
    }

    const pdfFiles = attachedFiles.filter(
      (file) => file.type === "application/pdf"
    );
    const docxFiles = attachedFiles.filter(
      (file) =>
        file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    const pdfFilesTextContent = await Promise.all(
      pdfFiles.map(async (file) => {
        // get the text from the document
        const arrayBuffer = await file.arrayBuffer();
        const pdfData = Buffer.from(arrayBuffer);
        const pdfDocument = await pdfParse(pdfData);
        return pdfDocument.text;
      })
    );

    const docxFilesTextContent = await Promise.all(
      docxFiles.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const docxData = Buffer.from(arrayBuffer);
        const docxDocument = await parseOfficeAsync(docxData);
        const textArray = docxDocument.toString();
        return textArray;
      })
    );

    const allFilesTextContent = [
      ...pdfFilesTextContent,
      ...docxFilesTextContent,
    ].join("\n");

    if (allFilesTextContent.length > 0) {
      const doc = MDocument.fromText(allFilesTextContent);

      const chunks = await doc.chunk({
        strategy: "recursive",
        size: 512,
        overlap: 50,
      });

      const { embeddings } = await embedMany({
        values: chunks.map((chunk) => chunk.text),
        model: openai.embedding("text-embedding-3-small", {
          dimensions: 1536,
        }),
      });

      await store.upsert({
        indexName: `report-${inputData.reportId}`,
        vectors: embeddings,
        metadata: chunks.map((chunk) => ({
          text: chunk.text,
          reportId: inputData.reportId,
        })),
      });
    }

    return {
      ...inputData,
      allFilesTextContent:
        allFilesTextContent.length > 0 ? allFilesTextContent : null,
    };
  },
});

const generateReportAxes = createStep({
  id: "generateReportChapters",
  description: "Generate report main chapters needed for the report",
  inputSchema: initialDataSchema.extend({
    allFilesTextContent: z.string().nullable(),
  }),
  outputSchema: planSchema,
  execute: async ({ inputData, runId }) => {
    console.log("text content", inputData.allFilesTextContent);
    const workflowId = runId;

    // Update step to generating chapters
    await updateWorkflowStep(workflowId, "generating_chapters");

    let additionalContext = inputData.allFilesTextContent
      ? `Here is some relevant information to the report:
${inputData.allFilesTextContent}`
      : "We do not have any additional context to the report, so please search the web very carefully for relevant information.";

    const response = await reportAgent.generate(
      [
        {
          role: "system",
          content: `Generate the report main chapters needed for the report. Create a logical flow where each chapter builds upon the previous ones. If the user is demanding something that you have no idea about, use your tools to search for information. repos, articles, etc.

            IMPORTANT: Design chapters that:
            - Follow a logical progression from foundational concepts to advanced topics
            - Each chapter should naturally lead to the next
            - Later chapters should be able to reference and build upon earlier ones
            - Avoid planning redundant content across chapters
            - Ensure the report tells a cohesive story from start to finish

            ${additionalContext}`,
        },
        {
          role: "user",
          content: inputData.userContext,
        },
      ],
      {
        output: planSchema,
        memory: {
          resource: inputData.reportId,
          thread: runId,
        },
      }
    );

    // Update step to chapters generated
    await updateWorkflowStep(workflowId, "chapters_generated");

    return response.object;
  },
});

// New step for user approval - this will suspend the workflow
export const userApprovalStep = createStep({
  id: "userApproval",
  description: "Wait for user approval of the generated chapters",
  inputSchema: planSchema,
  resumeSchema: z.object({
    approved: z.boolean(),
    feedback: z.string().optional(),
    modifiedPlan: planSchema.optional(),
  }),
  suspendSchema: z.object({
    generatedPlan: planSchema,
    message: z.string(),
  }),
  outputSchema: z.array(
    z.object({
      chapter: chapterSchema,
      chapterIndex: z.number(),
    })
  ),
  execute: async ({ inputData, resumeData, suspend, runId }) => {
    console.log("Ra7na hna f suspended", inputData);
    const workflowId = runId;

    // If no resume data, this means it's the first time running this step
    // So we should suspend for user approval
    if (!resumeData) {
      spinner.warn("Waiting for user approval");
      // Update step to awaiting approval
      await updateWorkflowStep(workflowId, "awaiting_approval");

      await suspend({
        generatedPlan: inputData,
        message:
          "Please review and approve the generated report chapters before proceeding.",
      });
      spinner.succeed();
      // This return won't be used when suspended
      return inputData.chapters.map((chapter, index) => ({
        chapter,
        chapterIndex: index,
      }));
    }

    // If we have resumeData, check if user approved
    if (resumeData.approved) {
      // Update step to plan approved
      await updateWorkflowStep(workflowId, "generate_chapters_content");

      // Use the modified plan if provided, otherwise use the original input data
      const finalPlan = resumeData.modifiedPlan || inputData;

      return finalPlan.chapters.map((chapter, index) => ({
        chapter,
        chapterIndex: index,
      }));
    } else {
      // Update step to plan rejected
      await updateWorkflowStep(workflowId, "plan_rejected", "failed");

      // Handle rejection - for now, we'll throw an error
      throw new Error(
        "User rejected the report plan: " +
          (resumeData.feedback || "No feedback provided")
      );
    }
  },
});

// Original parallel chapter generation step - kept for reference
// Now replaced by generateChaptersSequentially for coherent content generation
/*
const generateChapterContentStep = createStep({
    id: "generateChapterContent",
    description: "Generate content for a single chapter of the report",
    inputSchema: z.object({
        chapter: chapterSchema,
        chapterIndex: z.number(),
    }),
    outputSchema: z.object({
        chapterContent: z.string(),
        title: z.string(),
        chapterIndex: z.number(),
    }),
    execute: async ({ inputData, runId, getInitData }) => {

        const initData = getInitData();

        const { reportId, userContext, attachedFiles } = initData;

        console.log("reportId", reportId)
        const { embedding } = await embed({
            value: inputData.chapter.title + " " + inputData.chapter.description,
            model: openai.embedding("text-embedding-3-small", {
                dimensions: 1536,
            }),
        });

        const results = await store.query({
            indexName: `report-${reportId}`,
            queryVector: embedding,
            topK: 5,
        });


        const rerankedResults = await rerank(
            results,
            inputData.chapter.title + " " + inputData.chapter.description,
            openai("gpt-4o-mini"),
            {
                topK: 3,
            }
        );


        const finalKnowledge = rerankedResults.map((result) => result.result?.metadata?.text).filter(Boolean).join("\n");


        const additionalContext = finalKnowledge.length > 0 ? `Here is some relevant information to the chapter:
${finalKnowledge}` : "We do not have any additional context to the chapter, so please search the web very carefully for relevant information.";

        const response = await reportAgent.generate([{
            role: "system",
            content: `You are a technical report writer. Generate comprehensive, well-structured content in proper markdown format. Use your tools to search for detailed information if you don't know about the topic.

REQUIRED MARKDOWN STRUCTURE:
## [Chapter Title]

### Overview
[Detailed explanation of what this chapter covers - expand on the chapter description with context and importance]

### [Section 1 Title]
[Comprehensive content for this section with technical details, examples, and explanations]

### [Section 2 Title]
[Comprehensive content for this section with technical details, examples, and explanations]

### [Section 3 Title]
[Comprehensive content for this section with technical details, examples, and explanations]

FORMATTING REQUIREMENTS:
- Use ## for chapter title
- Use ### for section titles
- Use **bold** for important terms
- Use \`code\` for technical terms, commands, or code snippets
- Use bullet points with - for lists
- Use numbered lists 1. 2. 3. when showing steps
- Include code blocks with \`\`\`language when relevant
- Keep paragraphs well-structured and readable

CONTENT REQUIREMENTS:
- Search for current, accurate information using your tools
- Provide practical examples and real-world applications
- Include technical details and best practices
- Make content comprehensive but accessible
- Each section should be substantial (200-500 words minimum)`,
        }, {
            role: "user",
            content: `Generate a comprehensive chapter with this structure:

**Chapter Title:** ${inputData.chapter.title}
**Chapter Description:** ${inputData.chapter.description}

**Sections to cover:**
${inputData.chapter.sections.map(section => `- **${section.title}:** ${section.description}`).join('\n')}

Generate detailed, technical content for each section. Use your tools to research current information, best practices, and real examples. Ensure each section is comprehensive and valuable.

${additionalContext}`,
        }]);


        return {
            chapterContent: response.text,
            title: inputData.chapter.title,
            chapterIndex: inputData.chapterIndex,
        }
    }
});
*/

// New sequential chapter generation step with diagram support
const generateChaptersSequentially = createStep({
  id: "generateChaptersSequentially",
  description:
    "Generate chapters sequentially with context from previous chapters and diagrams",
  inputSchema: z.array(
    z.object({
      chapter: chapterSchema,
      chapterIndex: z.number(),
    })
  ),
  outputSchema: z.array(
    z.object({
      chapterIndex: z.number(),
      title: z.string(),
      chapterContent: z.string(),
      diagrams: z
        .array(
          z.object({
            position: z.string(),
            mermaidCode: z.string(),
            type: z.string(),
            title: z.string(),
            caption: z.string().optional(),
          })
        )
        .optional(),
    })
  ),
  execute: async ({ inputData, runId, getInitData }) => {
    const initData = getInitData();
    const { reportId } = initData;

    // Configuration option to enable/disable diagram generation
    const ENABLE_DIAGRAM_GENERATION =
      process.env.ENABLE_DIAGRAM_GENERATION !== "false";

    const generatedChapters: Array<{
      chapterIndex: number;
      title: string;
      chapterContent: string;
      diagrams?: Array<{
        position: string;
        mermaidCode: string;
        type: string;
        title: string;
        caption?: string;
      }>;
    }> = [];

    const chapterSummaries: Array<{
      title: string;
      summary: string;
    }> = [];

    // Process chapters sequentially
    for (const chapterData of inputData) {
      const { chapter, chapterIndex } = chapterData;
      // Update workflow step to show progress
      await updateWorkflowStep(
        runId,
        `generating_chapter_${chapterIndex + 1}_of_${inputData.length}`
      );

      console.log(`Processing chapter ${chapterIndex + 1}: ${chapter.title}`);

      // Generate previous chapters context
      const previousChaptersContext =
        chapterSummaries.length > 0
          ? `\n\nCONTEXT FROM PREVIOUS CHAPTERS:\n${chapterSummaries
              .map((s, idx) => `Chapter ${idx + 1} - ${s.title}:\n${s.summary}`)
              .join(
                "\n\n"
              )}\n\nBuild upon the information from previous chapters, avoid repetition, and maintain consistency in terminology and concepts.`
          : "";

      // Get RAG context for this chapter
      const { embedding } = await embed({
        value: chapter.title + " " + chapter.description,
        model: openai.embedding("text-embedding-3-small", {
          dimensions: 1536,
        }),
      });

      const results = await store.query({
        indexName: `report-${reportId}`,
        queryVector: embedding,
        topK: 5,
      });

      const rerankedResults = await rerank(
        results,
        chapter.title + " " + chapter.description,
        openai("gpt-4o-mini"),
        {
          topK: 3,
        }
      );

      const finalKnowledge = rerankedResults
        .map((result) => result.result?.metadata?.text)
        .filter(Boolean)
        .join("\n");
      const ragContext =
        finalKnowledge.length > 0
          ? `Here is some relevant information to the chapter:\n${finalKnowledge}`
          : "We do not have any additional context to the chapter, so please search the web very carefully for relevant information.";

      // Generate chapter content with previous chapters context
      const response = await reportAgent.generate(
        [
          {
            role: "system",
            content: `You are a technical report writer creating a coherent, multi-chapter report. Generate comprehensive, well-structured content in proper markdown format. Use your tools to search for detailed information if you don't know about the topic.

IMPORTANT: This is part of a larger report. Maintain consistency with previous chapters and build upon already established concepts.

CRITICAL: Generate FULL, COMPREHENSIVE chapter content. Each chapter should be 1000-3000 words with detailed explanations, examples, and technical depth. DO NOT generate placeholder text or minimal summaries.

REQUIRED MARKDOWN STRUCTURE:
## [Chapter Title]

### Overview
[2-3 paragraphs explaining what this chapter covers, why it's important, and how it relates to the overall report]

### [Section 1 Title]
[Multiple paragraphs with in-depth content including:
- Detailed explanations of concepts
- Technical specifications and details
- Real-world examples and use cases
- Code snippets where relevant
- Best practices and recommendations]

### [Section 2 Title]
[Multiple paragraphs following the same depth as Section 1]

### [Section 3 Title]
[Multiple paragraphs following the same depth as previous sections]

### Summary
[1-2 paragraphs summarizing key points from this chapter]

FORMATTING REQUIREMENTS:
- Use ## for chapter title
- Use ### for section titles
- Use **bold** for important terms
- Use \`code\` for technical terms, commands, or code snippets
- Use bullet points with - for lists
- Use numbered lists 1. 2. 3. when showing steps
- Include code blocks with \`\`\`language when relevant
- Keep paragraphs well-structured and readable

CONTENT REQUIREMENTS:
- MINIMUM 200-500 words per section
- Search for current, accurate information using your tools
- Provide practical examples and real-world applications
- Include technical details and best practices
- Make content comprehensive but accessible
- Reference and build upon concepts from previous chapters when relevant
- Avoid repeating information already covered
- Maintain consistent terminology throughout
- DO NOT write summaries of search results - write actual educational content
- DO NOT write "The search results confirm..." - write the actual information`,
          },
          {
            role: "user",
            content: `Generate a FULL, COMPREHENSIVE chapter with detailed content:

**Chapter ${chapterIndex + 1}: ${chapter.title}**
**Chapter Description:** ${chapter.description}

**Sections to cover:**
${chapter.sections
  .map(
    (section, idx) => `${idx + 1}. **${section.title}:** ${section.description}`
  )
  .join("\n")}

IMPORTANT REQUIREMENTS:
1. Generate COMPLETE, DETAILED content for each section (200-500 words minimum per section)
2. Use your tools to research and gather accurate, current information
3. Include practical examples, code snippets, and real-world applications
4. Write educational content, not summaries of search results
5. Ensure the chapter flows logically and builds on previous content

${ragContext}${previousChaptersContext}

Remember: This is a professional technical report. Each section should be substantive and provide real value to the reader. DO NOT generate minimal or placeholder content.`,
          },
        ],
        {
          memory: {
            resource: reportId,
            thread: runId + "-sequential",
          },
        }
      );

      // Validate content length and get the final chapter content
      let finalChapterContent = response.text;
      const wordCount = finalChapterContent.split(/\s+/).length;

      if (wordCount < 500) {
        console.warn(
          `⚠️ Chapter ${
            chapterIndex + 1
          } generated with only ${wordCount} words. Attempting to regenerate with more detail...`
        );

        // Try again with more explicit instructions
        const retryResponse = await reportAgent.generate(
          [
            {
              role: "system",
              content: `You MUST generate COMPREHENSIVE, DETAILED content. The previous attempt was too short. Generate at least 1000 words of high-quality, educational content.`,
            },
            {
              role: "user",
              content: `The previous chapter was too short (only ${wordCount} words). Generate a COMPLETE, DETAILED chapter with:

**Chapter ${chapterIndex + 1}: ${chapter.title}**

MINIMUM REQUIREMENTS:
- Total chapter length: 1000-3000 words
- Each section: 200-500 words minimum
- Include multiple paragraphs per section
- Add code examples, technical details, and real-world applications

Sections to cover:
${chapter.sections
  .map(
    (section, idx) =>
      `${idx + 1}. **${section.title}:** ${
        section.description
      } (MINIMUM 300 words)`
  )
  .join("\n")}

DO NOT generate summaries or confirmations. Generate actual educational content with depth and detail.`,
            },
          ],
          {
            memory: {
              resource: reportId,
              thread: runId + "-sequential-retry",
            },
          }
        );

        if (retryResponse.text.split(/\s+/).length > wordCount) {
          finalChapterContent = retryResponse.text;
          console.log(
            `✅ Chapter ${chapterIndex + 1} regenerated with ${
              retryResponse.text.split(/\s+/).length
            } words`
          );
        }
      }

      console.log(
        `📝 Chapter ${chapterIndex + 1} generated with ${
          finalChapterContent.split(/\s+/).length
        } words`
      );

      // After generating chapter content, analyze for diagram opportunities
      let generatedDiagrams = [];

      if (ENABLE_DIAGRAM_GENERATION) {
        console.log(
          `\n🔍 Analyzing chapter ${
            chapterIndex + 1
          } for diagram opportunities...`
        );

        const diagramAnalysisPrompt = `Analyze this chapter content and determine if any diagrams would enhance understanding. For each potential diagram, specify:
1. The type of diagram (flowchart, sequence, class, state, etc.)
2. Where it should be placed (after which section)
3. What it should illustrate
4. A detailed specification of its content

Chapter content:
${finalChapterContent}`;

        let diagramAnalysis;
        try {
          diagramAnalysis = await reportAgent.generate(
            [
              {
                role: "system",
                content:
                  "You are a technical documentation expert who identifies opportunities for visual diagrams in written content.",
              },
              {
                role: "user",
                content: diagramAnalysisPrompt,
              },
            ],
            {
              output: z.object({
                diagrams: z.array(
                  z.object({
                    type: z.enum([
                      "flowchart",
                      "sequence",
                      "class",
                      "state",
                      "entity-relationship",
                      "gantt",
                      "pie",
                      "mindmap",
                      "timeline",
                      "quadrant",
                      "c4-context",
                      "block",
                    ]),
                    position: z
                      .string()
                      .describe(
                        "Section title after which to place the diagram"
                      ),
                    purpose: z
                      .string()
                      .describe("What the diagram should illustrate"),
                    specification: z
                      .string()
                      .describe("Detailed specification of diagram content"),
                    title: z.string(),
                    caption: z.string().optional(),
                  })
                ),
              }),
              memory: {
                resource: reportId,
                thread: runId + "-diagrams",
              },
            }
          );
        } catch (analysisError) {
          console.error(
            `❌ Failed to analyze chapter for diagrams: ${analysisError}`
          );
          // Continue without diagrams for this chapter
          diagramAnalysis = { object: { diagrams: [] } };
        }

        console.log(
          `📊 Found ${
            diagramAnalysis.object.diagrams.length
          } diagram opportunities for chapter ${chapterIndex + 1}`
        );
        diagramAnalysis.object.diagrams.forEach((d, i) => {
          console.log(
            `  ${i + 1}. ${d.type} diagram: "${d.title}" (after ${d.position})`
          );
        });

        // Generate Mermaid code for each suggested diagram
        for (const diagramSpec of diagramAnalysis.object.diagrams) {
          console.log(
            `\n🎨 Generating ${diagramSpec.type} diagram: "${diagramSpec.title}"`
          );

          try {
            // Try to generate the diagram with structured output
            const mermaidGeneration = await reportAgent.generate(
              [
                {
                  role: "system",
                  content: `You are an expert at creating Mermaid diagrams. Generate valid Mermaid syntax for the requested diagram type.

Example for ${diagramSpec.type}:
${getDiagramTypeExamples(diagramSpec.type)}

IMPORTANT: You must return ONLY a JSON object with a "mermaidCode" field containing the diagram code. No additional text or explanation.`,
                },
                {
                  role: "user",
                  content: `Generate a ${diagramSpec.type} diagram with these specifications:

Title: ${diagramSpec.title}
Purpose: ${diagramSpec.purpose}
Detailed specification: ${diagramSpec.specification}

Return ONLY the JSON object with mermaidCode field.`,
                },
              ],
              {
                output: z.object({
                  mermaidCode: z.string(),
                }),
                memory: {
                  resource: reportId,
                  thread: runId + "-mermaid",
                },
              }
            );

            console.log(
              `📝 Generated Mermaid code:\n${mermaidGeneration.object.mermaidCode
                .split("\n")
                .slice(0, 5)
                .join("\n")}${
                mermaidGeneration.object.mermaidCode.split("\n").length > 5
                  ? "\n..."
                  : ""
              }`
            );

            generatedDiagrams.push({
              position: diagramSpec.position,
              mermaidCode: mermaidGeneration.object.mermaidCode,
              type: diagramSpec.type,
              title: diagramSpec.title,
              caption: diagramSpec.caption,
            });

            console.log(
              `✅ Generated ${diagramSpec.type} diagram with ${
                mermaidGeneration.object.mermaidCode.split("\n").length
              } lines of Mermaid code`
            );
          } catch (diagramError) {
            console.error(
              `❌ Failed to generate ${diagramSpec.type} diagram: ${diagramError}`
            );

            // Try a fallback approach with plain text generation
            try {
              console.log(
                `🔄 Attempting fallback generation for ${diagramSpec.type} diagram...`
              );

              const fallbackResponse = await reportAgent.generate(
                [
                  {
                    role: "system",
                    content: `Generate Mermaid diagram code. Example for ${
                      diagramSpec.type
                    }:
${getDiagramTypeExamples(diagramSpec.type)}`,
                  },
                  {
                    role: "user",
                    content: `Generate ONLY the Mermaid code for a ${diagramSpec.type} diagram:
Title: ${diagramSpec.title}
Purpose: ${diagramSpec.purpose}
Specification: ${diagramSpec.specification}

Output ONLY the Mermaid code, nothing else.`,
                  },
                ],
                {
                  memory: {
                    resource: reportId,
                    thread: runId + "-mermaid-fallback",
                  },
                }
              );

              // Extract mermaid code from the text response
              let mermaidCode = fallbackResponse.text.trim();

              // Remove markdown code blocks if present
              mermaidCode = mermaidCode
                .replace(/```mermaid\n?/g, "")
                .replace(/```\n?$/g, "")
                .trim();

              if (mermaidCode) {
                generatedDiagrams.push({
                  position: diagramSpec.position,
                  mermaidCode: mermaidCode,
                  type: diagramSpec.type,
                  title: diagramSpec.title,
                  caption: diagramSpec.caption,
                });

                console.log(
                  `✅ Fallback generation successful for ${diagramSpec.type} diagram`
                );
              } else {
                console.log(
                  `⚠️ Skipping ${diagramSpec.type} diagram - could not generate valid code`
                );
              }
            } catch (fallbackError) {
              console.error(
                `❌ Fallback generation also failed: ${fallbackError}`
              );
              console.log(
                `⚠️ Skipping ${diagramSpec.type} diagram due to generation errors`
              );
            }
          }
        }

        console.log(
          `\n📈 Total diagrams generated for chapter ${chapterIndex + 1}: ${
            generatedDiagrams.length
          }`
        );
      } else {
        console.log(
          `⚠️ Diagram generation is disabled for chapter ${chapterIndex + 1}`
        );
      }

      // Store the generated chapter with diagrams
      generatedChapters.push({
        chapterContent: finalChapterContent,
        title: chapter.title,
        chapterIndex: chapterIndex,
        diagrams: generatedDiagrams,
      });

      console.log(
        `Stored chapter ${chapterIndex + 1}: ${
          chapter.title
        } (total chapters so far: ${generatedChapters.length})`
      );

      // Generate a summary of this chapter for context in next chapters
      const summaryResponse = await reportAgent.generate(
        [
          {
            role: "system",
            content:
              "You are a technical writer tasked with creating concise summaries. Create a brief summary (150-200 words) that captures the key points, main concepts, and important details from this chapter. Focus on information that would be relevant for maintaining consistency in subsequent chapters.",
          },
          {
            role: "user",
            content: `Please summarize this chapter concisely:\n\n${finalChapterContent}`,
          },
        ],
        {
          memory: {
            resource: reportId,
            thread: runId + "-summaries",
          },
        }
      );

      chapterSummaries.push({
        title: chapter.title,
        summary: summaryResponse.text,
      });
    }

    console.log(
      "Final generatedChapters array:",
      generatedChapters.map((ch) => ({
        index: ch.chapterIndex,
        title: ch.title,
      }))
    );
    console.log("Total chapters generated:", generatedChapters.length);

    return generatedChapters;
  },
});

const assembleReportStep = createStep({
  id: "assembleReport",
  description: "Assemble the report from the chapters",
  inputSchema: z.array(
    z.object({
      chapterIndex: z.number(),
      title: z.string(),
      chapterContent: z.string(),
      diagrams: z
        .array(
          z.object({
            position: z.string(),
            mermaidCode: z.string(),
            type: z.string(),
            title: z.string(),
            caption: z.string().optional(),
          })
        )
        .optional(),
    })
  ),
  outputSchema: z.object({
    fullReport: z.string(),
    reportMetadata: z.object({
      title: z.string(),
      chaptersCount: z.number(),
      sectionsCount: z.number(),
      generatedAt: z.string(),
    }),
  }),
  execute: async ({ inputData, getStepResult, runId }) => {
    const workflowId = runId;

    // Update step to assembling report
    await updateWorkflowStep(workflowId, "assembling_report");

    console.log(
      "Chapters received in assembleReportStep:",
      inputData.map((ch) => ({ index: ch.chapterIndex, title: ch.title }))
    );

    const sortedChapters = inputData.sort(
      (a, b) => a.chapterIndex - b.chapterIndex
    );

    console.log(
      "Sorted chapters:",
      sortedChapters.map((ch) => ({ index: ch.chapterIndex, title: ch.title }))
    );

    const data = getStepResult(generateReportAxes);

    let fullReport = `# ${data.title}\n\n`;

    sortedChapters.forEach((chapter, idx) => {
      console.log(
        `Adding chapter ${idx + 1} (index: ${chapter.chapterIndex}): ${
          chapter.title
        } to report`
      );

      // If the chapter has diagrams, we need to integrate them into the content
      if (chapter.diagrams && chapter.diagrams.length > 0) {
        console.log(
          `  📊 Chapter has ${chapter.diagrams.length} diagrams to integrate`
        );
        let enhancedContent = chapter.chapterContent;

        // Sort diagrams by their position in reverse order to insert from bottom to top
        const sortedDiagrams = [...chapter.diagrams].reverse();
        console.log(
          `  📋 Diagrams to insert: ${sortedDiagrams
            .map((d) => `${d.type}:${d.title}`)
            .join(", ")}`
        );

        for (const diagram of sortedDiagrams) {
          // Create the Mermaid markdown block
          const diagramMarkdown = createMermaidMarkdownBlock({
            mermaidCode: diagram.mermaidCode,
            type: diagram.type as any,
            title: diagram.title,
            caption: diagram.caption,
            theme: "default",
            handDrawn: false,
          });

          // Find the position to insert the diagram
          const sectionRegex = new RegExp(
            `(### ${diagram.position}[\s\S]*?)(?=###|$)`,
            "g"
          );
          const beforeLength = enhancedContent.length;
          enhancedContent = enhancedContent.replace(sectionRegex, (match) => {
            console.log(
              `    ✏️  Inserting ${diagram.type} diagram after section "${diagram.position}"`
            );
            return match + "\n\n" + diagramMarkdown + "\n";
          });

          if (enhancedContent.length === beforeLength) {
            console.log(
              `    ⚠️  Warning: Could not find section "${diagram.position}" for ${diagram.type} diagram`
            );
          }
        }

        fullReport += `${enhancedContent}\n\n`;
        console.log(`  ✅ Chapter ${idx + 1} added with diagrams integrated`);
      } else {
        fullReport += `${chapter.chapterContent}\n\n`;
        console.log(`  ✅ Chapter ${idx + 1} added (no diagrams)`);
      }
      fullReport += `---\n\n`;
    });

    console.log(
      `\n📄 Final report assembled with ${sortedChapters.length} chapters`
    );

    // Update step to report completed
    await updateWorkflowStep(workflowId, "report_completed", "completed");

    return {
      fullReport,
      reportMetadata: {
        title: data.title,
        chaptersCount: sortedChapters.length,
        sectionsCount: data.chapters.reduce(
          (acc, chapter) => acc + chapter.sections.length,
          0
        ),
        generatedAt: new Date().toISOString(),
      },
    };
  },
});

const reportWorkflow = createWorkflow({
  id: "reportWorkflow",
  description: "Generate a report based on the user context and attached files",
  inputSchema: initialDataSchema,
  outputSchema: z.object({
    fullReport: z.string(),
    reportMetadata: z.object({
      title: z.string(),
      chaptersCount: z.number(),
      sectionsCount: z.number(),
      generatedAt: z.string(),
    }),
  }),
})
  .then(chunkDocuments)
  .then(generateReportAxes)
  .then(userApprovalStep)
  .then(generateChaptersSequentially)
  .then(assembleReportStep);

reportWorkflow.commit();

// Initialize Mastra with the workflow
const mastra = new Mastra({
  agents: { reportAgent },
  workflows: { reportWorkflow },
  storage: new LibSQLStore({ url: "file:./memory.db" }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
});

export default reportWorkflow;
export { mastra };
