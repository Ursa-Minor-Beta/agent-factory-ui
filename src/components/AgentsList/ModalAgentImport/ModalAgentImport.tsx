import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Text, Group, Button, Stack, Textarea, Select, TextInput, ActionIcon } from '@mantine/core';
import { agentsApi, workspacesApi, secretsApi, variablesApi, providersApi, memoryApi } from '../../../api';
import type { AgentExportData, AgentImportResponse, ImportCollectionSchema } from '../../../types';
import type { Workspace, WorkspaceExport, WorkspaceImportResponse } from '../../../types/workspace';
import { ApiError } from '../../../api/client';
import { FileDropZone } from '../../FileDropZone';
import { ImportSuccessView } from './ImportSuccessView';
import { SecretModal } from '../../Secrets/SecretModal';
import { VariableModal } from '../../Variables/VariableModal';
import { ProviderModal } from '../../Providers/ProviderModal';
import { CollectionModal } from '../../Collections/CollectionModal';
import { IconCheck, IconDownload } from '@tabler/icons-react';
import { routes } from '../../../config/routes';

const NEW_WORKSPACE_VALUE = '__new__';

export type ImportKind = 'agent' | 'workspace';

const KIND_LABEL: Record<ImportKind, string> = { agent: 'agent', workspace: 'workspace' };

// Workspace exports have an agents array, agent exports have agent + dependencies
function detectKind(parsed: unknown): ImportKind | null {
  if (!parsed || typeof parsed !== 'object') return null;
  if (Array.isArray((parsed as WorkspaceExport).agents)) return 'workspace';
  if ('agent' in parsed && 'dependencies' in parsed) return 'agent';
  return null;
}

interface AgentImportModalProps {
  opened: boolean;
  onClose: () => void;
  onImported: () => void;
  workspaceId?: string;
  // Which export file this modal imports, agent by default
  kind?: ImportKind;
}

export function ModalAgentImport({ opened, onClose, onImported, workspaceId, kind = 'agent' }: AgentImportModalProps) {
  const navigate = useNavigate();

  const [jsonContent, setJsonContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [parseError, setParseError] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [result, setResult] = useState<AgentImportResponse | WorkspaceImportResponse | null>(null);

  // Workspace selection
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    workspaceId || NEW_WORKSPACE_VALUE
  );

  // Create modals state
  const [secretModalOpen, setSecretModalOpen] = useState(false);
  const [secretDefaultName, setSecretDefaultName] = useState('');
  const [variableModalOpen, setVariableModalOpen] = useState(false);
  const [variableDefaultName, setVariableDefaultName] = useState('');
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [providerDefaultName, setProviderDefaultName] = useState('');
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [collectionDefaultName, setCollectionDefaultName] = useState('');
  const [collectionDefaultSchema, setCollectionDefaultSchema] = useState<ImportCollectionSchema['schema'] | undefined>();

  // Track created items
  const [createdSecrets, setCreatedSecrets] = useState<Set<string>>(new Set());
  const [createdVariables, setCreatedVariables] = useState<Set<string>>(new Set());
  const [createdProviders, setCreatedProviders] = useState<Set<string>>(new Set());
  const [createdCollections, setCreatedCollections] = useState<Set<string>>(new Set());

  // Track global items (fetched after import)
  const [globalSecrets, setGlobalSecrets] = useState<Set<string>>(new Set());
  const [globalVariables, setGlobalVariables] = useState<Set<string>>(new Set());
  const [globalProviders, setGlobalProviders] = useState<Set<string>>(new Set());
  const [globalCollections, setGlobalCollections] = useState<Set<string>>(new Set());

  // Track items already in the target workspace (fetched after import)
  const [existingSecrets, setExistingSecrets] = useState<Set<string>>(new Set());
  const [existingVariables, setExistingVariables] = useState<Set<string>>(new Set());
  const [existingProviders, setExistingProviders] = useState<Set<string>>(new Set());
  const [existingCollections, setExistingCollections] = useState<Set<string>>(new Set());

  // Track newly created workspace to notify sidebar on close/navigate
  const [newWorkspaceInfo, setNewWorkspaceInfo] = useState<{ id: string; name: string } | null>(null);

  // Load workspaces when modal opens
  useEffect(() => {
    if (!opened) return;
    workspacesApi
      .list({ limit: 100, sortBy: 'name', sortOrder: 'asc' })
      .then((data) => setWorkspaces(data.workspaces))
      .catch((err) => console.error('Failed to load workspaces:', err));
  }, [opened]);

  // Reset selected workspace when workspaceId prop changes
  useEffect(() => {
    setSelectedWorkspace(workspaceId || NEW_WORKSPACE_VALUE);
  }, [workspaceId]);

  const resetState = () => {
    setJsonContent('');
    setError('');
    setParseError('');
    setResult(null);
    setSelectedWorkspace(workspaceId || NEW_WORKSPACE_VALUE);
    setCreatedSecrets(new Set());
    setCreatedVariables(new Set());
    setCreatedProviders(new Set());
    setCreatedCollections(new Set());
    setGlobalSecrets(new Set());
    setGlobalVariables(new Set());
    setGlobalProviders(new Set());
    setGlobalCollections(new Set());
    setExistingSecrets(new Set());
    setExistingVariables(new Set());
    setExistingProviders(new Set());
    setExistingCollections(new Set());
    setUrlInput('');
    setNewWorkspaceInfo(null);
  };

  const convertToRawUrl = (url: string): string => {
    // Convert GitHub blob URLs to raw URLs
    // https://github.com/owner/repo/blob/branch/path -> https://raw.githubusercontent.com/owner/repo/branch/path
    const githubBlobMatch = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
    if (githubBlobMatch) {
      const [, owner, repo, rest] = githubBlobMatch;
      return `https://raw.githubusercontent.com/${owner}/${repo}/${rest}`;
    }
    return url;
  };

  const handleFetchFromUrl = async () => {
    if (!urlInput.trim()) return;

    setFetchingUrl(true);
    setError('');

    try {
      const fetchUrl = convertToRawUrl(urlInput.trim());
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
      const text = await response.text();
      validateAndSetJson(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch from URL');
    } finally {
      setFetchingUrl(false);
    }
  };

  const notifyWorkspaceCreated = () => {
    if (newWorkspaceInfo) {
      window.dispatchEvent(new CustomEvent('workspace-created', {
        detail: { workspace: newWorkspaceInfo }
      }));
    }
  };

  const handleClose = () => {
    if (result) {
      notifyWorkspaceCreated();
      onImported();
    }
    resetState();
    onClose();
  };

  const validateAndSetJson = (content: string) => {
    setJsonContent(content);
    setParseError('');

    if (content.trim()) {
      try {
        const detected = detectKind(JSON.parse(content));
        if (detected && detected !== kind) {
          setParseError(`This is ${detected === 'agent' ? 'an' : 'a'} ${KIND_LABEL[detected]} export file - use Import ${KIND_LABEL[detected]} instead`);
        }
      } catch {
        setParseError('Invalid JSON format');
      }
    }
  };

  const handleImport = async () => {
    if (!jsonContent.trim()) {
      setError('Please provide an export file or paste JSON content');
      return;
    }

    let parsed: AgentExportData | WorkspaceExport;
    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      setError('Invalid JSON format');
      return;
    }

    setImporting(true);
    setError('');

    const targetWorkspaceId = selectedWorkspace === NEW_WORKSPACE_VALUE ? undefined : selectedWorkspace ?? undefined;

    try {
      const response = kind === 'workspace'
        ? await workspacesApi.import({ package: parsed as WorkspaceExport, workspaceId: targetWorkspaceId })
        : await agentsApi.import({ package: parsed as AgentExportData, workspaceId: targetWorkspaceId });
      setResult(response);

      // Backend reports every package dependency as missing - check which ones already
      // exist globally or in the target workspace (a new workspace is empty, skip it)
      const wsId = targetWorkspaceId ? response.workspaceId : undefined;
      const [globals, globalVars, globalProvs, globalColls, wsSecrets, wsVars, wsProvs, wsColls] = await Promise.all([
        secretsApi.list({ workspaceId: null }),
        variablesApi.list({ workspaceId: null }),
        providersApi.list({ workspaceId: null }),
        memoryApi.listSchemas({ workspaceId: null }),
        wsId ? secretsApi.list({ workspaceId: wsId }) : [],
        wsId ? variablesApi.list({ workspaceId: wsId }) : [],
        wsId ? providersApi.list({ workspaceId: wsId }) : [],
        wsId ? memoryApi.listSchemas({ workspaceId: wsId }) : [],
      ]);
      setGlobalSecrets(new Set(globals.map((s) => s.name)));
      setGlobalVariables(new Set(globalVars.map((v) => v.name)));
      setGlobalProviders(new Set(globalProvs.map((p) => p.provider)));
      setGlobalCollections(new Set(globalColls.map((c) => c.name)));
      setExistingSecrets(new Set(wsSecrets.map((s) => s.name)));
      setExistingVariables(new Set(wsVars.map((v) => v.name)));
      setExistingProviders(new Set(wsProvs.map((p) => p.provider)));
      setExistingCollections(new Set(wsColls.map((c) => c.name)));

      // Store new workspace info to notify sidebar on close/navigate
      if (selectedWorkspace === NEW_WORKSPACE_VALUE) {
        const workspaceName = response.workspaceName || parsed.workspace?.name;
        if (workspaceName) {
          setNewWorkspaceInfo({ id: response.workspaceId, name: workspaceName });
        }
      }
    } catch (err) {
      if (kind === 'workspace' && err instanceof ApiError && err.status === 400) {
        setError('Invalid workspace export file');
      } else {
        setError(err instanceof Error ? err.message : `Failed to import ${KIND_LABEL[kind]}`);
      }
    } finally {
      setImporting(false);
    }
  };

  const handleNavigateToWorkspace = () => {
    if (result) {
      handleClose();
      navigate(routes.workspace(result.workspaceId));
    }
  };

  // Handlers for opening create modals
  const handleCreateSecret = (name: string) => {
    setSecretDefaultName(name);
    setSecretModalOpen(true);
  };

  const handleCreateVariable = (name: string) => {
    setVariableDefaultName(name);
    setVariableModalOpen(true);
  };

  const handleCreateProvider = (name: string) => {
    setProviderDefaultName(name);
    setProviderModalOpen(true);
  };

  const handleCreateCollection = (name: string) => {
    setCollectionDefaultName(name);
    // Find schema from import response if available
    const collectionData = result?.warnings.missingCollections?.find((c) => c.name === name);
    setCollectionDefaultSchema(collectionData?.schema);
    setCollectionModalOpen(true);
  };

  // Success state
  if (result) {
    return (
      <>
        <Modal
          opened={opened}
          onClose={handleClose}
          title={
          <Group gap="xs">
            <IconCheck size={20} color="var(--mantine-color-green-6)" />
            <Text fw={500}>
              {kind === 'workspace' ? 'Workspace imported to' : 'Agent imported to workspace'} <Text span c="cyan" inherit>{result.workspaceName}</Text>
            </Text>
          </Group>
          }
          centered
          size="xl"
          >
          <ImportSuccessView
            result={result}
            kind={kind}
            onClose={handleClose}
            onNavigateToWorkspace={handleNavigateToWorkspace}
            onCreateSecret={handleCreateSecret}
            onCreateVariable={handleCreateVariable}
            onCreateProvider={handleCreateProvider}
            onCreateCollection={handleCreateCollection}
            createdSecrets={createdSecrets}
            createdVariables={createdVariables}
            createdProviders={createdProviders}
            createdCollections={createdCollections}
            existingSecrets={existingSecrets}
            existingVariables={existingVariables}
            existingProviders={existingProviders}
            existingCollections={existingCollections}
            globalSecrets={globalSecrets}
            globalVariables={globalVariables}
            globalProviders={globalProviders}
            globalCollections={globalCollections}
          />
        </Modal>

        <SecretModal
          opened={secretModalOpen}
          onClose={() => setSecretModalOpen(false)}
          secret={null}
          workspaceId={result.workspaceId}
          defaultName={secretDefaultName}
          onSuccess={() => {
            setCreatedSecrets((prev) => new Set(prev).add(secretDefaultName));
            setSecretModalOpen(false);
          }}
        />

        <VariableModal
          opened={variableModalOpen}
          onClose={() => setVariableModalOpen(false)}
          variable={null}
          workspaceId={result.workspaceId}
          defaultName={variableDefaultName}
          onSuccess={() => {
            setCreatedVariables((prev) => new Set(prev).add(variableDefaultName));
            setVariableModalOpen(false);
          }}
        />

        <ProviderModal
          opened={providerModalOpen}
          onClose={() => setProviderModalOpen(false)}
          workspaceId={result.workspaceId}
          defaultName={providerDefaultName}
          onSuccess={() => {
            setCreatedProviders((prev) => new Set(prev).add(providerDefaultName));
            setProviderModalOpen(false);
          }}
        />

        <CollectionModal
          opened={collectionModalOpen}
          onClose={() => setCollectionModalOpen(false)}
          collection={null}
          workspaceId={result.workspaceId}
          defaultName={collectionDefaultName}
          defaultSchema={collectionDefaultSchema}
          onSuccess={() => {
            setCreatedCollections((prev) => new Set(prev).add(collectionDefaultName));
            setCollectionModalOpen(false);
          }}
        />
      </>
    );
  }

  // Import form
  return (
    <Modal opened={opened} onClose={handleClose} title={kind === 'workspace' ? 'Import Workspace' : 'Import Agent'} centered size="xl">
      <Stack gap="md" style={{ height: '60vh', minHeight: 400, display: 'flex', flexDirection: 'column' }}>
        <Select
          label="Import to workspace"
          value={selectedWorkspace}
          onChange={(value) => setSelectedWorkspace(value as string | null)}
          data={[
            { value: NEW_WORKSPACE_VALUE, label: '+ New workspace' },
            ...workspaces.map((ws) => ({ value: ws.id, label: ws.name })),
          ]}
          style={{ flexShrink: 0 }}
        />

        <TextInput
          // label=""
          placeholder={`Import from URL, https://example.com/${KIND_LABEL[kind]}.json`}
          value={urlInput}
          onChange={(e) => setUrlInput(e.currentTarget.value)}
          rightSection={
            <ActionIcon
              variant="subtle"
              loading={fetchingUrl}
              disabled={!urlInput.trim()}
              onClick={handleFetchFromUrl}
            >
              <IconDownload size={16} />
            </ActionIcon>
          }
          style={{ flexShrink: 0 }}
        />

        <Text size="sm" c="dimmed" ta="center" style={{ flexShrink: 0 }}>
          — or drop a file —
        </Text>

        <FileDropZone
            accept='.json'
            label='Drop a .json file here or click to select'
            onFileContent={validateAndSetJson}
            />

        <Text size="sm" c="dimmed" ta="center" style={{ flexShrink: 0 }}>
          — or paste JSON below —
        </Text>

        <Textarea
          placeholder="Paste export JSON here..."
          value={jsonContent}
          onChange={(e) => validateAndSetJson(e.currentTarget.value)}
          error={parseError}
          styles={{
            root: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 },
            wrapper: { flex: 1, display: 'flex', flexDirection: 'column' },
            input: { fontFamily: 'monospace', fontSize: '12px', flex: 1, resize: 'none' },
          }}
        />

        {error && (
          <Text size="sm" c="red" style={{ flexShrink: 0 }}>
            {error}
          </Text>
        )}

        <Group justify="flex-end" gap="sm" style={{ flexShrink: 0 }}>
          <Button variant="default" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} loading={importing} disabled={!jsonContent.trim() || !!parseError}>
            Import
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
