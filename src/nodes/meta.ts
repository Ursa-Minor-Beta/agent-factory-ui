import {
  IconArrowRightToArc,
  IconArrowLeftFromArc,
  IconCpu2,
  IconWorld,
  IconCode,
  IconRobot,
  IconGitBranch,
  IconDatabasePlus,
  IconDatabaseSearch,
  IconDatabaseEdit,
  IconDatabaseMinus,
  IconBox,
  type Icon,
} from '@tabler/icons-react';
import type { NodeTypeName } from './types';

export interface NodeTypeMeta {
  icon: Icon;
}

export const nodeTypeMeta: Record<NodeTypeName, NodeTypeMeta> = {
  input: { icon: IconArrowRightToArc },
  output: { icon: IconArrowLeftFromArc },
  llm: { icon: IconCpu2 },
  http: { icon: IconWorld },
  js: { icon: IconCode },
  agent: { icon: IconRobot },
  branch: { icon: IconGitBranch },
  'memory-store': { icon: IconDatabasePlus },
  'memory-search': { icon: IconDatabaseSearch },
  'memory-update': { icon: IconDatabaseEdit },
  'memory-delete': { icon: IconDatabaseMinus },
};

const fallbackMeta: NodeTypeMeta = { icon: IconBox };

// Accepts any string since node types may come from the backend unvalidated
export const getNodeTypeMeta = (type?: string): NodeTypeMeta =>
  nodeTypeMeta[type as NodeTypeName] ?? fallbackMeta;
