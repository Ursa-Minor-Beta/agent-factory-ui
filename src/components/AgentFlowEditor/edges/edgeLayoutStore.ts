// Manual edge geometry (turn points) by edge id, saved in agent editorData.edgeLayout
// Module-level: survives edge remounts (onlyRenderVisibleElements), no re-render on change
import type { EdgeLayout } from '../../../types/agent';

export type { EdgeLayout };
export type BackLine = NonNullable<EdgeLayout['back']>;

const store = new Map<string, EdgeLayout>();

export const edgeLayoutStore = {
  get: (edgeId: string): EdgeLayout => store.get(edgeId) ?? {},

  set: (edgeId: string, layout: EdgeLayout) => {
    if (layout.turn === undefined && !layout.back) store.delete(edgeId);
    else store.set(edgeId, layout);
  },

  // Replace store contents on agent load
  load: (data?: Record<string, EdgeLayout>) => {
    store.clear();
    Object.entries(data ?? {}).forEach(([id, layout]) => store.set(id, layout));
  },

  // Layout of existing edges only, removed edges are dropped
  toJSON: (edgeIds: string[]): Record<string, EdgeLayout> => {
    const result: Record<string, EdgeLayout> = {};
    edgeIds.forEach((id) => {
      const layout = store.get(id);
      if (layout) result[id] = layout;
    });
    return result;
  },
};
