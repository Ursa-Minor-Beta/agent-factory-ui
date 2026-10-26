import { useEffect, useRef } from 'react';

const DURATION = '0.1s';
// Trail lingers after the photon arrives, then slowly dims
const TRAIL_DURATION = '.5s';

// Single glowing dot sent once along the edge path to the next node
export function EdgePhoton({ path }: { path: string }) {
  const animRefs = useRef<(SVGAnimationElement | null)[]>([]);
  const setRef = (i: number) => (el: SVGAnimationElement | null) => {
    animRefs.current[i] = el;
  };

  // begin="indefinite" + manual start: SMIL "0s" is document time, so mounted later it would already be finished
  useEffect(() => {
    animRefs.current.forEach((el) => el?.beginElement());
  }, []);

  return (
    <g>
      {/* Trail is drawn behind the photon (dash reveal), then fades slowly */}
      <path d={path} className="edge-photon-trail" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} opacity={0}>
        <animate ref={setRef(0)} attributeName="stroke-dashoffset" from="1" to="0" dur={DURATION} begin="indefinite" fill="freeze" />
        <animate
          ref={setRef(1)}
          attributeName="opacity"
          values="1;1;0"
          keyTimes="0;0.15;1"
          dur={TRAIL_DURATION}
          begin="indefinite"
          fill="freeze"
        />
      </path>
      <circle r={4} className="edge-photon" opacity={0}>
        <animateMotion ref={setRef(2)} dur={DURATION} begin="indefinite" fill="freeze" path={path} />
        <animate
          ref={setRef(3)}
          attributeName="opacity"
          values="1;1;0"
          keyTimes="0;0.85;1"
          dur={DURATION}
          begin="indefinite"
          fill="freeze"
        />
      </circle>
    </g>
  );
}
