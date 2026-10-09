import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Modal,
  Text,
  Group,
  Button,
  Stack,
  TextInput,
  Select,
  Alert,
  SegmentedControl,
  Box,
} from '@mantine/core';
import { IconBrandGithub, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { githubApi } from '../../api/github';
import { workspacesApi } from '../../api/workspaces';
import { providersApi } from '../../api/providers';
import { secretsApi } from '../../api/secrets';
import { memoryApi } from '../../api/memory';
import type { Workspace } from '../../types/workspace';
import type { ProviderConfig } from '../../types/provider';
import type { GitHubImportResponse, ImportCollectionSchema } from '../../types';
import { ImportSuccessView } from './ModalAgentImport/ImportSuccessView';
import { SecretModal } from '../Secrets/SecretModal';
import { ProviderModal } from '../Providers/ProviderModal';
import { CollectionModal } from '../Collections/CollectionModal';

const NEW_WORKSPACE_VALUE = '__new__';

// Parse GitHub URL or owner/repo format
// Handles:
// - https://github.com/owner/repo
// - https://github.com/owner/repo.git
// - https://github.com/owner/repo/tree/branch/path
// - https://github.com/owner/repo/blob/branch/path
// - owner/repo
function parseGitHubInput(input: string): { repository: string; branch?: string; path?: string } {
  const trimmed = input.trim();

  // Check if it's a GitHub URL
  const urlMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/(?:tree|blob)\/([^/]+)(?:\/(.+))?)?$/);
  if (urlMatch) {
    return {
      repository: `${urlMatch[1]}/${urlMatch[2]}`,
      branch: urlMatch[3],
      path: urlMatch[4],
    };
  }

  // Otherwise treat as owner/repo format
  return { repository: trimmed.replace(/\.git$/, '') };
}

interface GitHubImportModalProps {
  opened: boolean;
  onClose: () => void;
  onImported: () => void;
  workspaceId?: string;
}

export function ModalGitHubImport({
  opened,
  onClose,
  onImported,
  workspaceId,
}: GitHubImportModalProps) {
  const navigate = useNavigate();

  const [privateRepo, setPrivateRepo] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [repository, setRepository] = useState('');
  const [path, setPath] = useState('');
  const [branch, setBranch] = useState('main');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GitHubImportResponse | null>(null);

  // Workspace selection
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    workspaceId || NEW_WORKSPACE_VALUE
  );

  // GitHub providers
  const [githubProviders, setGithubProviders] = useState<ProviderConfig[]>([]);

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

  // Load workspaces and GitHub providers when modal opens
  useEffect(() => {
    if (!opened) return;
    workspacesApi
      .list({ limit: 100, sortBy: 'name', sortOrder: 'asc' })
      .then((data) => setWorkspaces(data.workspaces))
      .catch((err) => console.error('Failed to load workspaces:', err));

    providersApi
      .list({ provider: 'github' })
      .then((providers) => setGithubProviders(providers))
      .catch((err) => console.error('Failed to load GitHub providers:', err));
  }, [opened]);

  // Reset selected workspace when workspaceId prop changes
  useEffect(() => {
    setSelectedWorkspace(workspaceId || NEW_WORKSPACE_VALUE);
  }, [workspaceId]);

  const resetState = () => {
    setPrivateRepo(false);
    setProviderName('');
    setRepository('');
    setPath('');
    setBranch('main');
    setError('');
    setResult(null);
    setSelectedWorkspace(workspaceId || NEW_WORKSPACE_VALUE);
    setCreatedSecrets(new Set());
    setCreatedProviders(new Set());
    setCreatedCollections(new Set());
    setGlobalSecrets(new Set());
    setGlobalProviders(new Set());
    setGlobalCollections(new Set());
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleImport = async () => {
    if (!repository.trim()) {
      setError('Repository is required (e.g., owner/repo)');
      return;
    }
    if (!path.trim()) {
      setError('File path is required');
      return;
    }

    setImporting(true);
    setError('');

    const targetWorkspaceId =
      selectedWorkspace === NEW_WORKSPACE_VALUE ? undefined : selectedWorkspace ?? undefined;

    try {
      const response = await githubApi.importAgent({
        providerName: privateRepo ? (providerName.trim() || undefined) : undefined,
        publicRepo: privateRepo ? undefined : true,
        repository: repository.trim(),
        path: path.trim(),
        branch: branch.trim() || 'main',
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
        const workspaceName = response.workspaceName;
        if (workspaceName) {
          window.dispatchEvent(new CustomEvent('workspace-created', {
            detail: { workspace: { id: response.workspaceId, name: workspaceName } }
          }));
        }
      }

      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import agent from GitHub');
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
    setCollectionDefaultSchema(collectionData?.schema as ImportCollectionSchema['schema'] | undefined);
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
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconBrandGithub size={20} />
          <Text fw={500}>Import Agent from GitHub</Text>
        </Group>
      }
      centered
      size="xl"
    >
      <Stack gap="lg">

        <TextInput
          name='owner-repository'
          label="Repository"
          placeholder="owner/repo or https://github.com/owner/repo"
          description="GitHub repository URL or owner/repo format"
          value={repository}
          onChange={(e) => setRepository(e.currentTarget.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            const parsed = parseGitHubInput(pasted);
            if (parsed.repository !== pasted) {
              e.preventDefault();
              setRepository(parsed.repository);
              if (parsed.branch) setBranch(parsed.branch);
              if (parsed.path) setPath(parsed.path);
            }
          }}
          required
        />

        <TextInput
          name='file-path'
          label="File Path"
          placeholder="path/to/agent.json"
          description="Path to the agent JSON file in the repository"
          value={path}
          onChange={(e) => setPath(e.currentTarget.value)}
          required
        />

        <TextInput
          label="Branch"
          placeholder="main"
          description="Branch to import from"
          value={branch}
          onChange={(e) => setBranch(e.currentTarget.value)}
        />

        <Stack gap="xs">
            <Group>
                <Text fz="sm" style={{ fontWeight: 'var(--mantine-font-weight-medium)' }}>Repository Access</Text>
                <Box>
                  <SegmentedControl
                    value={privateRepo ? 'private' : 'public'}
                    onChange={(value) => setPrivateRepo(value === 'private')}
                    data={[
                      { value: 'public', label: 'Public' },
                      { value: 'private', label: 'Private' },
                    ]}
                  />
                </Box>
            </Group>
            <Select
              description={privateRepo ? "Select GitHub provider" : "Public read-only resource"}
              value={providerName}
              disabled={!privateRepo}
              onChange={(value) => setProviderName(value || '')}
              data={[
                { value: '', label: 'Use default' },
                ...githubProviders.map((p) => ({ value: p.name, label: p.name })),
              ]}
            />
        </Stack>

        <Select
          label="Import to workspace"
          value={selectedWorkspace}
          onChange={(value) => setSelectedWorkspace(value)}
          data={[
            { value: NEW_WORKSPACE_VALUE, label: '+ New workspace' },
            ...workspaces.map((ws) => ({ value: ws.id, label: ws.name })),
          ]}
        />

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            loading={importing}
            disabled={!repository.trim() || !path.trim()}
            leftSection={<IconBrandGithub size={16} />}
          >
            Import
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
