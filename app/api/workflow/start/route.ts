import { NextRequest, NextResponse } from 'next/server';
import reportWorkflow, { mastra } from '@/task/mastra-agent';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { z } from 'zod';

const bodySchema = z.object({
    userContext: z.string().min(1, "User context is required"),
    attachedFiles: z.array(z.instanceof(File)),
    title: z.string().optional(),
    description: z.string().optional(),
});

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
    try {
        // Parse FormData
        const formData = await req.formData();

        // Extract fields from FormData
        const userContext = formData.get("userContext") as string;
        const title = formData.get("title") as string | null;
        const description = formData.get("description") as string | null;

        // Extract files
        const attachedFiles: File[] = [];
        formData.getAll("attachedFiles").forEach((file) => {
            if (file instanceof File) {
                attachedFiles.push(file);
            }
        });

        // Create body object for validation
        const body = {
            userContext,
            attachedFiles,
            ...(title && { title }),
            ...(description && { description }),
        };

        const parseResult = bodySchema.safeParse(body);


        if (!parseResult.success) {
            const errors = parseResult.error.flatten().fieldErrors;
            console.log("errors", errors)
            return NextResponse.json(errors,
                { status: 400 });
        }


        const reportId = await convex.mutation(api.reports.createReport, {
            title: title || "Generating Plan...",
            userPrompt: userContext,
        });

        const run = await mastra.getWorkflow("reportWorkflow").createRunAsync();
        const workflowId = await convex.mutation(api.workflows.createWorkflow, {
            reportId,
            mastraWorkflowId: run.runId,
            currentStep: "generateReportChapters",
        });

        await convex.mutation(api.workflows.updateWorkflowStatus, {
            workflowId,
            status: "running",
        });

        const result = await run.start({
            inputData: {
                reportId,
                userContext,
                attachedFiles,
            },
        });



        // Handle different workflow outcomes
        if (result.status === 'suspended') {
            const userApprovalStep = result.steps['userApproval'];
            if (userApprovalStep?.status === 'suspended') {
                // Extract suspended data
                let message = userApprovalStep.payload?.message;
                let generatedPlan = userApprovalStep.payload?.generatedPlan;

                // Try alternative payload access if needed
                if (!message || !generatedPlan) {
                    message = (userApprovalStep as any).suspendPayload?.message ||
                        "Please review and approve the generated report chapters before proceeding.";
                    generatedPlan = (userApprovalStep as any).suspendPayload?.generatedPlan;
                }

                // Fallback to previous step if needed
                if (!generatedPlan) {
                    const generateStep = result.steps['generateReportChapters'];
                    if (generateStep?.status === 'success') {
                        generatedPlan = (generateStep as any).output;
                    }
                }

                if (generatedPlan) {
                    // Update report with generated title and status
                    await convex.mutation(api.reports.updateReportInfo, {
                        reportId,
                        title: generatedPlan.title,
                        status: "plan_generated",
                    });

                }

                // Update workflow status in Convex
                await convex.mutation(api.workflows.suspendWorkflow, {
                    mastraWorkflowId: run.runId,
                    suspendedData: {
                        message,
                        generatedPlan,
                    },
                    currentStep: "userApproval",
                });

                const responseData = {
                    status: 'suspended',
                    runId: run.runId,
                    reportId,
                    workflowId,
                    message,
                    generatedPlan,
                    stepId: 'userApproval'
                };

                return NextResponse.json(responseData);
            }
        }

        if (result.status === 'success') {
            // Update report and workflow status to completed
            await convex.mutation(api.reports.updateReportStatus, {
                reportId,
                status: "completed",
            });

            await convex.mutation(api.workflows.updateWorkflowStatus, {
                workflowId,
                status: "completed",
            });


            return NextResponse.json({
                status: 'success',
                result: result.result,
                runId: run.runId,
                reportId,
                workflowId,
            });
        }

        if (result.status === 'failed') {
            // Update workflow status
            await convex.mutation(api.workflows.updateWorkflowStatus, {
                workflowId,
                status: "failed",
                errorMessage: result.error?.message || 'Workflow failed',
            });

            // Update report status
            await convex.mutation(api.reports.updateReportStatus, {
                reportId,
                status: "failed",
            });

            return NextResponse.json({
                status: 'failed',
                error: result.error?.message || 'Workflow failed',
                runId: run.runId,
                reportId,
                workflowId,
            }, { status: 500 });
        }

        return NextResponse.json({
            status: 'unknown',
            result,
            runId: run.runId,
            reportId,
            workflowId,
            debug: {
                steps: Object.keys(result.steps),
                stepStatuses: Object.fromEntries(
                    Object.entries(result.steps).map(([id, step]) => [id, step.status])
                )
            }
        });

    } catch (error) {
        console.error('❌ Error starting workflow:', error);
        return NextResponse.json(
            { error: 'Failed to start workflow', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 