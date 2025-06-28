import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new workflow
export const createWorkflow = mutation({
    args: {
        reportId: v.id("reports"),
        mastraWorkflowId: v.string(),
        currentStep: v.string(),
    },
    handler: async (ctx, { reportId, mastraWorkflowId, currentStep }) => {
        const now = Date.now();

        const workflowId = await ctx.db.insert("workflows", {
            reportId,
            mastraWorkflowId,
            currentStep,
            status: "pending",
            createdAt: now,
            updatedAt: now,
        });

        return workflowId;
    },
});

// Update workflow status
export const updateWorkflowStatus = mutation({
    args: {
        workflowId: v.id("workflows"),
        status: v.union(
            v.literal("pending"),
            v.literal("running"),
            v.literal("suspended"),
            v.literal("completed"),
            v.literal("failed")
        ),
        currentStep: v.optional(v.string()),
        suspendedData: v.optional(v.any()),
        errorMessage: v.optional(v.string()),
    },
    handler: async (ctx, { workflowId, status, currentStep, suspendedData, errorMessage }) => {
        const updateData: any = {
            status,
            updatedAt: Date.now(),
        };

        if (currentStep !== undefined) updateData.currentStep = currentStep;
        if (suspendedData !== undefined) updateData.suspendedData = suspendedData;
        if (errorMessage !== undefined) updateData.errorMessage = errorMessage;

        await ctx.db.patch(workflowId, updateData);
        return workflowId;
    },
});

// Get workflow by Mastra ID
export const getWorkflowByMastraId = query({
    args: { mastraWorkflowId: v.string() },
    handler: async (ctx, { mastraWorkflowId }) => {
        return await ctx.db
            .query("workflows")
            .withIndex("by_mastra_id", (q) => q.eq("mastraWorkflowId", mastraWorkflowId))
            .first();
    },
});

// Get workflow by report ID
export const getWorkflowByReportId = query({
    args: { reportId: v.id("reports") },
    handler: async (ctx, { reportId }) => {
        return await ctx.db
            .query("workflows")
            .withIndex("by_report", (q) => q.eq("reportId", reportId))
            .first();
    },
});

// Get active workflows
export const getActiveWorkflows = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("workflows")
            .withIndex("by_status", (q) => q.eq("status", "running"))
            .collect();
    },
});

// Get suspended workflows
export const getSuspendedWorkflows = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("workflows")
            .withIndex("by_status", (q) => q.eq("status", "suspended"))
            .collect();
    },
});

// Handle workflow suspension (when user approval is needed)
export const suspendWorkflow = mutation({
    args: {
        mastraWorkflowId: v.string(),
        suspendedData: v.any(),
        currentStep: v.string(),
    },
    handler: async (ctx, { mastraWorkflowId, suspendedData, currentStep }) => {
        const workflow = await ctx.db
            .query("workflows")
            .withIndex("by_mastra_id", (q) => q.eq("mastraWorkflowId", mastraWorkflowId))
            .first();

        if (!workflow) {
            throw new Error("Workflow not found");
        }

        await ctx.db.patch(workflow._id, {
            status: "suspended",
            currentStep,
            suspendedData,
            updatedAt: Date.now(),
        });

        return workflow._id;
    },
});

// Resume workflow
export const resumeWorkflow = mutation({
    args: {
        workflowId: v.id("workflows"),
        resumeData: v.any(),
    },
    handler: async (ctx, { workflowId, resumeData }) => {
        const workflow = await ctx.db.get(workflowId);
        if (!workflow) {
            throw new Error("Workflow not found");
        }

        await ctx.db.patch(workflowId, {
            status: "running",
            updatedAt: Date.now(),
        });

        return { workflow, resumeData };
    },
});

// Clean up completed workflows (optional utility)
export const cleanupCompletedWorkflows = mutation({
    args: { olderThanDays: v.number() },
    handler: async (ctx, { olderThanDays }) => {
        const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

        const completedWorkflows = await ctx.db
            .query("workflows")
            .withIndex("by_status", (q) => q.eq("status", "completed"))
            .filter((q) => q.lt(q.field("updatedAt"), cutoffTime))
            .collect();

        let deletedCount = 0;
        for (const workflow of completedWorkflows) {
            await ctx.db.delete(workflow._id);
            deletedCount++;
        }

        return { deletedCount };
    },
}); 