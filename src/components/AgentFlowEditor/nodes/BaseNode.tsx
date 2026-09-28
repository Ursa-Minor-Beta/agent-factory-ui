import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export const BaseNode = memo(function BaseNode({ data, type }: NodeProps) {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <div className="node-content">
        {data?.label as string || type}
      </div>
      <Handle type="source" position={Position.Right} />
    </>
  );
});
