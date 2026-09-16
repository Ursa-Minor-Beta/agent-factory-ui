import { useState } from 'react';
import { Box, Text, ActionIcon, Tooltip, Group, Image, Modal } from '@mantine/core';
import { IconDownload, IconFile } from '@tabler/icons-react';
import type { MessageAttachment } from '../types';

// Download base64 data as file
function downloadBase64(data: string, filename: string, isImage: boolean) {
  const mimeType = isImage ? 'image/png' : 'application/octet-stream';
  const link = document.createElement('a');
  link.href = `data:${mimeType};base64,${data}`;
  link.download = filename;
  link.click();
}

export function AttachmentPreview({ attachments }: { attachments: MessageAttachment[] }) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (attachments.length === 0) return null;

  return (
    <>
      {/* Image preview modal */}
      <Modal
        opened={!!previewImage}
        onClose={() => setPreviewImage(null)}
        size="xl"
        padding={0}
        withCloseButton
      >
        {previewImage && (
          <Image src={`data:image/png;base64,${previewImage}`} alt="Preview" fit="contain" />
        )}
      </Modal>

      <Group gap="xs" mt="sm" wrap="wrap">
        {attachments.map((att, idx) => (
          <Tooltip key={idx} label={`${att.name} (${att.size})`}>
            <Box
              style={{
                position: 'relative',
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                border: '1px solid var(--mantine-color-default-border)',
              }}
            >
              {att.type === 'image' ? (
                <Box onClick={() => setPreviewImage(att.data)}>
                  <Image
                    src={`data:image/png;base64,${att.data}`}
                    alt={att.name}
                    w={80}
                    h={60}
                    fit="cover"
                  />
                  <ActionIcon
                    variant="filled"
                    size="xs"
                    style={{ position: 'absolute', bottom: 4, right: 4 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadBase64(att.data, `${att.name}.png`, true);
                    }}
                  >
                    <IconDownload size={12} />
                  </ActionIcon>
                </Box>
              ) : (
                <Box
                  p="xs"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: 'var(--mantine-color-default)',
                  }}
                  onClick={() => downloadBase64(att.data, att.name, false)}
                >
                  <IconFile size={20} />
                  <Text size="xs" style={{ maxWidth: 100 }} truncate>
                    {att.size}
                  </Text>
                </Box>
              )}
            </Box>
          </Tooltip>
        ))}
      </Group>
    </>
  );
}
