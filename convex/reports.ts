import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new report
export const createReport = mutation({
    args: {
        title: v.string(),
        userPrompt: v.string(),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        const reportId = await ctx.db.insert("reports", {
            title: args.title,
            userPrompt: args.userPrompt,
            status: "draft",
            currentStep: "initializing",
            createdAt: now,
            updatedAt: now,
        });

        return reportId;
    },
});

// Update report status
export const updateReportStatus = mutation({
    args: {
        reportId: v.id("reports"),
        status: v.union(
            v.literal("draft"),
            v.literal("plan_generated"),
            v.literal("plan_approved"),
            v.literal("generating"),
            v.literal("completed"),
            v.literal("failed")
        ),
    },
    handler: async (ctx, { reportId, status }) => {
        await ctx.db.patch(reportId, {
            status,
            updatedAt: Date.now(),
        });
    },
});

// Update report info and current step
export const updateReportInfo = mutation({
    args: {
        reportId: v.id("reports"),
        title: v.optional(v.string()),
        currentStep: v.optional(v.string()),
        status: v.optional(v.union(
            v.literal("draft"),
            v.literal("plan_generated"),
            v.literal("plan_approved"),
            v.literal("generating"),
            v.literal("completed"),
            v.literal("failed")
        )),
    },
    handler: async (ctx, { reportId, title, currentStep, status }) => {
        const updateData: any = {
            updatedAt: Date.now(),
        };

        if (title !== undefined) updateData.title = title;
        if (currentStep !== undefined) updateData.currentStep = currentStep;
        if (status !== undefined) updateData.status = status;

        await ctx.db.patch(reportId, updateData);
    },
});

// Update just the current step (for real-time tracking)
export const updateCurrentStep = mutation({
    args: {
        reportId: v.id("reports"),
        currentStep: v.string(),
    },
    handler: async (ctx, { reportId, currentStep }) => {
        await ctx.db.patch(reportId, {
            currentStep,
            updatedAt: Date.now(),
        });
    },
});

// Get report by ID
export const getReport = query({
    args: { reportId: v.id("reports") },
    handler: async (ctx, { reportId }) => {
        const report = await ctx.db.get(reportId);
        if (!report) return null;

        // Get attachments
        const attachments = await ctx.db
            .query("attachments")
            .withIndex("by_report", (q) => q.eq("reportId", reportId))
            .collect();

        // Get workflow info
        const workflow = await ctx.db
            .query("workflows")
            .withIndex("by_report", (q) => q.eq("reportId", reportId))
            .first();

        return {
            ...report,
            attachments,
            workflow,
        };
    },
});

// Get all reports
export const getAllReports = query({
    args: {},
    handler: async (ctx) => {
        const reports = await ctx.db
            .query("reports")
            .withIndex("by_created_at")
            .order("desc")
            .take(10)

        return reports;
    },
});

// Get reports by status
export const getReportsByStatus = query({
    args: {
        status: v.union(
            v.literal("draft"),
            v.literal("plan_generated"),
            v.literal("plan_approved"),
            v.literal("generating"),
            v.literal("completed"),
            v.literal("failed")
        ),
    },
    handler: async (ctx, { status }) => {
        return await ctx.db
            .query("reports")
            .withIndex("by_status", (q) => q.eq("status", status))
            .order("desc")
            .take(10)
    },
});

// Update report with full content (when completed)
export const updateReportContent = mutation({
    args: {
        reportId: v.id("reports"),
        fullReport: v.string(),
        reportMetadata: v.object({
            title: v.string(),
            chaptersCount: v.number(),
            sectionsCount: v.number(),
            generatedAt: v.number(),
        }),
    },
    handler: async (ctx, { reportId, fullReport, reportMetadata }) => {
        await ctx.db.patch(reportId, {
            fullReport,
            reportMetadata,
            status: "completed",
            updatedAt: Date.now(),
        });
    },
});

