import { BaseEdge, getBezierPath, getSmoothStepPath, getStraightPath, type EdgeProps } from '@xyflow/react';
import { EdgePhoton } from './EdgePhoton';

// Built-in edges re-implemented to support run photons
function createPhotonEdge(getPath: (props: EdgeProps) => string) {
  return function EdgeWithPhoton(props: EdgeProps) {
    const path = getPath(props);
    return (
      <>
        <BaseEdge path={path} markerEnd={props.markerEnd} />
        {typeof props.data?.photon === 'number' && <EdgePhoton path={path} runningMs={props.data.photon} />}
      </>
    );
  };
}

export const EdgeBezier = createPhotonEdge((props) => getBezierPath(props)[0]);
export const EdgeStraight = createPhotonEdge((props) => getStraightPath(props)[0]);
export const EdgeSmoothStep = createPhotonEdge((props) => getSmoothStepPath(props)[0]);
export const EdgeStepSharp = createPhotonEdge((props) => getSmoothStepPath({ ...props, borderRadius: 0 })[0]);
