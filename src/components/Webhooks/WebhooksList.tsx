import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Code,
  Group,
  Loader,
  Pagination,
  Switch,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconAlertCircle, IconPencil, IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
import { webhooksApi } from '../../api';
import type { Webhook } from '../../types';
import { routes } from '../../config/routes';
import { formatRelativeTime } from '../../pages/Sessions/types';
import { CopyIconButton } from '../RunDetailsModal/CopyIconButton';
import { WorkspaceBadge } from '../Workspace';
import { WebhookModal } from './WebhookModal';
import { WebhookConfirmModal } from './WebhookConfirmModal';
import { maskWebhookUrl, hasHandler } from './utils';

export type WebhookColumn = 'workspace' | 'agent' | 'name' | 'url' | 'enabled' | 'lastTriggered' | 'created' | 'actions';

const PAGE_SIZE = 50;

const DEFAULT_COLUMNS: WebhookColumn[] = ['workspace', 'agent', 'name', 'url', 'enabled', 'lastTriggered', 'created', 'actions'];

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit' | 'rotate' | 'delete'; webhook: Webhook }
  | null;

interface WebhooksListProps {
  workspaceId?: string;
  description?: string;
  columns?: WebhookColumn[];
}

export function WebhooksList({ workspaceId, description = '', columns = DEFAULT_COLUMNS }: WebhooksListProps) {
  const showColumn = (col: WebhookColumn) => columns.includes(col);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await webhooksApi.list({ workspaceId, skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE });
      setWebhooks(data.webhooks);
      setTotal(data.total);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, page]);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

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

  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

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

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" withCloseButton onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              {showColumn('name') && <Table.Th>Name</Table.Th>}
              {showColumn('agent') && <Table.Th>Agent</Table.Th>}
              {showColumn('workspace') && <Table.Th>Workspace</Table.Th>}
              {showColumn('url') && <Table.Th>URL</Table.Th>}
              {showColumn('enabled') && <Table.Th>Enabled</Table.Th>}
              {showColumn('lastTriggered') && <Table.Th>Last Triggered</Table.Th>}
              {showColumn('created') && <Table.Th>Created</Table.Th>}
              {showColumn('actions') && <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {webhooks.map((webhook) => (
              <Table.Tr key={webhook.id}>
                {showColumn('name') && (
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Text size="sm">{webhook.name}</Text>
                      {hasHandler(webhook.handler) && <Badge size="xs" variant="light" color="violet">Custom handler</Badge>}
                    </Group>
                  </Table.Td>
                )}
                {showColumn('agent') && (
                  <Table.Td>
                    <Anchor component={Link} to={routes.agentEditor(webhook.agentId)} size="sm">
                      {webhook.agentName || webhook.agentId}
                    </Anchor>
                  </Table.Td>
                )}
                {showColumn('workspace') && (
                  <Table.Td>
                    <WorkspaceBadge workspaceId={webhook.workspaceId} workspaceName={webhook.workspaceName} />
                  </Table.Td>
                )}
                {showColumn('url') && (
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      <Code fz="xs">{maskWebhookUrl(webhook.url)}</Code>
                      <CopyIconButton value={webhook.url} label="Copy URL" />
                    </Group>
                  </Table.Td>
                )}
                {showColumn('enabled') && (
                  <Table.Td>
                    <Switch
                      size="xs"
                      checked={webhook.enabled}
                      onChange={(e) => handleToggle(webhook, e.currentTarget.checked)}
                      aria-label="Enabled"
                    />
                  </Table.Td>
                )}
                {showColumn('lastTriggered') && (
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {webhook.lastTriggeredAt ? formatRelativeTime(webhook.lastTriggeredAt) : 'Never'}
                    </Text>
                  </Table.Td>
                )}
                {showColumn('created') && (
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(webhook.createdAt).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                )}
                {showColumn('actions') && (
                  <Table.Td style={{ textAlign: 'right' }}>
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
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
            {webhooks.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Text ta="center" c="dimmed" py="md" size="sm">
                    No webhooks configured
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>

      {total > PAGE_SIZE && (
        <Group justify="center" mt="md">
          <Pagination total={Math.ceil(total / PAGE_SIZE)} value={page} onChange={setPage} />
        </Group>
      )}

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
