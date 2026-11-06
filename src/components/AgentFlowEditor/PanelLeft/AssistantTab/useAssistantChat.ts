import { useCallback, useEffect, useRef, useState } from 'react';
import { sessionsApi, runsApi, ApiError } from '../../../../api';
import { useAgentStream } from '../../../AgentStream';
import { mapApiMessageToChatMessage, parseMessageContent } from '../../../../pages/Chat/models/messageParser';
import type { ChatMessage } from '../../../../pages/Chat/types';
import { ASSISTANT_CLIENT_TOOLS, executeAssistantTool, graphOutlineForAssistant, type AssistantEditor, type ToolExecution } from './assistantTools';
import { validateGraph } from '../../utils/validateGraph';

const SESSION_STORAGE_PREFIX = 'agent-editor-assistant-session:';
const HISTORY_LIMIT = 50;

// Rendered by the Chat page's MessageBubble; UI tool calls are part of the answer's toolCalls
export interface AssistantMessage extends Omit<ChatMessage, 'role'> {
  role: 'user' | 'assistant';
}

// Unsaved agent ('new') keeps its session in memory only - a stored one would leak into the next new agent
const isUnsaved = (sessionKey: string) => sessionKey.endsWith(':new');

function readSession(sessionKey: string) {
  if (isUnsaved(sessionKey)) return null;
  try {
    return localStorage.getItem(SESSION_STORAGE_PREFIX + sessionKey);
  } catch {
    return null;
  }
}

function writeSession(sessionKey: string, sessionId: string | null) {
  if (isUnsaved(sessionKey)) return;
  try {
    if (sessionId) localStorage.setItem(SESSION_STORAGE_PREFIX + sessionKey, sessionId);
    else localStorage.removeItem(SESSION_STORAGE_PREFIX + sessionKey);
  } catch {
    // Storage unavailable - session just won't survive reload
  }
}

// Drop sessions stored for unsaved agents by earlier versions
try {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(SESSION_STORAGE_PREFIX) && isUnsaved(key))
    .forEach((key) => localStorage.removeItem(key));
} catch {
  // Storage unavailable
}

let messageSeq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${++messageSeq}`;

/**
 * Chat with the builder agent. The agent edits the canvas through client tools:
 * each client-tool-call is executed on the editor and its validation result posted back,
 * the run waits for it. One session per edited agent, kept in localStorage once the agent is saved.
 */
export function useAssistantChat(assistantAgentId: string | undefined, agentKey: string, editor: AssistantEditor) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const [loadingHistory, setLoadingHistory] = useState(false);
  const stream = useAgentStream();
  const { running: sending, start, abort: stopStream, cancel, clearError } = stream;

  const editorRef = useRef(editor);
  editorRef.current = editor;
  // Session is per builder agent + edited agent
  const sessionKey = `${assistantAgentId ?? ''}:${agentKey}`;
  const sessionKeyRef = useRef(sessionKey);
  const agentKeyRef = useRef(agentKey);
  const assistantAgentIdRef = useRef(assistantAgentId);

  // Switching edited agent or builder: stop the run (its tool calls would hit the other agent) and load the matching session.
  // First save of a new agent changes the key 'new' -> id: keep the conversation and running stream.
  useEffect(() => {
    const prevAgentKey = agentKeyRef.current;
    const sameAssistant = assistantAgentIdRef.current === assistantAgentId;
    agentKeyRef.current = agentKey;
    sessionKeyRef.current = sessionKey;
    assistantAgentIdRef.current = assistantAgentId;
    if (sameAssistant && prevAgentKey === 'new' && agentKey !== 'new') {
      // Now the agent has an id - persist the in-memory session under it
      if (sessionIdRef.current) writeSession(sessionKey, sessionIdRef.current);
      return;
    }

    stopStream();
    clearError();
    if (!assistantAgentId) {
      setSessionId(null);
      setMessages([]);
      return;
    }
    const stored = readSession(sessionKey);
    setSessionId(stored);
    setMessages([]);
    if (!stored) return;

    let cancelled = false;
    setLoadingHistory(true);
    sessionsApi
      .getMessages(stored, HISTORY_LIMIT, 0)
      .then((data) => {
        if (cancelled) return;
        const history = data
          .map(mapApiMessageToChatMessage)
          .reverse()
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m): AssistantMessage => ({
            ...m,
            role: m.role as 'user' | 'assistant',
            // User input is { message, nodes } - show only the message
            content: m.role === 'user' && typeof m.rawInput?.message === 'string' ? m.rawInput.message : m.content,
            rawInput: undefined,
          }));
        setMessages(history);
      })
      .catch((err) => {
        if (cancelled) return;
        // Session gone (deleted / expired) - start fresh
        console.error('Failed to load assistant history:', err);
        writeSession(sessionKey, null);
        setSessionId(null);
      })
      .finally(() => !cancelled && setLoadingHistory(false));

    return () => {
      cancelled = true;
    };
  }, [agentKey, assistantAgentId, sessionKey, stopStream, clearError]);

  const addMessage = useCallback((message: AssistantMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!assistantAgentId || !message || sending) return;

      addMessage({ id: nextId('user'), role: 'user', content: message, createdAt: new Date().toISOString() });

      const editor = editorRef.current;
      const { name: agentName, description: agentDescription } = editor.getAgentInfo();
      // Stream drop cancels the run (client tools attached) - useAgentStream aborts it on unmount
      const result = await start(
        assistantAgentId,
        {
          input: {
            message,
            // Edited agent id - empty for an unsaved agent
            agentId: agentKeyRef.current === 'new' ? '' : agentKeyRef.current,
            agentName,
            agentDescription,
            // Outline only - the assistant reads full nodes via editor_get_nodes
            graph: graphOutlineForAssistant(editor.getNodes(), editor.nodeTypes),
            selection: editor.getSelection(),
            validationErrors: validateGraph(editor.getNodes(), editor.nodeTypes).errors,
          },
          sessionId: sessionId || undefined,
          clientTools: ASSISTANT_CLIENT_TOOLS,
        },
        {
          onInit: (data) => {
            setSessionId(data.sessionId);
            writeSession(sessionKeyRef.current, data.sessionId);
          },
          onClientToolCall: async (data) => {
            let execution: ToolExecution;
            try {
              // Save / run tools take a while - the server run waits for the result
              execution = await executeAssistantTool(editorRef.current, data.name, data.args ?? {});
            } catch (err) {
              execution = { summary: data.name, result: { ok: false, errors: [String(err)] } };
            }
            const { summary, result } = execution;
            try {
              await runsApi.submitToolResult(data.runId, data.toolCallId, result);
            } catch (err) {
              // 409 = already answered or timed out, nothing to do
              if (!(err instanceof ApiError && err.status === 409)) {
                console.error('Failed to submit tool result:', err);
              }
            }
            // Shown as a tool step, then in the answer's tool calls
            return { ok: result.ok, label: summary, errors: result.errors };
          },
        }
      );
      // Built once the stream ends - tool calls of the answer are known by then
      if (result.response === undefined || result.cancelled) return;
      const { text: content, fileRefs } = parseMessageContent(result.response);
      if (!content) return;
      addMessage({
        id: nextId('assistant'),
        role: 'assistant',
        content,
        fileRefs: fileRefs.length ? fileRefs : undefined,
        toolCalls: result.toolCalls,
        createdAt: new Date().toISOString(),
        runId: result.runId,
      });
    },
    [assistantAgentId, sending, sessionId, addMessage, start]
  );

  const newChat = useCallback(() => {
    if (sending) cancel();
    writeSession(sessionKeyRef.current, null);
    setSessionId(null);
    setMessages([]);
    clearError();
  }, [sending, cancel, clearError]);

  return {
    messages,
    loadingHistory,
    sending,
    statusText: stream.statusText,
    runId: stream.runId,
    steps: stream.steps,
    error: stream.error,
    errorRunId: stream.errorRunId,
    clearError,
    send,
    cancel,
    newChat,
  };
}
