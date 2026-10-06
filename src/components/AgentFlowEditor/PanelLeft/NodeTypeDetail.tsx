import { Box } from '@mantine/core';
import type { NodeType } from '../../../api';
import { JsonEditor } from '../../JsonEditor';

interface NodeTypeDetailProps {
  nodeType: NodeType;
}

export function NodeTypeDetail({ nodeType }: NodeTypeDetailProps) {
  return (
    <Box style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }} p="xs">
      <JsonEditor value={nodeType} readOnly height="100%" showLineNumbers={false} />
    </Box>
  );
}
