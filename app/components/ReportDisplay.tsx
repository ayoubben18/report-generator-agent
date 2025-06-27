"use client";

import { useState } from 'react';

interface ReportMetadata {
    title: string;
    chaptersCount: number;
    sectionsCount: number;
    generatedAt: string;
}

interface ReportDisplayProps {
    fullReport: string;
    reportMetadata: ReportMetadata;
    runId: string;
    onStartNew: () => void;
}

export default function ReportDisplay({
    fullReport,
    reportMetadata,
    runId,
    onStartNew
}: ReportDisplayProps) {
    const [showRaw, setShowRaw] = useState(false);

    const downloadReport = () => {
        const blob = new Blob([fullReport], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportMetadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(fullReport);
            alert('Report copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    // Simple markdown-like formatting for display
    const formatMarkdown = (text: string) => {
        return text
            .split('\n')
            .map((line, index) => {
                // Headers
                if (line.startsWith('### ')) {
                    return <h3 key={index} className="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-white">{line.substring(4)}</h3>;
                }
                if (line.startsWith('## ')) {
                    return <h2 key={index} className="text-xl font-bold mt-8 mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">{line.substring(3)}</h2>;
                }
                if (line.startsWith('# ')) {
                    return <h1 key={index} className="text-2xl font-bold mt-8 mb-6 text-gray-900 dark:text-white">{line.substring(2)}</h1>;
                }

                // Horizontal rule
                if (line.trim() === '---') {
                    return <hr key={index} className="my-6 border-gray-300 dark:border-gray-600" />;
                }

                // Bold text (simple **text** pattern)
                if (line.includes('**')) {
                    const parts = line.split('**');
                    return (
                        <p key={index} className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed">
                            {parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
                        </p>
                    );
                }

                // Italic text (simple *text* pattern)
                if (line.includes('*[') && line.includes(']*')) {
                    return <p key={index} className="mb-3 text-gray-500 dark:text-gray-400 italic leading-relaxed">{line}</p>;
                }

                // List items
                if (line.trim().match(/^\d+\./)) {
                    return <li key={index} className="ml-6 mb-1 text-gray-700 dark:text-gray-300">{line.trim()}</li>;
                }
                if (line.trim().startsWith('   ') && line.trim().match(/^\d+\.\d+\./)) {
                    return <li key={index} className="ml-12 mb-1 text-gray-600 dark:text-gray-400 text-sm">{line.trim()}</li>;
                }

                // Regular paragraphs
                if (line.trim()) {
                    return <p key={index} className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed">{line}</p>;
                }

                // Empty lines
                return <div key={index} className="mb-2"></div>;
            });
    };

    return (
        <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Report Generated Successfully!
                    </h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>📖 {reportMetadata.chaptersCount} chapters</span>
                        <span>📄 {reportMetadata.sectionsCount} sections</span>
                        <span>🕒 {new Date(reportMetadata.generatedAt).toLocaleString()}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowRaw(!showRaw)}
                        className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                        {showRaw ? 'Formatted' : 'Raw'}
                    </button>
                    <button
                        onClick={copyToClipboard}
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Copy
                    </button>
                    <button
                        onClick={downloadReport}
                        className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                        Download
                    </button>
                    <button
                        onClick={onStartNew}
                        className="px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                        New Report
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="prose prose-gray dark:prose-invert max-w-none">
                {showRaw ? (
                    <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-sm whitespace-pre-wrap">
                        {fullReport}
                    </pre>
                ) : (
                    <div className="space-y-4">
                        {formatMarkdown(fullReport)}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>Workflow Run ID: {runId}</span>
                    <span>Generated by Report Generator Agent</span>
                </div>
            </div>
        </div>
    );
} 