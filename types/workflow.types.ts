
interface Section {
    id: string;
    title: string;
    description: string;
}

interface Chapter {
    title: string;
    description: string;
    sections: Section[];
}

interface Plan {
    title: string;
    chapters: Chapter[];
}

interface ReportMetadata {
    title: string;
    chaptersCount: number;
    sectionsCount: number;
    generatedAt: number;
}


interface WorkflowState {
    status:
    | "idle"
    | "starting"
    | "suspended"
    | "resuming"
    | "generating"
    | "completed"
    | "failed";
    runId?: string;
    generatedPlan?: Plan;
    message?: string;
    stepId?: string;
    result?: {
        fullReport: string;
        reportMetadata: ReportMetadata;
        approvedPlan: Plan;
        userFeedback?: string;
    };
    error?: string;
}



export type { WorkflowState, ReportMetadata, Plan, Chapter, Section };