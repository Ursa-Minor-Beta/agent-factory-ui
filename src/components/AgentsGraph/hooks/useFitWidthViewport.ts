import { useEffect, useState } from 'react';
import { useElementSize } from '@mantine/hooks';
import type { Viewport } from '@xyflow/react';
import type { GraphBounds } from '../types';

const FIT_PADDING = 16; // px around the graph
const FIT_MAX_ZOOM = 1; // never enlarge small graphs

/**
 * Fit to width, centred horizontally, pinned to the top. Recomputed on container resize or new data;
 * returned as a controlled viewport so it applies immediately, while pan/zoom still update it via setViewport.
 */
export function useFitWidthViewport(bounds: GraphBounds | null, topInset = 0) {
  const { ref, width: containerWidth } = useElementSize();
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });

  useEffect(() => {
    if (!bounds || containerWidth === 0) return;
    const graphWidth = bounds.maxX - bounds.minX;
    const zoom = Math.min(FIT_MAX_ZOOM, (containerWidth - FIT_PADDING * 2) / graphWidth);
    setViewport({
      x: (containerWidth - graphWidth * zoom) / 2 - bounds.minX * zoom,
      y: FIT_PADDING + topInset - bounds.minY * zoom,
      zoom,
    });
  }, [bounds, containerWidth, topInset]);

  return { ref, viewport, setViewport };
}
