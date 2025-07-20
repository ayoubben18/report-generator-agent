import { z } from "zod";

// Enum for all supported Mermaid diagram types
export const diagramTypeEnum = z.enum([
    "flowchart",
    "sequence",
    "class",
    "state",
    "entity-relationship",
    "gantt",
    "pie",
    "git",
    "user-journey",
    "c4-context",
    "c4-container",
    "c4-component",
    "c4-dynamic",
    "mindmap",
    "timeline",
    "quadrant",
    "requirement",
    "sankey",
    "xy-chart",
    "block",
    "zenuml"
]);

// Schema for diagram specification
export const diagramSpecSchema = z.object({
    // Whether a diagram is needed for this section/chapter
    needsDiagram: z.boolean(),
    
    // If needsDiagram is true, these fields are populated
    diagramType: diagramTypeEnum.optional(),
    
    // Reasoning about why this diagram is needed and what it should show
    reasoning: z.string().optional().describe("Explanation of why this diagram is beneficial and what it should communicate"),
    
    // Detailed specification for the diagram content
    scratchpad: z.string().optional().describe("Detailed specification of what the diagram should contain, including nodes, relationships, data points, etc."),
    
    // Title for the diagram
    title: z.string().optional().describe("Title to display above the diagram"),
    
    // Caption for the diagram
    caption: z.string().optional().describe("Caption to display below the diagram explaining its purpose")
});

// Schema for generated Mermaid diagram
export const mermaidDiagramSchema = z.object({
    // The actual Mermaid syntax code
    mermaidCode: z.string(),
    
    // The diagram type (for validation)
    type: diagramTypeEnum,
    
    // Title and caption
    title: z.string(),
    caption: z.string().optional(),
    
    // Optional theme settings
    theme: z.enum(["default", "dark", "forest", "neutral"]).default("default"),
    
    // Whether to use hand-drawn look
    handDrawn: z.boolean().default(false)
});

// Schema for chapter content with diagrams
export const chapterWithDiagramsSchema = z.object({
    // Original chapter content
    content: z.string(),
    
    // Array of diagrams to include in the chapter
    diagrams: z.array(z.object({
        // Position in the chapter (after which section)
        afterSection: z.string().optional().describe("Section title after which to insert the diagram"),
        
        // The diagram specification
        diagram: mermaidDiagramSchema,
        
        // Markdown representation (for embedding)
        markdownBlock: z.string().describe("The complete markdown block including mermaid code fence")
    })).default([])
});

// Schema for diagram generation request
export const diagramGenerationRequestSchema = z.object({
    // Context from the chapter/section
    context: z.string(),
    
    // The diagram specification
    specification: diagramSpecSchema,
    
    // Any additional context from previous chapters
    previousChaptersContext: z.string().optional(),
    
    // Report theme/style guidelines
    styleGuidelines: z.string().optional()
});

// Schema for section analysis (to determine if diagrams are needed)
export const sectionAnalysisSchema = z.object({
    sectionTitle: z.string(),
    sectionContent: z.string(),
    
    // Analysis results
    diagramSpecs: z.array(diagramSpecSchema).describe("Potential diagrams for this section"),
    
    // Reasoning for the analysis
    analysisReasoning: z.string().describe("Explanation of the analysis and why certain diagrams were suggested")
});

// Helper function to create markdown block from Mermaid diagram
export function createMermaidMarkdownBlock(diagram: z.infer<typeof mermaidDiagramSchema>): string {
    const themeConfig = diagram.handDrawn 
        ? `%%{init: {'theme':'${diagram.theme}', 'look': 'handDrawn'}}%%\n`
        : `%%{init: {'theme':'${diagram.theme}'}}%%\n`;
    
    let markdown = '';
    
    // Add title if present
    if (diagram.title) {
        markdown += `### ${diagram.title}\n\n`;
    }
    
    // Add mermaid code block
    markdown += '```mermaid\n';
    markdown += themeConfig;
    markdown += diagram.mermaidCode;
    markdown += '\n```\n';
    
    // Add caption if present
    if (diagram.caption) {
        markdown += `\n*${diagram.caption}*\n`;
    }
    
    return markdown;
}

// Type exports for use in other files
export type DiagramType = z.infer<typeof diagramTypeEnum>;
export type DiagramSpec = z.infer<typeof diagramSpecSchema>;
export type MermaidDiagram = z.infer<typeof mermaidDiagramSchema>;
export type ChapterWithDiagrams = z.infer<typeof chapterWithDiagramsSchema>;
export type DiagramGenerationRequest = z.infer<typeof diagramGenerationRequestSchema>;
export type SectionAnalysis = z.infer<typeof sectionAnalysisSchema>;