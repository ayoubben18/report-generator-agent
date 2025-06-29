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
import { embedMany, embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { rerank } from "@mastra/rag";
import { MDocument } from "@mastra/rag";
import { UpstashVector } from "@mastra/upstash";

// Set up persistent memory
const mastraMemory = new Memory({
    storage: new LibSQLStore({ url: "file:./memory.db" }),
});

const store = new UpstashVector({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
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

        const pdfFilesTextContent = await Promise.all(pdfFiles.map(async (file) => {
            const text = await file.text();
            return text;
        }));

        const pdfFilesTextContentString = pdfFilesTextContent.join("\n");

        if (pdfFilesTextContentString.length > 0) {
            throw new Error("Your pdf files do not have any text content please upload a pdf file with text content");
        }

        const doc = MDocument.fromText(pdfFilesTextContentString);

        const chunks = await doc.chunk({
            strategy: "recursive",
            size: 512,
            overlap: 50,
        });

        const { embeddings } = await embedMany({
            values: chunks.map((chunk) => chunk.text),
            model: openai.embedding("text-embedding-3-small"),
        });

        await store.upsert({
            indexName: `report-${inputData.reportId}`,
            vectors: embeddings,
            metadata: chunks.map(chunk => ({ text: chunk.text, reportId: inputData.reportId })),
        });



        return inputData
    }
})


const generateReportAxes = createStep({
    id: "generateReportChapters",
    description: "Generate report main chapters needed for the report",
    inputSchema: initialDataSchema,
    outputSchema: planSchema,
    execute: async ({ inputData, runId, getInitData }) => {

        const initData = getInitData();

        const { reportId, userContext, attachedFiles } = initData;



        const workflowId = runId;

        // Update step to generating chapters
        await updateWorkflowStep(workflowId, "generating_chapters");


        const response = await reportAgent.generate([{
            role: "system",
            content: "Generate the report main chapters needed for the report, if the user is demanding something that you have no idea about, use your tools to search for information. repos, articles, etc.",
        }, {
            role: "user",
            content: JSON.stringify(inputData),
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
        spinner.start();

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

        const { embedding } = await embed({
            value: inputData.chapter.title + " " + inputData.chapter.description,
            model: openai.embedding("text-embedding-3-small"),
        });

        const results = await store.query({
            indexName: `report-${reportId}`,
            queryVector: embedding,
            topK: 3,
        });

        const rerankedResults = await rerank(
            results,
            inputData.chapter.title + " " + inputData.chapter.description,
            openai("gpt-4o-mini"),
            {
                topK: 3,
            }
        );

        const finalKnowledge = rerankedResults.map((result) => result.result.document).join("\n");

        const response = await reportAgent.generate([{
            role: "system",
            content: "You are a technical report writer. Generate comprehensive, well-structured content for the given chapter. Use markdown formatting. Use your tools to search for information if you don't know about the topic. Structure the content to include the chapter description followed by each section with its content.",
        }, {
            role: "user",
            content: `Generate content for the chapter with the following structure:
Title: ${inputData.chapter.title}
Description: ${inputData.chapter.description}
Sections: ${inputData.chapter.sections.map(section => `- ${section.title}: ${section.description}`).join('\n')}

Please generate content that includes the chapter description first, then covers each section thoroughly with detailed content based on their descriptions.

Here is some relevant information to the chapter:
${finalKnowledge}`,
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

        let fullReport = ``;

        sortedChapters.forEach((chapter) => {
            // fullReport += `## ${chapter.title}\n\n`;
            fullReport += `${chapter.chapterContent}\n\n`;
            fullReport += `---\n\n`;
        });

        const data = getStepResult(generateReportAxes);

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