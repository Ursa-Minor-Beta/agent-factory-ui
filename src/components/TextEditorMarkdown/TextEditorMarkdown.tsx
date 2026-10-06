import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { BlockMath } from '@tiptap/extension-mathematics';
import Subscript from '@tiptap/extension-subscript';
import { TableKit } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Typography from '@tiptap/extension-typography';
import { Markdown } from '@tiptap/markdown';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';
import { useEffect, useRef, useState } from 'react';
import { Box, Button, Group, Textarea } from '@mantine/core';
import type { Icon } from '@tabler/icons-react';
import type { Extension } from '@tiptap/core';
import classes from './TextEditorMarkdown.module.css';

// Create lowlight instance with error handling for unrecognized languages
const lowlight = createLowlight(common);
const originalHighlight = lowlight.highlight.bind(lowlight);
lowlight.highlight = (language: string, value: string, options?: any) => {
    try {
        return originalHighlight(language, value, options);
    } catch (error) {
        // Fallback to plaintext if language not recognized
        console.warn(`Language "${language}" not recognized, falling back to plaintext`);
        return originalHighlight('plaintext', value, options);
    }
};

/**
 * Checks if content contains mathematical notation.
 */
const isMathContent = (content: string): boolean => {
    // Check for LaTeX commands: \command
    if (/\\[a-zA-Z]+/.test(content)) return true;

    // Check for alphanumeric content with math operators
    if (/[a-zA-Z0-9]/.test(content) && /[+\-*/=^_<>]/.test(content)) return true;

    // Check for Greek letters and mathematical symbols
    if (/[∫∑∏∂∇αβγδεζηθικλμνξοπρστυφχψω≤≥≠±∓×÷√∞]/.test(content)) return true;

    return false;
};

/**
 * Normalizes LaTeX math delimiters to $$...$$ format for BlockMath extension.
 * Only converts if content is detected as mathematical notation.
 */
const normalizeLaTeXDelimiters = (text: string): string => {
    if (!text) return text;

    // Step 1: Convert \[...\] to $$...$$ (only if content is math)
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, math) => {
        if (isMathContent(math)) {
            return `$$${math}$$`;
        }
        return `\[${match}\]`; // Keep original if not math content
    });

    // Step 2: Convert \(...\) to $$...$$ (only if content is math)
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, math) => {
        if (isMathContent(math)) {
            return `$$${math}$$`;
        }
        return `\(${match}\)`; // Keep original if not math content
    });

    return text;
};

type EditorMode = 'formatted' | 'raw';

type Btn = { title?: string; Icon?: Icon; tip?: string; onClick: (editor: Editor) => void };
type ToolbarItem = Btn | { separator: true };

interface TextEditorMarkdownRawProps {
    formFieldName: string;
    defaultMode?: EditorMode;
    disabled?: boolean;
    heightInitPx?: number;
    placeholder?: string;
    toolbarFormatBtns?: ToolbarItem[];
    toolbarCommonBtns?: ToolbarItem[];
    customExtensions?: Extension[];

    getValues: (fieldName: string) => string;
    setValue: (fieldName: string, value: string) => void;
    subscribe?: (config: { name: string; callback: (data: any) => void }) => (() => void) | void;
}

const getEditorProps = (height: string) => ({
    editorProps: {
        attributes: {
            class: 'tiptap-content',
            style: `height: ${height}`,
        },
    },
});

const ToolbarItem = ({ toolbarItem, onClick }: { toolbarItem: ToolbarItem; onClick?: any }) => {
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

export const TextEditorMarkdownRaw = ({
    formFieldName,
    defaultMode = 'formatted',
    disabled = false,
    heightInitPx = 400,
    placeholder,
    toolbarFormatBtns,
    toolbarCommonBtns,
    customExtensions = [],

    setValue, getValues, subscribe

}: TextEditorMarkdownRawProps) => {

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const heightRef = useRef<string>(`${heightInitPx}px`);
    const formatedTouched = useRef<boolean>(false);

    const [editorMode, setEditorMode] = useState<EditorMode>(defaultMode);
    const [rawContent, setRawContent] = useState(() => getValues(formFieldName));

    const isModeFormatted = editorMode === 'formatted';
    let setValueTimeOut: null | number = null;

    const handleMode = (mode: EditorMode) => {
        if (editorMode === mode) return;
        // sync height
        heightRef.current =
            textAreaRef.current?.style.height ||
            editor.view.dom.style.height ||
            `${heightInitPx}px`;
        if (isModeFormatted) {
            // Switching from MD to Text - save editor content
            const markdown = editor.getMarkdown();
            setValue(formFieldName, markdown);
            setRawContent(markdown);
        } else {
            // Switching from Text to MD - save textarea and update editor
            const textValue = textAreaRef.current?.value ?? '';
            setValue(formFieldName, textValue);
            editor.commands.setContent(normalizeLaTeXDelimiters(textValue), {
                contentType: 'markdown',
            });
            formatedTouched.current = false;
            editor.setOptions(getEditorProps(heightRef.current));
        }
        setEditorMode(isModeFormatted ? 'raw' : 'formatted');
    };

    const setFormValue = (value: string) => {
        if (setValueTimeOut) clearTimeout(setValueTimeOut);
        setValue(formFieldName, value);
    };

    const editor = useEditor(
        {
            extensions: [
                StarterKit,
                Markdown.configure({
                    markedOptions: { gfm: true },
                }),

                // Block math: $$...$$
                // All math delimiters (\[...\], \(...\)) are converted to $$...$$ in the normalizeLaTeXDelimiters()
                BlockMath.configure({
                    katexOptions: {
                        throwOnError: false,
                    },
                }),

                CodeBlockLowlight.configure({
                    lowlight,
                    HTMLAttributes: {
                        class: 'code-block-highlighted',
                    },
                    defaultLanguage: 'plaintext',
                }),

                Subscript,
                // Superscript

                TableKit.configure({
                    table: {
                        HTMLAttributes: {
                            class: 'table table-sm table-bordered',
                        },
                    },
                }),

                // Task lists - [ ] and [x]
                TaskList.configure({
                    HTMLAttributes: {
                        class: 'task-list',
                    },
                }),
                TaskItem.configure({
                    nested: true,
                    HTMLAttributes: {
                        class: 'task-item',
                    },
                }),

                Typography,

                // Custom extensions passed from outside
                ...customExtensions,
            ],
            editable: !disabled,
            ...getEditorProps(heightRef.current),
            onCreate: ({ editor }) => {
                const initialValue = getValues(formFieldName);
                if (initialValue) {
                    editor.commands.setContent(normalizeLaTeXDelimiters(initialValue), {
                        contentType: 'markdown',
                    });
                }
            },
            onUpdate: (_p) => {
                if (!formatedTouched.current) formatedTouched.current = true;
            },
            onBlur: (p) => {
                if (formatedTouched.current) setFormValue(p.editor.getMarkdown());
            },
        },
        [customExtensions],
    );

    // Handle external updates via subscription
    useEffect(() => {
        if (!editor || !subscribe) return;

        const unsubscribe = subscribe({
            name: formFieldName,
            callback: (_d) => {
                const val = getValues(formFieldName);
                setRawContent(val);
                if (isModeFormatted && editor?.isInitialized && !editor.isFocused) {
                    editor.commands.setContent(normalizeLaTeXDelimiters(val), {
                        contentType: 'markdown',
                    });
                } else if (textAreaRef.current) {
                    textAreaRef.current.value = val;
                }
                // Reset flag when content is programmatically updated
                formatedTouched.current = false;
            },
        });

        // Cleanup subscription on unmount
        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [editor, isModeFormatted]);

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
                    {!!toolbarFormatBtns && isModeFormatted && (
                        <>
                            <Box style={{ width: 1, height: 20, backgroundColor: 'var(--mantine-color-default-border)', margin: '0 8px' }} />
                            <Group gap="xs">
                                {toolbarFormatBtns.map((b, i) => (
                                    <ToolbarItem
                                        key={i}
                                        toolbarItem={b}
                                        onClick={
                                            'onClick' in b ? () => b.onClick(editor) : undefined
                                        }
                                    />
                                ))}
                            </Group>
                        </>
                    )}
                    {!!toolbarCommonBtns && (
                        <Group gap="xs" style={{ marginLeft: 'auto' }}>
                            {toolbarCommonBtns.map((b, i) => (
                                <ToolbarItem
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
                    // borderTop: '1px solid var(--mantine-color-default-border)',
                    padding: '4px',
                    // border: '1px solid var(--mantine-color-default-border)',
                    // borderRadius: '8px'
                    }}
                  >
                    {isModeFormatted ? (
                        <EditorContent
                          editor={editor}
                          className={classes.tiptapContent}
                          />
                    ) : (
                        <Textarea
                            ref={textAreaRef}
                            disabled={disabled}
                            placeholder={placeholder}
                            styles={{
                                root: { flex: 1, minHeight: 0 },
                                wrapper: { height: '100%' },
                                input: { height: '100%', border: 'none', borderRadius: 0, backgroundColor: 'transparent' },
                            }}
                            defaultValue={rawContent}
                            onBlur={(e) => setFormValue(e.target.value)}
                        />
                    )}
                </Box>

            </Box>
        </Box>
    );
};
