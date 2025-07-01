import "server-only";

import { Agent } from "@mastra/core/agent";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { mcp } from "./mcp-tools";
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
async function updateWorkflowStep(mastraWorkflowId: string, currentStep: string, status?: string) {
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
})

const reportAgent = new Agent({
    name: "reportAgent",
    instructions: "You are a report agent that generates reports based on user context and files. You can use tools like Tavily for web searches and Context7 for documentation to gather information. and Deep Graph MCP for github repositories to gather information.",
    model: google("gemini-2.5-flash-lite-preview-06-17"),
    tools: await mcp.getTools(),
    memory: mastraMemory,
})

const chapterSchema = z.object({
    title: z.string(),
    description: z.string(),
    sections: z.array(z.object({
        title: z.string(),
        description: z.string(),
    })),
})

const planSchema = z.object({
    title: z.string(),
    chapters: z.array(chapterSchema),
})

const initialDataSchema = z.object({
    reportId: z.string(),
    userContext: z.string(),
    attachedFiles: z.array(z.instanceof(File)),
})

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
            return inputData
        }

        const pdfFiles = attachedFiles.filter((file) => file.type === "application/pdf");
        const docxFiles = attachedFiles.filter((file) => file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

        const pdfFilesTextContent = await Promise.all(pdfFiles.map(async (file) => {
            // get the text from the document
            const arrayBuffer = await file.arrayBuffer();
            const pdfData = Buffer.from(arrayBuffer);
            const pdfDocument = await pdfParse(pdfData);
            return pdfDocument.text;
        }));

        const docxFilesTextContent = await Promise.all(docxFiles.map(async (file) => {
            const arrayBuffer = await file.arrayBuffer();
            const docxData = Buffer.from(arrayBuffer);
            const docxDocument = await parseOfficeAsync(docxData);
            const textArray = docxDocument.toString();
            return textArray
        }));


        const allFilesTextContent = [...pdfFilesTextContent, ...docxFilesTextContent].join("\n");


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
                metadata: chunks.map(chunk => ({ text: chunk.text, reportId: inputData.reportId })),
            });
        }

        return { ...inputData, allFilesTextContent: allFilesTextContent.length > 0 ? allFilesTextContent : null }
    }
})


const generateReportAxes = createStep({
    id: "generateReportChapters",
    description: "Generate report main chapters needed for the report",
    inputSchema: initialDataSchema.extend({
        allFilesTextContent: z.string().nullable(),
    }),
    outputSchema: planSchema,
    execute: async ({ inputData, runId }) => {

        console.log("text content", inputData.allFilesTextContent)
        const workflowId = runId;

        // Update step to generating chapters
        await updateWorkflowStep(workflowId, "generating_chapters");

        let additionalContext = inputData.allFilesTextContent ? `Here is some relevant information to the report:
${inputData.allFilesTextContent}` : "We do not have any additional context to the report, so please search the web very carefully for relevant information.";


        const response = await reportAgent.generate([{
            role: "system",
            content: `Generate the report main chapters needed for the report, if the user is demanding something that you have no idea about, use your tools to search for information. repos, articles, etc.

            ${additionalContext}`,
        }, {
            role: "user",
            content: inputData.userContext,
        }], {
            output: planSchema,
            memory: {
                resource: inputData.reportId,
                thread: runId,
            }
        })


        // Update step to chapters generated
        await updateWorkflowStep(workflowId, "chapters_generated");


        return response.object;
    }
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
    outputSchema: z.array(z.object({
        chapter: chapterSchema,
        chapterIndex: z.number(),
    })),
    execute: async ({ inputData, resumeData, suspend, runId }) => {
        console.log("Ra7na hna f suspended", inputData)
        const workflowId = runId;

        // If no resume data, this means it's the first time running this step
        // So we should suspend for user approval
        if (!resumeData) {

            spinner.warn("Waiting for user approval");
            // Update step to awaiting approval
            await updateWorkflowStep(workflowId, "awaiting_approval");

            await suspend({
                generatedPlan: inputData,
                message: "Please review and approve the generated report chapters before proceeding.",
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
            throw new Error("User rejected the report plan: " + (resumeData.feedback || "No feedback provided"));
        }
    },
});

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

const assembleReportStep = createStep({
    id: "assembleReport",
    description: "Assemble the report from the chapters",
    inputSchema: z.array(z.object({
        chapterIndex: z.number(),
        title: z.string(),
        chapterContent: z.string(),
    })),
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

        const sortedChapters = inputData.sort((a, b) => a.chapterIndex - b.chapterIndex);

        const data = getStepResult(generateReportAxes);

        let fullReport = `# ${data.title}\n\n`;

        sortedChapters.forEach((chapter) => {
            fullReport += `${chapter.chapterContent}\n\n`;
            fullReport += `---\n\n`;
        });


        // Update step to report completed
        await updateWorkflowStep(workflowId, "report_completed", "completed");

        return {
            fullReport,
            reportMetadata: {
                title: data.title,
                chaptersCount: sortedChapters.length,
                sectionsCount: data.chapters.reduce((acc, chapter) => acc + chapter.sections.length, 0),
                generatedAt: new Date().toISOString(),
            },
        }
    }
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
    .foreach(generateChapterContentStep, { concurrency: 10 })
    .then(assembleReportStep);

reportWorkflow.commit();

// Initialize Mastra with the workflow
const mastra = new Mastra({
    agents: { reportAgent },
    workflows: { reportWorkflow },
    storage: new LibSQLStore({ url: "file:./memory.db" }),
    logger: new PinoLogger({
        name: "Mastra",
        level: "info"
    }),
});


export default reportWorkflow;
export { mastra };