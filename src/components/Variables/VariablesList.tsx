import { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Button,
  Card,
  Group,
  ActionIcon,
  Loader,
  Alert,
  Table,
  Center,
  Code,
  TextInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconSearch,
  IconAlertCircle,
} from '@tabler/icons-react';
import { variablesApi } from '../../api';
import type { Variable } from '../../types';
import { VariableModal } from './VariableModal';
import { DeleteConfirmModal } from '../DeleteConfirmModal';
import { WorkspaceBadge } from '../Workspace';

export type VariableColumn = 'workspace' | 'name' | 'value' | 'description' | 'created' | 'actions';

const DEFAULT_COLUMNS: VariableColumn[] = ['workspace', 'name', 'value', 'description', 'created', 'actions'];

interface VariablesListProps {
  workspaceId?: string;
  description?: string;
  showSearch?: boolean;
  columns?: VariableColumn[];
  onCreate?: () => void;
  onDelete?: () => void;
}

export function VariablesList({
  workspaceId,
  description = '',
  showSearch = true,
  columns = DEFAULT_COLUMNS,
  onCreate,
  onDelete,
}: VariablesListProps) {
  const showColumn = (col: VariableColumn) => columns.includes(col);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
  const [deletingVariable, setDeletingVariable] = useState<Variable | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');

  const loadVariables = async () => {
    try {
      setLoading(true);
      const data = await variablesApi.list(workspaceId !== undefined ? { workspaceId } : undefined);
      setVariables(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load variables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVariables();
  }, [workspaceId]);

  const handleOpenCreateModal = () => {
    setEditingVariable(null);
    openModal();
  };

  const handleOpenEditModal = (variable: Variable) => {
    setEditingVariable(variable);
    openModal();
  };

  const handleCloseModal = () => {
    setEditingVariable(null);
    closeModal();
  };

  const handleSuccess = () => {
    const isNew = !editingVariable;
    handleCloseModal();
    loadVariables();
    if (isNew) onCreate?.();
  };

  const handleOpenDeleteModal = (variable: Variable) => {
    setDeletingVariable(variable);
    openDeleteModal();
  };

  const handleDelete = async () => {
    if (!deletingVariable) return;
    setDeleting(true);
    try {
      await variablesApi.delete(deletingVariable.id);
      closeDeleteModal();
      setDeletingVariable(null);
      loadVariables();
      onDelete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete variable');
    } finally {
      setDeleting(false);
    }
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
        {showSearch && (
          <TextInput
            placeholder="Search variables..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1, maxWidth: 300 }}
          />
        )}
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreateModal}>
          Add Variable
        </Button>
      </Group>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          mb="md"
          withCloseButton
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      <Card withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              {showColumn('workspace') && <Table.Th>Workspace</Table.Th>}
              {showColumn('name') && <Table.Th>Name</Table.Th>}
              {showColumn('value') && <Table.Th>Value</Table.Th>}
              {showColumn('description') && <Table.Th>Description</Table.Th>}
              {showColumn('created') && <Table.Th>Created</Table.Th>}
              {showColumn('actions') && <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {variables.map((variable) => (
              <Table.Tr key={variable.id}>
                {showColumn('workspace') && (
                  <Table.Td>
                    <WorkspaceBadge workspaceName={variable.workspaceName} />
                  </Table.Td>
                )}
                {showColumn('name') && (
                  <Table.Td>
                    <Code>{variable.name}</Code>
                  </Table.Td>
                )}
                {showColumn('value') && (
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {variable.value}
                    </Text>
                  </Table.Td>
                )}
                {showColumn('description') && (
                  <Table.Td>
                    <Text size="sm" c="dimmed" lineClamp={1}>
                      {variable.description || '-'}
                    </Text>
                  </Table.Td>
                )}
                {showColumn('created') && (
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(variable.createdAt).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                )}
                {showColumn('actions') && (
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Group gap="xs" justify="flex-end">
                      <ActionIcon
                        variant="subtle"
                        onClick={() => handleOpenEditModal(variable)}
                      >
                        <IconPencil size={18} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => handleOpenDeleteModal(variable)}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
            {variables.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={columns.filter((c) => showColumn(c)).length}>
                  <Text ta="center" c="dimmed" py="md" size="sm">
                    {variables.length === 0
                      ? 'No variables configured'
                      : 'No variables match your search'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>

      <VariableModal
        opened={modalOpened}
        onClose={handleCloseModal}
        variable={editingVariable}
        workspaceId={workspaceId}
        onSuccess={handleSuccess}
      />

      <DeleteConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onDelete={handleDelete}
        deleting={deleting}
        title="Delete Variable"
        entityName={<Code>{deletingVariable?.name}</Code>}
      />
    </Box>
  );
}
