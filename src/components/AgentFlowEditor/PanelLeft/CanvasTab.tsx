import { Stack, Select, Text } from '@mantine/core';

const EDGE_TYPE_OPTIONS = [
  { value: 'smart', label: 'Smart' },
  { value: 'default', label: 'Bezier (Default)' },
  { value: 'straight', label: 'Straight' },
  { value: 'step', label: 'Step' },
  { value: 'smoothstep', label: 'Smooth Step' },
];

interface CanvasTabProps {
  edgeType: string;
  onEdgeTypeChange: (value: string) => void;
}

export function CanvasTab({ edgeType, onEdgeTypeChange }: CanvasTabProps) {
  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={500} mb={4}>
          Edge Style
        </Text>
        <Select
          size="xs"
          value={edgeType}
          onChange={(value) => value && onEdgeTypeChange(value)}
          data={EDGE_TYPE_OPTIONS}
        />
      </div>
    </Stack>
  );
}
