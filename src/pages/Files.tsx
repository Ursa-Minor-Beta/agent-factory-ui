import { useState, useRef } from 'react';
import {
  Box,
  Text,
  Group,
  ActionIcon,
  Loader,
  Center,
  Image,
  Modal,
  Tooltip,
  Badge,
  Button,
  Stack,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconTrash,
  IconDownload,
  IconFile,
  IconFileTypePdf,
  IconPhoto,
  IconSearch,
} from '@tabler/icons-react';
import { filesApi, type FileListItem, type FileData } from '../api';
import type { FilesSortBy, ListFilesParams } from '../api/files';
import {
  DataTable,
  type DataTableBulkAction,
  type DataTableColumn,
  type DataTableHandle,
  type DataTableQuery,
  type SortValue,
} from '../components/common/DataTable';

interface FilesFilters {
  name: string;
  mimeType: string;
  createdAfter: Date | null;
  createdBefore: Date | null;
}

// Sent as a prefix, so 'image' matches every image type; any other prefix can be typed
const MIME_TYPE_SUGGESTIONS = [
  'image',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/json',
  'application/zip',
  'application/xml',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-excel',
  'text',
  'text/plain',
  'text/csv',
  'text/html',
  'text/markdown',
  'audio',
  'video',
];

const INITIAL_SORT: SortValue<FilesSortBy> = { sortBy: 'createdAt', sortOrder: 'desc' };

// Format file size
function formatSize(bytes: number | undefined | null): string {
  if (bytes == null || isNaN(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Get icon for mime type
function getMimeIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <IconPhoto size={18} />;
  if (mimeType === 'application/pdf') return <IconFileTypePdf size={18} />;
  return <IconFile size={18} />;
}

export function FilesPage() {
  const tableRef = useRef<DataTableHandle<FileListItem>>(null);
  const [error, setError] = useState('');
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [deletingFile, setDeletingFile] = useState<FileListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Files the delete modal will act on (from the bulk action)
  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);

  const loadFiles = async ({
    filters,
    sort,
    page,
    pageSize,
  }: DataTableQuery<FilesFilters, FilesSortBy>) => {
    const params: ListFilesParams = {
      ...sort,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    };
    if (filters.name) params.name = filters.name;
    if (filters.mimeType) params.mimeType = filters.mimeType;
    if (filters.createdAfter) params.createdAfter = filters.createdAfter.toISOString();
    if (filters.createdBefore) params.createdBefore = filters.createdBefore.toISOString();

    const { files, total } = await filesApi.list(params);
    return { rows: files, total };
  };

  const handlePreview = async (file: FileListItem) => {
    if (!file.mimeType.startsWith('image/')) return;

    try {
      setLoadingPreview(true);
      const data = await filesApi.getById(file.id);
      setPreviewFile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async (file: FileListItem) => {
    try {
      const data = await filesApi.getById(file.id);
      const link = document.createElement('a');
      link.href = `data:${data.mimeType};base64,${data.data}`;
      link.download = data.name || `file-${file.id}`;
      link.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  const handleOpenDeleteModal = (file: FileListItem) => {
    setDeletingFile(file);
    openDeleteModal();
  };

  const handleBulkDelete = (selected: FileListItem[]) => {
    setFilesToDelete(selected.map((file) => file.id));
    openDeleteModal();
  };

  const handleCloseDeleteModal = () => {
    closeDeleteModal();
    setDeletingFile(null);
    setFilesToDelete([]);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const idsToDelete = deletingFile ? [deletingFile.id] : filesToDelete;

      await filesApi.delete({ id: idsToDelete });
      handleCloseDeleteModal();
      tableRef.current?.clearSelection();
      // Reload current page so it refills after deletion
      await tableRef.current?.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    } finally {
      setDeleting(false);
    }
  };

  const deleteCount = deletingFile ? 1 : filesToDelete.length;

  const bulkActions: DataTableBulkAction<FileListItem>[] = [
    {
      label: 'Delete',
      icon: <IconTrash size={16} />,
      color: 'red',
      onClick: handleBulkDelete,
    },
  ];

  const columns: DataTableColumn<FileListItem, FilesFilters>[] = [
    {
      key: 'preview',
      header: 'Preview',
      width: 60,
      render: (file) => (
        <Box
          style={{
            width: 40,
            height: 40,
            borderRadius: 4,
            overflow: 'hidden',
            backgroundColor: 'var(--mantine-color-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: file.mimeType.startsWith('image/') ? 'pointer' : 'default',
          }}
          onClick={() => handlePreview(file)}
        >
          {getMimeIcon(file.mimeType)}
        </Box>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      filter: { type: 'text', key: 'name', placeholder: 'Search by name', icon: <IconSearch size={16} /> },
      render: (file) => (
        <Text size="sm" truncate style={{ maxWidth: 300 }}>
          {file.name}
        </Text>
      ),
    },
    {
      key: 'mimeType',
      header: 'Type',
      sortable: true,
      filter: {
        type: 'text',
        key: 'mimeType',
        placeholder: 'MIME type',
        suggestions: MIME_TYPE_SUGGESTIONS,
      },
      render: (file) => (
        <Badge variant="light" size="sm">
          {file.mimeType.split('/')[1] || file.mimeType}
        </Badge>
      ),
    },
    {
      key: 'size',
      header: 'Size',
      sortable: true,
      render: (file) => (
        <Text size="sm" c="dimmed">
          {formatSize(file.size)}
        </Text>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      filter: [
        { type: 'date', key: 'createdAfter', placeholder: 'Created after' },
        { type: 'date', key: 'createdBefore', placeholder: 'Created before' },
      ],
      render: (file) => (
        <Text size="sm" c="dimmed">
          {new Date(file.createdAt).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'actions',
      pinned: true,
      header: 'Actions',
      align: 'right',
      render: (file) => (
        <Group gap="xs" justify="flex-end">
          <Tooltip label="Download">
            <ActionIcon variant="subtle" onClick={() => handleDownload(file)}>
              <IconDownload size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete">
            <ActionIcon variant="subtle" color="red" onClick={() => handleOpenDeleteModal(file)}>
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    },
  ];

  return (
    <Box>
      <Text c="dimmed" size="sm" mb="md">
        File storage
      </Text>

      <DataTable
        ref={tableRef}
        columns={columns}
        getRowId={(file) => file.id}
        loadData={loadFiles}
        error={error}
        onErrorClose={() => setError('')}
        emptyMessage="No files stored"
        noMatchMessage="No files match your filters"
        initialSort={INITIAL_SORT}
        bulkActions={bulkActions}
        itemLabel={['file', 'files']}
      />

      {/* Image Preview Modal */}
      <Modal
        opened={!!previewFile}
        onClose={() => setPreviewFile(null)}
        size="xl"
        padding={0}
        withCloseButton
      >
        {loadingPreview ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : previewFile ? (
          <Image
            src={`data:${previewFile.mimeType};base64,${previewFile.data}`}
            alt={previewFile.name}
            fit="contain"
          />
        ) : null}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={handleCloseDeleteModal}
        title={deleteCount > 1 ? 'Delete Files' : 'Delete File'}
        size="sm"
        centered
      >
        <Stack>
          <Text size="sm">
            {deletingFile ? (
              <>Are you sure you want to delete <strong>{deletingFile.name}</strong>?</>
            ) : (
              <>Are you sure you want to delete {deleteCount} {deleteCount === 1 ? 'file' : 'files'}?</>
            )}
          </Text>
          <Text size="sm" c="dimmed">
            This action cannot be undone.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleCloseDeleteModal} disabled={deleting}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
