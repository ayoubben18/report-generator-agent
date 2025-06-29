"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ReportMetadata } from "@/types/workflow.types";
import { AnimatePresence, motion } from "framer-motion";
import {
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  RefreshCwIcon,
  FileTextIcon,
  FileCodeIcon,
  ExternalLinkIcon // Make sure this is imported
} from "lucide-react";
import { useState } from "react";


interface ReportDisplayProps {
  fullReport: string;
  reportMetadata: ReportMetadata;
  runId: string;
  onStartNew: () => void;
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

export default function ReportDisplay({
  fullReport,
  reportMetadata,
  runId,
  onStartNew,
}: ReportDisplayProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [latexGenerating, setLatexGenerating] = useState(false);
  const [overleafOpening, setOverleafOpening] = useState(false); // New state for Overleaf button

  const downloadReport = () => {
    const blob = new Blob([fullReport], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportMetadata.title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}_report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateLatex = async () => {
    setLatexGenerating(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: fullReport, metadata: reportMetadata }),
      });
      const data = await await response.json(); // Added await here
      if (response.ok && data.latex) { // Check response.ok for better error handling
        const blob = new Blob([data.latex], { type: "text/x-tex" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportMetadata.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_report.tex`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert(data.error || "Failed to generate LaTeX code."); // Display backend error if available
      }
    } catch (error) {
      console.error("Failed to generate LaTeX code:", error);
      alert("An error occurred while generating LaTeX code.");
    } finally {
      setLatexGenerating(false);
    }
  };

  const openInOverleaf = async () => {
    setOverleafOpening(true);
    try {
      // Step 1: Call your backend to get the LaTeX string
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: fullReport, metadata: reportMetadata }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate LaTeX for Overleaf.');
      }

      const { latex } = await response.json();

      // Step 2: Create a dynamic form to submit to Overleaf
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://www.overleaf.com/docs';
      form.target = '_blank'; // Open in a new tab/window

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'snip'; // Parameter to send the LaTeX content directly
      input.value = latex;

      form.appendChild(input);
      document.body.appendChild(form); // Append to body to submit
      form.submit(); // Submit the form
      document.body.removeChild(form); // Clean up the form after submission

    } catch (error) {
      console.error("Failed to open in Overleaf:", error);
      alert(`Could not open in Overleaf: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setOverleafOpening(false);
    }
  };


  const downloadPDF = async () => {
    setPdfGenerating(true);
    try {
      console.log("Downloading PDF (placeholder - implement backend PDF generation)");
      alert("PDF generation is not yet implemented. This would require a local LaTeX compiler service.");

    } catch (error) {
      console.error("Failed to generate PDF: ", error);
    } finally {
      setPdfGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullReport);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  // Enhanced markdown formatting for display
  const formatMarkdown = (text: string) => {
    return text.split("\n").map((line, index) => {
      // Headers
      if (line.startsWith("### ")) {
        return (
          <motion.h3
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-lg font-semibold mt-8 mb-4 text-white/90 border-l-2 border-violet-500/30 pl-4"
          >
            {line.substring(4)}
          </motion.h3>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <motion.h2
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xl font-bold mt-10 mb-6 text-white/95 border-b border-white/[0.1] pb-3"
          >
            {line.substring(3)}
          </motion.h2>
        );
      }
      if (line.startsWith("# ")) {
        return (
          <motion.h1
            key={index}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold mt-12 mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white/95 to-white/70"
          >
            {line.substring(2)}
          </motion.h1>
        );
      }

      // Horizontal rule
      if (line.trim() === "---") {
        return (
          <motion.hr
            key={index}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            className="my-8 border-white/[0.1]"
          />
        );
      }

      // Bold text (simple **text** pattern)
      if (line.includes("**")) {
        const parts = line.split("**");
        return (
          <motion.p
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 text-white/80 leading-relaxed"
          >
            {parts.map((part, i) =>
              i % 2 === 1 ? (
                <strong key={i} className="text-white/95 font-semibold">
                  {part}
                </strong>
              ) : (
                part
              )
            )}
          </motion.p>
        );
      }

      // List items
      if (line.trim().match(/^\d+\./)) {
        return (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="ml-6 mb-2 text-white/80 relative before:content-[''] before:absolute before:-left-4 before:top-3 before:w-1 before:h-1 before:bg-violet-400 before:rounded-full"
          >
            {line.trim()}
          </motion.li>
        );
      }
      if (line.trim().startsWith("   ") && line.trim().match(/^\d+\.\d+\./)) {
        return (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="ml-12 mb-1 text-white/70 text-sm"
          >
            {line.trim()}
          </motion.li>
        );
      }

      // Regular paragraphs
      if (line.trim()) {
        return (
          <motion.p
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 text-white/80 leading-relaxed"
          >
            {line}
          </motion.p>
        );
      }

      // Empty lines
      return <div key={index} className="mb-3"></div>;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <motion.div
        className="p-8 border-b border-white/[0.05]"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="space-y-4">
          {/* Title and Action Buttons Row */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white/95 to-white/70">
              Report Generated Successfully!
            </h1>
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-8 text-sm text-white/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-violet-400/60 rounded-full"></div>
              <span className="font-medium text-white/70">
                {reportMetadata.chaptersCount}
              </span>
              <span>chapters</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-indigo-400/60 rounded-full"></div>
              <span className="font-medium text-white/70">
                {reportMetadata.sectionsCount}
              </span>
              <span>sections</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400/60 rounded-full"></div>
              <span className="font-medium text-white/70">
                {new Date(reportMetadata.generatedAt).toLocaleDateString()}
              </span>
              <span>at</span>
              <span className="font-medium text-white/70">
                {new Date(reportMetadata.generatedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="p-8 border-b border-white/[0.05]"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex gap-3">
              <motion.button
                onClick={() => setShowRaw(!showRaw)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-10 text-md items-center gap-2 px-3 bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white rounded-xl transition-all border border-white/[0.05]"
              >
                {showRaw ? (
                  <EyeIcon className="w-4 h-4" />
                ) : (
                  <CodeIcon className="w-4 h-4" />
                )}
                {showRaw ? "Formatted" : "Raw"}
              </motion.button>

              <motion.button
                onClick={copyToClipboard}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-10 text-md items-center gap-2 px-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl transition-all border border-blue-500/20"
              >
                <CopyIcon className="w-4 h-4" />
                {copySuccess ? "Copied!" : "Copy"}
              </motion.button>

              <motion.button
                onClick={downloadReport}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-10 text-md items-center gap-2 px-3 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-xl transition-all border border-green-500/20"
              >
                <DownloadIcon className="w-4 h-4" />
                Markdown
              </motion.button>

              {/* LaTeX Download Button */}
              <motion.button
                onClick={generateLatex}
                disabled={latexGenerating}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-10 text-md items-center gap-2 px-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-xl transition-all border border-yellow-500/20"
              >
                <FileCodeIcon className="w-4 h-4" />
                {latexGenerating ? "Downloading" : "LaTeX"} {/* Changed text for clarity */}
              </motion.button>

              {/* Open in Overleaf Button */}
              <motion.button
                onClick={openInOverleaf}
                disabled={overleafOpening}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-10 text-md items-center gap-2 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-all border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ExternalLinkIcon className="w-4 h-4" />
                {overleafOpening ? "Opening" : "Open in Overleaf"}
              </motion.button>

              <motion.button
                onClick={downloadPDF}
                disabled={pdfGenerating}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-10 text-md items-center gap-2 px-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl transition-all border border-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileTextIcon className="w-4 h-4" />
                {pdfGenerating ? "Downloading" : "PDF"}
              </motion.button>
            </div>
      </motion.div>

      {/* Content */}
      <motion.div
        className="p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <ScrollArea className="max-h-[calc(100vh-30rem)] p-4 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {showRaw ? (
              <motion.div
                key="raw"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="backdrop-blur-xl bg-white/[0.03] rounded-xl p-6 border border-white/[0.05]"
              >
                <pre className="text-sm text-white/80 whitespace-pre-wrap overflow-auto  custom-scrollbar">
                  {fullReport}
                </pre>
              </motion.div>
            ) : (
              <motion.div
                key="formatted"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="prose prose-invert max-w-none space-y-6  overflow-auto custom-scrollbar pr-4"
              >
                {formatMarkdown(fullReport)}
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </motion.div>

      {/* Footer */}
      <motion.div
        className="px-8 py-4 border-t border-white/[0.05] bg-white/[0.01]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex justify-between items-center text-xs text-white/30">
          <span>Workflow Run ID: {runId}</span>
          <span>Generated by Report Generator Agent</span>
        </div>
      </motion.div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </motion.div>
  );
}