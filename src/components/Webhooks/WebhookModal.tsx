import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ActionIcon,
  Alert,
  Anchor,
  Box,
  Button,
  Code,
  Group,
  Modal,
  Menu,
  SegmentedControl,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconAlertCircle, IconAlertTriangle, IconCheck, IconChevronDown, IconRefresh } from '@tabler/icons-react';
import { agentsApi, ApiError, secretsApi, webhooksApi } from '../../api';
import type { Secret, Webhook, WebhookTemplate } from '../../types';
import { routes } from '../../config/routes';
import { JsonEditor } from '../JsonEditor';
import { WorkspaceBadge } from '../Workspace';
import { CopyIconButton } from '../RunDetailsModal/CopyIconButton';
import { WebhookTestPanel } from './WebhookTestPanel';
import { WebhookConfirmModal } from './WebhookConfirmModal';
import { HANDLER_SKELETON, hasHandler, maskWebhookUrl } from './utils';

const AGENT_SEARCH_LIMIT = 20;
const HANDLER_MODE = { base: 'base', custom: 'custom' } as const;
type HandlerMode = (typeof HANDLER_MODE)[keyof typeof HANDLER_MODE];
const HANDLER_MODE_OPTIONS = [
  { label: 'Default', value: HANDLER_MODE.base },
  { label: 'Custom', value: HANDLER_MODE.custom },
];
const DEFAULT_TEMPLATE_ID = 'default';
// Fixed tab panel height so the modal doesn't resize when switching tabs
const PANEL_HEIGHT = '80vh';

type AgentOption = { value: string; label: string; workspaceId: string | null; workspaceName?: string };

interface WebhookModalProps {
  opened: boolean;
  onClose: () => void;
  webhook: Webhook | null; // null = create
  agentId?: string; // fixed agent (editor tab); otherwise an agent picker is shown on create
  workspaceId?: string | null; // agent's workspace, or the picker's scope
  onSaved: (webhook: Webhook, isNew: boolean) => void; // modal stays open; it calls onClose itself for "& close"
  onRotated?: (webhook: Webhook) => void; // URL rotated - modal stays open
}

export function WebhookModal({ opened, onClose, webhook, agentId: fixedAgentId, workspaceId, onSaved, onRotated }: WebhookModalProps) {
  const isNew = !webhook;
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentWorkspaceId, setAgentWorkspaceId] = useState<string | null>(null);
  const [mode, setMode] = useState<HandlerMode>(HANDLER_MODE.base);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [handler, setHandler] = useState('');
  const [handlerError, setHandlerError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<string | null>('settings');
  const [url, setUrl] = useState('');
  const [rotateOpened, setRotateOpened] = useState(false);
  const [templates, setTemplates] = useState<WebhookTemplate[]>([]);
  const [secrets, setSecrets] = useState<Secret[] | null>(null);

  // Reset form when opened or switched to another webhook (e.g. right after create)
  useEffect(() => {
    if (!opened) return;
    setName(webhook?.name ?? '');
    setUrl(webhook?.url ?? '');
    setHandler(webhook?.handler ?? '');
    setMode(hasHandler(webhook?.handler) ? HANDLER_MODE.custom : HANDLER_MODE.base);
    setTemplateId(null);
    setAgentId(fixedAgentId ?? webhook?.agentId ?? null);
    setAgentWorkspaceId(workspaceId ?? null);
    setNameError('');
    setHandlerError('');
    setError('');
    if (!webhook) setTab('settings');
  }, [opened, webhook?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reset per webhook only

  useEffect(() => {
    if (!opened || templates.length > 0) return;
    webhooksApi.templates().then(setTemplates).catch((err) => console.error('Failed to load webhook templates:', err));
  }, [opened, templates.length]);

  // 'default' template = the documented base handler; also the starting code for Custom
  const defaultTemplate = templates.find((t) => t.id === DEFAULT_TEMPLATE_ID);
  const template = mode === HANDLER_MODE.custom ? templates.find((t) => t.id === templateId) : undefined;

  useEffect(() => {
    if (!template?.requiredSecrets.length || secrets) return;
    secretsApi.list().then(setSecrets).catch((err) => console.error('Failed to load secrets:', err));
  }, [template, secrets]);

  // Secrets resolve from the agent's workspace, falling back to global
  const secretExists = (secretName: string) =>
    secrets?.some((s) => s.name === secretName && (!s.workspaceId || s.workspaceId === agentWorkspaceId)) ?? false;

  // Base keeps the editor text, so switching back to Custom restores it
  const handleModeChange = (next: HandlerMode) => {
    setMode(next);
    setHandlerError('');
    if (next === HANDLER_MODE.custom && !hasHandler(handler)) setHandler(defaultTemplate?.code ?? HANDLER_SKELETON);
  };

  const applyTemplate = (picked: WebhookTemplate) => {
    setTemplateId(picked.id);
    setHandler(picked.code);
    setHandlerError('');
  };

  const handleRotate = async () => {
    if (!webhook) return;
    setError('');
    try {
      const rotated = await webhooksApi.rotate(webhook.id);
      setUrl(rotated.url);
      onRotated?.(rotated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate URL');
      throw err;
    }
  };

  const handleSave = async (close: boolean) => {
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    if (isNew && !agentId) {
      setError('Pick an agent');
      return;
    }
    setSaving(true);
    setError('');
    setHandlerError('');
    const handlerValue = mode === HANDLER_MODE.custom && hasHandler(handler) ? handler : null;
    try {
      const saved = isNew
        ? await webhooksApi.create({ agentId: agentId!, name: name.trim(), ...(handlerValue && { handler: handlerValue }) })
        : await webhooksApi.update(webhook.id, { name: name.trim(), handler: handlerValue });
      onSaved(saved, isNew);
      if (close) onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save webhook';
      // 400 on save = handler syntax error
      if (err instanceof ApiError && err.status === 400 && handlerValue) setHandlerError(message);
      else setError(message);
    } finally {
      setSaving(false);
    }
  };

  const unsavedHandler = !!webhook && (webhook.handler ?? '') !== (mode === HANDLER_MODE.custom ? handler : '');

  const settings = (
    <Stack gap="lg">
      <TextInput
        label="Name"
        placeholder="e.g. GitHub push"
        data-autofocus
        value={name}
        onChange={(e) => {
          setName(e.currentTarget.value);
          setNameError('');
        }}
        error={nameError}
      />
      {isNew && !fixedAgentId && (
        <AgentPicker
          workspaceId={workspaceId ?? undefined}
          value={agentId}
          onChange={(option) => {
            setAgentId(option?.value ?? null);
            setAgentWorkspaceId(option?.workspaceId ?? null);
          }}
        />
      )}
      {agentId && (!isNew || fixedAgentId) && (
        <TextInput
          label="Agent"
          readOnly
          value={webhook?.agentName || agentId}
          description={webhook?.agentName ? `ID: ${agentId}` : undefined}
          rightSection={<CopyIconButton value={agentId} label="Copy agent ID" />}
        />
      )}
      {webhook && (
        <TextInput
          label="URL"
          readOnly
          value={maskWebhookUrl(url)}
          styles={{ input: { fontFamily: 'monospace' } }}
          rightSectionWidth={64}
          rightSection={
            <Group gap={2} wrap="nowrap">
              <CopyIconButton value={url} label="Copy URL" />
              <Tooltip label="Rotate URL">
                <ActionIcon variant="subtle" size="xs" color="orange" onClick={() => setRotateOpened(true)} aria-label="Rotate URL">
                  <IconRefresh size={12} />
                </ActionIcon>
              </Tooltip>
            </Group>
          }
        />
      )}

      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap="md">
            <Text size="sm" fw={500}>Handler</Text>
            <SegmentedControl
              size="xs"
              value={mode}
              onChange={(v) => handleModeChange(v as HandlerMode)}
              data={HANDLER_MODE_OPTIONS}
            />
          </Group>
          {mode === HANDLER_MODE.custom && (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button size="compact-xs" variant="light" rightSection={<IconChevronDown size={12} />} disabled={templates.length === 0}>
                  Templates
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Replaces the current code</Menu.Label>
                {templates.map((t) => (
                  <Menu.Item key={t.id} onClick={() => applyTemplate(t)}>{t.name}</Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>


        {mode === HANDLER_MODE.custom ? (
          <Stack gap="xs">
            <JsonEditor
              value={null}
              mode="javascript"
              text={handler}
              onTextChange={(text) => {
                setHandler(text);
                setHandlerError('');
              }}
              height={320}
            />
            {handlerError && (
              <Text size="xs" c="red" style={{ whiteSpace: 'pre-wrap' }}>{handlerError}</Text>
            )}
            {template && (
              <>
                <Text size="sm" c="dimmed">{template.description}</Text>
              </>
            )}
            {template && template.requiredSecrets.length > 0 && (
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={500} mb="xs">Required secrets</Text>
                <Stack gap={2}>
                  {template.requiredSecrets.map((secretName) => {
                    const exists = secretExists(secretName);
                    return (
                      <Group key={secretName} gap={6}>
                        {exists
                          ? <IconCheck size={14} color="var(--mantine-color-green-6)" />
                          : <IconAlertTriangle size={14} color="var(--mantine-color-yellow-6)" />}
                        <Code fz="xs">{secretName}</Code>
                        {secrets && !exists && (
                          <Anchor component={Link} to={routes.secrets()} size="xs" onClick={onClose}>
                            Missing - add in Secrets
                          </Anchor>
                        )}
                      </Group>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Stack>
        ) : (
          <Stack gap="xs">
            {defaultTemplate && <Code block fz="xs">{defaultTemplate.code}</Code>}
          </Stack>
        )}

      </Stack>

    </Stack>
  );

  return (
    <Modal opened={opened} onClose={onClose} title={isNew ? 'New webhook' : `Edit webhook - ${webhook.name}`} centered size="xl">
      {isNew ? (
        <Box mah={PANEL_HEIGHT} style={{ overflowY: 'auto' }}>{settings}</Box>
      ) : (
        <Tabs value={tab} onChange={setTab} keepMounted={false}>
          <Tabs.List mb="sm">
            <Tabs.Tab value="settings">Settings</Tabs.Tab>
            <Tabs.Tab value="test">Test</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="settings" h={PANEL_HEIGHT} style={{ overflowY: 'auto' }}>{settings}</Tabs.Panel>
          <Tabs.Panel value="test" h={PANEL_HEIGHT} style={{ overflowY: 'auto' }}>
            <WebhookTestPanel webhookId={webhook.id} unsavedHandler={unsavedHandler} />
          </Tabs.Panel>
        </Tabs>
      )}

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" mt="sm">{error}</Alert>
      )}

      {/* Footer stays outside the scrolling panels */}
      <Group justify="flex-end" pt="md" mt="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <Button variant="default" onClick={onClose}>Cancel</Button>
        <Button variant="light" loading={saving} onClick={() => handleSave(false)}>{isNew ? 'Create' : 'Save'}</Button>
        <Button loading={saving} onClick={() => handleSave(true)}>{isNew ? 'Create & close' : 'Save & close'}</Button>
      </Group>

      {webhook && (
        <WebhookConfirmModal
          opened={rotateOpened}
          title="Rotate webhook URL"
          message={`A new URL will be generated for "${webhook.name}". The old URL stops working immediately.`}
          confirmLabel="Rotate"
          onClose={() => setRotateOpened(false)}
          onConfirm={handleRotate}
        />
      )}
    </Modal>
  );
}

// Agent picker - agents searched on the server by name
function AgentPicker({ workspaceId, value, onChange }: { workspaceId?: string; value: string | null; onChange: (option: AgentOption | null) => void }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [options, setOptions] = useState<AgentOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    agentsApi
      .list({ name: debouncedSearch || undefined, workspaceId, sortBy: 'name', sortOrder: 'asc', limit: AGENT_SEARCH_LIMIT })
      .then(({ agents }) => !cancelled && setOptions(agents.map((a) => ({ value: a.id, label: a.name, workspaceId: a.workspaceId ?? null, workspaceName: a.workspaceName }))))
      .catch((err) => console.error('Failed to search agents:', err));
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, workspaceId]);

  return (
    <Select
      label="Agent"
      placeholder="Search agents"
      searchable
      filter={({ options }) => options}
      searchValue={search}
      onSearchChange={setSearch}
      data={options}
      value={value}
      onChange={(v) => onChange(options.find((o) => o.value === v) ?? null)}
      renderOption={({ option }) => {
        const agent = option as AgentOption;
        return (
          <Group justify="space-between" wrap="nowrap" w="100%">
            <Text size="sm" truncate>{agent.label}</Text>
            <WorkspaceBadge workspaceName={agent.workspaceName} size="xs" />
          </Group>
        );
      }}
      comboboxProps={{ withinPortal: true }}
    />
  );
}
