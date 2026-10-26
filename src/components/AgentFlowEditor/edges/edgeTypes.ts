import type { EdgeTypes } from '@xyflow/react';
import { EdgeSmart } from './EdgeSmart';
import { EdgeBezier, EdgeSmoothStep, EdgeStepSharp, EdgeStraight } from './EdgeStep';

export const edgeTypes: EdgeTypes = {
  default: EdgeBezier,
  smart: EdgeSmart,
  smoothstep: EdgeSmoothStep,
  step: EdgeStepSharp,
  straight: EdgeStraight,
};
