import { MCPClient } from "@mastra/mcp";

const mcp = new MCPClient({
    servers: {
        context7: {
            command: "pnpm",
            args: [
                "dlx",
                "@upstash/context7-mcp@latest"
            ],
            logger: console.log
        },
        // exa: {
        //     command: "npx",
        //     args: [
        //         "-y",
        //         "mcp-remote",
        //         "https://mcp.exa.ai/mcp?exaApiKey=" + process.env.EXA_API_KEY
        //     ]
        // },
        tavilyMcp: {
            command: "npx",
            args: [
                "-y",
                "tavily-mcp@0.1.2"
            ],
            env: {
                TAVILY_API_KEY: process.env.TAVILY_API_KEY!
            },
            logger: console.log
        }
    },
});

export { mcp }