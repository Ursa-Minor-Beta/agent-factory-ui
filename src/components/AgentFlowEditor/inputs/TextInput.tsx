import { Box, Text, Group, ActionIcon, Modal, Textarea } from '@mantine/core';
import { IconArrowsMaximize } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';

interface TextInputProps {
  name: string;
  nodeLabel?: string;
  value: string;
  onChange: (value: string) => void;
}

export function TextInput({ name, nodeLabel, value, onChange }: TextInputProps) {
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

  return (
    <Box>
      <Group justify="space-between" mb={4}>
        <Text size="xs" c="dimmed">{name}</Text>
        <ActionIcon size="xs" variant="subtle" onClick={openModal} title="Edit in modal">
          <IconArrowsMaximize size={12} />
        </ActionIcon>
      </Group>
      <Textarea
        size="xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minRows={2}
        maxRows={4}
        autosize
      />

      <Modal opened={modalOpened} onClose={closeModal} title={`${nodeLabel || 'Node'} / ${name}`} size="xl" fullScreen centered>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          styles={{
            root: { height: 'calc(100vh - 100px)' },
            wrapper: { height: '100%' },
            input: { height: '100%', fontFamily: 'monospace' },
          }}
        />
      </Modal>
    </Box>
  );
}
