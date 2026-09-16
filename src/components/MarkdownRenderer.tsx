import { Box, Text, Code } from '@mantine/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const failedImages = new Set<string>();

function MarkdownImage({ src, alt }: { src?: string; alt?: string }) {
  if (!src || failedImages.has(src)) return null;

  return (
    <img
      src={src}
      alt={alt || ''}
      style={{
        maxWidth: '100%',
        borderRadius: 'var(--mantine-radius-sm)',
        margin: '8px 0',
      }}
      onError={() => {
        if (src) failedImages.add(src);
      }}
    />
  );
}

interface MarkdownRendererProps {
  children: string;
}

// Convert LaTeX-style delimiters to dollar sign format
function preprocessMath(content: string): string {
  return content
    // Block math: \[ ... \] -> $$ ... $$
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
    // Inline math: \( ... \) -> $ ... $
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
}

export function MarkdownRenderer({ children }: MarkdownRendererProps) {
  const processedContent = preprocessMath(children);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => (
          <Text size="sm" style={{ margin: 0 }}>
            {children}
          </Text>
        ),
        code: ({ children }) => <Code>{children}</Code>,
        pre: ({ children }) => (
          <Box
            component="pre"
            style={{
              backgroundColor: 'var(--mantine-color-default)',
              padding: 'var(--mantine-spacing-xs)',
              borderRadius: 'var(--mantine-radius-sm)',
              overflow: 'auto',
              margin: 'var(--mantine-spacing-xs) 0',
            }}
          >
            {children}
          </Box>
        ),
        ul: ({ children }) => (
          <Box component="ul" style={{ margin: '4px 0', paddingLeft: 20 }}>
            {children}
          </Box>
        ),
        ol: ({ children }) => (
          <Box component="ol" style={{ margin: '4px 0', paddingLeft: 20 }}>
            {children}
          </Box>
        ),
        li: ({ children }) => (
          <Text component="li" size="sm">
            {children}
          </Text>
        ),
        table: ({ children }) => (
          <Box
            component="table"
            style={{
              borderCollapse: 'collapse',
              margin: '8px 0',
              fontSize: 'var(--mantine-font-size-sm)',
              width: '100%',
            }}
          >
            {children}
          </Box>
        ),
        th: ({ children }) => (
          <Box
            component="th"
            style={{
              border: '1px solid var(--mantine-color-default-border)',
              padding: '6px 10px',
              textAlign: 'left',
            }}
          >
            {children}
          </Box>
        ),
        td: ({ children }) => (
          <Box
            component="td"
            style={{
              border: '1px solid var(--mantine-color-default-border)',
              padding: '6px 10px',
            }}
          >
            {children}
          </Box>
        ),
        blockquote: ({ children }) => (
          <Box
            component="blockquote"
            style={{
              borderLeft: '3px solid var(--mantine-color-cyan-6)',
              margin: '8px 0',
              paddingLeft: 12,
              color: 'var(--mantine-color-dimmed)',
            }}
          >
            {children}
          </Box>
        ),
        img: ({ src, alt }) => <MarkdownImage src={src} alt={alt} />,
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
}
