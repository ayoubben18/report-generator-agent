"use client";

import { useQueryState } from "nuqs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AnimatedAIChat } from "@/components/ui/animated-ai-chat";
import ApprovalPageClient from "@/app/components/approval-page-client";

export default function MainPageClient() {
    // Always call hooks in the same order
    const [reportId, setReportId] = useQueryState("report");

    // Always call these queries (use "skip" when not needed)
    const report = useQuery(
        api.reports.getReport,
        reportId ? { reportId: reportId as Id<"reports"> } : "skip"
    );

    const workflow = useQuery(
        api.workflows.getWorkflowByReportId,
        report?.status === "plan_generated"
            ? { reportId: reportId as Id<"reports"> }
            : "skip"
    );

    // Loading state when we have reportId but no data yet
    if (reportId && report === undefined) {
        return (
            <div className="min-h-screen flex flex-col w-full items-center justify-center bg-transparent text-white p-6 relative overflow-hidden">
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
                    <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[96px] animate-pulse delay-1000" />
                </div>
                <div className="w-full max-w-4xl mx-auto relative z-10">
                    <div className="backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] shadow-2xl p-8 text-center">
                        <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full mx-auto mb-4 animate-spin" />
                        <h3 className="text-xl font-semibold mb-2 text-white/90">Loading Report...</h3>
                        <p className="text-white/60">Fetching report data from database</p>
                    </div>
                </div>
            </div>
        );
    }

    // Handle plan_generated status with approval interface
    if (reportId && report?.status === "plan_generated" && workflow?.suspendedData?.generatedPlan) {
        return (
            <ApprovalPageClient
                runId={workflow.mastraWorkflowId}
                generatedPlan={workflow.suspendedData.generatedPlan}
                message={workflow.suspendedData.message}
                currentStep={workflow.currentStep}
            />
        );
    }

    // Always render AnimatedAIChat with different props based on state
    return (
        <AnimatedAIChat
            serverReport={reportId && report ? report : undefined}
            onReportGenerated={setReportId}
        />
    );
} 