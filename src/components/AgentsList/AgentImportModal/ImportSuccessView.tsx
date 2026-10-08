import { Text, Group, Button, Stack, Card, Badge } from '@mantine/core';
import { IconCircleCheck, IconCircleDashed, IconKey, IconCloud, IconDatabase, IconPlus, IconCircleHalf2, IconRobot } from '@tabler/icons-react';
import type { AgentImportResponse } from '../../../types';

interface ConfigItemProps {
  name: string;
  isCreated: boolean;
  isGlobal: boolean;
  onCreate?: () => void;
}

function ConfigItem({ name, isCreated, isGlobal, onCreate }: ConfigItemProps) {
  const resolved = isCreated || isGlobal;

  return (
    <Group gap="xs" py={6} px="xs" style={{ borderRadius: 'var(--mantine-radius-sm)' }}>
      {isCreated ? (
        <IconCircleCheck size={16} color="var(--mantine-color-green-6)" />
      ) :
      isGlobal ? (
        <IconCircleHalf2 size={16} color="var(--mantine-color-blue-6)" />
      ) : (
        <IconCircleDashed size={16} color="var(--mantine-color-dimmed)" />
      )}
      <Text size="sm" c={resolved ? 'dimmed' : undefined} style={{ flex: 1 }}>
        {name}
      </Text>
      {isGlobal && (
        <Badge size="sm" color="blue" variant="light">Global exists</Badge>
      )}
      {onCreate && !isCreated && (
        <Button size="compact-xs" variant="light" onClick={onCreate} leftSection={<IconPlus size={12} />}>
          {isGlobal ? 'Create local' : 'Create'}
        </Button>
      )}
      {isCreated && (
        <Badge size="sm" color="green" variant="light">Created</Badge>
      )}
    </Group>
  );
}

interface ConfigSectionProps {
  title: string;
  icon: React.ReactNode;
  items: string[];
  createdItems: Set<string>;
  globalItems: Set<string>;
  onCreate?: (item: string) => void;
}

function ConfigSection({ title, icon, items, createdItems, globalItems, onCreate }: ConfigSectionProps) {
  if (!items || items.length === 0) return null;

  const resolvedCount = items.filter((item) => createdItems.has(item) || globalItems.has(item)).length;
  const allDone = resolvedCount === items.length;

  return (
    <Card withBorder padding="sm" radius="md">
      <Group gap="xs" mb="xs">
        {icon}
        <Text size="sm" fw={500} style={{ flex: 1 }}>{title}</Text>
        <Badge size="sm" color={allDone ? 'green' : 'gray'} variant="light">
          {resolvedCount}/{items.length}
        </Badge>
      </Group>
      <Stack gap={0}>
        {items.map((item) => (
          <ConfigItem
            key={item}
            name={item}
            isCreated={createdItems.has(item)}
            isGlobal={globalItems.has(item)}
            onCreate={onCreate ? () => onCreate(item) : undefined}
          />
        ))}
      </Stack>
    </Card>
  );
}

interface ImportSuccessViewProps {
  result: AgentImportResponse;
  onClose: () => void;
  onNavigateToWorkspace: () => void;
  onCreateSecret?: (name: string) => void;
  onCreateProvider?: (name: string) => void;
  onCreateCollection?: (name: string) => void;
  createdSecrets: Set<string>;
  createdProviders: Set<string>;
  createdCollections: Set<string>;
  globalSecrets: Set<string>;
  globalProviders: Set<string>;
  globalCollections: Set<string>;
}

export function ImportSuccessView({
  result,
  onClose,
  onNavigateToWorkspace,
  onCreateSecret,
  onCreateProvider,
  onCreateCollection,
  createdSecrets,
  createdProviders,
  createdCollections,
  globalSecrets,
  globalProviders,
  globalCollections,
}: ImportSuccessViewProps) {
  // Get collection names from result.warnings.missingCollections (schemas to create)
  const collectionsToCreate = result.warnings.missingCollections?.map((c) => c.name) ?? [];

  const hasWarnings =
    (result.warnings.missingSecrets?.length ?? 0) > 0 ||
    (result.warnings.missingProviders?.length ?? 0) > 0 ||
    collectionsToCreate.length > 0;

  return (
    <Stack gap="xs">
      {Object.keys(result.agentIdMap).length > 1 && (
        <Card withBorder padding="sm" radius="md">
          <Group gap="xs">
            <IconRobot size={16} color="var(--mantine-color-green-6)" />
            <Text size="sm" fw={500} style={{ flex: 1 }}>Sub-agents Imported</Text>
            <Badge size="sm" color="green" variant="light">
              {Object.keys(result.agentIdMap).length - 1}
            </Badge>
          </Group>
        </Card>
      )}

      {hasWarnings && (
        <>
          <ConfigSection
            title="Collections"
            icon={<IconDatabase size={16} color="var(--mantine-color-dimmed)" />}
            items={collectionsToCreate}
            createdItems={createdCollections}
            globalItems={globalCollections}
            onCreate={onCreateCollection}
          />
          <ConfigSection
            title="Secrets"
            icon={<IconKey size={16} color="var(--mantine-color-dimmed)" />}
            items={result.warnings.missingSecrets ?? []}
            createdItems={createdSecrets}
            globalItems={globalSecrets}
            onCreate={onCreateSecret}
          />
          <ConfigSection
            title="Providers"
            icon={<IconCloud size={16} color="var(--mantine-color-dimmed)" />}
            items={result.warnings.missingProviders ?? []}
            createdItems={createdProviders}
            globalItems={globalProviders}
            onCreate={onCreateProvider}
          />
        </>
      )}

      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onNavigateToWorkspace}>
          To Workspace
        </Button>
      </Group>
    </Stack>
  );
}
