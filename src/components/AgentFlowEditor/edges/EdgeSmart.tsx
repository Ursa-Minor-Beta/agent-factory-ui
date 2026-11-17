import type { CSSProperties } from 'react';
import { BaseEdge, Position, useNodes, type Node } from '@xyflow/react';
import { EdgePhoton } from './EdgePhoton';
import { edgeLayoutStore, type BackLine, type EdgeLayout } from './edgeLayoutStore';

const radius = 20;
const baseOffset = 40; // % 2 = 0
const handleOffsetStep = 12; // extra start offset per source handle slot
const alignThreshold = 1; // px, handles closer than this on the cross axis get a straight edge

// Slot of the source handle: plain output = 0, branch-N = N + 1
function getHandleSlot(sourceHandleId?: string | null): number {
  const match = sourceHandleId?.match(/^branch-(\d+)$/);
  return match ? Number(match[1]) + 1 : 0;
}

// Pyramid offset: middle handle goes furthest, outer handles turn closest to the node
// odd: 0 1 2 1 0, even: 0 1 2 3 1 0 (second middle gets an extra level to avoid overlap)
function getHandleOffsetLevel(slot: number, slotsCount: number): number {
  if (slotsCount % 2 === 0 && slot === slotsCount / 2) return slot;
  return Math.min(slot, slotsCount - 1 - slot);
}

interface Point {
  key: 'L' | 'M'; // svg command keys
  x: number;
  y: number;
  length?: number;
}

interface EdgeProps {
  id: string;
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition?: Position;
  targetPosition?: Position;
  sourceHandleId?: string | null;
  markerEnd?: string;
  style?: CSSProperties;
  data?: { photon?: number };
}

type NodeToCalculatePath = {
  position: { x: number; y: number };
  size: { w: number; h: number };
};

type NodesToCalculate = {
  source: NodeToCalculatePath;
  target: NodeToCalculatePath;
};

function getSizePosition(node: Node): NodeToCalculatePath {
  const measured = node.measured;
  const position = node.position;
  return {
    position,
    size: {
      w: measured?.width ?? position.x,
      h: measured?.height ?? position.y,
    },
  };
}

function useFindSourceTarget(sourceNodeId: string, targetNodeId: string) {
  const nodes = useNodes();
  const nodesToConnect: NodesToCalculate = {} as NodesToCalculate;
  let sourceSlotsCount = 1;

  for (const node of nodes) {
    if (node.id === sourceNodeId) {
      nodesToConnect.source = getSizePosition(node);
      // Plain output + one handle per branch
      const branches = node.type === 'branch' ? node.data?.branches : null;
      if (Array.isArray(branches)) sourceSlotsCount = branches.length + 1;
    }
    else if (node.id === targetNodeId) nodesToConnect.target = getSizePosition(node);
    if (nodesToConnect.source && nodesToConnect.target) break;
  }

  return { nodesToConnect, sourceSlotsCount };
}


function getBox(x: number, y: number, w: number, h: number) {
  return {
    a: { x, y },               //  a ______ b
    b: { x: x + w, y },        //   | node |
    c: { x: x + w, y: y + h }, //   |______|
    d: { x, y: y + h },        //   d        c
  };
}

interface GetPointsParams {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourceNodeBox: ReturnType<typeof getBox>;
  isVertical?: boolean;
  startOffset: number;
  turn: number | null; // turn coordinate of a forward edge, null - edge goes back
  layout: EdgeLayout; // saved turn points, updated in place
}

function getPointsHorizontal({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceNodeBox,
  startOffset,
  turn,
  layout,
}: GetPointsParams): Point[] {

  const pointStart: Point = { key: 'M', x: sourceX, y: sourceY }; // start
  const pointStartOffset: Point = { key: 'L', x: sourceX + startOffset, y: sourceY, length: startOffset * 2 };
  const pointFinishOffset: Point = { key: 'L', x: targetX - (baseOffset / 2), y: targetY };
  const pointFinish: Point = { key: 'L', x: targetX, y: targetY }; // finish

  // Handles (almost) aligned - straight line, avoids degenerate corners
  if (turn !== null && Math.abs(targetY - sourceY) < alignThreshold) {
    return [pointStart, pointFinish];
  }

  if (turn !== null) {
    const turnX = turn;
    return [
      pointStart,
      { key: 'L', x: turnX, y: sourceY, length: (turnX - sourceX) * 2 },
      { key: 'L', x: turnX, y: targetY, length: Math.abs(targetY - sourceY) },
      { ...pointFinish, length: targetX - turnX },
    ];
  }

  const points: Point[] = [pointStart, pointStartOffset];

  if (pointStartOffset.x > pointFinishOffset.x) {
    let y: number;
    let length: number;

    if (pointStart.y < pointFinish.y) {
      y = getBackLine(layout, 'after', {
        preferred: sourceNodeBox.c.y + baseOffset,
        min: sourceNodeBox.c.y + baseOffset / 2,
        max: pointFinish.y - baseOffset / 2,
        fallback: pointStart.y + (pointFinish.y - pointStart.y) / 2,
      });

      length = y - pointStartOffset.y;
    } else {
      y = getBackLine(layout, 'before', {
        preferred: sourceNodeBox.b.y - baseOffset,
        min: pointFinish.y + baseOffset / 2,
        max: sourceNodeBox.b.y - baseOffset / 2,
        fallback: pointFinish.y + (pointStart.y - pointFinish.y) / 2,
      });

      length = pointStartOffset.y - y;
    }
    points.push({ key: 'L', x: pointStartOffset.x, y, length });
    points.push({ key: 'L', x: pointFinishOffset.x, y, length: Math.abs(pointFinishOffset.x - pointStartOffset.x) });

    const finishOffLen = Math.abs(y - pointFinishOffset.y);
    points.push({ ...pointFinishOffset, length: finishOffLen });
  }

  const finishLen = pointFinish.x - points[points.length - 1].x;
  points.push({ ...pointFinish, length: finishLen });

  return points;
}

function getPointsVertical({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceNodeBox,
  startOffset,
  turn,
  layout,
}: GetPointsParams): Point[] {

  const pointStart: Point = { key: 'M', x: sourceX, y: sourceY };
  const pointStartOffset: Point = { key: 'L', x: sourceX, y: sourceY + startOffset, length: startOffset * 2 };
  const pointFinishOffset: Point = { key: 'L', x: targetX, y: targetY - (baseOffset / 2) };
  const pointFinish: Point = { key: 'L', x: targetX, y: targetY };

  // Handles (almost) aligned - straight line, avoids degenerate corners
  if (turn !== null && Math.abs(targetX - sourceX) < alignThreshold) {
    return [pointStart, pointFinish];
  }

  if (turn !== null) {
    const turnY = turn;
    return [
      pointStart,
      { key: 'L', x: sourceX, y: turnY, length: (turnY - sourceY) * 2 },
      { key: 'L', x: targetX, y: turnY, length: Math.abs(targetX - sourceX) },
      { ...pointFinish, length: targetY - turnY },
    ];
  }

  const points: Point[] = [pointStart, pointStartOffset];

  if (pointStartOffset.y > pointFinishOffset.y) {
    let x: number;
    let length: number;

    if (pointStart.x < pointFinish.x) {
      x = getBackLine(layout, 'after', {
        preferred: sourceNodeBox.c.x + baseOffset,
        min: sourceNodeBox.c.x + baseOffset / 2,
        max: pointFinish.x - baseOffset / 2,
        fallback: pointStart.x + (pointFinish.x - pointStart.x) / 2,
      });

      length = x - pointStartOffset.x;
    } else {
      x = getBackLine(layout, 'before', {
        preferred: sourceNodeBox.a.x - baseOffset,
        min: pointFinish.x + baseOffset / 2,
        max: sourceNodeBox.a.x - baseOffset / 2,
        fallback: pointFinish.x + (pointStart.x - pointFinish.x) / 2,
      });

      length = pointStartOffset.x - x;
    }
    points.push({ key: 'L', x, y: pointStartOffset.y, length: Math.abs(length) });
    points.push({ key: 'L', x, y: pointFinishOffset.y, length: Math.abs(pointFinishOffset.y - pointStartOffset.y) });

    const finishOffLen = Math.abs(x - pointFinishOffset.x);
    points.push({ ...pointFinishOffset, length: finishOffLen });
  }

  const finishLen = Math.abs(pointFinish.y - points[points.length - 1].y);
  points.push({ ...pointFinish, length: finishLen });

  return points;
}

// Turn of a forward edge stays where it was, so the segment of the moving node
// shrinks first; once it hits min offset the turn is pushed and the other segment shrinks
function getForwardTurn(layout: EdgeLayout, from: number, to: number, startOffset: number) {
  const min = from + baseOffset / 2;
  const max = to - baseOffset / 2;
  if (min > max) {
    layout.turn = undefined;
    return null;
  }
  layout.turn = Math.min(Math.max(layout.turn ?? to - startOffset, min), max);
  return layout.turn;
}

// Middle line of a back edge (goes around the source node) stays where it was while nodes move,
// pushed only by min offsets; no room between the nodes - goes through the middle
function getBackLine(
  layout: EdgeLayout,
  side: BackLine['side'],
  { preferred, min, max, fallback }: { preferred: number; min: number; max: number; fallback: number }
): number {
  if (min > max) {
    layout.back = undefined;
    return fallback;
  }
  const prev = layout.back?.side === side ? layout.back.value : preferred;
  layout.back = { side, value: Math.min(Math.max(prev, min), max) };
  return layout.back.value;
}

function getPath(params: GetPointsParams): string {
  let path = '';

  const points = params.isVertical ? getPointsVertical(params) : getPointsHorizontal(params);
  if (points && points.length > 0) {
    for (let i = 0; i < points.length; i++) {
      const x = points[i].x;
      const y = points[i].y;
      const key = points[i].key;

      if (key === 'L' && points[i + 1]?.key === 'L') {
        // creating rounded corners
        let r = radius;
        const currentLength = points[i].length;
        const nextLength = points[i + 1].length;
        const minLen = Math.min(currentLength!, nextLength!);
        if (minLen < r * 2) {
          r = minLen / 2;
        }

        const yDiff = y - points[i + 1].y;
        const xDiff = x - points[i + 1].x;

        if (yDiff !== 0) {
          const xDirection = points[i - 1].x - x;
          path += `${key} ${xDirection > 0 ? x + r : x - r} ${y} `;
          path += `Q ${x} ${y} ${x} ${yDiff > 0 ? y - r : y + r} `;
        } else if (xDiff !== 0) {
          const yDirection = points[i - 1].y - y;
          path += `${key} ${x} ${yDirection > 0 ? y + r : y - r} `;
          path += `Q ${x} ${y} ${xDiff > 0 ? x - r : x + r} ${y} `;
        } else {
          // zero-length segment - no corner to round
          path += `${key} ${x} ${y} `;
        }
      } else {
        path += `${key} ${x} ${y} `;
      }
    }
  }

  return path;
}

export function EdgeSmart(edgeProps: EdgeProps) {
  const { nodesToConnect, sourceSlotsCount } = useFindSourceTarget(edgeProps.source, edgeProps.target);
  const sourceNodeBox = getBox(
    nodesToConnect.source.position.x,
    nodesToConnect.source.position.y,
    nodesToConnect.source.size.w,
    nodesToConnect.source.size.h
  );

  // Detect vertical flow direction
  const isVertical =
    edgeProps.sourcePosition === Position.Bottom || edgeProps.targetPosition === Position.Top;

  const startOffset =
    baseOffset / 2 +
    getHandleOffsetLevel(getHandleSlot(edgeProps.sourceHandleId), sourceSlotsCount) * handleOffsetStep;
  const from = isVertical ? edgeProps.sourceY : edgeProps.sourceX;
  const to = isVertical ? edgeProps.targetY : edgeProps.targetX;
  const layout = { ...edgeLayoutStore.get(edgeProps.id) };

  const edgePathParams: GetPointsParams = {
    sourceX: edgeProps.sourceX,
    sourceY: edgeProps.sourceY,
    targetX: edgeProps.targetX,
    targetY: edgeProps.targetY,
    sourceNodeBox,
    isVertical,
    startOffset,
    turn: getForwardTurn(layout, from, to, startOffset),
    layout,
  };

  const path = getPath(edgePathParams);
  edgeLayoutStore.set(edgeProps.id, layout);

  return (
    <>
      <BaseEdge path={path} markerEnd={edgeProps.markerEnd} style={edgeProps.style} />
      {edgeProps.data?.photon !== undefined && <EdgePhoton path={path} runningMs={edgeProps.data.photon} />}
    </>
  );
}
