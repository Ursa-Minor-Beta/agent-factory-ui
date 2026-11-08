import type { Node } from '@xyflow/react';
type LayoutAgent = { id: string; name: string };
import type { GraphBounds, GraphSizes, Relation } from '../types';

const ORDER_SWEEPS = 6;
const POSITION_SWEEPS = 8;

const average = (values: number[]) => values.reduce((s, v) => s + v, 0) / values.length;

/**
 * Layered (Sugiyama-style) layout of the call graph:
 *  1. Layering   - each agent's row = longest call path from a root, so callees always sit below callers
 *  2. Ordering   - start from DFS order (keeps siblings together), then barycenter sweeps
 *                  down/up to reduce edge crossings
 *  3. Placement  - pull each agent toward the average x of its callers/callees, keeping min spacing
 * Agents without any relations share the top row with the roots, the whole row sorted by name.
 */
export function layout(
  agents: LayoutAgent[],
  relations: Relation[],
  { slot: SLOT, rowGap: ROW_GAP }: GraphSizes,
): Map<string, { x: number; y: number }> {
  const nameOf = new Map(agents.map((a) => [a.id, a.name]));
  const byName = (a: string, b: string) => nameOf.get(a)!.localeCompare(nameOf.get(b)!);
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  relations.forEach((r) => {
    if (r.source === r.target) return;
    children.set(r.source, [...(children.get(r.source) ?? []), r.target]);
    parents.set(r.target, [...(parents.get(r.target) ?? []), r.source]);
  });
  children.forEach((list) => list.sort(byName));

  const connected = agents.map((a) => a.id).filter((id) => children.has(id) || parents.has(id));
  const isolated = agents.map((a) => a.id).filter((id) => !children.has(id) && !parents.has(id)).sort(byName);

  // 1. Layering. Roots are agents nobody calls; members of a pure cycle fall back to being roots.
  const depth = new Map<string, number>();
  const visit = (id: string, d: number, path: Set<string>) => {
    if (path.has(id) || (depth.get(id) ?? -1) >= d) return;
    depth.set(id, d);
    path.add(id);
    (children.get(id) ?? []).forEach((c) => visit(c, d + 1, path));
    path.delete(id);
  };
  const roots = connected.filter((id) => !parents.has(id)).sort(byName);
  roots.forEach((id) => visit(id, 0, new Set()));
  connected.forEach((id) => { if (!depth.has(id)) visit(id, 0, new Set()); });

  // 2. Ordering. Initial order = DFS pre-order so each subtree starts out contiguous.
  const rank = new Map<string, number>();
  let counter = 0;
  const dfs = (id: string) => {
    if (rank.has(id)) return;
    rank.set(id, counter++);
    (children.get(id) ?? []).forEach(dfs);
  };
  [...roots, ...connected].forEach(dfs);

  const maxDepth = Math.max(0, ...depth.values());
  const layers: string[][] = Array.from({ length: maxDepth + 1 }, () => []);
  connected.forEach((id) => layers[depth.get(id)!].push(id));
  layers.forEach((layer) => layer.sort((a, b) => rank.get(a)! - rank.get(b)!));

  const index = new Map<string, number>();
  const reindex = () => layers.forEach((layer) => layer.forEach((id, i) => index.set(id, i)));
  reindex();

  const sortByBarycenter = (layer: string[], neighbours: Map<string, string[]>) => {
    const bary = new Map(layer.map((id) => {
      const ns = neighbours.get(id) ?? [];
      return [id, ns.length ? average(ns.map((n) => index.get(n)!)) : index.get(id)!];
    }));
    layer.sort((a, b) => bary.get(a)! - bary.get(b)! || index.get(a)! - index.get(b)!);
  };
  for (let sweep = 0; sweep < ORDER_SWEEPS; sweep++) {
    if (sweep % 2 === 0) {
      for (let d = 1; d <= maxDepth; d++) { sortByBarycenter(layers[d], parents); reindex(); }
    } else {
      for (let d = maxDepth - 1; d >= 0; d--) { sortByBarycenter(layers[d], children); reindex(); }
    }
  }

  // Top row: roots plus isolated agents, sorted by name
  layers[0].push(...isolated);
  layers[0].sort(byName);
  reindex();

  // 3. Placement. Start packed, then pull toward neighbours while keeping order and spacing.
  const x = new Map<string, number>();
  layers.forEach((layer) => layer.forEach((id, i) => x.set(id, i * SLOT)));

  const placeLayer = (layer: string[], neighbours: Map<string, string[]>) => {
    const desired = layer.map((id) => {
      const ns = neighbours.get(id) ?? [];
      return ns.length ? average(ns.map((n) => x.get(n)!)) : x.get(id)!;
    });
    // Resolve overlaps pushing right and pushing left, average both so crowded groups stay centred
    const right = [...desired];
    for (let i = 1; i < right.length; i++) right[i] = Math.max(right[i], right[i - 1] + SLOT);
    const left = [...desired];
    for (let i = left.length - 2; i >= 0; i--) left[i] = Math.min(left[i], left[i + 1] - SLOT);
    const placed = desired.map((_, i) => (left[i] + right[i]) / 2);
    for (let i = 1; i < placed.length; i++) placed[i] = Math.max(placed[i], placed[i - 1] + SLOT);
    layer.forEach((id, i) => x.set(id, placed[i]));
  };
  for (let sweep = 0; sweep < POSITION_SWEEPS; sweep++) {
    if (sweep % 2 === 0) {
      for (let d = maxDepth - 1; d >= 0; d--) placeLayer(layers[d], children);
    } else {
      for (let d = 1; d <= maxDepth; d++) placeLayer(layers[d], parents);
    }
  }

  const positions = new Map<string, { x: number; y: number }>();
  layers.forEach((layer, d) => layer.forEach((id) => positions.set(id, { x: x.get(id)!, y: d * ROW_GAP })));
  return positions;
}

// Extent straight from the layout - no need to wait for React Flow to measure nodes
export function graphBounds(nodes: Node[], nodeWidth: number): GraphBounds | null {
  if (!nodes.length) return null;
  const xs = nodes.map((n) => n.position.x);
  const ys = nodes.map((n) => n.position.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs) + nodeWidth, minY: Math.min(...ys) };
}
