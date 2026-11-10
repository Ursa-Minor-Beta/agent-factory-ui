import { memo, useMemo } from 'react';
import { TEMPLATE_VAR_REGEX, TEMPLATE_REF_REGEX } from '../utils/converters';

export interface NodeMetadata {
  id: string;
  outputs?: string[];
}

// Secret / variable names available for {{secret:NAME}} / {{var:NAME}} references
export interface TemplateRefs {
  secrets?: string[];
  variables?: string[];
}

export type TemplateKind = 'node' | 'secret' | 'var';

export const TEMPLATE_KIND_COLORS: Record<TemplateKind, string> = {
  node: 'rgba(34, 184, 207, 0.15)',
  secret: 'rgba(250, 176, 5, 0.2)',
  var: 'rgba(151, 117, 250, 0.2)',
};
export const TEMPLATE_INVALID_COLOR = 'rgba(246, 22, 22, .5)';

// Template option label without braces: "node:id.output", "secret:NAME", "var:NAME"
export function buildTemplateOptions(nodes: NodeMetadata[] = [], refs?: TemplateRefs): string[] {
  const options: string[] = [];

  // Only node.output combinations, not bare nodes
  nodes.forEach(node => {
    node.outputs?.forEach(output => options.push(`node:${node.id}.${output}`));
  });
  refs?.variables?.forEach(name => options.push(`var:${name}`));
  refs?.secrets?.forEach(name => options.push(`secret:${name}`));

  return options.sort((a, b) => a.localeCompare(b));
}

const TEMPLATE_KINDS: TemplateKind[] = ['node', 'secret', 'var'];

// Kind shortcut option ("node:", "secret:", "var:") - selecting it only inserts the prefix
export const isTemplateKindOption = (option: string) => option.endsWith(':');

// Filter options by what's typed after {{ (e.g. "", "sec", "node:llm.")
// While no kind is typed yet, kind shortcuts for kinds with options go first
export function filterTemplateOptions(options: string[], query: string): string[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, '');
  const filtered = q ? options.filter(option => option.toLowerCase().includes(q)) : options;
  if (q.includes(':')) return filtered;

  const kinds = TEMPLATE_KINDS
    .filter(kind => kind.startsWith(q) && options.some(option => getTemplateKind(option) === kind))
    .map(kind => `${kind}:`);
  return [...kinds, ...filtered];
}

export function getTemplateKind(option: string): TemplateKind {
  return option.slice(0, option.indexOf(':')) as TemplateKind;
}

// Lookup sets for validating references
export interface TemplateValidation {
  nodeIds: Set<string>;
  secrets: Set<string>;
  variables: Set<string>;
}

export function buildTemplateValidation(nodeIds: string[] = [], refs?: TemplateRefs): TemplateValidation {
  return {
    nodeIds: new Set(nodeIds),
    secrets: new Set(refs?.secrets ?? []),
    variables: new Set(refs?.variables ?? []),
  };
}

// Resolve kind and validity of a full {{...}} reference
export function checkTemplateRef(ref: string, validation: TemplateValidation): { kind: TemplateKind; isValid: boolean } | null {
  const match = ref.match(TEMPLATE_REF_REGEX);
  if (!match) return null;

  const kind = match[1] as TemplateKind;
  const target = match[2];
  if (kind === 'node') return { kind, isValid: validation.nodeIds.has(target.split('.')[0].trim()) };
  if (kind === 'secret') return { kind, isValid: validation.secrets.has(target) };
  return { kind, isValid: validation.variables.has(target) };
}

interface HighlightedTextProps {
  text: string;
  validation: TemplateValidation;
}

export const HighlightedText = memo(function HighlightedText({ text, validation }: HighlightedTextProps) {
  const parts = useMemo(() => {
    if (!text) return [];
    return text.split(TEMPLATE_VAR_REGEX);
  }, [text]);

  return (
    <>
      {parts.map((part, i) => {
        const ref = checkTemplateRef(part, validation);
        if (!ref) {
          return <span key={i}>{part}</span>;
        }

        return (
          <span
            key={i}
            style={{
              color: 'transparent',
              backgroundColor: ref.isValid ? TEMPLATE_KIND_COLORS[ref.kind] : TEMPLATE_INVALID_COLOR,
              borderRadius: 2,
            }}
          >
            {part}
          </span>
        );
      })}
    </>
  );
});

// Find the start of the current template being typed (after {{ )
// Style properties that affect text layout, copied to the caret measuring mirror
const CARET_MIRROR_PROPS = [
  'boxSizing', 'width', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'fontStyle', 'fontWeight', 'fontSize', 'lineHeight', 'fontFamily', 'letterSpacing', 'tabSize',
] as const;

// Caret position inside an input/textarea, relative to its border box (mirror div technique)
export function getCaretCoordinates(
  el: HTMLInputElement | HTMLTextAreaElement,
  pos: number
): { top: number; left: number; height: number } {
  const computed = window.getComputedStyle(el);
  const isInput = el.tagName === 'INPUT';
  const mirror = document.createElement('div');

  CARET_MIRROR_PROPS.forEach(prop => { mirror.style[prop] = computed[prop]; });
  Object.assign(mirror.style, {
    position: 'absolute',
    top: '0',
    visibility: 'hidden',
    whiteSpace: isInput ? 'pre' : 'pre-wrap',
    overflowWrap: 'break-word',
  });

  mirror.textContent = el.value.slice(0, pos);
  const marker = document.createElement('span');
  marker.textContent = el.value.slice(pos) || '.';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.2;
  const coords = {
    top: marker.offsetTop - el.scrollTop,
    left: marker.offsetLeft - el.scrollLeft,
    height: lineHeight,
  };
  document.body.removeChild(mirror);
  return coords;
}

export function findTemplateStart(text: string, cursorPos: number): { start: number; query: string } | null {
  const beforeCursor = text.slice(0, cursorPos);
  const lastOpen = beforeCursor.lastIndexOf('{{');

  if (lastOpen === -1) return null;

  const afterOpen = beforeCursor.slice(lastOpen);
  if (afterOpen.includes('}}')) return null;

  const query = beforeCursor.slice(lastOpen + 2);
  return { start: lastOpen, query };
}
