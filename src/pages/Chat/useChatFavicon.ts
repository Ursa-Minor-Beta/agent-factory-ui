import { useEffect, useRef, useState } from 'react';
import { useDocumentVisibility } from '@mantine/hooks';

const FAVICON_URL = '/favicon.svg';
const SIZE = 64;
const BADGE_COLORS = {
  responding: '#fab005', // amber
  ready: '#94d82d', // lime green - warmer than plain green so it stands out against the cyan logo
} as const;

type BadgeStatus = keyof typeof BADGE_COLORS | null;

let baseImage: Promise<HTMLImageElement> | null = null;

function loadBaseImage() {
  baseImage ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = FAVICON_URL;
  });
  return baseImage;
}

async function renderBadge(color: string) {
  const img = await loadBaseImage();
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return FAVICON_URL;

  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  const r = SIZE * 0.22;
  const cx = SIZE - r - 2;
  const cy = SIZE - r - 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1b1e';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  return canvas.toDataURL('image/png');
}

function setFavicon(href: string) {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link) link.href = href;
}

/**
 * Badges the tab favicon: amber while the agent is responding,
 * green when a response finished while the tab was hidden (cleared on return).
 */
export function useChatFavicon(sending: boolean) {
  const visibility = useDocumentVisibility();
  const [ready, setReady] = useState(false);
  const wasSending = useRef(sending);

  useEffect(() => {
    if (wasSending.current && !sending && visibility === 'hidden') setReady(true);
    wasSending.current = sending;
  }, [sending, visibility]);

  useEffect(() => {
    if (visibility === 'visible' || sending) setReady(false);
  }, [visibility, sending]);

  const status: BadgeStatus = sending ? 'responding' : ready ? 'ready' : null;

  useEffect(() => {
    if (!status) {
      setFavicon(FAVICON_URL);
      return;
    }
    let cancelled = false;
    renderBadge(BADGE_COLORS[status])
      .then((href) => !cancelled && setFavicon(href))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => () => setFavicon(FAVICON_URL), []);
}
