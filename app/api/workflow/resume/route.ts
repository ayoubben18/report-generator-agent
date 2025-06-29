import { NextRequest, NextResponse } from 'next/server';
import reportWorkflow, { mastra, userApprovalStep } from '@/task/mastra-agent';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { z } from 'zod';
import { inspect } from 'util';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Define the schema for the chapter and plan structure (matching the mastra-agent schemas)
const chapterSchema = z.object({
    title: z.string(),
    description: z.string(),
    sections: z.array(z.object({
        title: z.string(),
        description: z.string(),
        id: z.string().optional(), // Optional for backward compatibility
    })),
});

const planSchema = z.object({
    title: z.string(),
    chapters: z.array(chapterSchema),
});

// Define the request body schema
const resumeWorkflowSchema = z.object({
    runId: z.string().min(1, "Run ID is required"),
    approved: z.boolean(),
    feedback: z.string().optional(),
    modifiedPlan: planSchema.optional(),
    reportId: z.string().optional(), // Optional since it's not always used
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validate the request body using Zod
        const validationResult = resumeWorkflowSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: 'Invalid request body',
                    details: validationResult.error.issues
                },
                { status: 400 }
            );
        }


        const { runId, approved, feedback, modifiedPlan, reportId } = validationResult.data;

        // Get workflow from Convex
        const workflow = await convex.query(api.workflows.getWorkflowByMastraId, {
            mastraWorkflowId: runId,
        });

        if (!workflow) {
            return NextResponse.json(
                { error: 'Workflow not found in database' },
                { status: 404 }
            );
        }

        // Create a run instance with the existing runId to resume it
        const run = await mastra.getWorkflow("reportWorkflow").createRunAsync({ runId });

        // Prepare resume data
        const resumeData = {
            approved,
            feedback: feedback || undefined,
            modifiedPlan: modifiedPlan || undefined,
        };

        if (approved) {
            // Update report status to approved, then generating
            await convex.mutation(api.reports.updateReportStatus, {
                reportId: workflow.reportId,
                status: "plan_approved",
            });

            await convex.mutation(api.reports.updateReportStatus, {
                reportId: workflow.reportId,
                status: "generating",
            });
        }

        // Resume the workflow in Convex
        await convex.mutation(api.workflows.resumeWorkflow, {
            workflowId: workflow._id,
            resumeData,
        });

        // Resume the Mastra workflow using the step ID string
        // According to the docs, we should use the step ID string, not the step instance
        const result = await run.resume({
            step: userApprovalStep,
            resumeData: resumeData,
        });

        // Alternative approach: Use suspended array for more dynamic step identification
        // This would be useful if you need to handle multiple suspended steps dynamically:
        /*
        const currentResult = await run.status(); // Get current workflow state
        if (currentResult.status === 'suspended' && currentResult.suspended.length > 0) {
            const result = await run.resume({
                step: currentResult.suspended[0], // Use first suspended step from array
                resumeData: resumeData,
            });
        }
        */

        // Handle the result after resumption
        if (result.status === 'success') {
            const workflowResult = result.result;
            if (workflowResult && workflowResult.fullReport && workflowResult.reportMetadata) {
                await convex.mutation(api.reports.updateReportContent, {
                    reportId: workflow.reportId,
                    fullReport: workflowResult.fullReport,
                    reportMetadata: {
                        title: workflowResult.reportMetadata.title,
                        chaptersCount: workflowResult.reportMetadata.chaptersCount,
                        sectionsCount: workflowResult.reportMetadata.sectionsCount,
                        generatedAt: new Date(workflowResult.reportMetadata.generatedAt).getTime(),
                    },
                });
            }

            await convex.mutation(api.workflows.updateWorkflowStatus, {
                workflowId: workflow._id,
                status: "completed",
            });

            return NextResponse.json({
                status: 'success',
                result: result.result,
                runId,
                reportId: workflow.reportId,
                workflowId: workflow._id,
            });
        }

        if (result.status === 'failed') {
            await convex.mutation(api.workflows.updateWorkflowStatus, {
                workflowId: workflow._id,
                status: "failed",
                errorMessage: result.error?.message || 'Workflow failed during resume',
            });

            await convex.mutation(api.reports.updateReportStatus, {
                reportId: workflow.reportId,
                status: "failed",
            });

            return NextResponse.json({
                status: 'failed',
                error: result.error?.message || 'Workflow failed',
                runId,
                reportId: workflow.reportId,
                workflowId: workflow._id,
            }, { status: 500 });
        }

        if (result.status === 'suspended') {
            await convex.mutation(api.workflows.updateWorkflowStatus, {
                workflowId: workflow._id,
                status: "suspended",
                suspendedData: result.steps,
            });

            return NextResponse.json({
                status: 'suspended',
                message: 'Workflow suspended again',
                runId,
                reportId: workflow.reportId,
                workflowId: workflow._id,
                debug: result.steps,
            });
        }

        return NextResponse.json({
            status: 'unknown',
            result,
            runId,
            reportId: workflow.reportId,
            workflowId: workflow._id,
        });

    } catch (error) {
        console.error('❌ Error resuming workflow:', error);
        return NextResponse.json(
            {
                error: 'Failed to resume workflow',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 