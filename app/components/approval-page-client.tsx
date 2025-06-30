"use client";

import { useCallback, useState, useTransition } from "react";
import WorkflowApproval from "@/app/components/workflow-approval";
import { Plan } from "@/types/workflow.types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ApprovalPageClientProps {
  runId: string;
  generatedPlan: Plan;
  message: string;
  currentStep: string;
}

export default function ApprovalPageClient({
  runId,
  generatedPlan,
  message,
  currentStep,
}: ApprovalPageClientProps) {
  const [isPending, startTransition] = useTransition();

  const handleApproval = useCallback(
    async (approvalData: {
      approved: boolean;
      feedback?: string;
      modifiedPlan?: Plan;
    }) => {
      const response = await fetch("/api/workflow/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          stepId: currentStep,
          ...approvalData,
        }),
      });

      const responseData = await response.text();
      if (response.ok) {
        console.log("✅ Approval submitted successfully");
      } else {
        console.error("Failed to submit approval:", responseData);
      }
    },
    [runId, currentStep]
  );

  return (
    <div className="flex-1 flex min-h-screen">
      {/* Left Side - Generated Plan (Read-only) */}
      <div className="w-1/2 border-r border-white/[0.05] flex flex-col backdrop-blur-2xl bg-white/[0.02]">
        <div className="p-6 border-b border-white/[0.05]">
          <h3 className="text-lg font-semibold text-white/90 mb-2">
            Generated Plan
          </h3>
          <p className="text-sm text-white/60">
            Review the AI-generated report structure
          </p>
        </div>
        <ScrollArea className="max-h-[calc(100vh-6rem)]">
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <h4 className="text-xl font-medium text-white/90">
                {generatedPlan.title}
              </h4>
              {generatedPlan.chapters.map((chapter, chapterIndex) => (
                <div
                  key={chapterIndex}
                  className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.05]"
                >
                  <h5 className="font-medium text-white/90 mb-2">
                    Chapter {chapterIndex + 1}: {chapter.title}
                  </h5>
                  <p className="text-sm text-white/70 mb-3">
                    {chapter.description}
                  </p>
                  <div className="space-y-2">
                    {chapter.sections.map((section, sectionIndex) => (
                      <div
                        key={sectionIndex}
                        className="bg-white/[0.02] rounded-lg p-3 border-l-2 border-violet-500/30"
                      >
                        <h6 className="text-sm font-medium text-white/80 mb-1">
                          {section.title}
                        </h6>
                        <p className="text-xs text-white/60">
                          {section.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Right Side - Approval Interface */}
      <div className="w-1/2 flex flex-col backdrop-blur-2xl bg-white/[0.02]">
        <div className="p-6 border-b border-white/[0.05]">
          <h3 className="text-lg font-semibold text-white/90 mb-2">
            Plan Approval
          </h3>
          <p className="text-sm text-white/60">{message}</p>
        </div>
        <div className="flex-1">
          <WorkflowApproval
            runId={runId}
            generatedPlan={generatedPlan}
            message={message}
            onApprove={(approvalData) =>
              startTransition(() => handleApproval(approvalData))
            }
            loading={isPending}
          />
        </div>
      </div>
    </div>
  );
}
