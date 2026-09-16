import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, ActionIcon, Loader, Image, Tooltip, Modal } from '@mantine/core';
import { IconFile, IconDownload, IconAlertCircle, IconFileTypePdf } from '@tabler/icons-react';
import { filesApi, type FileData } from '../../../api';

// Simple in-memory cache for fetched files
const fileCache = new Map<string, FileData>();

interface FileContentProps {
  fileId: string;
  mimeType: string;
  fieldName?: string;
  onPreview?: (data: string, mimeType: string) => void;
}

interface FilePreviewProps {
  fileRefs: Array<{ fileId: string; mimeType: string; fieldName?: string }>;
}

// Single file item with lazy loading
function FileItem({ fileId, mimeType, fieldName, onPreview }: FileContentProps) {
  const [fileData, setFileData] = useState<FileData | null>(fileCache.get(fileId) || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const fetchFile = useCallback(async () => {
    if (fileCache.has(fileId)) {
      setFileData(fileCache.get(fileId)!);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await filesApi.getById(fileId);
      fileCache.set(fileId, data);
      setFileData(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes('404')) {
        setError('File unavailable');
      } else {
        setError('Failed to load');
      }
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  // Fetch file when visible and not already loaded
  useEffect(() => {
    if (isVisible && !fileData && !loading && !error) {
      fetchFile();
    }
  }, [isVisible, fileData, loading, error, fetchFile]);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!fileData) return;
    const link = document.createElement('a');
    link.href = `data:${fileData.mimeType};base64,${fileData.data}`;
    link.download = fileData.name || `file-${fileId}`;
    link.click();
  };

  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const label = fieldName || fileData?.name || mimeType;

  // Placeholder / Loading / Error states
  if (!isVisible || loading || error || !fileData) {
    return (
      <Tooltip label={error || (loading ? `Loading ${mimeType}...` : label)}>
        <Box
          ref={containerRef}
          style={{
            position: 'relative',
            width: 80,
            height: 60,
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid var(--mantine-color-default-border)',
            backgroundColor: 'var(--mantine-color-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: error ? 'pointer' : 'default',
          }}
          onClick={error ? fetchFile : undefined}
        >
          {loading ? (
            <Loader size="xs" />
          ) : error ? (
            <IconAlertCircle size={20} style={{ color: 'var(--mantine-color-red-5)' }} />
          ) : (
            <IconFile size={20} style={{ color: 'var(--mantine-color-dimmed)' }} />
          )}
        </Box>
      </Tooltip>
    );
  }

  // Image thumbnail
  if (isImage) {
    return (
      <Tooltip label={label}>
        <Box
          style={{
            position: 'relative',
            borderRadius: 8,
            overflow: 'hidden',
            cursor: 'pointer',
            border: '1px solid var(--mantine-color-default-border)',
          }}
          onClick={() => onPreview?.(fileData.data, fileData.mimeType)}
        >
          <Image
            src={`data:${fileData.mimeType};base64,${fileData.data}`}
            alt={label}
            w={80}
            h={60}
            fit="cover"
          />
          <ActionIcon
            variant="filled"
            size="xs"
            style={{ position: 'absolute', bottom: 4, right: 4 }}
            onClick={handleDownload}
          >
            <IconDownload size={12} />
          </ActionIcon>
        </Box>
      </Tooltip>
    );
  }

  // PDF
  if (isPdf) {
    return (
      <Tooltip label={fileData.name || 'PDF Document'}>
        <Box
          style={{
            position: 'relative',
            width: 80,
            height: 60,
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid var(--mantine-color-default-border)',
            backgroundColor: 'var(--mantine-color-default)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={handleDownload}
        >
          <IconFileTypePdf size={24} style={{ color: 'var(--mantine-color-red-5)' }} />
          <Text size='xs' c="dimmed" mt={2}>PDF</Text>
        </Box>
      </Tooltip>
    );
  }

  // Other file types
  return (
    <Tooltip label={fileData.name || label}>
      <Box
        style={{
          position: 'relative',
          width: 80,
          height: 60,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-default)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        onClick={handleDownload}
      >
        <IconFile size={24} style={{ color: 'var(--mantine-color-dimmed)' }} />
        <Text size='xs' c="dimmed" mt={2} truncate style={{ maxWidth: 70 }}>
          {mimeType.split('/')[1] || 'file'}
        </Text>
      </Box>
    </Tooltip>
  );
}

// Export wrapper component that handles preview modal
export function FileContent({ fileId, mimeType, fieldName }: FileContentProps) {
  const [previewData, setPreviewData] = useState<{ data: string; mimeType: string } | null>(null);

  return (
    <>
      <Modal
        opened={!!previewData}
        onClose={() => setPreviewData(null)}
        size="xl"
        padding={0}
        withCloseButton
      >
        {previewData && (
          <Image
            src={`data:${previewData.mimeType};base64,${previewData.data}`}
            alt="Preview"
            fit="contain"
          />
        )}
      </Modal>
      <FileItem
        fileId={fileId}
        mimeType={mimeType}
        fieldName={fieldName}
        onPreview={(data, mt) => setPreviewData({ data, mimeType: mt })}
      />
    </>
  );
}

// Export grouped preview component matching AttachmentPreview style
export function FileRefPreview({ fileRefs }: FilePreviewProps) {
  const [previewData, setPreviewData] = useState<{ data: string; mimeType: string } | null>(null);

  if (fileRefs.length === 0) return null;

  return (
    <>
      <Modal
        opened={!!previewData}
        onClose={() => setPreviewData(null)}
        size="xl"
        padding={0}
        withCloseButton
      >
        {previewData && (
          <Image
            src={`data:${previewData.mimeType};base64,${previewData.data}`}
            alt="Preview"
            fit="contain"
          />
        )}
      </Modal>
      <Box style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {fileRefs.map((ref, idx) => (
          <FileItem
            key={idx}
            fileId={ref.fileId}
            mimeType={ref.mimeType}
            fieldName={ref.fieldName}
            onPreview={(data, mt) => setPreviewData({ data, mimeType: mt })}
          />
        ))}
      </Box>
    </>
  );
}
