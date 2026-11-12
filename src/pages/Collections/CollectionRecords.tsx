import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box,
  Text,
  Button,
  Group,
  ActionIcon,
  Loader,
  Alert,
  Center,
  Tooltip,
  Breadcrumbs,
  Code,
  Badge,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconSearch,
  IconAlertCircle,
  IconList,
} from '@tabler/icons-react';
import { memoryApi } from '../../api';
import type { MemorySchema, MemoryRecord, MemoryFieldType } from '../../types';
import { getRecordUserFields } from '../../types';
import type { FilterField } from '../../components/common/TableFilters';
import {
  DataTable,
  type DataTableColumn,
  type DataTableHandle,
  type DataTableQuery,
  type SortValue,
} from '../../components/common/DataTable';
import { CopyId } from '../../components/common/CopyId';
import { RecordModal } from './RecordModal';
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal';
import { routes } from '../../config/routes';
import { WorkspaceBadge } from '../../components/Workspace';

// 'createdAt', 'updatedAt' or a schema field name
type RecordsSortBy = string;

interface RecordsFilters {
  field: string | null;
  value: string;
}

const INITIAL_SORT: SortValue<RecordsSortBy> = { sortBy: 'createdAt', sortOrder: 'desc' };

// Search is "field contains value"; not tied to a column since field columns come from the schema
function buildSearchFilters(schema: MemorySchema): FilterField<RecordsFilters>[] {
  const defaultField = schema.fields.find((field) => field.type === 'string') ?? schema.fields[0];
  return [
    {
      type: 'select',
      key: 'field',
      placeholder: 'Field',
      options: schema.fields
        .map((field) => ({ value: field.name, label: field.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      defaultValue: defaultField?.name ?? null,
      // Choosing the field alone isn't a filter
      persistent: true,
    },
    {
      type: 'text',
      key: 'value',
      placeholder: 'Contains...',
      icon: <IconSearch size={16} />,
      width: 250,
      debounce: 300,
    },
  ];
}

const MAX_TEXT_LENGTH = 60;

function truncate(text: string) {
  return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}…` : text;
}

/** Cell content for a record field, formatted by its schema type */
function FieldValue({ type, value }: { type: MemoryFieldType; value: unknown }) {
  if (value === undefined || value === null || value === '') {
    return <Text size="sm" c="dimmed">-</Text>;
  }
  switch (type) {
    case 'boolean':
      return (
        <Badge size="sm" variant="light" color={value ? 'teal' : 'gray'}>
          {value ? 'true' : 'false'}
        </Badge>
      );
    case 'date': {
      const date = new Date(String(value));
      return (
        <Text size="sm" c="dimmed">
          {Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()}
        </Text>
      );
    }
    case 'array':
    case 'object':
      return <Code fz="xs">{truncate(JSON.stringify(value))}</Code>;
    default:
      return (
        <Text size="sm" lineClamp={1}>
          {truncate(String(value))}
        </Text>
      );
  }
}

interface RecordForm {
  data: string; // JSON string of user fields
}

export function CollectionRecordsPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const tableRef = useRef<DataTableHandle<MemoryRecord>>(null);
  const [schema, setSchema] = useState<MemorySchema | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingRecord, setEditingRecord] = useState<MemoryRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<MemoryRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<RecordForm>({
    data: '{}',
  });
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    if (!collectionId) return;
    setSchemaLoading(true);
    memoryApi
      .getSchema(collectionId)
      .then((data) => {
        setSchema(data);
        setError('');
      })
      .catch((err) => {
        setSchema(null);
        setError(err instanceof Error ? err.message : 'Failed to load collection');
      })
      .finally(() => setSchemaLoading(false));
  }, [collectionId]);

  const loadRecords = async ({
    filters,
    sort,
    page,
    pageSize,
  }: DataTableQuery<RecordsFilters, RecordsSortBy>) => {
    if (!schema) return { rows: [], total: 0 };
    const searching = Boolean(filters.field && filters.value);
    const data = await memoryApi.listRecords(schema.id, {
      field: searching ? filters.field ?? undefined : undefined,
      value: searching ? filters.value : undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      sortField: sort?.sortBy,
      sortDirection: sort?.sortOrder,
    });
    return { rows: data.records, total: data.total };
  };

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
    if (!schema) return;
    if (!validateJson(formData.data)) return;

    setSaving(true);
    try {
      // Send flat user fields directly (not wrapped in data)
      const payload = JSON.parse(formData.data);

      if (editingRecord) {
        await memoryApi.updateRecord(schema.id, editingRecord.id, payload);
      } else {
        await memoryApi.createRecord(schema.id, payload);
      }
      handleCloseModal();
      tableRef.current?.reload();
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
    if (!deletingRecord || !schema) return;
    setDeleting(true);
    try {
      await memoryApi.deleteRecord(schema.id, deletingRecord.id);
      closeDeleteModal();
      setDeletingRecord(null);
      // Refetch so the page refills; the table steps back if the page is now empty
      tableRef.current?.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record');
    } finally {
      setDeleting(false);
    }
  };

  if (schemaLoading) {
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
          Collection "{collectionId}" not found
        </Alert>
      </Box>
    );
  }

  const columns: DataTableColumn<MemoryRecord, RecordsFilters>[] = [
    {
      key: 'id',
      header: 'ID',
      width: 140,
      render: (record) => (
        <CopyId value={record.id} label={record.id.slice(0, 8)} tooltip="Copy Record ID" dimmed />
      ),
    },
    // One column per schema field
    ...schema.fields.map(
      (field): DataTableColumn<MemoryRecord, RecordsFilters> => ({
        key: field.name,
        header: field.name,
        sortable: true,
        render: (record) => (
          <FieldValue type={field.type} value={(record as unknown as Record<string, unknown>)[field.name]} />
        ),
      })
    ),
    {
      key: 'createdAt',
      header: 'Created',
      width: 120,
      sortable: true,
      render: (record) => (
        <Text size="sm" c="dimmed">
          {new Date(record.createdAt).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      width: 120,
      sortable: true,
      render: (record) => (
        <Text size="sm" c="dimmed">
          {new Date(record.updatedAt).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'actions',
      pinned: true,
      header: 'Actions',
      width: 120,
      align: 'right',
      render: (record) => (
        <Group gap="xs" justify="flex-end">
          <Tooltip label="Edit">
            <ActionIcon variant="subtle" onClick={() => handleOpenEditModal(record)}>
              <IconPencil size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete">
            <ActionIcon variant="subtle" color="red" onClick={() => handleOpenDeleteModal(record)}>
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    },
  ];

  return (
    <Box>
      <Group justify="space-between" mb="md" wrap="nowrap">
        <Breadcrumbs>
          <Tooltip label="All Collections">
            <ActionIcon variant="subtle" color="gray" size="md" component={Link} to={routes.collections()}>
              <IconList size={18} />
            </ActionIcon>
          </Tooltip>
          <Group gap="xs" wrap="nowrap">
            <Text>{schema.name}</Text>
            <WorkspaceBadge workspaceId={schema.workspaceId} workspaceName={schema.workspaceName} />
          </Group>
        </Breadcrumbs>
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreateModal}>
          Add Record
        </Button>
      </Group>

      {schema.description && (
        <Text c="dimmed" size="sm" mb="md">
          {schema.description}
        </Text>
      )}

      <DataTable
        // Remount when navigating to another collection
        key={schema.id}
        ref={tableRef}
        columns={columns}
        getRowId={(record) => record.id}
        loadData={loadRecords}
        error={error}
        onErrorClose={() => setError('')}
        emptyMessage="No records in this collection"
        noMatchMessage="No records match your search"
        extraFilters={buildSearchFilters(schema)}
        initialSort={INITIAL_SORT}
        itemLabel={['record', 'records']}
      />

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

      <DeleteConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onDelete={handleDelete}
        deleting={deleting}
        title="Delete Record"
        entityName={<>record <Code fz="xs">{deletingRecord?.id}</Code></>}
      />
    </Box>
  );
}
