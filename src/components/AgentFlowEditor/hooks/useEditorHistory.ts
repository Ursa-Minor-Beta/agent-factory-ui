import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Node, Edge } from '@xyflow/react';

const MAX_HISTORY = 100;
// Changes within this window (typing, nudging) collapse into one undo step
const SETTLE_MS = 400;

type Snapshot = { nodes: Node[]; edges: Edge[]; key: string };

// Drop UI-only state so selecting/measuring doesn't create undo steps
function stripNode({ selected: _s, dragging: _d, measured: _m, ...node }: Node): Node {
  return node as Node;
}

function stripEdge({ selected: _s, ...edge }: Edge): Edge {
  return edge as Edge;
}

function takeSnapshot(nodes: Node[], edges: Edge[]): Snapshot {
  const n = nodes.map(stripNode);
  const e = edges.map(stripEdge);
  return { nodes: n, edges: e, key: JSON.stringify([n, e]) };
}

function isEditableTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

interface UseEditorHistoryOptions {
  nodes: Node[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  // Changing it (e.g. another agent loaded) starts a fresh history
  resetKey: string;
  // While true (loading, dragging) changes are not recorded yet
  paused: boolean;
}

/**
 * Snapshot-based undo / redo for the canvas graph.
 * Observes nodes/edges instead of wrapping every action, so any edit
 * (drag, connect, node settings, template, paste) is undoable.
 * Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z or Ctrl+Y = redo (native text undo inside inputs).
 */
export function useEditorHistory({ nodes, edges, setNodes, setEdges, resetKey, paused }: UseEditorHistoryOptions) {
  const pastRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const currentRef = useRef<Snapshot | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestRef = useRef({ nodes, edges });
  latestRef.current = { nodes, edges };

  // Key of the last saved (or loaded) graph - differs from current = unsaved changes
  const savedKeyRef = useRef<string | null>(null);

  const [counts, setCounts] = useState({ undo: 0, redo: 0, dirty: false });
  // Bumped on undo/redo - lets consumers remount views holding local copies of node data
  const [version, setVersion] = useState(0);

  const syncCounts = useCallback(() => {
    setCounts({
      undo: pastRef.current.length,
      redo: futureRef.current.length,
      dirty: !!currentRef.current && currentRef.current.key !== savedKeyRef.current,
    });
  }, []);

  // Record current graph as a new step if it differs from the last one
  const commit = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
    const snapshot = takeSnapshot(latestRef.current.nodes, latestRef.current.edges);
    const current = currentRef.current;
    if (!current) {
      currentRef.current = snapshot;
      savedKeyRef.current = snapshot.key;
      syncCounts();
      return;
    }
    if (current.key === snapshot.key) return;
    pastRef.current = [...pastRef.current, current].slice(-MAX_HISTORY);
    futureRef.current = [];
    currentRef.current = snapshot;
    syncCounts();
  }, [syncCounts]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
    pastRef.current = [];
    futureRef.current = [];
    currentRef.current = null;
    savedKeyRef.current = null;
    syncCounts();
  }, [resetKey, syncCounts]);

  // Call after a successful save - current graph becomes the clean state
  const markSaved = useCallback(() => {
    commit();
    savedKeyRef.current = currentRef.current?.key ?? null;
    syncCounts();
  }, [commit, syncCounts]);

  useEffect(() => {
    if (paused) return;
    // First state after a reset is the baseline
    if (!currentRef.current) {
      commit();
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(commit, SETTLE_MS);
  }, [nodes, edges, paused, commit]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const restore = useCallback(
    (snapshot: Snapshot) => {
      currentRef.current = snapshot;
      // Keep measured sizes of existing nodes so they don't flicker while re-measuring
      setNodes((nds) => {
        const measured = new Map(nds.map((n) => [n.id, n.measured]));
        return snapshot.nodes.map((n) => ({ ...n, measured: measured.get(n.id) }));
      });
      setEdges(snapshot.edges);
      setVersion((v) => v + 1);
      syncCounts();
    },
    [setNodes, setEdges, syncCounts]
  );

  const undo = useCallback(() => {
    // Pending edit becomes its own step first, so undo reverts it
    if (timerRef.current) commit();
    const previous = pastRef.current.at(-1);
    if (!previous || !currentRef.current) return;
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, currentRef.current];
    restore(previous);
  }, [commit, restore]);

  const redo = useCallback(() => {
    if (timerRef.current) commit();
    const next = futureRef.current.at(-1);
    if (!next || !currentRef.current) return;
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, currentRef.current];
    restore(next);
  }, [commit, restore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || isEditableTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    undo,
    redo,
    canUndo: counts.undo > 0,
    canRedo: counts.redo > 0,
    isDirty: counts.dirty,
    markSaved,
    version,
  };
}
