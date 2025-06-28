"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock,
    CheckCircle,
    XCircle,
    Play,
    Pause,
    FileText,
    Calendar,
    Filter,
    Eye,
    Download,
    Loader2
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface Report {
    _id: Id<"reports">;
    title: string;
    description: string;
    userPrompt: string;
    status: "draft" | "plan_generated" | "plan_approved" | "generating" | "completed" | "failed";
    generatedPlan?: any;
    approvedPlan?: any;
    userFeedback?: string;
    fullReport?: string;
    reportMetadata?: {
        title: string;
        chaptersCount: number;
        sectionsCount: number;
        generatedAt: string;
    };
    createdAt: number;
    updatedAt: number;
    chapters?: any[];
    attachments?: any[];
    workflow?: any;
}

interface ReportsDashboardProps {
    onReportSelect?: (report: Report) => void;
}

const statusIcons = {
    draft: <FileText className="w-4 h-4" />,
    plan_generated: <Clock className="w-4 h-4" />,
    plan_approved: <CheckCircle className="w-4 h-4" />,
    generating: <Loader2 className="w-4 h-4 animate-spin" />,
    completed: <CheckCircle className="w-4 h-4 text-green-500" />,
    failed: <XCircle className="w-4 h-4 text-red-500" />,
};

const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    plan_generated: "bg-blue-100 text-blue-800",
    plan_approved: "bg-green-100 text-green-800",
    generating: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
};

export function ReportsDashboard({ onReportSelect }: ReportsDashboardProps) {
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    // Query all reports or by status
    const allReports = useQuery(api.reports.getAllReports);
    const draftReports = useQuery(api.reports.getReportsByStatus, { status: "draft" });
    const generatingReports = useQuery(api.reports.getReportsByStatus, { status: "generating" });
    const completedReports = useQuery(api.reports.getReportsByStatus, { status: "completed" });
    const failedReports = useQuery(api.reports.getReportsByStatus, { status: "failed" });

    const getReports = () => {
        switch (selectedStatus) {
            case "draft":
                return draftReports || [];
            case "generating":
                return generatingReports || [];
            case "completed":
                return completedReports || [];
            case "failed":
                return failedReports || [];
            default:
                return allReports || [];
        }
    };

    const reports = getReports();

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleReportClick = (report: Report) => {
        setSelectedReport(report);
        onReportSelect?.(report);
    };

    const downloadReport = async (report: Report) => {
        if (!report.fullReport) return;

        const blob = new Blob([report.fullReport], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.title}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!reports) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header and Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Reports Dashboard</h2>
                    <p className="text-gray-600 mt-1">Manage and track your report generation</p>
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Reports</option>
                        <option value="draft">Draft</option>
                        <option value="generating">Generating</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>
            </div>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {reports.map((report) => (
                        <motion.div
                            key={report._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
                        >
                            <div className="p-6">
                                {/* Status Badge */}
                                <div className="flex items-center justify-between mb-3">
                                    <span
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[report.status]
                                            }`}
                                    >
                                        {statusIcons[report.status]}
                                        {report.status.replace('_', ' ')}
                                    </span>
                                    <div className="flex items-center text-xs text-gray-500">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {formatDate(report.createdAt)}
                                    </div>
                                </div>

                                {/* Report Title and Description */}
                                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                                    {report.title}
                                </h3>
                                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                                    {report.description || report.userPrompt}
                                </p>

                                {/* Report Metadata */}
                                {report.reportMetadata && (
                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                                        <span>{report.reportMetadata.chaptersCount} chapters</span>
                                        <span>{report.reportMetadata.sectionsCount} sections</span>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleReportClick(report)}
                                        className="flex-1"
                                    >
                                        <Eye className="w-3 h-3 mr-1" />
                                        View
                                    </Button>
                                    {report.status === "completed" && report.fullReport && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => downloadReport(report)}
                                        >
                                            <Download className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Empty State */}
            {reports.length === 0 && (
                <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                    <p className="text-gray-600">
                        {selectedStatus === "all"
                            ? "Start creating your first report to see it here."
                            : `No reports with status "${selectedStatus}" found.`
                        }
                    </p>
                </div>
            )}

            {/* Report Detail Modal */}
            <AnimatePresence>
                {selectedReport && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                        onClick={() => setSelectedReport(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        {selectedReport.title}
                                    </h3>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedReport(null)}
                                    >
                                        ×
                                    </Button>
                                </div>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                                        <p className="text-gray-600">{selectedReport.description || "No description provided"}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">User Prompt</h4>
                                        <p className="text-gray-600 bg-gray-50 p-3 rounded">{selectedReport.userPrompt}</p>
                                    </div>
                                    {selectedReport.generatedPlan && (
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">Generated Plan</h4>
                                            <pre className="text-sm bg-gray-50 p-3 rounded overflow-x-auto">
                                                {JSON.stringify(selectedReport.generatedPlan, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                    {selectedReport.fullReport && (
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">Full Report</h4>
                                            <div className="bg-gray-50 p-3 rounded max-h-64 overflow-y-auto">
                                                <pre className="text-sm whitespace-pre-wrap">{selectedReport.fullReport}</pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
} 