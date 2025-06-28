import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    reports: defineTable({
        title: v.string(),
        userPrompt: v.string(),
        status: v.union(
            v.literal("draft"),
            v.literal("plan_generated"),
            v.literal("plan_approved"),
            v.literal("generating"),
            v.literal("completed"),
            v.literal("failed")
        ),
        currentStep: v.optional(v.string()), // Track current workflow step in real-time
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_status", ["status"])
        .index("by_created_at", ["createdAt"]),

    workflows: defineTable({
        reportId: v.id("reports"),
        mastraWorkflowId: v.string(), // The Mastra workflow run ID
        currentStep: v.string(), // Current step in the workflow
        status: v.union(
            v.literal("pending"),
            v.literal("running"),
            v.literal("suspended"),
            v.literal("completed"),
            v.literal("failed")
        ),
        suspendedData: v.optional(v.any()), // Data from suspended step
        errorMessage: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_report", ["reportId"])
        .index("by_mastra_id", ["mastraWorkflowId"])
        .index("by_status", ["status"]),

    attachments: defineTable({
        fileId: v.optional(v.id("_storage")),
        fileName: v.string(),
        fileSize: v.number(),
        mimeType: v.string(),
        type: v.union(
            v.literal("image"),
            v.literal("pdf"),
            v.literal("docx"),
            v.literal("txt"),
            v.literal("csv"),
            v.literal("xlsx"),
            v.literal("pptx")
        ),
        extension: v.string(),
        reportId: v.id("reports"),
        uploadedAt: v.number(),
    })
        .index("by_report", ["reportId"])
        .index("by_type", ["type"]),
});