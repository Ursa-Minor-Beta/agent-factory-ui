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
  Tooltip,
  Breadcrumbs,
  Anchor,
  Code,
  Pagination,
  Select,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconSearch,
  IconAlertCircle,
} from '@tabler/icons-react';
import { memoryApi } from '../../api';
import type { MemorySchema, MemoryRecord } from '../../types';
import { getRecordUserFields } from '../../types';
import { RecordModal } from './RecordModal';
import { RecordDeleteModal } from './RecordDeleteModal';

interface RecordForm {
  data: string; // JSON string of user fields
}

export function CollectionRecordsPage() {
  const { collection } = useParams<{ collection: string }>();
  const [schema, setSchema] = useState<MemorySchema | null>(null);
  const [records, setRecords] = useState<MemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingRecord, setEditingRecord] = useState<MemoryRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<MemoryRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  // Form state
  const [formData, setFormData] = useState<RecordForm>({
    data: '{}',
  });
  const [dataError, setDataError] = useState('');

  const loadData = useCallback(async (searchQuery?: string, currentPage?: number, currentLimit?: number) => {
    if (!collection) return;
    const pageNum = currentPage ?? page;
    const limitNum = currentLimit ?? limit;
    const offset = (pageNum - 1) * limitNum;

    try {
      setLoading(true);
      // Load schema and records in parallel
      const [schemasData, recordsData] = await Promise.all([
        memoryApi.listSchemas(),
        memoryApi.listRecords(collection, {
          search: searchQuery || undefined,
          limit: limitNum,
          offset,
          sortDirection: 'desc',
        }),
      ]);
      const foundSchema = schemasData.find((s) => s.name === collection);
      setSchema(foundSchema || null);
      setRecords(recordsData);
      // Use schema recordCount for total, fallback to records length if not available
      setTotal(foundSchema?.recordCount ?? recordsData.length);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [collection, page, limit]);

  // Debounce search and reset page
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1); // Reset to first page on search change
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load data when collection, page, limit, or debounced search changes
  useEffect(() => {
    loadData(searchDebounced, page, limit);
  }, [searchDebounced, page, limit, loadData]);

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
    });
    setDataError('');
    openModal();
  };

  const handleOpenEditModal = (record: MemoryRecord) => {
    setEditingRecord(record);
    setFormData({
      data: JSON.stringify(getRecordUserFields(record), null, 2),
    });
    setDataError('');
    openModal();
  };

  const handleCloseModal = () => {
    setEditingRecord(null);
    setFormData({
      data: '{}',
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
      // Send flat user fields directly (not wrapped in data)
      const payload = JSON.parse(formData.data);

      if (editingRecord) {
        await memoryApi.updateRecord(collection, editingRecord.id, payload);
      } else {
        await memoryApi.createRecord(collection, payload);
        setPage(1); // Go to first page after creating new record
      }
      handleCloseModal();
      loadData(searchDebounced, editingRecord ? page : 1, limit);
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
      // If last item on page, go to previous page
      const newPage = records.length === 1 && page > 1 ? page - 1 : page;
      if (newPage !== page) setPage(newPage);
      loadData(searchDebounced, newPage, limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record');
    } finally {
      setDeleting(false);
    }
  };

  const formatDataPreview = (data: Record<string, unknown> | null | undefined): string => {
    if (!data) return '{}';
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
          <Text c="dimmed" size="sm">{total} record{total !== 1 ? 's' : ''}</Text>
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
              <Table.Th>Fields</Table.Th>
              <Table.Th style={{ width: 120 }}>Created</Table.Th>
              <Table.Th style={{ width: 120 }}>Updated</Table.Th>
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
                    {formatDataPreview(getRecordUserFields(record))}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {new Date(record.createdAt).toLocaleDateString()}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {new Date(record.updatedAt).toLocaleDateString()}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Group gap="xs" justify="flex-end">
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
                <Table.Td colSpan={5}>
                  <Text ta="center" c="dimmed" py="md">
                    {search ? 'No records match your search' : 'No records in this collection'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>

        {/* Pagination */}
        {total > 0 && (
          <Group justify="space-between" mt="md">
            <Group gap="xs">
              <Text size="sm" c="dimmed">Rows per page:</Text>
              <Select
                size="xs"
                w={80}
                value={String(limit)}
                onChange={(value) => {
                  setLimit(Number(value));
                  setPage(1);
                }}
                data={[
                  { value: '10', label: '10' },
                  { value: '20', label: '20' },
                  { value: '50', label: '50' },
                  { value: '100', label: '100' },
                ]}
              />
              <Text size="sm" c="dimmed">
                {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
              </Text>
            </Group>
            <Pagination
              size="sm"
              total={Math.ceil(total / limit)}
              value={page}
              onChange={setPage}
            />
          </Group>
        )}
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
