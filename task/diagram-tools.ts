import { z } from "zod";
import { 
    diagramSpecSchema, 
    mermaidDiagramSchema, 
    diagramTypeEnum,
    createMermaidMarkdownBlock,
    type DiagramSpec,
    type MermaidDiagram
} from "./diagram-schemas";

// Tool for analyzing content and determining if diagrams would be helpful
export const analyzeDiagramNeedsSchema = z.object({
    content: z.string().describe("The chapter or section content to analyze"),
    context: z.string().describe("Additional context about the report and its purpose"),
});

export const analyzeDiagramNeedsTool = {
    name: "analyzeDiagramNeeds",
    description: "Analyze content to determine if diagrams would enhance understanding",
    parameters: analyzeDiagramNeedsSchema,
    execute: async (params: z.infer<typeof analyzeDiagramNeedsSchema>) => {
        // This is a placeholder - in real implementation, this would use the LLM
        // to analyze the content and suggest appropriate diagrams
        return {
            suggestions: [] as DiagramSpec[]
        };
    }
};

// Tool for generating Mermaid diagram code
export const generateMermaidDiagramSchema = z.object({
    diagramType: diagramTypeEnum,
    specification: z.string().describe("Detailed specification of what the diagram should show"),
    context: z.string().describe("Context from the chapter/section where this will be used"),
    title: z.string(),
    theme: z.enum(["default", "dark", "forest", "neutral"]).default("default"),
    handDrawn: z.boolean().default(false),
});

export const generateMermaidDiagramTool = {
    name: "generateMermaidDiagram",
    description: "Generate Mermaid diagram code based on specifications",
    parameters: generateMermaidDiagramSchema,
    execute: async (params: z.infer<typeof generateMermaidDiagramSchema>) => {
        // This is a placeholder - in real implementation, this would use the LLM
        // to generate the actual Mermaid code
        return {
            mermaidCode: "",
            type: params.diagramType,
            title: params.title,
            theme: params.theme,
            handDrawn: params.handDrawn
        } as MermaidDiagram;
    }
};

// Helper function to generate diagram type examples
export function getDiagramTypeExamples(type: z.infer<typeof diagramTypeEnum>): string {
    const examples: Record<string, string> = {
        flowchart: `flowchart TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    B -->|No| D[End]`,
        
        sequence: `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>John: Hello John, how are you?
    John-->>Alice: Great!`,
        
        class: `classDiagram
    Class01 <|-- AveryLongClass : Cool
    Class03 *-- Class04
    Class05 o-- Class06`,
        
        state: `stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still`,
        
        "entity-relationship": `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses`,
        
        gantt: `gantt
    title A Gantt Diagram
    dateFormat YYYY-MM-DD
    section Section
    A task           :a1, 2014-01-01, 30d
    Another task     :after a1, 20d`,
        
        pie: `pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`,
        
        git: `gitGraph
    commit
    branch develop
    checkout develop
    commit
    checkout main
    merge develop`,
        
        "user-journey": `journey
    title My working day
    section Go to work
      Make tea: 5: Me
      Go upstairs: 3: Me
      Do work: 1: Me, Cat`,
        
        "c4-context": `C4Context
    title System Context diagram for Internet Banking System
    Person(customerA, "Banking Customer", "A customer of the bank")
    System(SystemAA, "Internet Banking System", "Allows customers to manage accounts")`,
        
        mindmap: `mindmap
  root((mindmap))
    Origins
      Long history
      ::icon(fa fa-book)
      Popularisation
        British popular psychology author Tony Buzan
    Research
      On effectiveness<br/>and features
      On Automatic creation`,
        
        timeline: `timeline
    title History of Social Media Platform
    2002 : LinkedIn
    2004 : Facebook
    2005 : Youtube
    2006 : Twitter`,
        
        quadrant: `quadrantChart
    title Reach and engagement of campaigns
    x-axis Low Reach --> High Reach
    y-axis Low Engagement --> High Engagement
    quadrant-1 We should expand
    quadrant-2 Need to promote
    quadrant-3 Re-evaluate
    quadrant-4 May be improved`,
        
        requirement: `requirementDiagram
    requirement test_req {
        id: 1
        text: the test text.
        risk: high
        verifymethod: test
    }`,
        
        sankey: `sankey-beta
    Agricultural 'waste',Bio-conversion,124.729
    Bio-conversion,Liquid,0.597
    Bio-conversion,Losses,26.862`,
        
        "xy-chart": `xychart-beta
    title "Sales Revenue"
    x-axis [jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec]
    y-axis "Revenue (in $)" 4000 --> 11000
    bar [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]`,
        
        block: `block-beta
    columns 3
    a:3
    block:group1:2
      columns 2
      h i j k
    end
    g`,
        
        zenuml: `zenuml
    title Demo
    Alice->Bob: Hi Bob
    Bob->Alice: Hi Alice`
    };
    
    return examples[type] || "";
}

// Function to determine appropriate diagram types based on content
export function suggestDiagramTypes(content: string): Array<z.infer<typeof diagramTypeEnum>> {
    const suggestions: Array<z.infer<typeof diagramTypeEnum>> = [];
    
    // Keywords mapping to diagram types
    const keywordMap: Record<string, Array<z.infer<typeof diagramTypeEnum>>> = {
        // Process/flow keywords
        "process|workflow|steps|procedure|algorithm": ["flowchart"],
        "interaction|communication|api|protocol": ["sequence"],
        "state|status|lifecycle|transition": ["state"],
        
        // Data/structure keywords
        "class|object|inheritance|interface": ["class"],
        "database|table|relationship|entity": ["entity-relationship"],
        "architecture|system|component": ["c4-context", "c4-container", "block"],
        
        // Time/planning keywords
        "timeline|history|evolution": ["timeline"],
        "project|schedule|milestone|deadline": ["gantt"],
        
        // Analysis keywords
        "percentage|distribution|proportion": ["pie"],
        "comparison|quadrant|matrix": ["quadrant"],
        "flow|transfer|movement": ["sankey"],
        "trend|correlation|data points": ["xy-chart"],
        
        // Other keywords
        "journey|experience|user flow": ["user-journey"],
        "concept|idea|brainstorm": ["mindmap"],
        "requirement|specification": ["requirement"],
        "branch|version|git": ["git"],
    };
    
    // Check content for keywords
    for (const [keywords, types] of Object.entries(keywordMap)) {
        const regex = new RegExp(keywords, "i");
        if (regex.test(content)) {
            suggestions.push(...types);
        }
    }
    
    // Remove duplicates
    return [...new Set(suggestions)];
}

// Function to validate Mermaid syntax (basic validation)
export function validateMermaidSyntax(code: string, type: z.infer<typeof diagramTypeEnum>): boolean {
    // Basic validation - check if it starts with the correct diagram type
    const typeMap: Record<string, string[]> = {
        flowchart: ["flowchart", "graph"],
        sequence: ["sequenceDiagram"],
        class: ["classDiagram"],
        state: ["stateDiagram-v2", "stateDiagram"],
        "entity-relationship": ["erDiagram"],
        gantt: ["gantt"],
        pie: ["pie"],
        git: ["gitGraph"],
        "user-journey": ["journey"],
        "c4-context": ["C4Context"],
        "c4-container": ["C4Container"],
        "c4-component": ["C4Component"],
        "c4-dynamic": ["C4Dynamic"],
        mindmap: ["mindmap"],
        timeline: ["timeline"],
        quadrant: ["quadrantChart"],
        requirement: ["requirementDiagram"],
        sankey: ["sankey-beta"],
        "xy-chart": ["xychart-beta"],
        block: ["block-beta"],
        zenuml: ["zenuml"],
    };
    
    const validPrefixes = typeMap[type] || [];
    return validPrefixes.some(prefix => code.trim().startsWith(prefix));
}