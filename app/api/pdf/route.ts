import { PdfGenerationService } from '../../../lib/pdf-generator';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Define the input schema for the request body, matching the service's input
const reportDataSchema = z.object({
    fullReport: z.string(),
    reportMetadata: z.object({
        title: z.string(),
        generatedAt: z.number(),
        chaptersCount: z.number(),
        sectionsCount: z.number(),
    }),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = reportDataSchema.safeParse(body);

        if (!validation.success) {
            console.error("Validation failed:", validation.error.errors);
            return NextResponse.json(validation.error.errors, { status: 400 });
        }

        const { fullReport, reportMetadata } = validation.data;

        const pdfService = new PdfGenerationService();
        const pdfBuffer = await pdfService.generatePdf({
            fullReport,
            reportMetadata,
        });

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="report.pdf"',
            },
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        const errorMessage =
            error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json(
            { error: 'Failed to generate PDF', details: errorMessage },
            { status: 500 }
        );
    }
} 