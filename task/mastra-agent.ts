import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// Simple file system tool as an example MCP-like tool
const fileSystemTool = createTool({
    id: "read-file",
    description: "Read a file from the file system",
    inputSchema: z.object({
        path: z.string().describe("Path to the file to read"),
    }),
    outputSchema: z.object({
        content: z.string().describe("Content of the file"),
        size: z.number().describe("Size of the file in bytes"),
    }),
    execute: async ({ context }) => {
        try {
            const fs = await import("fs/promises");
            const content = await fs.readFile(context.path, "utf-8");
            const stats = await fs.stat(context.path);

            return {
                content: content,
                size: stats.size,
            };
        } catch (error) {
            throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },
});

// Report generation tool
const reportGeneratorTool = createTool({
    id: "generate-report",
    description: "Generate a structured report based on provided data",
    inputSchema: z.object({
        title: z.string().describe("Title of the report"),
        data: z.string().describe("Data to analyze and include in the report"),
        format: z.enum(["markdown", "text", "structured"]).describe("Output format for the report"),
    }),
    outputSchema: z.object({
        report: z.string().describe("Generated report content"),
        metadata: z.object({
            wordCount: z.number(),
            sections: z.number(),
            generatedAt: z.string(),
        }),
    }),
    execute: async ({ context }) => {
        const { title, data, format } = context;
        const timestamp = new Date().toISOString();

        let report = "";
        let sections = 0;

        if (format === "markdown") {
            report = `# ${title}\n\n**Generated:** ${timestamp}\n\n## Executive Summary\n\n${data}\n\n## Analysis\n\nBased on the provided data, this report presents key findings and insights.\n\n## Conclusion\n\nThis analysis provides a comprehensive overview of the data provided.`;
            sections = 3;
        } else if (format === "structured") {
            report = JSON.stringify({
                title,
                timestamp,
                summary: data,
                analysis: "Structured analysis of the provided data",
                conclusion: "Key insights and recommendations"
            }, null, 2);
            sections = 4;
        } else {
            report = `${title}\n\nGenerated: ${timestamp}\n\n${data}\n\nThis report provides an analysis of the provided information.`;
            sections = 2;
        }

        const wordCount = report.split(/\s+/).length;

        return {
            report,
            metadata: {
                wordCount,
                sections,
                generatedAt: timestamp,
            },
        };
    },
});

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const reportAgent = new Agent({
    name: "Report Generator Agent",
    instructions: `You are a helpful AI assistant specialized in generating reports and analyzing data. 
      
      You have access to tools that allow you to:
      - Read files from the file system
      - Generate structured reports in various formats  

      When users ask you to generate reports, use the available tools to help them create comprehensive, well-structured documents. Always be helpful and provide detailed responses.`,
    model: google("gemini-2.5-flash-lite-preview-06-17"),
    tools: {
        readFile: fileSystemTool,
        generateReport: reportGeneratorTool,
    },
});


// Create the main Mastra instance
export const mastra = new Mastra({
    agents: {
        reportAgent
    }
});

export default mastra; 