import { NextRequest, NextResponse } from 'next/server';
import reportWorkflow from '@/task/mastra-agent';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userContext, attachedFiles = [] } = body;

        if (!userContext) {
            return NextResponse.json(
                { error: 'User context is required' },
                { status: 400 }
            );
        }

        console.log('🚀 Starting workflow with context:', userContext);

        // Create and start the workflow
        const run = reportWorkflow.createRun();
        console.log('📝 Created run with ID:', run.runId);

        const result = await run.start({
            inputData: {
                userContext,
                attachedFiles,
            },
        });


        // Return different responses based on workflow status
        if (result.status === 'suspended') {

            // Get the suspended step data
            const userApprovalStep = result.steps['userApproval'];

            if (userApprovalStep?.status === 'suspended') {
                // Try different ways to access the suspended data
                let message = userApprovalStep.payload?.message;
                let generatedPlan = userApprovalStep.payload?.generatedPlan;

                // If payload is empty, try accessing from suspendPayload or other properties
                if (!message || !generatedPlan) {
                    console.log('🔍 Trying alternative payload access...');
                    message = (userApprovalStep as any).suspendPayload?.message ||
                        "Please review and approve the generated report chapters before proceeding.";

                    generatedPlan = (userApprovalStep as any).suspendPayload?.generatedPlan;
                }

                // If we still don't have the plan, try to get it from the previous step
                if (!generatedPlan) {
                    const generateStep = result.steps['generateReportChapters'];
                    if (generateStep?.status === 'success') {
                        generatedPlan = (generateStep as any).output;
                    }
                }

                const responseData = {
                    status: 'suspended',
                    runId: run.runId,
                    message: message,
                    generatedPlan: generatedPlan,
                    stepId: 'userApproval'
                };
                return NextResponse.json(responseData);
            }
        }

        if (result.status === 'success') {
            return NextResponse.json({
                status: 'success',
                result: result.result,
                runId: run.runId
            });
        }

        if (result.status === 'failed') {
            return NextResponse.json({
                status: 'failed',
                error: result.error?.message || 'Workflow failed',
                runId: run.runId
            }, { status: 500 });
        }

        return NextResponse.json({
            status: 'unknown',
            result,
            runId: run.runId,
            debug: {
                steps: Object.keys(result.steps),
                stepStatuses: Object.fromEntries(
                    Object.entries(result.steps).map(([id, step]) => [id, step.status])
                )
            }
        });

    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to start workflow' },
            { status: 500 }
        );
    }
} 