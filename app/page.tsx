"use client";
import { useState } from "react";
import WorkflowApproval from "./components/WorkflowApproval";
import ReportDisplay from "./components/ReportDisplay";

interface Plan {
  title: string;
  chapters: {
    title: string;
    description: string;
    sections: {
      title: string;
      description: string;
    }[];
  }[];
}

interface ReportMetadata {
  title: string;
  chaptersCount: number;
  sectionsCount: number;
  generatedAt: string;
}

interface WorkflowState {
  status: 'idle' | 'starting' | 'suspended' | 'resuming' | 'generating' | 'completed' | 'failed';
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

export default function Home() {
  const [userContext, setUserContext] = useState("");
  const [workflowState, setWorkflowState] = useState<WorkflowState>({ status: 'idle' });

  const startWorkflow = async () => {
    if (!userContext.trim()) return;

    setWorkflowState({ status: 'starting' });
    console.log('🚀 Frontend: Starting workflow with context:', userContext);

    try {
      const response = await fetch('/api/workflow/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userContext,
          attachedFiles: []
        }),
      });

      const data = await response.json();
      console.log('📡 Frontend: API response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start workflow');
      }

      if (data.status === 'suspended') {
        console.log('⏸️  Frontend: Setting suspended state with plan:', data.generatedPlan);
        setWorkflowState({
          status: 'suspended',
          runId: data.runId,
          generatedPlan: data.generatedPlan,
          message: data.message,
          stepId: data.stepId
        });
      } else if (data.status === 'success') {
        console.log('✅ Frontend: Workflow completed');
        setWorkflowState({
          status: 'completed',
          runId: data.runId,
          result: data.result
        });
      } else if (data.status === 'failed') {
        console.log('❌ Frontend: Workflow failed');
        setWorkflowState({
          status: 'failed',
          error: data.error
        });
      } else {
        console.log('❓ Frontend: Unknown status:', data.status);
        console.log('🔍 Frontend: Full response:', data);
        // For debugging, show the raw response
        setWorkflowState({
          status: 'failed',
          error: `Unknown status: ${data.status}. Check console for details.`
        });
      }
    } catch (error) {
      console.error('💥 Frontend: Error starting workflow:', error);
      setWorkflowState({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleApproval = async (approvalData: { approved: boolean; feedback?: string; modifiedPlan?: Plan }) => {
    if (!workflowState.runId || !workflowState.stepId) return;

    setWorkflowState(prev => ({ ...prev, status: 'generating' }));

    try {
      const response = await fetch('/api/workflow/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          runId: workflowState.runId,
          stepId: workflowState.stepId,
          ...approvalData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resume workflow');
      }

      if (data.status === 'success') {
        setWorkflowState({
          status: 'completed',
          runId: data.runId,
          result: data.result
        });
      } else if (data.status === 'failed') {
        setWorkflowState({
          status: 'failed',
          error: data.error
        });
      } else if (data.status === 'suspended') {
        // Handle case where workflow suspends again
        setWorkflowState({
          status: 'suspended',
          runId: data.runId,
          message: data.message
        });
      }
    } catch (error) {
      setWorkflowState({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const resetWorkflow = () => {
    setWorkflowState({ status: 'idle' });
    setUserContext("");
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-8 bg-gray-50 dark:bg-black">
      <main className="flex flex-col w-full max-w-4xl gap-6 mt-10">
        <h1 className="text-3xl font-bold text-center mb-6">Report Generator Workflow</h1>

        {workflowState.status === 'idle' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Start Report Generation</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Report Context:
                </label>
                <textarea
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  placeholder="Describe what kind of report you want to generate..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <button
                onClick={startWorkflow}
                disabled={!userContext.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
              >
                Generate Report Plan
              </button>
            </div>
          </div>
        )}

        {workflowState.status === 'starting' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Generating report plan...</p>
          </div>
        )}

        {workflowState.status === 'suspended' && workflowState.generatedPlan && (
          <WorkflowApproval
            runId={workflowState.runId!}
            generatedPlan={workflowState.generatedPlan}
            message={workflowState.message!}
            onApprove={handleApproval}
            loading={false}
          />
        )}

        {workflowState.status === 'resuming' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Processing your approval...</p>
          </div>
        )}

        {workflowState.status === 'generating' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-6"></div>
            <h3 className="text-lg font-semibold mb-2">Generating Full Report</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Our AI agent is now creating detailed content for each chapter and section...
            </p>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>📝 Writing content...</span>
                <span>🔍 Using MCP tools for research...</span>
                <span>📊 Structuring report...</span>
              </div>
            </div>
          </div>
        )}

        {workflowState.status === 'completed' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-green-600">Workflow Completed!</h2>
              <button
                onClick={resetWorkflow}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Start New Report
              </button>
            </div>
            {workflowState.result && (
              <ReportDisplay
                fullReport={workflowState.result.fullReport}
                reportMetadata={workflowState.result.reportMetadata}
                runId={workflowState.runId!}
                onStartNew={resetWorkflow}
              />
            )}
            {workflowState.runId && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Run ID: {workflowState.runId}
              </p>
            )}
          </div>
        )}

        {workflowState.status === 'failed' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-red-600">Workflow Failed</h2>
              <button
                onClick={resetWorkflow}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Try Again
              </button>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4">
              <p className="text-red-800 dark:text-red-300">
                {workflowState.error || 'An unknown error occurred'}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
