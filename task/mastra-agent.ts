import { Agent } from "@mastra/core/agent";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { mcp } from "./mcp-tools";
import { Mastra } from "@mastra/core";

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
})

const reportAgent = new Agent({
    name: "reportAgent",
    instructions: "You are a report agent that generates reports based on user context and files. You can use tools like Tavily for web searches and Context7 for documentation to gather information. and Deep Graph MCP for github repositories to gather information.",
    model: google("gemini-2.5-flash-lite-preview-06-17"),
    tools: await mcp.getTools(),
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

const generateReportAxes = createStep({
    id: "generateReportChapters",
    description: "Generate report main chapters needed for the report",
    inputSchema: z.object({
        userContext: z.string(),
        attachedFiles: z.array(z.instanceof(File)),
    }),
    outputSchema: planSchema,
    execute: async ({ inputData }) => {
        console.log(inputData);

        const response = await reportAgent.generate([{
            role: "system",
            content: "Generate the report main chapters needed for the report",
        }, {
            role: "user",
            content: JSON.stringify(inputData),
        }], {
            output: planSchema,
        })

        console.log(response.object);

        return response.object;
    }
});

// New step for user approval - this will suspend the workflow
const userApprovalStep = createStep({
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
    execute: async ({ inputData, resumeData, suspend }) => {

        // If no resume data, this means it's the first time running this step
        // So we should suspend for user approval
        if (!resumeData) {
            console.log("⏸️  Suspending workflow for user approval...");
            await suspend({
                generatedPlan: inputData,
                message: "Please review and approve the generated report chapters before proceeding.",
            });
            // This return won't be used when suspended
            return inputData.chapters.map((chapter, index) => ({
                chapter,
                title: chapter.title,
                description: chapter.description,
                chapterIndex: index,
            }));
        }

        // If we have resumeData, check if user approved
        if (resumeData.approved) {
            // Use the modified plan if provided, otherwise use the original input data
            const finalPlan = resumeData.modifiedPlan || inputData;


            return finalPlan.chapters.map((chapter, index) => ({
                chapter,
                title: chapter.title,
                description: chapter.description,
                chapterIndex: index,
            }));
        } else {
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
    execute: async ({ inputData }) => {
        console.log(inputData);
        const response = await reportAgent.generate([{
            role: "system",
            content: "You are a technical report writer. Generate comprehensive, well-structured content for the given chapter. Use markdown formatting. Use your tools to search for information if you don't know about the topic. Structure the content to include the chapter description followed by each section with its content.",
        }, {
            role: "user",
            content: `Generate content for the chapter with the following structure:
Title: ${inputData.chapter.title}
Description: ${inputData.chapter.description}
Sections: ${inputData.chapter.sections.map(section => `- ${section.title}: ${section.description}`).join('\n')}

Please generate content that includes the chapter description first, then covers each section thoroughly with detailed content based on their descriptions.`,
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
    execute: async ({ inputData, getStepResult }) => {

        const sortedChapters = inputData.sort((a, b) => a.chapterIndex - b.chapterIndex);

        let fullReport = ``;

        sortedChapters.forEach((chapter) => {
            // fullReport += `## ${chapter.title}\n\n`;
            fullReport += `${chapter.chapterContent}\n\n`;
            fullReport += `---\n\n`;
        });


        const data = getStepResult(generateReportAxes);

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
    inputSchema: z.object({
        userContext: z.string(),
        attachedFiles: z.array(z.instanceof(File)),
    }),
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
    .then(generateReportAxes)
    .then(userApprovalStep)
    .foreach(generateChapterContentStep, { concurrency: 10 })
    .then(assembleReportStep)
    .commit();

// Initialize Mastra with the workflow
const mastra = new Mastra({
    agents: { reportAgent },
    workflows: { reportWorkflow },
});

export default reportWorkflow;
export { mastra };