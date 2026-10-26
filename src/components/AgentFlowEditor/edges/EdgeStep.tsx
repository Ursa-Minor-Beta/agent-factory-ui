import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { EdgePhoton } from './EdgePhoton';

// Built-in smoothstep/step edges re-implemented to support run photons
function createStepEdge(borderRadius?: number) {
  return function EdgeStep(props: EdgeProps) {
    const [path] = getSmoothStepPath({ ...props, borderRadius });
    return (
      <>
        <BaseEdge path={path} markerEnd={props.markerEnd} />
        {props.data?.photon === true && <EdgePhoton path={path} />}
      </>
    );
  };
}

export const EdgeSmoothStep = createStepEdge();
export const EdgeStepSharp = createStepEdge(0);
