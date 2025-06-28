"use client";

import { useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
    EditIcon,
    PlusIcon,
    TrashIcon,
    CheckIcon,
    XIcon,
    GripVerticalIcon,
} from "lucide-react";
import { Plan, Section } from "@/types/workflow.types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WorkflowApprovalProps {
    runId: string;
    generatedPlan: Plan;
    message: string;
    onApprove: (data: {
        approved: boolean;
        feedback?: string;
        modifiedPlan?: Plan;
    }) => void;
    loading?: boolean;
}

export default function WorkflowApproval({
    runId,
    generatedPlan,
    message,
    onApprove,
    loading = false,
}: WorkflowApprovalProps) {
    const [feedback, setFeedback] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);

    // Add IDs to sections if they don't exist
    const addIdsToSections = (plan: Plan): Plan => {
        return {
            ...plan,
            chapters: plan.chapters.map((chapter) => ({
                ...chapter,
                sections: chapter.sections.map((section, index) => ({
                    ...section,
                    id:
                        (section as any).id ||
                        `section-${Date.now()}-${index}-${Math.random()
                            .toString(36)
                            .substr(2, 9)}`,
                })),
            })),
        };
    };

    const [editedPlan, setEditedPlan] = useState<Plan>(
        addIdsToSections(generatedPlan)
    );

    const handleApprove = () => {
        onApprove({
            approved: true,
            feedback: feedback || undefined,
            modifiedPlan: isEditing ? editedPlan : generatedPlan,
        });
    };

    const handleReject = () => {
        onApprove({
            approved: false,
            feedback: feedback || "User rejected the plan",
        });
    };

    const updateChapterTitle = (chapterIndex: number, newTitle: string) => {
        const updated = { ...editedPlan };
        updated.chapters[chapterIndex].title = newTitle;
        setEditedPlan(updated);
    };

    const updateChapterDescription = (
        chapterIndex: number,
        newDescription: string
    ) => {
        const updated = { ...editedPlan };
        updated.chapters[chapterIndex].description = newDescription;
        setEditedPlan(updated);
    };

    const addSection = (chapterIndex: number) => {
        const updated = { ...editedPlan };
        updated.chapters[chapterIndex].sections.push({
            id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: "New Section",
            description: "Section description",
        });
        setEditedPlan(updated);
    };

    const updateSectionTitle = (
        chapterIndex: number,
        sectionId: string,
        newTitle: string
    ) => {
        const updated = { ...editedPlan };
        const sectionIndex = updated.chapters[chapterIndex].sections.findIndex(
            (s) => s.id === sectionId
        );
        if (sectionIndex !== -1) {
            updated.chapters[chapterIndex].sections[sectionIndex].title = newTitle;
            setEditedPlan(updated);
        }
    };

    const updateSectionDescription = (
        chapterIndex: number,
        sectionId: string,
        newDescription: string
    ) => {
        const updated = { ...editedPlan };
        const sectionIndex = updated.chapters[chapterIndex].sections.findIndex(
            (s) => s.id === sectionId
        );
        if (sectionIndex !== -1) {
            updated.chapters[chapterIndex].sections[sectionIndex].description =
                newDescription;
            setEditedPlan(updated);
        }
    };

    const removeSection = (chapterIndex: number, sectionId: string) => {
        const updated = { ...editedPlan };
        const sectionIndex = updated.chapters[chapterIndex].sections.findIndex(
            (s) => s.id === sectionId
        );
        if (sectionIndex !== -1) {
            updated.chapters[chapterIndex].sections.splice(sectionIndex, 1);
            setEditedPlan(updated);
        }
    };

    const reorderSections = (
        chapterIndex: number,
        newSectionOrder: Section[]
    ) => {
        const updated = { ...editedPlan };
        updated.chapters[chapterIndex].sections = newSectionOrder;
        setEditedPlan(updated);
    };

    return (
        <div className="w-full text-white ">
            {/* Edit Toggle */}
            <div className="flex items-center justify-between p-6">
                <div>
                    <h3 className="text-lg font-medium text-white/90 mb-1">Edit Plan</h3>
                    <p className="text-sm text-white/60">Make changes to the generated plan if needed</p>
                </div>
                <motion.button
                    onClick={() => setIsEditing(!isEditing)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-4 py-2 rounded-xl transition-all border flex items-center gap-2 ${isEditing
                        ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
                        : "bg-white/[0.05] border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.1]"
                        }`}
                >
                    <EditIcon className="w-4 h-4" />
                    {isEditing ? "Done Editing" : "Edit Plan"}
                </motion.button>
            </div>
            {isEditing && <ScrollArea className="max-h-[calc(100vh-12.5rem)] p-4 flex flex-col gap-6">

                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                >
                    <label className="block text-sm font-medium text-white/70">
                        Report Title:
                    </label>
                    <input
                        type="text"
                        value={editedPlan.title}
                        onChange={(e) =>
                            setEditedPlan({ ...editedPlan, title: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white/90 placeholder:text-white/30 focus:outline-none focus:border-violet-400/50 transition-colors"
                        placeholder="Report Title"
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                >
                    <h4 className="text-lg font-medium text-white/90">Edit Chapters</h4>
                    <div className="space-y-6">
                        {editedPlan.chapters.map((chapter, chapterIndex) => (
                            <div
                                key={chapterIndex}
                                className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-6 space-y-4"
                            >
                                {/* Chapter Title */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-white/70">
                                        Chapter {chapterIndex + 1} Title:
                                    </label>
                                    <input
                                        type="text"
                                        value={chapter.title}
                                        onChange={(e) =>
                                            updateChapterTitle(chapterIndex, e.target.value)
                                        }
                                        className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white/90 placeholder:text-white/30 focus:outline-none focus:border-violet-400/50 transition-colors"
                                        placeholder="Chapter title"
                                    />
                                </div>

                                {/* Chapter Description */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-white/70">
                                        Description:
                                    </label>
                                    <textarea
                                        value={chapter.description}
                                        onChange={(e) =>
                                            updateChapterDescription(chapterIndex, e.target.value)
                                        }
                                        rows={3}
                                        className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white/90 placeholder:text-white/30 focus:outline-none focus:border-violet-400/50 transition-colors resize-none"
                                        placeholder="Chapter description"
                                    />
                                </div>

                                {/* Sections */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-medium text-white/70">
                                            Sections:
                                        </label>
                                        <motion.button
                                            onClick={() => addSection(chapterIndex)}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-lg transition-colors border border-violet-500/20"
                                        >
                                            <PlusIcon className="w-3 h-3" />
                                            Add Section
                                        </motion.button>
                                    </div>

                                    <Reorder.Group
                                        axis="y"
                                        values={chapter.sections}
                                        onReorder={(newOrder) =>
                                            reorderSections(chapterIndex, newOrder)
                                        }
                                        className="space-y-3"
                                    >
                                        {chapter.sections.map((section) => (
                                            <Reorder.Item
                                                key={section.id}
                                                value={section}
                                                className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-4 space-y-3"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-shrink-0 mt-2 p-1 text-white/30 hover:text-white/60 transition-colors cursor-grab active:cursor-grabbing">
                                                        <GripVerticalIcon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 space-y-3">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="text"
                                                                value={section.title}
                                                                onChange={(e) =>
                                                                    updateSectionTitle(
                                                                        chapterIndex,
                                                                        section.id,
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="flex-1 px-3 py-2 text-sm bg-white/[0.05] border border-white/[0.1] rounded-lg text-white/90 placeholder:text-white/30 focus:outline-none focus:border-violet-400/50 transition-colors"
                                                                placeholder="Section title"
                                                            />
                                                            <motion.button
                                                                onClick={() =>
                                                                    removeSection(chapterIndex, section.id)
                                                                }
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors border border-red-500/20"
                                                            >
                                                                <TrashIcon className="w-3 h-3" />
                                                            </motion.button>
                                                        </div>
                                                        <textarea
                                                            value={section.description}
                                                            onChange={(e) =>
                                                                updateSectionDescription(
                                                                    chapterIndex,
                                                                    section.id,
                                                                    e.target.value
                                                                )
                                                            }
                                                            rows={2}
                                                            className="w-full px-3 py-2 text-sm bg-white/[0.05] border border-white/[0.1] rounded-lg text-white/90 placeholder:text-white/30 focus:outline-none focus:border-violet-400/50 transition-colors resize-none"
                                                            placeholder="Section description"
                                                        />
                                                    </div>
                                                </div>
                                            </Reorder.Item>
                                        ))}
                                    </Reorder.Group>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </ScrollArea>}

            {!isEditing &&
                <div className="flex flex-col gap-4 p-6">
                    {/* Feedback */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-white/70">
                            Additional Feedback (optional):
                        </label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Any additional comments or feedback..."
                            rows={4}
                            className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white/90 placeholder:text-white/30 focus:outline-none focus:border-violet-400/50 transition-colors resize-none"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4">
                        <motion.button
                            onClick={handleApprove}
                            disabled={loading}
                            whileHover={{ scale: loading ? 1 : 1.02 }}
                            whileTap={{ scale: loading ? 1 : 0.98 }}
                            className="flex-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 disabled:opacity-50 text-green-300 font-medium py-3 px-6 rounded-xl transition-all duration-200 border border-green-500/20 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <motion.div
                                    className="w-4 h-4 border-2 border-green-300/30 border-t-green-300 rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                            ) : (
                                <CheckIcon className="w-4 h-4" />
                            )}
                            {loading ? "Processing..." : "Approve & Continue"}
                        </motion.button>
                        <motion.button
                            onClick={handleReject}
                            disabled={loading}
                            whileHover={{ scale: loading ? 1 : 1.02 }}
                            whileTap={{ scale: loading ? 1 : 0.98 }}
                            className="flex-1 bg-gradient-to-r from-red-500/20 to-rose-500/20 hover:from-red-500/30 hover:to-rose-500/30 disabled:opacity-50 text-red-300 font-medium py-3 px-6 rounded-xl transition-all duration-200 border border-red-500/20 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <motion.div
                                    className="w-4 h-4 border-2 border-red-300/30 border-t-red-300 rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                            ) : (
                                <XIcon className="w-4 h-4" />
                            )}
                            {loading ? "Processing..." : "Reject"}
                        </motion.button>
                    </div>

                    {/* Footer */}
                    <div className="text-xs text-white/30 text-center pt-4 border-t border-white/[0.05]">
                        Workflow Run ID: {runId}
                    </div>
                </div>}
        </div>
    );
} 