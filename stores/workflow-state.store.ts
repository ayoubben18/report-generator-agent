import { WorkflowState } from "@/types/workflow.types";
import { create } from "zustand";

type WorkflowStateStore = {
    workflowState: WorkflowState
    setWorkflowState: (newWorkflowState: WorkflowState) => void
}


const useWorkflowStateStore = create<WorkflowStateStore>((set) => ({
    workflowState: {
        status: "idle",
    },
    setWorkflowState: (newWorkflowState: WorkflowState) => set({ workflowState: newWorkflowState }),
}))

export default useWorkflowStateStore
