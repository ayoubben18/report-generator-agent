'use server'

import { Resource } from "sst";

import { redirect } from 'next/navigation';
import mastra from "@/task/mastra-agent";


export async function invokeReportGeneration(formData: FormData) {
    try {
        const message = formData.get('message') as string;

        if (!message) {
            // Redirect with error parameter
            redirect('/?error=Message is required');
        }

        const agent = mastra.getAgent("reportAgent");
        const response = await agent.generate(message);

        console.log(response.steps[0].text);

    } catch (error) {
        console.error('Error publishing to EventBridge:', error);
        // Redirect with error parameter
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // redirect(`/?error=Failed to submit report generation request: ${encodeURIComponent(errorMessage)}`);
    }
} 