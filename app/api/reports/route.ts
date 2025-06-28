import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const status = url.searchParams.get('status');
        const reportId = url.searchParams.get('reportId');

        // If specific report ID is requested
        if (reportId) {
            const report = await convex.query(api.reports.getReport, {
                reportId: reportId as any,
            });

            if (!report) {
                return NextResponse.json(
                    { error: 'Report not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json(report);
        }

        // If status filter is provided
        if (status) {
            const reports = await convex.query(api.reports.getReportsByStatus, {
                status: status as any,
            });
            return NextResponse.json({ reports });
        }

        // Get all reports
        const reports = await convex.query(api.reports.getAllReports);
        return NextResponse.json({ reports });

    } catch (error) {
        console.error('❌ Error fetching reports:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch reports',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, description, userPrompt } = body;

        if (!title || !userPrompt) {
            return NextResponse.json(
                { error: 'Title and user prompt are required' },
                { status: 400 }
            );
        }

        const reportId = await convex.mutation(api.reports.createReport, {
            title,
            userPrompt,
        });

        const report = await convex.query(api.reports.getReport, {
            reportId,
        });

        return NextResponse.json(report, { status: 201 });

    } catch (error) {
        console.error('❌ Error creating report:', error);
        return NextResponse.json(
            {
                error: 'Failed to create report',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { reportId, status } = body;

        if (!reportId || !status) {
            return NextResponse.json(
                { error: 'Report ID and status are required' },
                { status: 400 }
            );
        }

        await convex.mutation(api.reports.updateReportStatus, {
            reportId: reportId as any,
            status,
        });

        const report = await convex.query(api.reports.getReport, {
            reportId: reportId as any,
        });

        return NextResponse.json(report);

    } catch (error) {
        console.error('❌ Error updating report:', error);
        return NextResponse.json(
            {
                error: 'Failed to update report',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 