import { memo, useEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
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
import { branchHandleId, canRunAfter } from '../utils/converters';

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

const rotate = (type: string, isVertical: boolean) => {
  switch(type) {
    case 'input':
    case 'output':
      return isVertical ? { transform: 'rotate(90deg)' } : undefined;
    case 'branch':
      return isVertical ? { transform: 'rotate(180deg)' } : { transform: 'rotate(90deg)' };
    default:
      return undefined;
  }
}

export const BaseNode = memo(function BaseNode({ id, data, type, sourcePosition, targetPosition }: NodeProps) {
  const IconComponent = nodeIcons[type];

  // Rotate input/output icons based on flow direction (TB = 90deg)
  const isVertical = sourcePosition === Position.Bottom || targetPosition === Position.Top;

  const branchSources = type === 'branch' && Array.isArray(data.branches)
    ? (data.branches as { name?: string }[])
    : [];
  const sourcePos = sourcePosition ?? Position.Right;

  // Re-measure handles when branch handles are added/removed, otherwise their edges aren't rendered
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, branchSources.length, isVertical, updateNodeInternals]);

  // Spread plain output + branch handles evenly along the source side
  const handleOffsetStyle = (slot: number) => {
    const offset = `${((slot + 1) / (branchSources.length + 2)) * 100}%`;
    return isVertical ? { left: offset } : { top: offset };
  };


  return (
    <>
      <Handle
          type="target"
          isConnectableStart={false}
          position={targetPosition ?? Position.Left}
          hidden={type === 'input'}
          />
      <Box
          style={{ textAlign:
          'center', minWidth: '80px' }}
          >
        {IconComponent && (
          <IconComponent
            size={36}
            stroke={1}
            style={ rotate(type, isVertical) }
          />
        )}
        <Box fz="xs" c="cyan">{id || ''}</Box>
      </Box>
      {/* Plain output (no branch selection) - first slot when branch handles exist.
          Dragging from it to another node adds a runAfter ordering dependency */}
      <Handle
          type="source"
          isConnectableStart={canRunAfter(type)}
          position={sourcePos}
          hidden={type === 'output'}
          style={branchSources.length > 0 ? handleOffsetStyle(0) : undefined}
          >
          {branchSources.length > 0 && 
            <Box
              fz={8}
              c="dimmed"
              style={{
                position: 'absolute',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                ...(isVertical
                  ? { top: 8, left: '50%', transform: 'translateX(-50%)' }
                  : { left: 8, top: '50%', transform: 'translateY(-50%)' }),
              }}
              >output</Box>
          }
      </Handle>
      
      {/* One source handle per branch, spread along the source side after the plain output */}
      {branchSources.map((branch, index) => (
            <Handle
                key={index}
                isConnectableStart={false}
                id={branchHandleId(index)}
                type="source"
                position={sourcePos}
                title={branch?.name}
                style={handleOffsetStyle(index + 1)}
                >
              <Box
                  fz={8}
                  c="dimmed"
                  style={{
                    position: 'absolute',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    ...(isVertical
                      ? { top: 8, left: '50%', transform: 'translateX(-50%)' }
                      : { left: 8, top: '50%', transform: 'translateY(-50%)' }),
                  }}
                  >
                {branch?.name}
              </Box>
            </Handle>
      ))}
    </>
  );
});
