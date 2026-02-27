import { useState, useCallback } from 'react';
import type { WorkflowStatus } from '../types/network';

interface TriggerWorkflowOptions {
  workflowId: string;
  params?: Record<string, string>;
}

interface UseWorkflowTriggerResult {
  status: WorkflowStatus;
  error: string | null;
  trigger: (opts: TriggerWorkflowOptions) => Promise<void>;
  reset: () => void;
}

/**
 * Hook that triggers a Dynatrace Workflow via the Automation API.
 *
 * The app runs inside Dynatrace so no extra auth is needed — the platform
 * injects credentials automatically into all `fetch` requests.
 */
export function useWorkflowTrigger(): UseWorkflowTriggerResult {
  const [status, setStatus] = useState<WorkflowStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const trigger = useCallback(async ({ workflowId, params = {} }: TriggerWorkflowOptions) => {
    setStatus('loading');
    setError(null);

    try {
      const response = await fetch(
        `/platform/automation/v1/workflows/${workflowId}/run`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ params }),
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            `Workflow "${workflowId}" not found. Configure a real workflow ID in networkCategories.ts.`,
          );
        }
        const body = await response.text();
        throw new Error(`Failed to trigger workflow (${response.status}): ${body}`);
      }

      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, trigger, reset };
}
