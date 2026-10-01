import { useMemo, useRef, useState } from 'react';
import { Box, Button, Group, Textarea } from '@mantine/core';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { BlockMath } from '@tiptap/extension-mathematics';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Subscript from '@tiptap/extension-subscript';
import { TableKit } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Typography from '@tiptap/extension-typography';
import { common, createLowlight } from 'lowlight';
import type { Icon } from '@tabler/icons-react';
import { createTemplateMention, createTemplateHighlight } from './templateMention';
import { TemplateInputWrapper } from '../TemplateInputWrapper';
import type { NodeMetadata } from '../templateUtils';
import classes from '../../../TextEditorMarkdown/TextEditorMarkdown.module.css';

// Create lowlight instance with error handling
const lowlight = createLowlight(common);
const originalHighlight = lowlight.highlight.bind(lowlight);
lowlight.highlight = (language: string, value: string, options?: any) => {
    try {
        return originalHighlight(language, value, options);
    } catch (error) {
        console.warn(`Language "${language}" not recognized, falling back to plaintext`);
        return originalHighlight('plaintext', value, options);
    }
};

const isMathContent = (content: string): boolean => {
    if (/\\[a-zA-Z]+/.test(content)) return true;
    if (/[a-zA-Z0-9]/.test(content) && /[+\-*/=^_<>]/.test(content)) return true;
    if (/[∫∑∏∂∇αβγδεζηθικλμνξοπρστυφχψω≤≥≠±∓×÷√∞]/.test(content)) return true;
    return false;
};

const normalizeLaTeXDelimiters = (text: string): string => {
    if (!text) return text;
    text = text.replace(/\\\[([\\s\\S]*?)\\\]/g, (match, math) => {
        if (isMathContent(math)) return `$$${math}$$`;
        return `\\[${match}\\]`;
    });
    text = text.replace(/\\\(([\\s\\S]*?)\\\)/g, (match, math) => {
        if (isMathContent(math)) return `$$${math}$$`;
        return `\\(${match}\\)`;
    });
    return text;
};

type EditorMode = 'formatted' | 'raw';

type Btn = { title?: string; Icon?: Icon; tip?: string; onClick: (editor: Editor) => void };
type ToolbarItem = Btn | { separator: true };

interface TemplateTextEditorFullProps {
    formFieldName: string;
    defaultMode?: EditorMode;
    disabled?: boolean;
    heightInitPx?: number;
    placeholder?: string;
    toolbarFormatBtns?: ToolbarItem[];
    toolbarCommonBtns?: ToolbarItem[];
    /** @deprecated Use nodes instead */
    nodeIds?: string[];
    nodes?: NodeMetadata[];

    getValues: (fieldName: string) => string;
    setValue: (fieldName: string, value: string) => void;
}

const getEditorProps = (height: string) => ({
    editorProps: {
        attributes: {
            class: 'tiptap-content',
            style: `height: ${height}`,
        },
    },
});

const ToolbarItemComponent = ({ toolbarItem, onClick }: { toolbarItem: ToolbarItem; onClick?: () => void }) => {
    if ('separator' in toolbarItem) {
        return <Box style={{ width: 1, height: 20, backgroundColor: 'var(--mantine-color-default-border)' }} />;
    }
    const { title, Icon, tip } = toolbarItem;
    return (
        <Button size="xs" variant="subtle" title={tip} onClick={onClick}>
            {!!Icon && <Icon size={16} />}
            {!!title && title}
        </Button>
    );
};

export function TemplateTextEditorFull({
    formFieldName,
    defaultMode = 'formatted',
    disabled = false,
    heightInitPx = 400,
    placeholder,
    toolbarFormatBtns,
    toolbarCommonBtns,
    nodeIds,
    nodes,
    setValue,
    getValues,
}: TemplateTextEditorFullProps) {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);
    const heightRef = useRef<string>(`${heightInitPx}px`);

    // Single source of truth for content - shared between both modes
    const contentRef = useRef<string>(getValues(formFieldName));
    const setValueRef = useRef(setValue);
    setValueRef.current = setValue;

    const [editorMode, setEditorMode] = useState<EditorMode>(defaultMode);
    const [rawModeKey, setRawModeKey] = useState(0);

    const isModeFormatted = editorMode === 'formatted';

    // Template extensions for TipTap - use stable key to prevent unnecessary recreations
    const nodesRef = useRef(nodes);
    const nodeIdsRef = useRef(nodeIds);
    nodesRef.current = nodes;
    nodeIdsRef.current = nodeIds;
    const nodeMetadataKey = nodes?.map(n => `${n.id}:${n.outputs?.join(',') || ''}`).join('|') || nodeIds?.join(',') || '';

    const templateExtensions = useMemo(() => {
        // Backward compatibility: convert nodeIds to nodes
        const nodeMetadata: NodeMetadata[] = nodesRef.current || (nodeIdsRef.current ? nodeIdsRef.current.map(id => ({ id })) : []);

        if (nodeMetadata.length === 0) return [];

        const nodeIdList = nodeMetadata.map(n => n.id);

        return [
            createTemplateMention(nodeMetadata),
            createTemplateHighlight(nodeIdList),
        ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeMetadataKey]);

    const handleMode = (mode: EditorMode) => {
        if (editorMode === mode) return;
        heightRef.current =
            textAreaRef.current?.style.height ||
            editor?.view.dom.style.height ||
            `${heightInitPx}px`;
        if (isModeFormatted) {
            // Switching from MD to Text - sync contentRef from editor
            contentRef.current = editor?.getMarkdown() || contentRef.current;
            setRawModeKey(prev => prev + 1); // Force remount of raw editor
        } else {
            // Switching from Text to MD - sync contentRef from textarea
            contentRef.current = textAreaRef.current?.value ?? contentRef.current;
            editor?.commands.setContent(normalizeLaTeXDelimiters(contentRef.current), {
                contentType: 'markdown',
            });
            editor?.setOptions(getEditorProps(heightRef.current));
        }
        setEditorMode(isModeFormatted ? 'raw' : 'formatted');
    };

    const editor = useEditor(
        {
            extensions: [
                StarterKit,
                Markdown.configure({ markedOptions: { gfm: true } }),
                BlockMath.configure({ katexOptions: { throwOnError: false } }),
                CodeBlockLowlight.configure({
                    lowlight,
                    HTMLAttributes: { class: 'code-block-highlighted' },
                    defaultLanguage: 'plaintext',
                }),
                Subscript,
                TableKit.configure({
                    table: { HTMLAttributes: { class: 'table table-sm table-bordered' } },
                }),
                TaskList.configure({ HTMLAttributes: { class: 'task-list' } }),
                TaskItem.configure({ nested: true, HTMLAttributes: { class: 'task-item' } }),
                Typography,
                ...templateExtensions,
            ],
            editable: !disabled,
            ...getEditorProps(heightRef.current),
            onCreate: ({ editor }) => {
                if (contentRef.current) {
                    editor.commands.setContent(normalizeLaTeXDelimiters(contentRef.current), {
                        contentType: 'markdown',
                    });
                }
            },
            onUpdate: ({ editor }) => {
                // Keep contentRef in sync with editor
                contentRef.current = editor.getMarkdown();
            },
            onDestroy: () => {
                // Save content when editor is destroyed (modal closes)
                setValueRef.current(formFieldName, contentRef.current);
            },
        },
        [templateExtensions],
    );

    // Handle raw mode content updates
    const handleRawContentChange = (newValue: string) => {
        contentRef.current = newValue;
    };

    // Scroll sync for raw mode highlight layer
    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (highlightRef.current) {
            highlightRef.current.scrollTop = e.currentTarget.scrollTop;
            highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    return (
        <Box className={classes.wrapper}>
            <Box style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <Group
                    gap="xs"
                    p={12}
                    style={{
                        borderTop: '1px solid var(--mantine-color-default-border)',
                        borderBottom: '1px solid var(--mantine-color-default-border)',
                    }}
                >
                    <Button.Group>
                        <Button
                            size="xs"
                            variant={isModeFormatted ? 'filled' : 'default'}
                            onClick={() => handleMode('formatted')}
                        >
                            MD
                        </Button>
                        <Button
                            size="xs"
                            variant={!isModeFormatted ? 'filled' : 'default'}
                            onClick={() => handleMode('raw')}
                        >
                            Text
                        </Button>
                    </Button.Group>
                    {!!toolbarFormatBtns && isModeFormatted && editor && (
                        <>
                            <Box style={{ width: 1, height: 20, backgroundColor: 'var(--mantine-color-default-border)', margin: '0 8px' }} />
                            <Group gap="xs">
                                {toolbarFormatBtns.map((b, i) => (
                                    <ToolbarItemComponent
                                        key={i}
                                        toolbarItem={b}
                                        onClick={'onClick' in b ? () => b.onClick(editor) : undefined}
                                    />
                                ))}
                            </Group>
                        </>
                    )}
                    {!!toolbarCommonBtns && editor && (
                        <Group gap="xs" style={{ marginLeft: 'auto' }}>
                            {toolbarCommonBtns.map((b, i) => (
                                <ToolbarItemComponent
                                    key={i}
                                    toolbarItem={b}
                                    onClick={'onClick' in b ? () => b.onClick(editor) : undefined}
                                />
                            ))}
                        </Group>
                    )}
                </Group>

                <Box
                    style={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '4px',
                    }}
                >
                    {isModeFormatted ? (
                        <EditorContent editor={editor} className={classes.tiptapContent} />
                    ) : (
                        <TemplateInputWrapper
                            key={rawModeKey}
                            value={contentRef.current}
                            nodes={nodes}
                            nodeIds={nodeIds}
                            onChange={handleRawContentChange}
                            highlightRef={highlightRef}
                            dropdownPosition="top-start"
                            wrapperStyle={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
                            highlightStyle={{
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                padding: '8px 12px',
                                fontSize: 'var(--mantine-font-size-sm)',
                                lineHeight: 1.55,
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word',
                                display: 'block',
                                alignItems: undefined,
                                overflow: 'auto',
                                height: '100%',
                            }}
                        >
                            {({ inputRef, defaultValue, handleChange, handleBlur, handleClick, handleKeyDown }) => (
                                <Textarea
                                    ref={(el) => {
                                        (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
                                        (textAreaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
                                    }}
                                    disabled={disabled}
                                    placeholder={placeholder}
                                    styles={{
                                        root: { flex: 1, minHeight: 0 },
                                        wrapper: { height: '100%' },
                                        input: {
                                            height: '100%',
                                            border: 'none',
                                            borderRadius: 0,
                                            backgroundColor: 'transparent',
                                            padding: '8px 12px',
                                            lineHeight: 1.55,
                                        },
                                    }}
                                    defaultValue={defaultValue}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    onClick={handleClick}
                                    onScroll={handleScroll}
                                    onKeyDown={handleKeyDown}
                                />
                            )}
                        </TemplateInputWrapper>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
