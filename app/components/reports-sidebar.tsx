"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ReportStatusBadge } from "@/components/shared";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, FileText, Filter, Loader2, Plus } from "lucide-react";
import { useQueryState } from "nuqs";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReportSearchParam } from "@/hooks/use-report-search-param";
import { ReportStatus } from "@/types/workflow.types";
import { textCapitalize } from "@/lib/string";

interface Report {
  _id: Id<"reports">;
  title: string;
  userPrompt: string;
  status:
    | "draft"
    | "plan_generated"
    | "plan_approved"
    | "generating"
    | "completed"
    | "failed";
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

function ReportsSidebarContent() {
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | "all">(
    "all"
  );
  const [reportId, setReportId] = useReportSearchParam();

  // Query reports based on selected status
  const allReports = useQuery(
    api.reports.getAllReports,
    selectedStatus === "all" ? {} : "skip"
  );
  const statusReports = useQuery(
    api.reports.getReportsByStatus,
    selectedStatus !== "all"
      ? { status: selectedStatus as ReportStatus }
      : "skip"
  );

  const reports =
    selectedStatus === "all" ? allReports || [] : statusReports || [];

  const downloadReport = async (report: Report, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!report.fullReport) return;

    const blob = new Blob([report.fullReport], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Reports</h2>
          </div>
          <Button
            onClick={() => setReportId(null)}
            size="sm"
            className="bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border-violet-500/30 h-8 px-3"
          >
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-3 h-3" />
            <span>Filter by status</span>
          </div>
          <Select
            value={selectedStatus}
            onValueChange={(value) =>
              setSelectedStatus(value as ReportStatus | "all")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Reports" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="plan_generated">Plan Generated</SelectItem>
              <SelectItem value="plan_approved">Plan Approved</SelectItem>
              <SelectItem value="generating">Generating</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="p-0 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-10rem)] p-2">
          <SidebarGroup>
            <SidebarGroupLabel>
              {selectedStatus === "all"
                ? "All Reports"
                : `${textCapitalize(selectedStatus)} Reports`}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {!reports ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : reports.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p>No reports found</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {reports.map((report) => (
                      <motion.div
                        key={report._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <SidebarMenuItem>
                          <div
                            className={`flex flex-col items-start gap-2 p-3 cursor-pointer rounded-md transition-colors hover:bg-accent hover:text-accent-foreground ${
                              reportId === report._id
                                ? "bg-accent text-accent-foreground"
                                : ""
                            }`}
                            onClick={() => setReportId(report._id)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <ReportStatusBadge
                                status={report.status}
                                size="sm"
                              />
                              {report.status === "completed" &&
                                report.fullReport && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => downloadReport(report, e)}
                                    className="h-auto p-1"
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                )}
                            </div>
                            <h3 className="text-sm font-medium text-left line-clamp-2 w-full leading-relaxed">
                              {report.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {new Date(
                                  report.createdAt
                                ).toLocaleDateString()}
                              </span>
                              {report.reportMetadata && (
                                <>
                                  <span>•</span>
                                  <span>
                                    {report.reportMetadata.chaptersCount}{" "}
                                    chapters
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </SidebarMenuItem>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}

export function ReportsSidebar() {
  return <ReportsSidebarContent />;
}
