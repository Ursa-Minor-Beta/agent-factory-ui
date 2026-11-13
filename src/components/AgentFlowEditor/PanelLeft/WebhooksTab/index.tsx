import { useCallback, useEffect, useState } from 'react';
import { ActionIcon, Alert, Badge, Button, Card, Code, Group, Loader, Menu, Stack, Switch, Text } from '@mantine/core';
import { IconAlertCircle, IconDots, IconPencil, IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
import { webhooksApi } from '../../../../api';
import type { Webhook } from '../../../../types';
import { formatRelativeTime } from '../../../../pages/Sessions/types';
import { CopyIconButton } from '../../../RunDetailsModal/CopyIconButton';
import { WebhookModal, WebhookConfirmModal, maskWebhookUrl, toAbsoluteUrl, hasHandler } from '../../../Webhooks';

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit' | 'rotate' | 'delete'; webhook: Webhook }
  | null;

export function WebhooksTab({ agentId, workspaceId }: { agentId: string; workspaceId?: string | null }) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setWebhooks((await webhooksApi.list({ agentId, limit: 100 })).webhooks);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    load();
  }, [load]);

  const replace = (updated: Webhook) =>
    setWebhooks((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));

  // Rotate changes only the URL - keep the rest of the row as is
  const updateUrl = ({ id, url }: Webhook) =>
    setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, url } : w)));

  const run = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
      throw e;
    }
  };

  // Stay in the modal on the saved webhook (after create it can be tested)
  const handleSaved = (saved: Webhook, isNew: boolean) => {
    if (isNew) {
      setWebhooks((prev) => [...prev, saved]);
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

  const handleRotate = (webhook: Webhook) => () => run(async () => {
    updateUrl(await webhooksApi.rotate(webhook.id));
  });

  const handleDelete = (webhook: Webhook) => () => run(async () => {
    await webhooksApi.delete(webhook.id);
    setWebhooks((prev) => prev.filter((w) => w.id !== webhook.id));
  });

  return (
    <Stack gap="sm">
      <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => setDialog({ kind: 'create' })}>
        New webhook
      </Button>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Group justify="center" py="md"><Loader size="sm" /></Group>
      ) : webhooks.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="md">No webhooks yet</Text>
      ) : (
        webhooks.map((webhook) => (
          <Card key={webhook.id} withBorder radius="lg" padding="xs">
            <Stack gap={6}>
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Text size="sm" fw={500} truncate>{webhook.name}</Text>
                <Group gap={4} wrap="nowrap">
                  <Switch
                    size="xs"
                    checked={webhook.enabled}
                    onChange={(e) => handleToggle(webhook, e.currentTarget.checked)}
                    aria-label="Enabled"
                  />
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <ActionIcon variant="subtle" size="sm" aria-label="Actions"><IconDots size={14} /></ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => setDialog({ kind: 'edit', webhook })}>Edit</Menu.Item>
                      <Menu.Item leftSection={<IconRefresh size={14} />} onClick={() => setDialog({ kind: 'rotate', webhook })}>Rotate URL</Menu.Item>
                      <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => setDialog({ kind: 'delete', webhook })}>Delete</Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Group>
              {hasHandler(webhook.handler) && (
                <Badge size="xs" variant="light" color="violet" w="fit-content">Custom handler</Badge>
              )}
              <Group gap={4} wrap="nowrap">
                <Code fz="xs" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                  {maskWebhookUrl(toAbsoluteUrl(webhook.url))}
                </Code>
                <CopyIconButton value={toAbsoluteUrl(webhook.url)} label="Copy URL" />
              </Group>
              <Text size="xs" c="dimmed">
                Last triggered: {webhook.lastTriggeredAt ? formatRelativeTime(webhook.lastTriggeredAt) : 'Never'}
              </Text>
            </Stack>
          </Card>
        ))
      )}

      <WebhookModal
        opened={dialog?.kind === 'create' || dialog?.kind === 'edit'}
        webhook={dialog?.kind === 'edit' ? dialog.webhook : null}
        agentId={agentId}
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
            onConfirm={handleRotate(dialog.webhook)}
          />
          <WebhookConfirmModal
            opened={dialog.kind === 'delete'}
            title="Delete webhook"
            message={`Delete "${dialog.webhook.name}"? Requests to its URL will stop starting runs.`}
            confirmLabel="Delete"
            onClose={() => setDialog(null)}
            onConfirm={handleDelete(dialog.webhook)}
          />
        </>
      )}
    </Stack>
  );
}
