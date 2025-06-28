"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApproval = async (approvalData: {
    approved: boolean;
    feedback?: string;
    modifiedPlan?: Plan;
  }) => {
    setIsSubmitting(true);
    try {
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
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Failed to submit approval:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-transparent text-white relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[96px] animate-pulse delay-1000" />
      </div>

      <div className="flex-1 flex relative z-10">
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
              onApprove={handleApproval}
              loading={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
