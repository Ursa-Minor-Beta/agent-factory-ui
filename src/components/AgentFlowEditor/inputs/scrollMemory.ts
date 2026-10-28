import { useCallback, useEffect, type RefObject } from 'react';
import { useParams } from 'react-router';

// In-memory scroll positions keyed by agent:node:input. Survives unmounts, cleared on reload.
const scrollCache = new Map<string, number>();

/**
 * Remembers scrollTop of a scrollable element per agent/node/input.
 * Returns an onScroll handler to save the position; restores it on mount.
 * Pass `nodeId` undefined to disable.
 */
export function useScrollMemory(
  elementRef: RefObject<HTMLElement | null>,
  nodeId: string | undefined,
  inputName: string,
  syncRefs: RefObject<HTMLElement | null>[] = []
) {
  const { agentId } = useParams<{ agentId: string }>();
  const key = nodeId ? `${agentId ?? ''}:${nodeId}:${inputName}` : null;

  useEffect(() => {
    if (!key) return;
    const saved = scrollCache.get(key);
    if (!saved) return;
    // Wait a frame so autosize has set the final height
    const frame = requestAnimationFrame(() => {
      if (elementRef.current) elementRef.current.scrollTop = saved;
      syncRefs.forEach((ref) => {
        if (ref.current) ref.current.scrollTop = saved;
      });
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return useCallback(
    (scrollTop: number) => {
      if (key) scrollCache.set(key, scrollTop);
    },
    [key]
  );
}
