import { useEffect, useRef } from 'react';

const DURATION = '0.1s';

// Single glowing dot sent once along the edge path to the next node
export function EdgePhoton({ path }: { path: string }) {
  const motionRef = useRef<SVGAnimateMotionElement>(null);
  const fadeRef = useRef<SVGAnimateElement>(null);

  // begin="indefinite" + manual start: SMIL "0s" is document time, so mounted later it would already be finished
  useEffect(() => {
    motionRef.current?.beginElement();
    fadeRef.current?.beginElement();
  }, []);

  return (
    // Edge highlight + dot share one fade, so the edge is lit only while the photon travels
    <g opacity={0}>
      <path d={path} className="edge-photon-trail" />
      <circle r={4} className="edge-photon">
        <animateMotion ref={motionRef} dur={DURATION} begin="indefinite" fill="freeze" path={path} />
      </circle>
      <animate
        ref={fadeRef}
        attributeName="opacity"
        values="1;1;0"
        keyTimes="0;0.85;1"
        dur={DURATION}
        begin="indefinite"
        fill="freeze"
      />
    </g>
  );
}
