// lib/pdfGeneratorService.ts
import { LaTeXService } from './latex-generator';
import latex from 'node-latex';
import { z } from 'zod';
import { Readable } from 'stream';

// Define the input schema for report data
const reportDataSchema = z.object({
    fullReport: z.string(), // This is the Markdown content
    reportMetadata: z.object({
        title: z.string(),
        generatedAt: z.number(),
        chaptersCount: z.number(),
        sectionsCount: z.number(),
    }),
});

export class PdfGenerationService {
    public async generatePdf(
        input: z.infer<typeof reportDataSchema>
    ): Promise<Buffer> {
        try {
            const { fullReport, reportMetadata } = input;

            // 1. Convert the markdown report to LaTeX using your existing service
            console.log("Step 1: Converting markdown to LaTeX...");
            const latexService = new LaTeXService({
                documentClass:
                    reportMetadata.chaptersCount > 5 ? 'report' : 'article',
                title: reportMetadata.title,
                author: "AI Report Generator",
                date: new Date(reportMetadata.generatedAt).toLocaleDateString(),
                includeTableOfContents: reportMetadata.chaptersCount > 2,
            });

            const latexContent = latexService.convertToLaTeX(fullReport);
            console.log("LaTeX content created.");

            // 2. Compile the LaTeX content into a PDF buffer
            console.log("Step 2: Compiling LaTeX to PDF...");
            const pdfStream = latex(latexContent);

            const pdfBuffer = await this.streamToBuffer(pdfStream);
            console.log("PDF compiled successfully.");

            return pdfBuffer;
        } catch (error) {
            console.error("Error during PDF generation service:", error);
            throw new Error(
                `Failed to generate PDF: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`
            );
        }
    }

    private streamToBuffer(stream: Readable): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Uint8Array[] = [];
            stream.on('data', (chunk) => {
                chunks.push(chunk);
            });
            stream.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
            stream.on('error', (error) => {
                reject(error);
            });
        });
    }
}