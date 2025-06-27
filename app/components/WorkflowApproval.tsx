"use client";

import { useState } from 'react';

interface Chapter {
    title: string;
    description: string;
    sections: {
        title: string;
        description: string;
    }[];
}

interface Plan {
    title: string;
    chapters: Chapter[];
}

interface WorkflowApprovalProps {
    runId: string;
    generatedPlan: Plan;
    message: string;
    onApprove: (data: { approved: boolean; feedback?: string; modifiedPlan?: Plan }) => void;
    loading?: boolean;
}

export default function WorkflowApproval({
    runId,
    generatedPlan,
    message,
    onApprove,
    loading = false
}: WorkflowApprovalProps) {
    const [feedback, setFeedback] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editedPlan, setEditedPlan] = useState<Plan>(generatedPlan);

    const handleApprove = () => {
        onApprove({
            approved: true,
            feedback: feedback || undefined,
            modifiedPlan: isEditing ? editedPlan : generatedPlan
        });
    };

    const handleReject = () => {
        onApprove({
            approved: false,
            feedback: feedback || "User rejected the plan"
        });
    };

    const updateChapterTitle = (chapterIndex: number, newTitle: string) => {
        const updated = { ...editedPlan };
        updated.chapters[chapterIndex].title = newTitle;
        setEditedPlan(updated);
    };

    const updateChapterDescription = (chapterIndex: number, newDescription: string) => {
        const updated = { ...editedPlan };
        updated.chapters[chapterIndex].description = newDescription;
        setEditedPlan(updated);
    };

    const addSection = (chapterIndex: number) => {
        const updated = { ...editedPlan };
        updated.chapters[chapterIndex].sections.push({
            title: "New Section",
            description: "Section description"
        });
        setEditedPlan(updated);
    };

    const updateSectionTitle = (chapterIndex: number, sectionIndex: number, newTitle: string) => {
        const updated = { ...editedPlan };
        updated.chapters[chapterIndex].sections[sectionIndex].title = newTitle;
        setEditedPlan(updated);
    };

    const updateSectionDescription = (chapterIndex: number, sectionIndex: number, newDescription: string) => {
        const updated = { ...editedPlan };
        updated.chapters[chapterIndex].sections[sectionIndex].description = newDescription;
        setEditedPlan(updated);
    };

    const removeSection = (chapterIndex: number, sectionIndex: number) => {
        const updated = { ...editedPlan };
        updated.chapters[chapterIndex].sections.splice(sectionIndex, 1);
        setEditedPlan(updated);
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Report Plan Review
                </h2>
                <p className="text-gray-600 dark:text-gray-300">{message}</p>
            </div>

            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedPlan.title}
                                onChange={(e) => setEditedPlan({ ...editedPlan, title: e.target.value })}
                                className="text-xl font-semibold bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                            />
                        ) : (
                            editedPlan.title
                        )}
                    </h3>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                        {isEditing ? 'Preview' : 'Edit'}
                    </button>
                </div>

                <div className="space-y-4">
                    {editedPlan.chapters.map((chapter, chapterIndex) => (
                        <div key={chapterIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Chapter {chapterIndex + 1} Title:
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={chapter.title}
                                        onChange={(e) => updateChapterTitle(chapterIndex, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                ) : (
                                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">{chapter.title}</h4>
                                )}
                            </div>

                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Description:
                                </label>
                                {isEditing ? (
                                    <textarea
                                        value={chapter.description}
                                        onChange={(e) => updateChapterDescription(chapterIndex, e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                ) : (
                                    <p className="text-gray-600 dark:text-gray-300">{chapter.description}</p>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Sections:
                                    </label>
                                    {isEditing && (
                                        <button
                                            onClick={() => addSection(chapterIndex)}
                                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                        >
                                            Add Section
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-2 ml-4">
                                    {chapter.sections.map((section, sectionIndex) => (
                                        <div key={sectionIndex} className="border-l-2 border-gray-200 dark:border-gray-600 pl-3">
                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={section.title}
                                                            onChange={(e) => updateSectionTitle(chapterIndex, sectionIndex, e.target.value)}
                                                            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                        />
                                                        <button
                                                            onClick={() => removeSection(chapterIndex, sectionIndex)}
                                                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        value={section.description}
                                                        onChange={(e) => updateSectionDescription(chapterIndex, sectionIndex, e.target.value)}
                                                        rows={1}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                    />
                                                </div>
                                            ) : (
                                                <div>
                                                    <h5 className="font-medium text-gray-800 dark:text-gray-200">{section.title}</h5>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{section.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Additional Feedback (optional):
                </label>
                <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Any additional comments or feedback..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
            </div>

            <div className="flex gap-4">
                <button
                    onClick={handleApprove}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
                >
                    {loading ? 'Processing...' : 'Approve & Continue'}
                </button>
                <button
                    onClick={handleReject}
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
                >
                    {loading ? 'Processing...' : 'Reject'}
                </button>
            </div>

            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Workflow Run ID: {runId}
            </div>
        </div>
    );
} 