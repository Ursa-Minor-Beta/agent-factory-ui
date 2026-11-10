import { useEffect, useState } from 'react';
import { secretsApi, variablesApi } from '../../../api';
import type { TemplateRefs } from '../inputs/templateUtils';

const EMPTY_REFS: TemplateRefs = { secrets: [], variables: [] };

const uniqueSortedNames = (lists: { name: string }[][]) =>
  Array.from(new Set(lists.flat().map((item) => item.name))).sort((a, b) => a.localeCompare(b));

// Load secret / variable names available to the agent: global + its workspace (workspace overrides global on run)
export function useTemplateRefs(workspaceId?: string | null): TemplateRefs {
  const [refs, setRefs] = useState<TemplateRefs>(EMPTY_REFS);

  useEffect(() => {
    let cancelled = false;
    const scopes: (string | null)[] = workspaceId ? [null, workspaceId] : [null];

    Promise.all([
      Promise.all(scopes.map((scope) => secretsApi.list({ workspaceId: scope }))),
      Promise.all(scopes.map((scope) => variablesApi.list({ workspaceId: scope }))),
    ])
      .then(([secrets, variables]) => {
        if (cancelled) return;
        setRefs({ secrets: uniqueSortedNames(secrets), variables: uniqueSortedNames(variables) });
      })
      .catch((err) => {
        console.error('Failed to load secrets/variables for template suggestions:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  return refs;
}
