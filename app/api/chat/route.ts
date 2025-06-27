import { NextRequest } from 'next/server';
import { createDataStreamResponse, formatDataStreamPart } from 'ai';
import mastra from '@/task/mastra-agent';
import { MessageList } from '@mastra/core/agent';
export async function POST(req: NextRequest) {
    const body = await req.json();
    const messages = body.messages as MessageList;
    if (!messages || !Array.isArray(messages)) {
        return new Response('Missing messages', { status: 400 });
    }

    const agent = mastra.getAgent('reportAgent');
    const streamResponse = await agent.stream(messages);

    return createDataStreamResponse({
        execute: async (stream) => {
            for await (const chunk of streamResponse.textStream) {
                stream.write(formatDataStreamPart('text', chunk));
            }

        },
    });
} 