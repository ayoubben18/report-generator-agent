// import { mastra } from "./mastra-agent";

interface TaskInput {
    message: string;
    agentId?: string;
    requestId?: string;
}

// Main task execution function
export const runTask = async (input?: TaskInput) => {
    console.log("Starting Mastra task execution...");

    try {
        // Get input from environment variables or function parameters
        const message = input?.message || process.env.TASK_MESSAGE || "Generate a sample report";
        const agentId = input?.agentId || process.env.TASK_AGENT_ID || "reportAgent";
        const requestId = input?.requestId || process.env.TASK_REQUEST_ID || `task-${Date.now()}`;

        console.log(`Processing request ${requestId} with agent ${agentId}`);
        console.log(`Message: ${message}`);

        // Get the agent - use the exact key from the agents object
        // const agent = mastra.getAgent("reportAgent");
        // if (!agent) {
        //     console.error(`Agent 'reportAgent' not found`);
        //     throw new Error(`Agent 'reportAgent' not found`);
        // }

        // // Generate response from the agent
        // const response = await agent.generate(message);

        // console.log("Agent response generated successfully");

        // // Prepare the result
        // const result = {
        //     success: true,
        //     response: response.text,
        //     agentId,
        //     requestId,
        //     timestamp: new Date().toISOString(),
        // };

        // console.log("Task execution result:", JSON.stringify(result, null, 2));

        // return result;

    } catch (error) {
        console.error("Error in Mastra task execution:", error);

        const errorResult = {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
            timestamp: new Date().toISOString(),
        };

        console.log("Error result:", JSON.stringify(errorResult, null, 2));
        throw error; // Re-throw for task failure
    }
};

// Entry point when running as a standalone script
if (require.main === module) {
    runTask()
        .then(() => {
            console.log("Task completed successfully");
            process.exit(0);
        })
        .catch((error) => {
            console.error("Task failed:", error);
            process.exit(1);
        });
} 