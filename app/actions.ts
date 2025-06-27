'use server'

import { Resource } from "sst";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { redirect } from 'next/navigation';

const eventBridge = new EventBridgeClient({});

export async function invokeReportGeneration(formData: FormData) {
    try {
        const message = formData.get('message') as string;

        if (!message) {
            // Redirect with error parameter
            redirect('/?error=Message is required');
        }

        const requestId = crypto.randomUUID();

        console.log(`EventBridge Bus Name: ${Resource.ReportGeneratorBus.name}`);

        // Publish event to EventBridge
        const command = new PutEventsCommand({
            Entries: [
                {
                    Source: 'report-generator-app',
                    DetailType: "GenerateReport",
                    Detail: JSON.stringify({
                        message,
                        agentId: 'reportAgent',
                        requestId,
                    }),
                    EventBusName: Resource.ReportGeneratorBus.name,
                }
            ]
        });


        const response = await eventBridge.send(command);


        if (response.FailedEntryCount && response.FailedEntryCount > 0) {
            throw new Error(`Failed to publish ${response.FailedEntryCount} events. Details: ${JSON.stringify(response.Entries)}`);
        }

        console.log('Event published successfully to EventBridge:', response);

        // Redirect with success parameter
        // redirect(`/?success=Report generation request submitted with ID: ${requestId}`);

    } catch (error) {
        console.error('Error publishing to EventBridge:', error);
        // Redirect with error parameter
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // redirect(`/?error=Failed to submit report generation request: ${encodeURIComponent(errorMessage)}`);
    }
} 