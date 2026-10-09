import { useRef, useState } from 'react';
import { Box, Text } from '@mantine/core';
import { IconUpload } from '@tabler/icons-react';

interface FileDropZoneProps {
  onFileContent: (content: string) => void;
  accept?: string;
  label?: string;
}

export function FileDropZone({
  onFileContent,
  accept = '',
  label = 'Drop file here or click to select',
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onFileContent(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  return (
    <Box
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${isDragging ? 'var(--mantine-color-cyan-5)' : 'var(--mantine-color-default-border)'}`,
        borderRadius: 'var(--mantine-radius-md)',
        padding: 'var(--mantine-spacing-md)',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background-color 0.2s',
        backgroundColor: isDragging ? 'var(--mantine-color-cyan-light)' : 'transparent',
        flexShrink: 0,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <IconUpload
        size={24}
        style={{
          opacity: isDragging ? 1 : 0.5,
          marginBottom: 4,
          color: isDragging ? 'var(--mantine-color-cyan-5)' : undefined,
        }}
      />
      <Text size="sm" c={isDragging ? 'cyan' : 'dimmed'}>
        {label}
      </Text>
    </Box>
  );
}
