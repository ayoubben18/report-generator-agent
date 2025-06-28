import { NextRequest, NextResponse } from 'next/server';
import reportWorkflow from '@/task/mastra-agent';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { runId, approved, feedback, modifiedPlan, reportId } = body;

        if (!runId) {
            return NextResponse.json(
                { error: 'Run ID is required' },
                { status: 400 }
            );
        }

        console.log('🔄 Resuming workflow with run ID:', runId);
        console.log('📝 User approval:', approved);

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

        console.log('📋 Found workflow in Convex:', workflow._id);

        // Create a run instance with the existing runId to resume it
        const run = reportWorkflow.createRun({ runId });

        // Prepare resume data
        const resumeData = {
            approved,
            feedback: feedback || undefined,
            modifiedPlan: modifiedPlan || undefined,
        };

        console.log('🚀 Resuming with data:', resumeData);

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

            console.log('✅ Plan approved - updated status in Convex');
        }

        // Resume the workflow in Convex
        await convex.mutation(api.workflows.resumeWorkflow, {
            workflowId: workflow._id,
            resumeData,
        });

        // Resume the Mastra workflow
        const result: any = await run.resume({
            step: 'userApproval',
            resumeData: resumeData,
        });

        console.log('📊 Workflow resumed with status:', result.status);

        // Handle the result
        if (result.status === 'success') {
            console.log('✅ Workflow completed successfully');

            // Extract the full report and metadata from the result
            const workflowResult = result.result;
            if (workflowResult && workflowResult.fullReport && workflowResult.reportMetadata) {
                console.log('📄 Updating report with full content and metadata');

                // Update report with full content and metadata
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
            } else {
                console.log('⚠️  No report content found in workflow result, updating status only');
                // Fallback to just updating status if no content available
                await convex.mutation(api.reports.updateReportStatus, {
                    reportId: workflow.reportId,
                    status: "completed",
                });
            }

            await convex.mutation(api.workflows.updateWorkflowStatus, {
                workflowId: workflow._id,
                status: "completed",
            });

            console.log('✅ Updated report and workflow status to completed');

            return NextResponse.json({
                status: 'success',
                result: result.result,
                runId,
                reportId: workflow.reportId,
                workflowId: workflow._id,
            });
        }

        if (result.status === 'failed') {
            console.error('❌ Workflow failed:', result.error);

            // Update workflow and report status
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
            console.log('⏸️  Workflow suspended again');

            // Handle another suspension (rare case)
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

        // Log unknown status (simplified)
        console.warn(`Resume returned unknown status: ${result.status}`, result);

        return NextResponse.json({
            status: 'unknown',
            result,
            runId,
            reportId: workflow.reportId,
            workflowId: workflow._id,
            debug: {
                steps: Object.keys(result.steps || {}),
                stepStatuses: result.steps ? Object.fromEntries(
                    Object.entries(result.steps).map(([id, step]) => [id, (step as any).status])
                ) : {}
            }
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