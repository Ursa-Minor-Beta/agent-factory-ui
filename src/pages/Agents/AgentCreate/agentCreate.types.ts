import type { AgentNode } from '../../../types';

// Constants
export const TIPS_POSITION_KEY = 'agent-create-tips-position';
export const TIPS_PANEL_WIDTH = 320;
export const TIPS_PANEL_HEIGHT = 150;
export const DEFAULT_NODES: AgentNode[] = [];

// Types
export interface AgentCreateForm {
  name: string;
  description: string;
}

export interface AgentCreateModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: () => void;
  isMobile?: boolean;
}

export interface TipsPosition {
  x: number;
  y: number;
}

// Helper functions
export function loadTipsPosition(): TipsPosition {
  try {
    const saved = localStorage.getItem(TIPS_POSITION_KEY);
    if (saved) {
      const pos = JSON.parse(saved);
      if (typeof pos.x === 'number' && typeof pos.y === 'number') {
        return pos;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return { x: 20, y: 80 };
}

export function clampToViewport(pos: TipsPosition): TipsPosition {
  const maxX = window.innerWidth - TIPS_PANEL_WIDTH - 20;
  const maxY = window.innerHeight - TIPS_PANEL_HEIGHT - 20;
  return {
    x: Math.max(0, Math.min(pos.x, maxX)),
    y: Math.max(0, Math.min(pos.y, maxY)),
  };
}

export function generateNodeId(type: string, existingNodes: AgentNode[]): string {
  const prefix = `${type}-`;
  let maxNum = 0;
  for (const node of existingNodes) {
    if (node.id.startsWith(prefix)) {
      const numPart = node.id.slice(prefix.length);
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `${type}-${maxNum + 1}`;
}
