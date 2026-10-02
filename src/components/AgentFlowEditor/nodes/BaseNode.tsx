import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box } from '@mantine/core';
import {
  IconWorld,
  IconCode,
  IconRobot,
  IconGitBranch,
  type Icon,
  IconArrowRightToArc,
  IconArrowLeftFromArc,
  IconCpu2,
  IconDatabasePlus,
  IconDatabaseSearch,
  IconDatabaseEdit,
  IconDatabaseMinus,
} from '@tabler/icons-react';

const nodeIcons: Record<string, Icon> = {
  input: IconArrowRightToArc,
  output: IconArrowLeftFromArc,
  llm: IconCpu2,
  http: IconWorld,
  js: IconCode,
  agent: IconRobot,
  branch: IconGitBranch,
  'memory-store': IconDatabasePlus,
  'memory-search': IconDatabaseSearch,
  'memory-update': IconDatabaseEdit,
  'memory-delete': IconDatabaseMinus,
};

export const BaseNode = memo(function BaseNode({ id, type, sourcePosition, targetPosition }: NodeProps) {
  const IconComponent = nodeIcons[type];

  return (
    <>
      <Handle 
          type="target" 
          position={targetPosition ?? Position.Left} 
          hidden={type === 'input'} 
          />
      <Box 
          style={{ textAlign: 
          'center', minWidth: '80px' }}
          >
        {IconComponent && <IconComponent size={36} stroke={1} />}
        <Box fz="xs" c="cyan">{id || ''}</Box>
      </Box>
      <Handle 
          type="source" 
          position={sourcePosition ?? Position.Right} 
          hidden={type === 'output'}
          />
    </>
  );
});
