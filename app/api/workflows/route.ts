import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const status = url.searchParams.get('status');
        const reportId = url.searchParams.get('reportId');
        const mastraWorkflowId = url.searchParams.get('mastraWorkflowId');

        // If specific workflow by Mastra ID is requested
        if (mastraWorkflowId) {
            const workflow = await convex.query(api.workflows.getWorkflowByMastraId, {
                mastraWorkflowId,
            });

            if (!workflow) {
                return NextResponse.json(
                    { error: 'Workflow not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json(workflow);
        }

        // If workflow by report ID is requested
        if (reportId) {
            const workflow = await convex.query(api.workflows.getWorkflowByReportId, {
                reportId: reportId as any,
            });

            if (!workflow) {
                return NextResponse.json(
                    { error: 'Workflow not found for this report' },
                    { status: 404 }
                );
            }

            return NextResponse.json(workflow);
        }

        // If status filter is provided
        if (status === 'active') {
            const workflows = await convex.query(api.workflows.getActiveWorkflows);
            return NextResponse.json({ workflows });
        }

        if (status === 'suspended') {
            const workflows = await convex.query(api.workflows.getSuspendedWorkflows);
            return NextResponse.json({ workflows });
        }

        return NextResponse.json(
            { error: 'Please provide either reportId, mastraWorkflowId, or status parameter' },
            { status: 400 }
        );

    } catch (error) {
        console.error('❌ Error fetching workflows:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch workflows',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { reportId, mastraWorkflowId, currentStep } = body;

        if (!reportId || !mastraWorkflowId || !currentStep) {
            return NextResponse.json(
                { error: 'Report ID, Mastra workflow ID, and current step are required' },
                { status: 400 }
            );
        }

        const workflowId = await convex.mutation(api.workflows.createWorkflow, {
            reportId: reportId as any,
            mastraWorkflowId,
            currentStep,
        });

        return NextResponse.json({ workflowId }, { status: 201 });

    } catch (error) {
        console.error('❌ Error creating workflow:', error);
        return NextResponse.json(
            {
                error: 'Failed to create workflow',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { workflowId, status, currentStep, suspendedData, errorMessage } = body;

        if (!workflowId || !status) {
            return NextResponse.json(
                { error: 'Workflow ID and status are required' },
                { status: 400 }
            );
        }

        await convex.mutation(api.workflows.updateWorkflowStatus, {
            workflowId: workflowId as any,
            status,
            currentStep,
            suspendedData,
            errorMessage,
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('❌ Error updating workflow:', error);
        return NextResponse.json(
            {
                error: 'Failed to update workflow',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 