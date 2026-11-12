import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActionIcon, Anchor, Badge, Box, Button, Code, Group, Switch, Text, Tooltip } from '@mantine/core';
import { IconPencil, IconPlus, IconRefresh, IconRobot, IconSearch, IconTrash } from '@tabler/icons-react';
import { webhooksApi } from '../../api';
import type { ListWebhooksOptions, WebhooksSortBy } from '../../api/webhooks';
import type { Webhook } from '../../types';
import { routes } from '../../config/routes';
import { formatRelativeTime } from '../../pages/Sessions/types';
import {
  DataTable,
  type DataTableColumn,
  type DataTableHandle,
  type DataTableQuery,
  type SortValue,
} from '../common/DataTable';
import { CopyIconButton } from '../RunDetailsModal/CopyIconButton';
import { WorkspaceBadge, useWorkspaceFilterOptions, GLOBAL_WORKSPACE } from '../Workspace';
import { WebhookModal } from './WebhookModal';
import { WebhookConfirmModal } from './WebhookConfirmModal';
import { maskWebhookUrl, hasHandler } from './utils';

export type WebhookColumn = 'workspace' | 'agent' | 'name' | 'url' | 'enabled' | 'lastTriggered' | 'created' | 'actions';

interface WebhooksFilters {
  workspaceId: string | null;
  agentId: string;
  name: string;
  enabled: string | null;
}

const INITIAL_SORT: SortValue<WebhooksSortBy> = { sortBy: 'createdAt', sortOrder: 'desc' };

const ENABLED_OPTIONS = [
  { value: 'true', label: 'Enabled' },
  { value: 'false', label: 'Disabled' },
];

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit' | 'rotate' | 'delete'; webhook: Webhook }
  | null;

interface WebhooksListProps {
  workspaceId?: string;
  description?: string;
  /** Columns to leave out; all are shown by default */
  excludeColumns?: WebhookColumn[];
}

export function WebhooksList({ workspaceId, description = '', excludeColumns = [] }: WebhooksListProps) {
  const showColumn = (col: WebhookColumn) => !excludeColumns.includes(col);
  const tableRef = useRef<DataTableHandle<Webhook>>(null);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const workspaceOptions = useWorkspaceFilterOptions(workspaceId === undefined);

  const loadWebhooks = async ({
    filters,
    sort,
    page,
    pageSize,
  }: DataTableQuery<WebhooksFilters, WebhooksSortBy>) => {
    const options: ListWebhooksOptions = { ...sort, skip: (page - 1) * pageSize, limit: pageSize };
    const workspace = workspaceId ?? filters.workspaceId;
    if (workspace) options.workspaceId = workspace === GLOBAL_WORKSPACE ? null : workspace;
    if (filters.agentId) options.agentId = filters.agentId;
    if (filters.name) options.name = filters.name;
    if (filters.enabled) options.enabled = filters.enabled === 'true';

    const data = await webhooksApi.list(options);
    return { rows: data.webhooks, total: data.total };
  };

  const setWebhooks = (update: (rows: Webhook[]) => Webhook[]) => tableRef.current?.setRows(update);
  const setTotal = (update: (total: number) => number) => tableRef.current?.setTotal(update);

  const replace = (updated: Webhook) =>
    setWebhooks((prev) => prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)));

  // Rotate changes only the URL - keep the rest of the row as is
  const updateUrl = ({ id, url }: Webhook) =>
    setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, url } : w)));

  const run = async (action: () => Promise<void>) => {
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
      throw err;
    }
  };

  // Stay in the modal on the saved webhook (after create it can be tested)
  const handleSaved = (saved: Webhook, isNew: boolean) => {
    if (isNew) {
      setWebhooks((prev) => [...prev, saved]);
      setTotal((t) => t + 1);
      setDialog({ kind: 'edit', webhook: saved });
    } else {
      replace(saved);
      setDialog({ kind: 'edit', webhook: saved });
    }
  };

  const handleToggle = (webhook: Webhook, enabled: boolean) => {
    replace({ ...webhook, enabled });
    run(async () => {
      replace(await webhooksApi.update(webhook.id, { enabled }));
    }).catch(() => replace(webhook));
  };

  const columns: DataTableColumn<Webhook, WebhooksFilters>[] = [
    {
      key: 'name',
      header: 'Name',
      hidden: !showColumn('name'),
      sortable: true,
      filter: { type: 'text', key: 'name', placeholder: 'Search by name', icon: <IconSearch size={16} /> },
      render: (webhook) => (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm">{webhook.name}</Text>
          {hasHandler(webhook.handler) && <Badge size="xs" variant="light" color="violet">Custom handler</Badge>}
        </Group>
      ),
    },
    {
      key: 'agent',
      header: 'Agent',
      hidden: !showColumn('agent'),
      filter: { type: 'text', key: 'agentId', placeholder: 'Agent ID', icon: <IconRobot size={16} /> },
      render: (webhook) => (
        <Anchor component={Link} to={routes.agentEditor(webhook.agentId)} size="sm">
          {webhook.agentName || webhook.agentId}
        </Anchor>
      ),
    },
    {
      key: 'workspace',
      header: 'Workspace',
      hidden: !showColumn('workspace'),
      // Only when the list isn't already scoped to one workspace
      filter:
        workspaceId === undefined
          ? { type: 'select', key: 'workspaceId', placeholder: 'Workspace', options: workspaceOptions }
          : undefined,
      render: (webhook) => (
        <WorkspaceBadge workspaceId={webhook.workspaceId} workspaceName={webhook.workspaceName} />
      ),
    },
    {
      key: 'url',
      header: 'URL',
      hidden: !showColumn('url'),
      render: (webhook) => (
        <Group gap={4} wrap="nowrap">
          <Code fz="xs">{maskWebhookUrl(webhook.url)}</Code>
          <CopyIconButton value={webhook.url} label="Copy URL" />
        </Group>
      ),
    },
    {
      key: 'enabled',
      header: 'Enabled',
      hidden: !showColumn('enabled'),
      filter: { type: 'select', key: 'enabled', placeholder: 'Status', options: ENABLED_OPTIONS },
      render: (webhook) => (
        <Switch
          size="xs"
          checked={webhook.enabled}
          onChange={(e) => handleToggle(webhook, e.currentTarget.checked)}
          aria-label="Enabled"
        />
      ),
    },
    {
      key: 'lastTriggeredAt',
      header: 'Last Triggered',
      sortable: true,
      hidden: !showColumn('lastTriggered'),
      render: (webhook) => (
        <Text size="sm" c="dimmed">
          {webhook.lastTriggeredAt ? formatRelativeTime(webhook.lastTriggeredAt) : 'Never'}
        </Text>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      hidden: !showColumn('created'),
      render: (webhook) => (
        <Text size="sm" c="dimmed">
          {new Date(webhook.createdAt).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'actions',
      pinned: true,
      header: 'Actions',
      align: 'right',
      hidden: !showColumn('actions'),
      render: (webhook) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <Tooltip label="Edit">
            <ActionIcon variant="subtle" onClick={() => setDialog({ kind: 'edit', webhook })}>
              <IconPencil size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Rotate URL">
            <ActionIcon variant="subtle" color="orange" onClick={() => setDialog({ kind: 'rotate', webhook })}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete">
            <ActionIcon variant="subtle" color="red" onClick={() => setDialog({ kind: 'delete', webhook })}>
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    },
  ];

  return (
    <Box>
      <Group mb="md" justify="space-between" gap="sm">
        <Text c="dimmed" size="sm">
          {description}
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setDialog({ kind: 'create' })}>
          Add Webhook
        </Button>
      </Group>

      <DataTable
        // Remount on workspace change so the list reloads for the new workspace
        key={workspaceId ?? 'all'}
        ref={tableRef}
        columns={columns}
        getRowId={(webhook) => webhook.id}
        loadData={loadWebhooks}
        error={error}
        onErrorClose={() => setError('')}
        emptyMessage="No webhooks configured"
        noMatchMessage="No webhooks match your filters"
        initialSort={INITIAL_SORT}
        itemLabel={['webhook', 'webhooks']}
      />

      <WebhookModal
        opened={dialog?.kind === 'create' || dialog?.kind === 'edit'}
        webhook={dialog?.kind === 'edit' ? dialog.webhook : null}
        workspaceId={workspaceId}
        onClose={() => setDialog(null)}
        onSaved={handleSaved}
        onRotated={updateUrl}
      />
      {(dialog?.kind === 'rotate' || dialog?.kind === 'delete') && (
        <>
          <WebhookConfirmModal
            opened={dialog.kind === 'rotate'}
            title="Rotate webhook URL"
            message={`A new URL will be generated for "${dialog.webhook.name}". The old URL stops working immediately.`}
            confirmLabel="Rotate"
            onClose={() => setDialog(null)}
            onConfirm={() => run(async () => {
              updateUrl(await webhooksApi.rotate(dialog.webhook.id));
            })}
          />
          <WebhookConfirmModal
            opened={dialog.kind === 'delete'}
            title="Delete webhook"
            message={`Delete "${dialog.webhook.name}"? Requests to its URL will stop starting runs.`}
            confirmLabel="Delete"
            onClose={() => setDialog(null)}
            onConfirm={() => run(async () => {
              await webhooksApi.delete(dialog.webhook.id);
              setWebhooks((prev) => prev.filter((w) => w.id !== dialog.webhook.id));
              setTotal((t) => t - 1);
            })}
          />
        </>
      )}
    </Box>
  );
}
