import type { EdgeTypes } from '@xyflow/react';
import { EdgeSmart } from './EdgeSmart';
import { EdgeSmoothStep, EdgeStepSharp } from './EdgeStep';

export const edgeTypes: EdgeTypes = {
  smart: EdgeSmart,
  smoothstep: EdgeSmoothStep,
  step: EdgeStepSharp,
};
