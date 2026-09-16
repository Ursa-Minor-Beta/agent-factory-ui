import { useState } from 'react';
import { Button, Group, ScrollArea, CopyButton, Code, ActionIcon, Tooltip } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconCopy, IconCheck } from '@tabler/icons-react';
import { MarkdownRenderer } from '../../../components/MarkdownRenderer';

const MAX_PREVIEW_LENGTH = 5000;
const MAX_MARKDOWN_LENGTH = 50000;
const MAX_EXPANDED_HEIGHT = 1200;

export function CollapsibleContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > MAX_PREVIEW_LENGTH;
  const isVeryLong = content.length > MAX_MARKDOWN_LENGTH;

  // Short content - render normally
  if (!isLong) {
    return <MarkdownRenderer>{content}</MarkdownRenderer>;
  }

  // Very long content - use Code block (no markdown parsing)
  if (isVeryLong) {
    const preview = content.slice(0, MAX_PREVIEW_LENGTH);
    return (
      <>
        <ScrollArea.Autosize mah={expanded ? MAX_EXPANDED_HEIGHT : undefined}>
          <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12 }}>
            {expanded ? content : preview + '...'}
          </Code>
        </ScrollArea.Autosize>
        <Group gap="xs" mt="xs">
          <Button
            variant="subtle"
            size="xs"
            leftSection={expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show less' : `Show more (${Math.round(content.length / 1000)}k chars)`}
          </Button>
          <CopyButton value={content}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copied' : 'Copy full content'}>
                <ActionIcon variant="subtle" size="sm" onClick={copy}>
                  {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
      </>
    );
  }

  // Medium length - use markdown with scroll
  return (
    <>
      {expanded ? (
        <ScrollArea.Autosize mah={MAX_EXPANDED_HEIGHT}>
          <MarkdownRenderer>{content}</MarkdownRenderer>
        </ScrollArea.Autosize>
      ) : (
        <MarkdownRenderer>{content.slice(0, MAX_PREVIEW_LENGTH) + '...'}</MarkdownRenderer>
      )}
      <Group gap="xs" mt="xs">
        <Button
          variant="subtle"
          size="xs"
          leftSection={expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </Button>
        <CopyButton value={content}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? 'Copied' : 'Copy full content'}>
              <ActionIcon variant="subtle" size="sm" onClick={copy}>
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </Group>
    </>
  );
}
