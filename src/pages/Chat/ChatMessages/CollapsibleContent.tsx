import { useState } from 'react';
import { Button, Group, ScrollArea, Code, Box } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconExternalLink, IconPlayerPlay } from '@tabler/icons-react';
import { MarkdownRenderer } from '../../../components/MarkdownRenderer';

const MAX_PREVIEW_LENGTH = 5000;
const MAX_MARKDOWN_LENGTH = 50000;
const CONTENT_HEIGHT = '70vh';
const CONTENT_HEIGHT_EXPANDED = '100vh';

function isHtmlContent(content: string): boolean {
  const trimmed = content.trim().toLowerCase();
  return trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html');
}

function extractHtmlFromCodeBlock(content: string): string | null {
  // Match ```html ... ``` code blocks
  const match = content.match(/```html\s*\n([\s\S]*?)```/i);
  if (match) {
    const html = match[1].trim();
    // Verify it looks like valid HTML
    if (html.toLowerCase().startsWith('<!doctype') || html.toLowerCase().startsWith('<html')) {
      return html;
    }
  }
  return null;
}

function HtmlRenderer({
  content,
  expanded,
  onToggleExpand,
}: {
  content: string;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const [showCode, setShowCode] = useState(false);

  const openInNewTab = () => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Box>
      <Box
        style={{
          minWidth: '50vw',
          border: '1px solid var(--mantine-color-dark-1)',
          borderRadius: 'var(--mantine-radius-md)',
          overflow: 'hidden',
        }}
      >
        {showCode ? (
          <ScrollArea.Autosize mah={expanded ? CONTENT_HEIGHT_EXPANDED : CONTENT_HEIGHT}>
            <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12 }}>
              {content}
            </Code>
          </ScrollArea.Autosize>
        ) : (
          <iframe
            srcDoc={content}
            sandbox="allow-scripts"
            style={{
              width: '100%',
              height: expanded ? CONTENT_HEIGHT_EXPANDED : CONTENT_HEIGHT,
              border: 'none',
              backgroundColor: 'white',
            }}
            title="HTML Preview"
          />
        )}
      </Box>
      <Group gap="xs" mt="xs">
        <Button
          variant="subtle"
          size="xs"
          leftSection={expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          onClick={onToggleExpand}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
        <Button
          variant="subtle"
          size="xs"
          onClick={() => setShowCode(!showCode)}
        >
          {showCode ? 'Preview' : 'Code'}
        </Button>
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconExternalLink size={14} />}
          onClick={openInNewTab}
        >
          Open in new tab
        </Button>
      </Group>
    </Box>
  );
}

export function CollapsibleContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const isHtml = isHtmlContent(content);
  const embeddedHtml = extractHtmlFromCodeBlock(content);
  const isLong = content.length > MAX_PREVIEW_LENGTH;
  const isVeryLong = content.length > MAX_MARKDOWN_LENGTH;

  // HTML content - render in sandboxed iframe
  if (isHtml) {
    return (
      <HtmlRenderer
        content={content}
        expanded={expanded}
        onToggleExpand={() => setExpanded(!expanded)}
      />
    );
  }

  // Content with HTML code block - show markdown with render option
  if (embeddedHtml && showHtmlPreview) {
    return (
      <Box>
        <HtmlRenderer
          content={embeddedHtml}
          expanded={expanded}
          onToggleExpand={() => setExpanded(!expanded)}
        />
        <Button
          variant="subtle"
          size="xs"
          mt="xs"
          onClick={() => setShowHtmlPreview(false)}
        >
          Back to text
        </Button>
      </Box>
    );
  }

  // Short content - render normally
  if (!isLong) {
    return (
      <>
        <MarkdownRenderer>{content}</MarkdownRenderer>
        {embeddedHtml && (
          <Group gap="xs" mt="xs">
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconPlayerPlay size={14} />}
              onClick={() => setShowHtmlPreview(true)}
            >
              Render HTML
            </Button>
          </Group>
        )}
      </>
    );
  }

  // Very long content - use Code block (no markdown parsing)
  if (isVeryLong) {
    const preview = content.slice(0, MAX_PREVIEW_LENGTH);
    return (
      <>
        <ScrollArea.Autosize mah={expanded ? CONTENT_HEIGHT_EXPANDED : undefined}>
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
          {embeddedHtml && (
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconPlayerPlay size={14} />}
              onClick={() => setShowHtmlPreview(true)}
            >
              Render HTML
            </Button>
          )}
        </Group>
      </>
    );
  }

  // Medium length - use markdown with scroll
  return (
    <>
      {expanded ? (
        <ScrollArea.Autosize mah={CONTENT_HEIGHT_EXPANDED}>
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
        {embeddedHtml && (
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconPlayerPlay size={14} />}
            onClick={() => setShowHtmlPreview(true)}
          >
            Render HTML
          </Button>
        )}
      </Group>
    </>
  );
}
