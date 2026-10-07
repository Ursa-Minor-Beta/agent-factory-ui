import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Text, Group, Button, Stack, Textarea, Box, Alert, List, Anchor, Select } from '@mantine/core';
import { IconUpload, IconAlertTriangle, IconCheck } from '@tabler/icons-react';
import { agentsApi, workspacesApi } from '../../api';
import type { AgentExportData, AgentImportResponse } from '../../types';
import type { Workspace } from '../../types/workspace';

const NEW_WORKSPACE_VALUE = '__new__';

interface AgentImportModalProps {
  opened: boolean;
  onClose: () => void;
  onImported: () => void;
  workspaceId?: string;
}

export function AgentImportModal({ opened, onClose, onImported, workspaceId }: AgentImportModalProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jsonContent, setJsonContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [parseError, setParseError] = useState('');
  const [result, setResult] = useState<AgentImportResponse | null>(null);

  // Workspace selection
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    workspaceId || NEW_WORKSPACE_VALUE
  );

  // Load workspaces when modal opens
  useEffect(() => {
    if (!opened) return;
    const load = async () => {
      try {
        const data = await workspacesApi.list({ limit: 100, sortBy: 'name', sortOrder: 'asc' });
        setWorkspaces(data.workspaces);
      } catch (err) {
        console.error('Failed to load workspaces:', err);
      }
    };
    load();
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
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonContent(content);
      setParseError('');

      try {
        JSON.parse(content) as AgentExportData;
      } catch {
        setParseError('Invalid JSON format');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonContent(content);
      setParseError('');

      try {
        JSON.parse(content) as AgentExportData;
      } catch {
        setParseError('Invalid JSON format');
      }
    };
    reader.readAsText(file);
  };

  const handleJsonChange = (value: string) => {
    setJsonContent(value);
    setParseError('');

    if (value.trim()) {
      try {
        JSON.parse(value) as AgentExportData;
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

    const targetWorkspaceId = selectedWorkspace === NEW_WORKSPACE_VALUE ? undefined : selectedWorkspace;

    try {
      const response = await agentsApi.import({
        package: parsed,
        workspaceId: targetWorkspaceId,
      });
      setResult(response);

      // Notify sidebar about the new workspace (only if we created a new one)
      if (selectedWorkspace === NEW_WORKSPACE_VALUE) {

        console.log('dispatchEvent')

        window.dispatchEvent(new CustomEvent('workspace-created', {
          detail: { workspace: { id: response.workspaceId, name: response.workspaceName } }
        }));
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

  const hasWarnings = result && (
    result.warnings.missingSecrets.length > 0 ||
    result.warnings.missingProviders.length > 0 ||
    result.warnings.collectionsWithoutSchema.length > 0
  );

  // Success state
  if (result) {
    return (
      <Modal
        opened={opened}
        onClose={handleClose}
        title="Import Successful"
        centered
        size="xl"
      >
        <Stack gap="md">
          <Alert icon={<IconCheck size={16} />} color="green">
            Agent imported successfully!
          </Alert>

          {hasWarnings && (
            <Alert icon={<IconAlertTriangle size={16} />} color="yellow" title="Configuration Required">
              <Stack gap="xs">
                {result.warnings.missingSecrets.length > 0 && (
                  <Box>
                    <Text size="sm" fw={500}>Missing Secrets:</Text>
                    <List size="sm">
                      {result.warnings.missingSecrets.map((secret) => (
                        <List.Item key={secret}>
                          {secret} — <Anchor size="sm" onClick={() => { handleClose(); navigate('/settings/secrets'); }}>Configure</Anchor>
                        </List.Item>
                      ))}
                    </List>
                  </Box>
                )}

                {result.warnings.missingProviders.length > 0 && (
                  <Box>
                    <Text size="sm" fw={500}>Missing Providers:</Text>
                    <List size="sm">
                      {result.warnings.missingProviders.map((provider) => (
                        <List.Item key={provider}>
                          {provider} — <Anchor size="sm" onClick={() => { handleClose(); navigate('/settings/providers'); }}>Configure</Anchor>
                        </List.Item>
                      ))}
                    </List>
                  </Box>
                )}

                {result.warnings.collectionsWithoutSchema.length > 0 && (
                  <Box>
                    <Text size="sm" fw={500}>Collections without schema:</Text>
                    <List size="sm">
                      {result.warnings.collectionsWithoutSchema.map((collection) => (
                        <List.Item key={collection}>
                          {collection} — <Anchor size="sm" onClick={() => { handleClose(); navigate('/collections'); }}>Create schema</Anchor>
                        </List.Item>
                      ))}
                    </List>
                  </Box>
                )}
              </Stack>
            </Alert>
          )}

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={handleClose}>
              Close
            </Button>
            <Button onClick={handleNavigateToWorkspace}>
              Open Workspace
            </Button>
          </Group>
        </Stack>
      </Modal>
    );
  }

  // Import form
  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Import Agent"
      centered
      size="xl"
    >
      <Stack gap="md" style={{ height: '60vh', minHeight: 400, display: 'flex', flexDirection: 'column' }}>

        <Select
          label="Import to workspace"
          value={selectedWorkspace}
          onChange={(value) => setSelectedWorkspace(value)}
          data={[
            { value: NEW_WORKSPACE_VALUE, label: '+ New workspace' },
            ...workspaces.map((ws) => ({ value: ws.id, label: ws.name })),
          ]}
          style={{ flexShrink: 0 }}
        />

        <Box
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-md)',
            padding: 'var(--mantine-spacing-md)',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
            flexShrink: 0,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <IconUpload size={24} style={{ opacity: 0.5, marginBottom: 4 }} />
          <Text size="sm" c="dimmed">
            Drop a .json file here or click to select
          </Text>
        </Box>

        <Text size="sm" c="dimmed" ta="center" style={{ flexShrink: 0 }}>— or paste JSON below —</Text>

        <Textarea
          placeholder="Paste export JSON here..."
          value={jsonContent}
          onChange={(e) => handleJsonChange(e.currentTarget.value)}
          error={parseError}
          styles={{
            root: {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            },
            wrapper: {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            },
            input: {
              fontFamily: 'monospace',
              fontSize: '12px',
              flex: 1,
              resize: 'none',
            },
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
          <Button
            onClick={handleImport}
            loading={importing}
            disabled={!jsonContent.trim() || !!parseError}
          >
            Import
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
