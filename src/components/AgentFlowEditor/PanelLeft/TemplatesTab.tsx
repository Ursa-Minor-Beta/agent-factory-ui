import { useEffect, useState } from 'react';
import { Box, Text, Stack, ScrollArea, Center, Loader, Group, ActionIcon, Tooltip, Modal, Button } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { agentsApi, type AgentExample } from '../../../api';

interface TemplatesTabProps {
  hasNodes: boolean;
  onLoadTemplate: (template: AgentExample) => void;
}

export function TemplatesTab({ hasNodes, onLoadTemplate }: TemplatesTabProps) {
  const [templates, setTemplates] = useState<AgentExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmTemplate, setConfirmTemplate] = useState<AgentExample | null>(null);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const data = await agentsApi.getExamples();
        setTemplates(data);
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  const handleUseTemplate = (template: AgentExample) => {
    if (hasNodes) {
      setConfirmTemplate(template);
    } else {
      onLoadTemplate(template);
    }
  };

  const handleConfirm = () => {
    if (confirmTemplate) {
      onLoadTemplate(confirmTemplate);
      setConfirmTemplate(null);
    }
  };

  if (loading) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }

  if (templates.length === 0) {
    return (
      <Center py="xl">
        <Text size="sm" c="dimmed">No templates available</Text>
      </Center>
    );
  }

  return (
    <>
      <Modal
        opened={!!confirmTemplate}
        onClose={() => setConfirmTemplate(null)}
        title="Replace nodes"
        centered
        size="sm"
      >
        <Text size="sm" mb="md">
          This will replace all existing nodes with the "{confirmTemplate?.name}" template. Continue?
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="default" size="xs" onClick={() => setConfirmTemplate(null)}>
            Cancel
          </Button>
          <Button size="xs" onClick={handleConfirm}>
            Replace
          </Button>
        </Group>
      </Modal>

      <ScrollArea flex={1} p="xs" scrollbarSize={6}>
        <Stack gap="xs">
          {templates.map((template, index) => (
          <Box
            key={index}
            style={{
              padding: '8px',
              borderRadius: 'var(--mantine-radius-sm)',
              border: '1px solid var(--mantine-color-default-border)',
            }}
          >
            <Group justify="space-between" wrap="nowrap" gap={4} mb={4}>
              <Text size="xs" fw={500} truncate style={{ flex: 1 }}>
                {template.name}
              </Text>
              <Tooltip label="Use template">
                <ActionIcon
                  variant="subtle"
                  size="xs"
                  onClick={() => handleUseTemplate(template)}
                >
                  <IconArrowRight size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
            {template.description && (
              <Text size="xs" c="dimmed" lineClamp={2}>
                {template.description}
              </Text>
            )}
          </Box>
        ))}
        </Stack>
      </ScrollArea>
    </>
  );
}
