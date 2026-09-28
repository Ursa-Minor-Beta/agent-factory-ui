import { TextInput, Box, Text, Group, ActionIcon, Modal, Textarea } from '@mantine/core';
import { IconArrowsMaximize } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';

interface StringInputProps {
  name: string;
  nodeLabel?: string;
  value: string;
  onChange: (value: string) => void;
}

export function StringInput({ name, nodeLabel, value, onChange }: StringInputProps) {
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

  return (
    <Box>
      <Group justify="space-between" mb={4}>
        <Text size="xs" c="dimmed">{name}</Text>
        <ActionIcon size="xs" variant="subtle" onClick={openModal} title="Edit in modal">
          <IconArrowsMaximize size={12} />
        </ActionIcon>
      </Group>
      <TextInput
        size="xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
