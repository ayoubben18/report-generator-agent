import { EventBridgeEvent } from "aws-lambda";
import { Resource } from "sst";
import { task } from "sst/aws/task";
import { inspect } from "util";

interface ReportGenerationEvent {
    message: string;
    agentId?: string;
    requestId: string;
}

export const handler = async (event: EventBridgeEvent<"GenerateReport", ReportGenerationEvent>) => {
    // console.log("Lambda handler received event:", JSON.stringify(event, null, 2));

    try {
        // Parse the event from EventBridge
        const detail = event.detail as ReportGenerationEvent;

        console.log(detail)

        if (!detail) {
            throw new Error("No event detail found");
        }

        const { message, agentId = 'reportAgent', requestId } = detail;

        if (!message) {
            throw new Error("Message is required");
        }


        // Invoke the task
        const result = await task.run(Resource.MastraTask, {
            TASK_MESSAGE: message,
            TASK_AGENT_ID: agentId,
            TASK_REQUEST_ID: requestId,
        });

        console.log('Task invoked successfully');

        console.log(inspect(result, {
            colors: true,
            depth: Infinity
        }))

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: "Task invoked successfully",
                requestId,
                taskResult: result
            })
        };

    } catch (error) {
        console.error('Error in Lambda handler:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                requestId: event.detail?.requestId
            })
        };
    }
}; 