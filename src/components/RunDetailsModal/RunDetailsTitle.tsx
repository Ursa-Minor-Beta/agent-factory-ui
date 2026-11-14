import { Link } from 'react-router-dom';
import { ActionIcon, Anchor, Breadcrumbs, Group, Text, Tooltip } from '@mantine/core';
import { IconArrowLeft, IconExternalLink, IconPlayerStop, IconRefresh } from '@tabler/icons-react';
import { routes } from '../../config/routes';
import type { Run } from '../../types';
import { buildRunDetailsSearch, type RunTrailItem } from './useRunDetailsModal';
import { RunStatusBadge } from './RunStatusBadge';
import { CopyIconButton, toJson } from './CopyIconButton';

interface RunDetailsTitleProps {
  run: Run | null;
  trail: RunTrailItem[];
  showBackButton: boolean;
  onBack: () => void;
  loading: boolean;
  cancelling: boolean;
  onRefresh: () => void;
  onCancel: () => void;
}

// Breadcrumbs of parent runs + status and actions
export function RunDetailsTitle({ run, trail, showBackButton, onBack, loading, cancelling, onRefresh, onCancel }: RunDetailsTitleProps) {
  const active = run && (run.status === 'pending' || run.status === 'running');
  return (
    <Group gap="sm">
      {showBackButton && (
        <ActionIcon variant="subtle" size="sm" onClick={onBack}>
          <IconArrowLeft size={16} />
        </ActionIcon>
      )}
      <Breadcrumbs separatorMargin={6}>
        {trail.map((item, index) => (
          <Anchor key={item.id} component={Link} to={buildRunDetailsSearch(item.id, trail.slice(0, index))} size="sm">
            {item.name}
          </Anchor>
        ))}
        <Text fw={600}>{run ? run.agentName || run.agentId : 'Run Details'}</Text>
      </Breadcrumbs>
      {run && (
        <>
          <RunStatusBadge status={run.status} size="md" withIcon={false} />
          {active && (
            <Tooltip label="Stop">
              <ActionIcon variant="subtle" size="sm" color="red" onClick={onCancel} loading={cancelling}>
                <IconPlayerStop size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          {(active || run.status === 'cancelling') && (
            <Tooltip label="Refresh">
              <ActionIcon variant="subtle" size="sm" onClick={onRefresh} loading={loading}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          <CopyIconButton value={toJson(run)} label="Copy entire run" size="sm" iconSize={16} />
          <Tooltip label="Open full page">
            <ActionIcon variant="subtle" size="sm" component={Link} to={routes.runDetails(trail[0]?.id ?? run.id, run.id)}>
              <IconExternalLink size={16} />
            </ActionIcon>
          </Tooltip>
        </>
      )}
    </Group>
  );
}
