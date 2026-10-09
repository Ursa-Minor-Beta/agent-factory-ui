import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Text, Group, Button, Stack, Textarea, Select, TextInput, ActionIcon } from '@mantine/core';
import { agentsApi, workspacesApi, secretsApi, providersApi, memoryApi } from '../../../api';
import type { AgentExportData, AgentImportResponse, ImportCollectionSchema } from '../../../types';
import type { Workspace } from '../../../types/workspace';
import { FileDropZone } from '../../FileDropZone';
import { ImportSuccessView } from './ImportSuccessView';
import { SecretModal } from '../../Secrets/SecretModal';
import { ProviderModal } from '../../Providers/ProviderModal';
import { CollectionModal } from '../../Collections/CollectionModal';
import { IconCheck, IconDownload } from '@tabler/icons-react';

const NEW_WORKSPACE_VALUE = '__new__';

interface AgentImportModalProps {
  opened: boolean;
  onClose: () => void;
  onImported: () => void;
  workspaceId?: string;
}

export function ModalAgentImport({ opened, onClose, onImported, workspaceId }: AgentImportModalProps) {
  const navigate = useNavigate();

  const [jsonContent, setJsonContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [parseError, setParseError] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [result, setResult] = useState<AgentImportResponse | null>(null);

  // Workspace selection
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    workspaceId || NEW_WORKSPACE_VALUE
  );

  // Create modals state
  const [secretModalOpen, setSecretModalOpen] = useState(false);
  const [secretDefaultName, setSecretDefaultName] = useState('');
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [providerDefaultName, setProviderDefaultName] = useState('');
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [collectionDefaultName, setCollectionDefaultName] = useState('');
  const [collectionDefaultSchema, setCollectionDefaultSchema] = useState<ImportCollectionSchema['schema'] | undefined>();

  // Track created items
  const [createdSecrets, setCreatedSecrets] = useState<Set<string>>(new Set());
  const [createdProviders, setCreatedProviders] = useState<Set<string>>(new Set());
  const [createdCollections, setCreatedCollections] = useState<Set<string>>(new Set());

  // Track global items (fetched after import)
  const [globalSecrets, setGlobalSecrets] = useState<Set<string>>(new Set());
  const [globalProviders, setGlobalProviders] = useState<Set<string>>(new Set());
  const [globalCollections, setGlobalCollections] = useState<Set<string>>(new Set());

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
    setCreatedProviders(new Set());
    setCreatedCollections(new Set());
    setGlobalSecrets(new Set());
    setGlobalProviders(new Set());
    setGlobalCollections(new Set());
    setUrlInput('');
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

  const handleClose = () => {
    resetState();
    onClose();
  };

  const validateAndSetJson = (content: string) => {
    setJsonContent(content);
    setParseError('');

    if (content.trim()) {
      try {
        JSON.parse(content) as AgentExportData;
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

    let parsed: AgentExportData;
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
      const response = await agentsApi.import({
        package: parsed,
        workspaceId: targetWorkspaceId,
      });
      setResult(response);

      // Fetch global items to check if missing items exist globally
      const [globals, globalProvs, globalColls] = await Promise.all([
        secretsApi.list({ workspaceId: null }),
        providersApi.list({ workspaceId: null }),
        memoryApi.listSchemas({ workspaceId: null }),
      ]);
      setGlobalSecrets(new Set(globals.map((s) => s.name)));
      setGlobalProviders(new Set(globalProvs.map((p) => p.provider)));
      setGlobalCollections(new Set(globalColls.map((c) => c.name)));

      // Notify sidebar about the new workspace (only if we created a new one)
      if (selectedWorkspace === NEW_WORKSPACE_VALUE) {
        const workspaceName = response.workspaceName || parsed.workspace?.name;
        if (workspaceName) {
          window.dispatchEvent(new CustomEvent('workspace-created', {
            detail: { workspace: { id: response.workspaceId, name: workspaceName } }
          }));
        }
      }

      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import agent');
    } finally {
      setImporting(false);
    }
  };

  const handleNavigateToWorkspace = () => {
    if (result) {
      handleClose();
      navigate(`/workspaces/${result.workspaceId}`);
    }
  };

  // Handlers for opening create modals
  const handleCreateSecret = (name: string) => {
    setSecretDefaultName(name);
    setSecretModalOpen(true);
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
              Agent imported to workspace <Text span c="cyan" inherit>{result.workspaceName}</Text>
            </Text>
          </Group>
          }
          centered
          size="xl"
          >
          <ImportSuccessView
            result={result}
            onClose={handleClose}
            onNavigateToWorkspace={handleNavigateToWorkspace}
            onCreateSecret={handleCreateSecret}
            onCreateProvider={handleCreateProvider}
            onCreateCollection={handleCreateCollection}
            createdSecrets={createdSecrets}
            createdProviders={createdProviders}
            createdCollections={createdCollections}
            globalSecrets={globalSecrets}
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
    <Modal opened={opened} onClose={handleClose} title="Import Agent" centered size="xl">
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
          placeholder="Import from URL, https://example.com/agent.json"
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
