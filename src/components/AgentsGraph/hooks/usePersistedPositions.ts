import { useCallback, useEffect, useState } from 'react';
import type { XYPosition } from '@xyflow/react';

// workspaceId: an agent's workspace when it was moved (see graph/savedLayout.ts)
export type SavedPosition = XYPosition & { workspaceId?: string | null };
export type Positions = Record<string, SavedPosition>;

function load(key: string): Positions {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

function save(key: string, positions: Positions) {
  try {
    if (Object.keys(positions).length) localStorage.setItem(key, JSON.stringify(positions));
    else localStorage.removeItem(key);
  } catch {
    // Storage unavailable
  }
}

/**
 * Node positions moved by the user, on top of the auto layout. `persist` sets and saves them (on drag end),
 * `reset` drops them all.
 */
export function usePersistedPositions(key: string) {
  const [positions, setPositions] = useState<Positions>(() => load(key));
  // Positions as loaded / reset - changes only then, not while dragging (e.g. for fitting the viewport)
  const [initial, setInitial] = useState(positions);

  // Another graph scope (workspace) - its own saved layout
  useEffect(() => {
    const loaded = load(key);
    setPositions(loaded);
    setInitial(loaded);
  }, [key]);

  const persist = useCallback((next: Positions) => {
    save(key, next);
    setPositions(next);
  }, [key]);

  const reset = useCallback(() => {
    save(key, {});
    setPositions({});
    setInitial({});
  }, [key]);

  return { positions, initial, persist, reset };
}
