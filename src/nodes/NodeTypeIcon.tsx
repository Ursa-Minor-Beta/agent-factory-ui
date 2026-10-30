import type { IconProps } from '@tabler/icons-react';
import { getNodeTypeMeta } from './meta';

interface NodeTypeIconProps extends IconProps {
  type?: string;
}

export function NodeTypeIcon({ type, ...props }: NodeTypeIconProps) {
  const { icon: IconComponent } = getNodeTypeMeta(type);
  return <IconComponent {...props} />;
}
