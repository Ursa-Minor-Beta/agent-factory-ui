import { Stack, Select, Text } from '@mantine/core';
import type { LayoutDirection } from '../utils/converters';

const EDGE_TYPE_OPTIONS = [
  { value: 'default', label: 'Bezier' },
  { value: 'smart', label: 'Smart' },
  { value: 'smoothstep', label: 'Smooth Step' },
  { value: 'step', label: 'Step' },
  { value: 'straight', label: 'Straight' },
];

const LAYOUT_DIRECTION_OPTIONS = [
  { value: 'LR', label: 'Left → Right' },
  { value: 'TB', label: 'Top → Bottom' },
];

interface CanvasTabProps {
  edgeType: string;
  onEdgeTypeChange: (value: string) => void;
  layoutDirection: LayoutDirection;
  onLayoutDirectionChange: (value: LayoutDirection) => void;
}

export function CanvasTab({
  edgeType,
  onEdgeTypeChange,
  layoutDirection,
  onLayoutDirectionChange,
}: CanvasTabProps) {
  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={500} mb={4}>
          Layout Direction
        </Text>
        <Select
          size="xs"
          value={layoutDirection}
          onChange={(value) => value && onLayoutDirectionChange(value as LayoutDirection)}
          data={LAYOUT_DIRECTION_OPTIONS}
        />
      </div>
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
