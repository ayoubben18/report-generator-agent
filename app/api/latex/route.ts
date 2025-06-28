import { NextRequest, NextResponse } from 'next/server';
import { LaTeXService } from '@/lib/latex-generator';

export async function POST(req: NextRequest) {
  try {
    const { markdown, metadata } = await req.json();
    const latexService = new LaTeXService({
      title: metadata?.title,
      author: metadata?.author || '',
      date: metadata?.generatedAt ? new Date(metadata.generatedAt).toLocaleDateString() : undefined,
      includeTableOfContents: true,
    });
    const latex = latexService.convertToLaTeX(markdown);
    return NextResponse.json({ latex });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
} 