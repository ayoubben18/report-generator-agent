import { NextRequest, NextResponse } from 'next/server';
import reportWorkflow from '@/task/mastra-agent';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { runId, stepId, approved, feedback, modifiedPlan } = body;

        if (!runId || !stepId) {
            return NextResponse.json(
                { error: 'runId and stepId are required' },
                { status: 400 }
            );
        }

        // Create run instance with existing runId
        const run = await reportWorkflow.createRunAsync({ runId });

        // Resume the workflow with user decision
        const result = await run.resume({
            step: stepId,
            resumeData: {
                approved: Boolean(approved),
                feedback: feedback || undefined,
                modifiedPlan: modifiedPlan || undefined,
            },
        });

        if (result.status === 'success') {
            const userApprovalOutput = result.steps['userApproval'];
            // Check if the step was successful before accessing output
            const stepOutput = userApprovalOutput?.status === 'success' ? userApprovalOutput.output : null;

            return NextResponse.json({
                status: 'success',
                result: result.result,
                approvedPlan: stepOutput?.approvedPlan,
                userFeedback: stepOutput?.userFeedback,
                runId
            });
        }

        if (result.status === 'failed') {
            return NextResponse.json({
                status: 'failed',
                error: result.error?.message || 'Workflow failed after resume',
                runId
            }, { status: 500 });
        }

        if (result.status === 'suspended') {
            // Handle case where workflow suspends again (if you have multiple approval steps)
            return NextResponse.json({
                status: 'suspended',
                message: 'Workflow suspended at another step',
                suspended: result.suspended,
                runId
            });
        }

        return NextResponse.json({
            status: 'unknown',
            result,
            runId
        });

    } catch (error) {
        console.error('Error resuming workflow:', error);
        return NextResponse.json(
            { error: 'Failed to resume workflow' },
            { status: 500 }
        );
    }
} 