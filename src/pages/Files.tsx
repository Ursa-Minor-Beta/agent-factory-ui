import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Text,
  Card,
  Group,
  ActionIcon,
  Loader,
  Alert,
  Table,
  Center,
  Image,
  Modal,
  Tooltip,
  Badge,
  Pagination,
  Select,
  Button,
  Stack,
  Checkbox,
  Paper,
  Transition,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconTrash,
  IconAlertCircle,
  IconDownload,
  IconFile,
  IconFileTypePdf,
  IconPhoto,
  IconSquareCheck,
} from '@tabler/icons-react';
import { filesApi, type FileListItem, type FileData } from '../api';

const PAGE_SIZE_OPTIONS = ['10', '25', '50', '100'];
const DEFAULT_PAGE_SIZE = 25;

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
  const [files, setFiles] = useState<FileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [deletingFile, setDeletingFile] = useState<FileListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Selection state
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [hasMore, setHasMore] = useState(true);

  const loadFiles = useCallback(async (currentPage: number, limit: number) => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * limit;
      const data = await filesApi.list({ limit, offset });
      setFiles(data);
      // If we got fewer items than requested, we're at the last page
      setHasMore(data.length >= limit);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles(page, pageSize);
  }, [page, pageSize, loadFiles]);

  // Clear selection when page changes
  useEffect(() => {
    setSelectedFileIds(new Set());
  }, [page, pageSize]);

  // Selection handlers
  const handleToggleAll = () => {
    if (selectedFileIds.size === files.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(files.map((f) => f.id)));
    }
  };

  const handleToggleFile = (fileId: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (value: string | null) => {
    if (value) {
      setPageSize(Number(value));
      setPage(1); // Reset to first page when changing page size
    }
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

  const handleOpenDeleteModal = (file?: FileListItem) => {
    if (file) {
      setDeletingFile(file);
    }
    openDeleteModal();
  };

  const handleBulkDelete = () => {
    if (selectedFileIds.size > 0) {
      openDeleteModal();
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const idsToDelete = deletingFile
        ? [deletingFile.id]
        : Array.from(selectedFileIds);

      await filesApi.delete({ id: idsToDelete });
      closeDeleteModal();
      setDeletingFile(null);
      setSelectedFileIds(new Set());
      // Reload current page after deletion
      loadFiles(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    } finally {
      setDeleting(false);
    }
  };

  // Calculate total pages (estimate based on hasMore)
  const totalPages = hasMore ? page + 1 : page;
  const allSelected = files.length > 0 && selectedFileIds.size === files.length;
  const deleteCount = deletingFile ? 1 : selectedFileIds.size;

  return (
    <Box>
      <Text c="dimmed" size="sm" mb="md">
        File storage
      </Text>

      {/* Bulk actions bar */}
      <Box style={{ position: 'relative' }}>
        <Transition mounted={selectedFileIds.size > 0} transition="slide-down" duration={200}>
          {(styles) => (
            <Paper
              withBorder
              p="md"
              mb="md"
              radius="md"
              style={{
                ...styles,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 10,
                borderColor: 'var(--mantine-color-cyan-6)',
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="xs">
                  <IconSquareCheck size={20} style={{ color: 'var(--mantine-color-cyan-6)' }} />
                  <div>
                    <Text size="sm" fw={600} c="cyan.9">
                      {selectedFileIds.size} {selectedFileIds.size !== 1 ? 'files' : 'file'} selected
                    </Text>
                    <Text size="xs" c="dimmed">
                      Choose an action to perform on selected items
                    </Text>
                  </div>
                </Group>
                <Group gap="xs">
                  <Button
                    variant="light"
                    color="gray"
                    size="sm"
                    onClick={() => setSelectedFileIds(new Set())}
                  >
                    Clear
                  </Button>
                  <Button
                    color="red"
                    size="sm"
                    leftSection={<IconTrash size={16} />}
                    onClick={handleBulkDelete}
                  >
                    Delete
                  </Button>
                </Group>
              </Group>
            </Paper>
          )}
        </Transition>
      </Box>

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
        {loading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 40 }}>
                  <Checkbox
                    size="xs"
                    checked={allSelected}
                    indeterminate={selectedFileIds.size > 0 && !allSelected}
                    onChange={handleToggleAll}
                  />
                </Table.Th>
                <Table.Th style={{ width: 60 }}>Preview</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Size</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {files.map((file) => {
                const isSelected = selectedFileIds.has(file.id);
                return (
                <Table.Tr key={file.id}>
                  <Table.Td>
                    <Checkbox
                      size="xs"
                      checked={isSelected}
                      onChange={() => handleToggleFile(file.id)}
                    />
                  </Table.Td>
                  <Table.Td>
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
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" truncate style={{ maxWidth: 300 }}>
                      {file.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" size="sm">
                      {file.mimeType.split('/')[1] || file.mimeType}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {formatSize(file.size)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Group gap="xs" justify="flex-end">
                      <Tooltip label="Download">
                        <ActionIcon variant="subtle" onClick={() => handleDownload(file)}>
                          <IconDownload size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => handleOpenDeleteModal(file)}
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
                );
              })}
              {files.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text ta="center" c="dimmed" py="md">
                      No files stored
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}

        {/* Pagination */}
        {(files.length > 0 || page > 1) && (
          <Group justify="space-between" mt="md" px="sm">
            <Group gap="xs">
              <Text size="sm" c="dimmed">Rows per page:</Text>
              <Select
                size="xs"
                w={70}
                value={String(pageSize)}
                onChange={handlePageSizeChange}
                data={PAGE_SIZE_OPTIONS}
              />
            </Group>
            <Pagination
              value={page}
              onChange={handlePageChange}
              total={totalPages}
              size="sm"
            />
          </Group>
        )}
      </Card>

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
        onClose={closeDeleteModal}
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
            <Button variant="subtle" onClick={closeDeleteModal} disabled={deleting}>
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
