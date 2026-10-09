import { BaseEdge, Position, useEdges, useNodes, type Node } from '@xyflow/react';

const radius = 10;
const baseOffset = 20;
const edgeGap = 2;

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
  markerEnd?: string;
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

  for (const node of nodes) {
    if (node.id === sourceNodeId) nodesToConnect.source = getSizePosition(node);
    else if (node.id === targetNodeId) nodesToConnect.target = getSizePosition(node);
    if (nodesToConnect.source && nodesToConnect.target) break;
  }

  return { nodesToConnect };
}

function useCountConnectedEdges(sourceId: string, targetId: string) {
  const edges = useEdges();
  const sourceEdgesIds: string[] = [];
  const targetEdgesIds: string[] = [];

  for (const edge of edges) {
    if (edge.source === sourceId) sourceEdgesIds.push(edge.id);
    if (edge.target === targetId) targetEdgesIds.push(edge.id);
  }

  return { sourceEdgesIds, targetEdgesIds };
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
  edgeNumInSource: number;
  edgeNumInTarget: number;
  isVertical?: boolean;
}

function getPoints({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceNodeBox,
  edgeNumInSource,
  edgeNumInTarget,
}: GetPointsParams): Point[] {
  const sourceBoxOffset = baseOffset + edgeNumInSource * edgeGap;
  const targetBoxOffset = baseOffset + edgeNumInTarget * edgeGap;

  const pointStart: Point = { key: 'M', x: sourceX, y: sourceY }; // start
  const pointStartOffset: Point = { key: 'L', x: sourceX + sourceBoxOffset, y: sourceY, length: sourceBoxOffset };
  const pointFinishOffset: Point = { key: 'L', x: targetX - targetBoxOffset, y: targetY };
  const pointFinish: Point = { key: 'L', x: targetX, y: targetY }; // finish

  const points: Point[] = [pointStart, pointStartOffset];

  if (pointStartOffset.x > pointFinishOffset.x) {
    let y: number;
    let length: number;

    if (pointStart.y < pointFinish.y) {
      y =
        sourceNodeBox.c.y + sourceBoxOffset + baseOffset < pointFinish.y
          ? sourceNodeBox.c.y + sourceBoxOffset
          : pointStart.y + (pointFinish.y - pointStart.y) / 2;

      length = y - pointStartOffset.y;
    } else {
      y =
        sourceNodeBox.b.y - sourceBoxOffset - baseOffset > pointFinish.y
          ? sourceNodeBox.b.y - sourceBoxOffset
          : pointFinish.y + (pointStart.y - pointFinish.y) / 2;

      length = pointStartOffset.y - y;
    }
    points.push({ key: 'L', x: pointStartOffset.x, y, length });
    points.push({ key: 'L', x: pointFinishOffset.x, y, length: Math.abs(pointFinishOffset.x - pointStartOffset.x) });

    const finishOffLen = Math.abs(y - pointFinishOffset.y);
    points.push({ ...pointFinishOffset, length: finishOffLen });
  } else if (pointStartOffset.x < pointFinishOffset.x) {
    const length = Math.abs(pointFinishOffset.y - pointStartOffset.y);
    points.push({ key: 'L', x: pointStartOffset.x, y: pointFinishOffset.y, length });
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
  edgeNumInSource,
  edgeNumInTarget,
}: GetPointsParams): Point[] {
  const sourceBoxOffset = baseOffset + edgeNumInSource * edgeGap;
  const targetBoxOffset = baseOffset + edgeNumInTarget * edgeGap;

  const pointStart: Point = { key: 'M', x: sourceX, y: sourceY };
  const pointStartOffset: Point = { key: 'L', x: sourceX, y: sourceY + sourceBoxOffset, length: sourceBoxOffset };
  const pointFinishOffset: Point = { key: 'L', x: targetX, y: targetY - targetBoxOffset };
  const pointFinish: Point = { key: 'L', x: targetX, y: targetY };

  const points: Point[] = [pointStart, pointStartOffset];

  if (pointStartOffset.y > pointFinishOffset.y) {
    let x: number;
    let length: number;

    if (pointStart.x < pointFinish.x) {
      x =
        sourceNodeBox.c.x + sourceBoxOffset + baseOffset < pointFinish.x
          ? sourceNodeBox.c.x + sourceBoxOffset
          : pointStart.x + (pointFinish.x - pointStart.x) / 2;

      length = x - pointStartOffset.x;
    } else {
      x =
        sourceNodeBox.a.x - sourceBoxOffset - baseOffset > pointFinish.x
          ? sourceNodeBox.a.x - sourceBoxOffset
          : pointFinish.x + (pointStart.x - pointFinish.x) / 2;

      length = pointStartOffset.x - x;
    }
    points.push({ key: 'L', x, y: pointStartOffset.y, length: Math.abs(length) });
    points.push({ key: 'L', x, y: pointFinishOffset.y, length: Math.abs(pointFinishOffset.y - pointStartOffset.y) });

    const finishOffLen = Math.abs(x - pointFinishOffset.x);
    points.push({ ...pointFinishOffset, length: finishOffLen });
  } else if (pointStartOffset.y < pointFinishOffset.y) {
    const length = Math.abs(pointFinishOffset.x - pointStartOffset.x);
    points.push({ key: 'L', x: pointFinishOffset.x, y: pointStartOffset.y, length });
  }

  const finishLen = Math.abs(pointFinish.y - points[points.length - 1].y);
  points.push({ ...pointFinish, length: finishLen });

  return points;
}

function getPath(params: GetPointsParams): string {
  let path = '';

  const points = params.isVertical ? getPointsVertical(params) : getPoints(params);
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
          path += `${key} ${x + radius} ${y} `;
        }
      } else {
        path += `${key} ${x} ${y} `;
      }
    }
  }

  return path;
}

export function EdgeSmart(edgeProps: EdgeProps) {
  const { nodesToConnect } = useFindSourceTarget(edgeProps.source, edgeProps.target);
  const sourceNodeBox = getBox(
    nodesToConnect.source.position.x,
    nodesToConnect.source.position.y,
    nodesToConnect.source.size.w,
    nodesToConnect.source.size.h
  );

  // Detect vertical flow direction
  const isVertical =
    edgeProps.sourcePosition === Position.Bottom || edgeProps.targetPosition === Position.Top;

  // compare positions based on flow direction
  const isSourceHigherTarget = isVertical
    ? edgeProps.sourceY < edgeProps.targetY
    : edgeProps.sourceX < edgeProps.targetX;

  // count all edges in source and target
  const { sourceEdgesIds, targetEdgesIds } = useCountConnectedEdges(edgeProps.source, edgeProps.target);

  const edgeIndexInSource = sourceEdgesIds.findIndex((output) => output === edgeProps.id);
  const edgeIndexInTarget = targetEdgesIds.findIndex((input) => input === edgeProps.id);

  const edgeNumInSource =
    sourceEdgesIds.length === 1
      ? 1
      : isSourceHigherTarget
        ? sourceEdgesIds.length - (edgeIndexInSource - 0.5)
        : edgeIndexInSource;

  const edgeNumInTarget =
    targetEdgesIds.length === 1
      ? 1
      : isSourceHigherTarget
        ? edgeIndexInTarget
        : targetEdgesIds.length - (edgeIndexInTarget - 0.5);

  const edgePathParams: GetPointsParams = {
    sourceX: edgeProps.sourceX,
    sourceY: edgeProps.sourceY,
    targetX: edgeProps.targetX,
    targetY: edgeProps.targetY,
    sourceNodeBox,
    edgeNumInSource,
    edgeNumInTarget,
    isVertical,
  };

  const path = getPath(edgePathParams);

  return <BaseEdge path={path} markerEnd={edgeProps.markerEnd} />;
}
