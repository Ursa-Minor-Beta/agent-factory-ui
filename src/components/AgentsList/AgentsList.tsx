import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, Button, Group, Center, Tooltip, SegmentedControl } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import {
  IconSchema,
  IconCode,
  IconDownload,
  IconBrandGithub,
  IconHierarchy2,
  IconLayoutGrid,
  IconList,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { agentsApi } from '../../api';
import type { Agent } from '../../types';
import type { DataTableHandle } from '../common/DataTable';
import { AgentsTable } from './AgentsTable';
import { AgentsRelationsGraph } from '../AgentsGraph';
import { AgentDeleteModal } from './AgentDeleteModal';
import { AgentWorkspaceModal } from './AgentWorkspaceModal';
import { ModalAgentImport } from './ModalAgentImport/ModalAgentImport';
import { ModalGitHubImport } from './ModalGitHubImport';
import { useAgentModal } from '../AgentCreateModal';
import { routes } from '../../config/routes';

const VIEW_MODE_STORAGE_KEY = 'agents-view-mode';

// 'list' is the card grid (name kept for the stored preference)
type ViewMode = 'list' | 'table' | 'graph';

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface AgentsListProps {
  workspaceId?: string; // If provided, filter by this workspace
  showCreateButton?: boolean; // Show/hide create button
  onCreate?: () => void; // Called when agent is created/imported
  onDelete?: () => void; // Called when agent is deleted
}

export function AgentsList({
  workspaceId,
  showCreateButton = true,
  onCreate,
  onDelete,
}: AgentsListProps) {
  const [error, setError] = useState('');

  // Modals
  const { openCreateAgent, openEditAgent } = useAgentModal();
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [agentForWorkspace, setAgentForWorkspace] = useState<Agent | null>(null);
  const [importModalOpened, setImportModalOpened] = useState(false);
  const [githubImportModalOpened, setGithubImportModalOpened] = useState(false);

  // Graph view is only offered inside a workspace
  // Last chosen view is remembered across reloads
  const [selectedViewMode, setViewMode] = useLocalStorage<ViewMode>({
    key: VIEW_MODE_STORAGE_KEY,
    defaultValue: 'list',
    getInitialValueInEffect: false,
  });
  const viewMode: ViewMode =
    selectedViewMode === 'graph' ? (workspaceId ? 'graph' : 'list') : selectedViewMode;
  // Cards and table are one DataTable, so switching between them keeps filters, sort and page
  const tableRef = useRef<DataTableHandle<Agent>>(null);

  // Bumped on every mutation so the graph view refetches
  const [graphVersion, setGraphVersion] = useState(0);
  const reloadAgents = useCallback(() => {
    tableRef.current?.reload();
    setGraphVersion((v) => v + 1);
  }, []);

  // Listen for agent-saved event from global modal
  useEffect(() => {
    const handleAgentSaved = () => { reloadAgents(); onCreate?.(); };
    window.addEventListener('agent-saved', handleAgentSaved);
    return () => window.removeEventListener('agent-saved', handleAgentSaved);
  }, [reloadAgents, onCreate]);

  const handleOpenEditModal = (agent: Agent) => {
    openEditAgent(agent.id);
  };

  const handleClone = async (agent: Agent) => {
    try {
      // Fetch full agent data to get nodes // TODO move clone to thhe backend
      const fullAgent = await agentsApi.getById(agent.id);
      await agentsApi.create({
        name: `${fullAgent.name} (clone)`,
        description: fullAgent.description,
        nodes: fullAgent.nodes,
        workspaceId: fullAgent.workspaceId || workspaceId,
        editorData: fullAgent.editorData
      });
      reloadAgents();
      onCreate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone agent');
    }
  };

  const handleExport = async (agent: Agent) => {
    try {
      const exportData = await agentsApi.export(agent.id);
      downloadJson(exportData, `${agent.name}.agent.json`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export agent');
    }
  };

  const handlers = {
    onEdit: handleOpenEditModal,
    onDelete: setAgentToDelete,
    onClone: handleClone,
    onWorkspace: setAgentForWorkspace,
    onExport: handleExport,
  };

  const viewSwitcher = (
    <SegmentedControl
      value={viewMode}
      onChange={(value) => setViewMode(value as ViewMode)}
      data={[
        { value: 'list', label: <Tooltip label="Cards"><Center><IconLayoutGrid size={16} /></Center></Tooltip> },
        { value: 'table', label: <Tooltip label="Table"><Center><IconList size={16} /></Center></Tooltip> },
        ...(workspaceId
          ? [{ value: 'graph', label: <Tooltip label="Graph"><Center><IconHierarchy2 size={16} /></Center></Tooltip> }]
          : []),
      ]}
    />
  );

  const createButtons = showCreateButton && (
    <Group gap="md">
      <Group gap="xs">
        <Text size="sm" c="dimmed">New agent:</Text>
        <Button.Group>
          <Tooltip label="Visual Editor">
            <Button
              component={Link}
              to={routes.newAgentEditor(workspaceId)}
              variant="default"
            >
              <IconSchema size={16} style={{ color: 'var(--mantine-color-violet-5)' }} />
            </Button>
          </Tooltip>
          <Tooltip label="JSON Editor">
            <Button
              variant="default"
              onClick={() => openCreateAgent(workspaceId)}
            >
              <IconCode size={16} />
            </Button>
          </Tooltip>
          <Tooltip label="Import Agent">
            <Button
              variant="default"
              onClick={() => setImportModalOpened(true)}
            >
              <IconDownload size={16} />
            </Button>
          </Tooltip>
          <Tooltip label="Clone from GitHub">
            <Button
              variant="default"
              onClick={() => setGithubImportModalOpened(true)}
            >
              <IconBrandGithub size={16} />
            </Button>
          </Tooltip>
        </Button.Group>
      </Group>
    </Group>
  );

  return (
    <Box pos="relative">
      {viewMode === 'graph' && workspaceId ? (
        <>
          {/* Floats over the graph so the graph gets the full height */}
          <Group gap="sm" wrap="wrap" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
            {viewSwitcher}
            <Box style={{ flex: 1 }} />
            {createButtons}
          </Group>
          <AgentsRelationsGraph
            workspaceId={workspaceId}
            topInset={48}
            refreshKey={graphVersion}
            {...handlers}
          />
        </>
      ) : (
        <AgentsTable
          ref={tableRef}
          workspaceId={workspaceId}
          view={viewMode === 'table' ? 'table' : 'cards'}
          error={error}
          onErrorClose={() => setError('')}
          toolbarLeft={viewSwitcher}
          toolbarRight={createButtons}
          {...handlers}
        />
      )}

      <AgentDeleteModal
        agent={agentToDelete}
        onClose={() => setAgentToDelete(null)}
        onDeleted={() => { reloadAgents(); onDelete?.(); }}
      />

      <AgentWorkspaceModal
        agent={agentForWorkspace}
        onClose={() => setAgentForWorkspace(null)}
        onSaved={reloadAgents}
      />

      <ModalAgentImport
        opened={importModalOpened}
        onClose={() => setImportModalOpened(false)}
        onImported={() => { reloadAgents(); onCreate?.(); }}
        workspaceId={workspaceId}
      />

      <ModalGitHubImport
        opened={githubImportModalOpened}
        onClose={() => setGithubImportModalOpened(false)}
        onImported={() => { reloadAgents(); onCreate?.(); }}
        workspaceId={workspaceId}
      />
    </Box>
  );
}
