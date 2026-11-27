import { useCallback, useEffect, useRef, useState } from 'react';
import { useElementSize } from '@mantine/hooks';
import type { Viewport } from '@xyflow/react';
import type { GraphBounds } from '../types';

const FIT_PADDING = 16; // px around the graph
const FIT_MAX_ZOOM = 1; // never enlarge small graphs

function loadViewport(key: string | undefined): Viewport | null {
  if (!key) return null;
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

/**
 * Fit to width, centred horizontally, pinned to the top. Recomputed on container resize or new data;
 * returned as a controlled viewport so it applies immediately, while pan/zoom still update it via setViewport.
 * With `storageKey` the user's pan/zoom is remembered and restored instead of fitting.
 */
export function useFitWidthViewport(bounds: GraphBounds | null, topInset = 0, storageKey?: string) {
  const { ref, width: containerWidth } = useElementSize();
  const [viewport, setViewport] = useState<Viewport>(() => loadViewport(storageKey) ?? { x: 0, y: 0, zoom: 1 });
  // Once the user panned/zoomed (now or in a saved viewport), stop auto-fitting
  const userMoved = useRef(!!loadViewport(storageKey));

  useEffect(() => {
    if (!bounds || containerWidth === 0 || userMoved.current) return;
    const graphWidth = bounds.maxX - bounds.minX;
    const zoom = Math.min(FIT_MAX_ZOOM, (containerWidth - FIT_PADDING * 2) / graphWidth);
    setViewport({
      x: (containerWidth - graphWidth * zoom) / 2 - bounds.minX * zoom,
      y: FIT_PADDING + topInset - bounds.minY * zoom,
      zoom,
    });
  }, [bounds, containerWidth, topInset]);

  // A pan/zoom ended - remembered only when the user did it (an event), not a programmatic change
  const onMoveEnd = useCallback((event: MouseEvent | TouchEvent | null, next: Viewport) => {
    if (!storageKey || !event) return;
    userMoved.current = true;
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Storage unavailable
    }
  }, [storageKey]);

  return { ref, viewport, setViewport, onMoveEnd };
}
