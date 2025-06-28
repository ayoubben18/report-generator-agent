"use client";

import ReportDisplay from "@/app/components/report-display";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Plan, WorkflowState } from "@/types/workflow.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckIcon,
  FileText,
  Loader,
  PaperclipIcon,
  RefreshCwIcon,
  XIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "./button";
import { Separator } from "./separator";
import { Textarea } from "./text-area";

import { ThinkingComponent } from "../shared";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from "./form";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { textCapitalize } from "@/lib/string";

// Form validation schema
const formSchema = z.object({
  message: z.string().min(1, "Please enter a message").max(2000, "Message too long"),
  attachments: z.array(z.instanceof(File)).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Report {
  _id: Id<"reports">;
  title: string;
  userPrompt: string;
  status: "draft" | "plan_generated" | "plan_approved" | "generating" | "completed" | "failed";
  fullReport?: string;
  reportMetadata?: {
    title: string;
    chaptersCount: number;
    sectionsCount: number;
    generatedAt: number;
  };
  createdAt: number;
  updatedAt: number;
}

interface AnimatedAIChatProps {
  selectedReport?: Report | null;
  onClearSelectedReport?: () => void;
  serverReport?: any; // Server-side report data
  onReportGenerated?: (reportId: string) => void;
}

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
      );

      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

// Plan interface imported from WorkflowApproval

export function AnimatedAIChat({
  selectedReport,
  onClearSelectedReport,
  serverReport,
  onReportGenerated
}: AnimatedAIChatProps = {}) {
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY CONDITIONAL RETURNS
  const [isTyping, setIsTyping] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });
  const [inputFocused, setInputFocused] = useState(false);
  const router = useRouter();

  // Workflow state
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    status: "idle",
  });

  // Real-time step tracking for generating reports
  const generateReportData = useQuery(
    api.reports.getReport,
    serverReport && serverReport.status === "generating"
      ? { reportId: serverReport._id }
      : "skip"
  );


  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
      attachments: [],
    },
  });

  const { watch, reset } = form;
  const watchedMessage = watch("message");

  // Convert API plan to WorkflowApproval plan with section IDs
  const addIdsToSections = (plan: Plan): Plan => {
    return {
      ...plan,
      chapters: plan.chapters.map((chapter) => ({
        ...chapter,
        sections: chapter.sections.map((section, index: number) => ({
          ...section,
          id:
            section.id ||
            `section-${Date.now()}-${index}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
        })),
      })),
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Workflow functions
  const startWorkflow = async (data: FormData) => {

    if (!data.message.trim()) return;

    setWorkflowState({ status: "starting" });
    setIsTyping(true);

    try {
      const response = await fetch("/api/workflow/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userContext: data.message,
          attachedFiles: data.attachments,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to start workflow");
      }

      if (responseData.status === "suspended") {
        // Use search params to show the report page
        if (onReportGenerated) {
          onReportGenerated(responseData.reportId);
        } else {
          // Fallback to old behavior if callback not provided
          router.push(`/${responseData.reportId}`);
        }
      } else if (responseData.status === "success") {
        setWorkflowState({
          status: "completed",
          runId: responseData.runId,
          result: responseData.result,
        });
      } else if (responseData.status === "failed") {
        setWorkflowState({
          status: "failed",
          error: responseData.error,
        });
      }
    } catch (error) {
      setWorkflowState({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleApproval = async (approvalData: {
    approved: boolean;
    feedback?: string;
    modifiedPlan?: Plan;
  }) => {
    if (!workflowState.runId || !workflowState.stepId) return;

    setWorkflowState((prev) => ({ ...prev, status: "generating" }));
    setIsTyping(true);

    try {
      const response = await fetch("/api/workflow/resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId: workflowState.runId,
          stepId: workflowState.stepId,
          ...approvalData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resume workflow");
      }

      if (data.status === "success") {
        setWorkflowState({
          status: "completed",
          runId: data.runId,
          result: data.result,
        });
      } else if (data.status === "failed") {
        setWorkflowState({
          status: "failed",
          error: data.error,
        });
      } else if (data.status === "suspended") {
        setWorkflowState({
          status: "suspended",
          runId: data.runId,
          message: data.message,
        });
      }
    } catch (error) {
      setWorkflowState({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const resetWorkflow = () => {
    setWorkflowState({ status: "idle" });
    reset();
    adjustHeight(true);
  };

  const onSubmit = async (data: FormData) => {
    if (data.message.trim()) {
      startTransition(async () => {
        await startWorkflow(data);
      });
    }
  };

  // NOW WE CAN DO CONDITIONAL RENDERING AFTER ALL HOOKS ARE CALLED
  // If we have a server report, determine what to show based on its status
  if (serverReport) {
    if (serverReport.status === "completed" && serverReport.fullReport && serverReport.reportMetadata) {
      return (
        <div className="min-h-screen flex flex-col w-full items-center justify-center bg-transparent text-white p-6 relative overflow-hidden">
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
            <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[96px] animate-pulse delay-1000" />
          </div>
          <div className="w-full max-w-4xl mx-auto relative z-10">
            <ReportDisplay
              fullReport={serverReport.fullReport}
              reportMetadata={serverReport.reportMetadata}
              runId={serverReport._id}
              onStartNew={() => router.push("/")}
            />
          </div>
        </div>
      );
    } else if (serverReport.status === "generating") {
      return (
        <div className="min-h-screen flex flex-col w-full items-center justify-center bg-transparent text-white p-6 relative overflow-hidden">
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
            <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[96px] animate-pulse delay-1000" />
          </div>
          <div className="w-full max-w-4xl mx-auto relative z-10">
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
                      <span>{textCapitalize(generateReportData?.currentStep)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      );
    } else {
      // For other statuses (draft, etc.), show basic info and redirect to home
      return (
        <div className="min-h-screen flex flex-col w-full items-center justify-center bg-transparent text-white p-6 relative overflow-hidden">
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
            <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[96px] animate-pulse delay-1000" />
          </div>
          <div className="w-full max-w-4xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] shadow-2xl p-8 text-center"
            >
              <FileText className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white/80">
                Report Not Ready
              </h3>
              <p className="text-white/60 mb-4">
                This report is in {serverReport.status.replace('_', ' ')} status.
              </p>
              <motion.button
                onClick={() => router.push("/")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-xl transition-all"
              >
                Go to Home
              </motion.button>
            </motion.div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen flex flex-col w-full items-center justify-center bg-transparent text-white p-6 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[96px] animate-pulse delay-1000" />
      </div>

      {/* Main Content */}
      <div className="w-full max-w-4xl mx-auto relative z-10">
        {/* Chat Interface - Always visible */}
        {(workflowState.status === "idle" ||
          workflowState.status === "starting") && (
            <motion.div
              className="relative z-10 space-y-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="text-center space-y-3">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="inline-block"
                >
                  <h1 className="text-3xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/40 pb-1">
                    How can I help today ?
                  </h1>
                  <motion.div
                    className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "100%", opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                  />
                </motion.div>
                <motion.p
                  className="text-sm text-white/40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Type a topic you want to generate a report on. Attach files for additional context.
                </motion.p>
              </div>

              <motion.div
                className="backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] shadow-2xl p-4"
                initial={{ scale: 0.98 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Need a report? Ask me anything"
                              className={cn(
                                "w-full px-4 py-3",
                                "bg-transparent",
                                "border-none",
                                "text-white/90 text-sm",
                                "focus:outline-none",
                                "placeholder:text-white/20",
                                "focus-visible:ring-0"
                              )}
                              onFocus={() => setInputFocused(true)}
                              onBlur={(e) => {
                                field.onBlur();
                                setInputFocused(false);
                              }}
                              onChange={(e) => {
                                field.onChange(e);
                                adjustHeight();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  form.handleSubmit(onSubmit)();
                                }
                              }}
                              value={field.value}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <FormField
                      control={form.control}
                      name="attachments"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                multiple
                                className="hidden"
                                id="file-upload"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  field.onChange([...(field.value || []), ...files]);
                                }}
                                accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.xls,.json,.xml"
                              />
                              <label
                                htmlFor="file-upload"
                                className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] rounded-lg cursor-pointer transition-all"
                              >
                                <PaperclipIcon className="w-4 h-4" />
                                Attach Files
                              </label>
                              {field.value && field.value.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {field.value.map((file, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-1 px-2 py-1 bg-white/[0.1] rounded text-xs text-white/80"
                                    >
                                      <span className="max-w-20 truncate">{file.name}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newFiles = field.value?.filter((_, i) => i !== index) || [];
                                          field.onChange(newFiles);
                                        }}
                                        className="text-white/60 hover:text-white"
                                      >
                                        <XIcon className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-end w-full">
                      <Button
                        type="submit"
                        disabled={isPending || !watchedMessage?.trim()}
                        className="gap-2"
                      >
                        {isPending && <Loader className="w-4 h-4 animate-spin" />}
                        {isPending ? "Generating..." : "Generate"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </motion.div>
            </motion.div>
          )}

        {/* Workflow Approval State - Now handled by SSR on /[id] page */}

        {/* Generating State */}
        {workflowState.status === "generating" && (
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
                    <span>{textCapitalize(generateReportData?.currentStep)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Completed State */}
        {workflowState.status === "completed" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center"
                >
                  <CheckIcon className="w-5 h-5 text-green-400" />
                </motion.div>
                <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-green-300">
                  Report Completed!
                </h2>
              </div>
              <motion.button
                onClick={resetWorkflow}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white rounded-lg transition-all flex items-center gap-2"
              >
                <RefreshCwIcon className="w-4 h-4" />
                New Report
              </motion.button>
            </div>
            {workflowState.result && (
              <ReportDisplay
                fullReport={workflowState.result.fullReport}
                reportMetadata={workflowState.result.reportMetadata}
                runId={workflowState.runId!}
                onStartNew={resetWorkflow}
              />
            )}
          </motion.div>
        )}

        {/* Selected Report Display */}
        {selectedReport && workflowState.status === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center"
                >
                  <CheckIcon className="w-5 h-5 text-blue-400" />
                </motion.div>
                <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-300">
                  Viewing Saved Report
                </h2>
              </div>
              <motion.button
                onClick={onClearSelectedReport}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white rounded-lg transition-all flex items-center gap-2"
              >
                <XIcon className="w-4 h-4" />
                Close
              </motion.button>
            </div>
            {selectedReport.status === "completed" && selectedReport.fullReport && selectedReport.reportMetadata ? (
              <ReportDisplay
                fullReport={selectedReport.fullReport}
                reportMetadata={selectedReport.reportMetadata}
                runId={selectedReport._id.toString()}
                onStartNew={() => {
                  onClearSelectedReport?.();
                  resetWorkflow();
                }}
              />
            ) : selectedReport.status === "generating" ? (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full mx-auto mb-6"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <h3 className="text-lg font-semibold mb-2 text-white/80">
                  Report is still generating...
                </h3>
                <p className="text-white/60">
                  This report is currently being generated. Please check back later.
                </p>
              </motion.div>
            ) : (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <FileText className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-white/80">
                  Report Not Complete
                </h3>
                <p className="text-white/60 mb-4">
                  This report is in {selectedReport.status.replace('_', ' ')} status.
                </p>
                <div className="bg-white/[0.05] rounded-xl p-4">
                  <p className="text-sm text-white/70">
                    <strong>Title:</strong> {selectedReport.title}
                  </p>
                  <p className="text-sm text-white/70 mt-2">
                    <strong>Prompt:</strong> {selectedReport.userPrompt}
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Failed State */}
        {workflowState.status === "failed" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-red-500/20 shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-red-400">
                Workflow Failed
              </h2>
              <motion.button
                onClick={resetWorkflow}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white rounded-lg transition-all"
              >
                Try Again
              </motion.button>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-red-300">
                {workflowState.error || "An unknown error occurred"}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isTyping && (
          <ThinkingComponent />
        )}
      </AnimatePresence>

      {inputFocused && (
        <motion.div
          className="fixed w-[50rem] h-[50rem] rounded-full pointer-events-none z-0 opacity-[0.02] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 blur-[96px]"
          animate={{
            x: mousePosition.x - 400,
            y: mousePosition.y - 400,
          }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 150,
            mass: 0.5,
          }}
        />
      )}
    </div>
  );
}

const rippleKeyframes = `
@keyframes ripple {
  0% { transform: scale(0.5); opacity: 0.6; }
  100% { transform: scale(2); opacity: 0; }
}
`;

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = rippleKeyframes;
  document.head.appendChild(style);
}
