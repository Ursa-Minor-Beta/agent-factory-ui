import { useState, useEffect, useCallback } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import {
  Box,
  Text,
  Button,
  Card,
  Group,
  ActionIcon,
  TextInput,
  Loader,
  Alert,
  Table,
  Center,
  Badge,
  Tooltip,
  Breadcrumbs,
  Anchor,
  Code,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconSearch,
  IconAlertCircle,
  IconEye,
} from '@tabler/icons-react';
import { memoryApi } from '../../api';
import type { MemorySchema, MemoryRecord } from '../../types';
import { RecordModal } from './RecordModal';
import { RecordViewModal } from './RecordViewModal';
import { RecordDeleteModal } from './RecordDeleteModal';

interface RecordForm {
  data: string;
  importance: number;
  tags: string[];
}

export function CollectionRecordsPage() {
  const { collection } = useParams<{ collection: string }>();
  const [schema, setSchema] = useState<MemorySchema | null>(null);
  const [records, setRecords] = useState<MemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [viewModalOpened, { open: openViewModal, close: closeViewModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingRecord, setEditingRecord] = useState<MemoryRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MemoryRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<MemoryRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  // Form state
  const [formData, setFormData] = useState<RecordForm>({
    data: '{}',
    importance: 0.5,
    tags: [],
  });
  const [dataError, setDataError] = useState('');

  const loadData = useCallback(async (searchQuery?: string) => {
    if (!collection) return;
    try {
      setLoading(true);
      // Load schema and records in parallel
      const [schemasData, recordsData] = await Promise.all([
        memoryApi.listSchemas(),
        memoryApi.listRecords(collection, { search: searchQuery || undefined }),
      ]);
      const foundSchema = schemasData.find((s) => s.name === collection);
      setSchema(foundSchema || null);
      setRecords(recordsData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [collection]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load data when collection or debounced search changes
  useEffect(() => {
    loadData(searchDebounced);
  }, [searchDebounced, loadData]);

  const getDefaultDataFromSchema = (): Record<string, unknown> => {
    if (!schema) return {};
    const data: Record<string, unknown> = {};
    schema.fields.forEach((field) => {
      if (field.default !== undefined) {
        data[field.name] = field.default;
      } else {
        switch (field.type) {
          case 'string':
            data[field.name] = '';
            break;
          case 'number':
            data[field.name] = 0;
            break;
          case 'boolean':
            data[field.name] = false;
            break;
          case 'array':
            data[field.name] = [];
            break;
          case 'object':
            data[field.name] = {};
            break;
          case 'date':
            data[field.name] = new Date().toISOString();
            break;
        }
      }
    });
    return data;
  };

  const handleOpenCreateModal = () => {
    setEditingRecord(null);
    setFormData({
      data: JSON.stringify(getDefaultDataFromSchema(), null, 2),
      importance: 0.5,
      tags: [],
    });
    setDataError('');
    openModal();
  };

  const handleOpenEditModal = (record: MemoryRecord) => {
    setEditingRecord(record);
    setFormData({
      data: JSON.stringify(record.data, null, 2),
      importance: record.importance ?? 0.5,
      tags: record.tags || [],
    });
    setDataError('');
    openModal();
  };

  const handleOpenViewModal = (record: MemoryRecord) => {
    setViewingRecord(record);
    openViewModal();
  };

  const handleCloseModal = () => {
    setEditingRecord(null);
    setFormData({
      data: '{}',
      importance: 0.5,
      tags: [],
    });
    setDataError('');
    closeModal();
  };

  const validateJson = (value: string): boolean => {
    try {
      JSON.parse(value);
      setDataError('');
      return true;
    } catch {
      setDataError('Invalid JSON format');
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!collection) return;
    if (!validateJson(formData.data)) return;

    setSaving(true);
    try {
      const payload = {
        data: JSON.parse(formData.data),
        importance: formData.importance,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
      };

      if (editingRecord) {
        await memoryApi.updateRecord(collection, editingRecord.id, payload);
      } else {
        await memoryApi.createRecord(collection, payload);
      }
      handleCloseModal();
      loadData(searchDebounced);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteModal = (record: MemoryRecord) => {
    setDeletingRecord(record);
    openDeleteModal();
  };

  const handleDelete = async () => {
    if (!deletingRecord || !collection) return;
    setDeleting(true);
    try {
      await memoryApi.deleteRecord(collection, deletingRecord.id);
      closeDeleteModal();
      setDeletingRecord(null);
      loadData(searchDebounced);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record');
    } finally {
      setDeleting(false);
    }
  };

  const formatDataPreview = (data: Record<string, unknown>): string => {
    const entries = Object.entries(data);
    if (entries.length === 0) return '{}';
    const preview = entries.slice(0, 2).map(([k, v]) => {
      const valueStr = typeof v === 'string' ? v : JSON.stringify(v);
      const truncated = valueStr.length > 30 ? valueStr.substring(0, 30) + '...' : valueStr;
      return `${k}: ${truncated}`;
    }).join(', ');
    return entries.length > 2 ? `${preview}, ...` : preview;
  };

  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (!schema) {
    return (
      <Box>
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          Collection "{collection}" not found
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Breadcrumbs mb="md">
        <Anchor component={NavLink} to="/collections">Collections</Anchor>
        <Text>{collection}</Text>
      </Breadcrumbs>

      <Group justify="space-between" mb="md">
        <Box>
          {schema.description && (
            <Text c="dimmed" size="sm">{schema.description}</Text>
          )}
        </Box>
        <Group gap="xs">
          <Text c="dimmed" size="sm">{records.length} record{records.length !== 1 ? 's' : ''}</Text>
        </Group>
      </Group>

      <Group mb="md" gap="sm">
        <TextInput
          placeholder="Search records..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1, maxWidth: 400 }}
        />
        <Box style={{ flex: 1 }} />
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreateModal}>
          Add Record
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
              <Table.Th style={{ width: 100 }}>ID</Table.Th>
              <Table.Th>Data</Table.Th>
              <Table.Th style={{ width: 100 }}>Importance</Table.Th>
              <Table.Th style={{ width: 150 }}>Tags</Table.Th>
              <Table.Th style={{ width: 120 }}>Created</Table.Th>
              <Table.Th style={{ width: 120, textAlign: 'right' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {records.map((record) => (
              <Table.Tr key={record.id}>
                <Table.Td>
                  <Code fz="xs">{record.id.slice(0, 8)}</Code>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed" lineClamp={1}>
                    {formatDataPreview(record.data)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {record.importance !== undefined && (
                    <Badge size="sm" variant="light" color={record.importance > 0.7 ? 'green' : record.importance > 0.3 ? 'yellow' : 'gray'}>
                      {record.importance.toFixed(2)}
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {record.tags?.slice(0, 2).map((tag) => (
                      <Badge key={tag} size="xs" variant="outline">
                        {tag}
                      </Badge>
                    ))}
                    {(record.tags?.length ?? 0) > 2 && (
                      <Badge size="xs" variant="outline" c="dimmed">
                        +{(record.tags?.length ?? 0) - 2}
                      </Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {new Date(record.createdAt).toLocaleDateString()}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Group gap="xs" justify="flex-end">
                    <Tooltip label="View">
                      <ActionIcon
                        variant="subtle"
                        onClick={() => handleOpenViewModal(record)}
                      >
                        <IconEye size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Edit">
                      <ActionIcon
                        variant="subtle"
                        onClick={() => handleOpenEditModal(record)}
                      >
                        <IconPencil size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => handleOpenDeleteModal(record)}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {records.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text ta="center" c="dimmed" py="md">
                    {search ? 'No records match your search' : 'No records in this collection'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>

      <RecordModal
        opened={modalOpened}
        onClose={handleCloseModal}
        record={editingRecord}
        schema={schema}
        formData={formData}
        onFormChange={setFormData}
        dataError={dataError}
        onValidateJson={validateJson}
        onSave={handleSubmit}
        saving={saving}
      />

      <RecordViewModal
        opened={viewModalOpened}
        onClose={closeViewModal}
        record={viewingRecord}
        onEdit={handleOpenEditModal}
      />

      <RecordDeleteModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        record={deletingRecord}
        onDelete={handleDelete}
        deleting={deleting}
      />
    </Box>
  );
}
