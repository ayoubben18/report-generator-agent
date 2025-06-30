"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import ApprovalPageClient from "@/app/components/approval-page-client";
import ReportDisplay from "./report-display";
import { useReportSearchParam } from "@/hooks/use-report-search-param";
import { motion } from "framer-motion";
import FailedInterface from "@/components/failed-interface";
import { textCapitalize } from "@/lib/string";
import ChatInterface from "@/components/chat-interface";

type Props = {
  reportId?: string;
};

export default function MainPageClient({ reportId }: Props) {
  const [_, setReportId] = useReportSearchParam();
  // Always call these queries (use "skip" when not needed)
  const report = useQuery(
    api.reports.getReport,
    reportId ? { reportId: reportId as Id<"reports"> } : "skip"
  );

  const workflow = useQuery(
    api.workflows.getWorkflowByReportId,
    reportId ? { reportId: reportId as Id<"reports"> } : "skip"
  );

  console.log("report", report);
  console.log("workflow", workflow);
  console.log("reportId", reportId);

  if (reportId) {
    // Loading state when we have reportId but no data yet
    if (!report && !workflow) {
      return (
        <div className="backdrop-blur-2xl max-w-4xl bg-white/[0.02] rounded-2xl border border-white/[0.05] shadow-2xl p-8 text-center">
          <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold mb-2 text-white/90">
            Loading Report...
          </h3>
          <p className="text-white/60">Fetching report data from database</p>
        </div>
      );
    }

    if (workflow && report) {
      if (report.status === "failed") {
        return <FailedInterface report={report} />;
      }

      // Handle plan_generated status with approval interface
      if (report.status === "plan_generated") {
        return (
          <ApprovalPageClient
            runId={workflow.mastraWorkflowId}
            generatedPlan={workflow.suspendedData.generatedPlan}
            message={workflow.suspendedData.message}
            currentStep={workflow.currentStep}
          />
        );
      }

      if (report.status === "generating") {
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] shadow-2xl p-8 text-center"
          >
            <div className="space-y-6">
              <motion.div
                className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full mx-auto"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <div>
                <h3 className="text-xl font-semibold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/60">
                  Generating Full Report
                </h3>
                <div className="backdrop-blur-xl bg-white/[0.03] rounded-xl p-4">
                  <div className="flex items-center justify-center text-sm text-white/70">
                    <span>{textCapitalize(report.currentStep)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      }

      if (
        report.status === "completed" &&
        report.fullReport &&
        report.reportMetadata
      ) {
        return (
          <div className=" max-w-4xl">
            <ReportDisplay
              fullReport={report.fullReport}
              reportMetadata={report.reportMetadata}
              runId={report._id}
              onStartNew={() => setReportId(null)}
            />
          </div>
        );
      }
    }
  } else {
    return <ChatInterface />;
  }
}
