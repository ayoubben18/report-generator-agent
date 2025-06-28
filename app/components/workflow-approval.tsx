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
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(
    null
  );

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] shadow-2xl p-8 text-white"
    >
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-2xl font-semibold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/60">
          Report Plan Review
        </h2>
        <p className="text-white/60 leading-relaxed">{message}</p>
      </motion.div>

      {/* Plan Title and Edit Toggle */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editedPlan.title}
                onChange={(e) =>
                  setEditedPlan({ ...editedPlan, title: e.target.value })
                }
                className="text-xl font-medium bg-transparent border-b border-white/20 focus:outline-none focus:border-violet-400 text-white/90 pb-2 transition-colors w-full"
                placeholder="Report Title"
              />
            ) : (
              <h3 className="text-xl font-medium text-white/90">
                {editedPlan.title}
              </h3>
            )}
          </div>
          <motion.button
            onClick={() => setIsEditing(!isEditing)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white rounded-xl transition-all border border-white/[0.05] ml-4"
          >
            <EditIcon className="w-4 h-4" />
            {isEditing ? "Preview" : "Edit"}
          </motion.button>
        </div>

        {/* Chapters */}
        <div className="space-y-6">
          {editedPlan.chapters.map((chapter, chapterIndex) => (
            <motion.div
              key={chapterIndex}
              className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.05] rounded-xl p-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + chapterIndex * 0.1 }}
            >
              {/* Chapter Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-white/50 mb-2">
                  Chapter {chapterIndex + 1} Title:
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={chapter.title}
                    onChange={(e) =>
                      updateChapterTitle(chapterIndex, e.target.value)
                    }
                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white/90 placeholder:text-white/30 focus:outline-none focus:border-violet-400/50 transition-colors"
                    placeholder="Chapter title"
                  />
                ) : (
                  <h4 className="text-lg font-medium text-white/90">
                    {chapter.title}
                  </h4>
                )}
              </div>

              {/* Chapter Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-white/50 mb-2">
                  Description:
                </label>
                {isEditing ? (
                  <textarea
                    value={chapter.description}
                    onChange={(e) =>
                      updateChapterDescription(chapterIndex, e.target.value)
                    }
                    rows={3}
                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white/90 placeholder:text-white/30 focus:outline-none focus:border-violet-400/50 transition-colors resize-none"
                    placeholder="Chapter description"
                  />
                ) : (
                  <p className="text-white/70 leading-relaxed">
                    {chapter.description}
                  </p>
                )}
              </div>

              {/* Sections */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-white/50">
                    Sections{" "}
                    {isEditing && (
                      <span className="text-xs text-white/30">
                        (drag to reorder)
                      </span>
                    )}
                    :
                  </label>
                  {isEditing && (
                    <motion.button
                      onClick={() => addSection(chapterIndex)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-lg transition-colors border border-violet-500/20"
                    >
                      <PlusIcon className="w-3 h-3" />
                      Add Section
                    </motion.button>
                  )}
                </div>

                {isEditing ? (
                  <div className="ml-4">
                    <Reorder.Group
                      axis="y"
                      values={chapter.sections}
                      onReorder={(newOrder) =>
                        reorderSections(chapterIndex, newOrder)
                      }
                      className="space-y-3"
                      layoutScroll
                      style={{ overflow: "visible" }}
                    >
                      {chapter.sections.map((section, sectionIndex) => (
                        <Reorder.Item
                          key={section.id}
                          value={section}
                          className="cursor-grab active:cursor-grabbing"
                          layout
                          animate={
                            draggingSectionId === section.id
                              ? {
                                scale: 1.05,
                                zIndex: 50,
                                boxShadow:
                                  "0 10px 30px rgba(139, 92, 246, 0.3)",
                                backgroundColor: "rgba(255, 255, 255, 0.08)",
                                rotate: 2,
                              }
                              : {
                                scale: 1,
                                zIndex: 1,
                                boxShadow: "0 0 0 rgba(139, 92, 246, 0)",
                                backgroundColor: "rgba(255, 255, 255, 0.02)",
                                rotate: 0,
                              }
                          }
                          whileHover={
                            draggingSectionId !== section.id
                              ? { scale: 1.02 }
                              : {}
                          }
                          transition={{ duration: 0.15 }}
                          dragTransition={{
                            bounceStiffness: 600,
                            bounceDamping: 20,
                          }}
                          onDragStart={() => {
                            setDraggingSectionId(section.id);
                          }}
                          onDragEnd={() => {
                            setDraggingSectionId(null);
                          }}
                          style={{
                            marginBottom: "12px",
                            listStyle: "none",
                          }}
                        >
                          <div className="border-l-2 border-white/[0.1] pl-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-r-lg py-3 transition-colors group">
                            <div className="flex items-start gap-3">
                              {/* Drag Handle */}
                              <motion.div
                                className="flex-shrink-0 mt-2 p-1 text-white/30 hover:text-white/60 transition-colors cursor-grab active:cursor-grabbing"
                                whileHover={{ scale: 1.1 }}
                              >
                                <GripVerticalIcon className="w-4 h-4" />
                              </motion.div>

                              {/* Section Content */}
                              <div className="flex-1 space-y-3  pr-4">
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
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  </div>
                ) : (
                  <div className="space-y-3 ml-4">
                    {chapter.sections.map((section, sectionIndex) => (
                      <motion.div
                        key={sectionIndex}
                        className="border-l-2 border-white/[0.1] pl-4 bg-white/[0.02] rounded-r-lg py-3"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + sectionIndex * 0.05 }}
                      >
                        <div>
                          <h5 className="font-medium text-white/90 mb-1">
                            {section.title}
                          </h5>
                          <p className="text-sm text-white/60 leading-relaxed">
                            {section.description}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Feedback */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <label className="block text-sm font-medium text-white/50 mb-3">
          Additional Feedback (optional):
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Any additional comments or feedback..."
          rows={4}
          className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white/90 placeholder:text-white/30 focus:outline-none focus:border-violet-400/50 transition-colors resize-none"
        />
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        className="flex gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
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
      </motion.div>

      {/* Footer */}
      <motion.div
        className="mt-6 text-xs text-white/30 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        Workflow Run ID: {runId}
      </motion.div>
    </motion.div>
  );
}
