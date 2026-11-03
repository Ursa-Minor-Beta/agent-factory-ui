import { useCallback, useEffect, useRef, useState } from 'react';
import { sessionsApi, runsApi, ApiError } from '../../../../api';
import { mapApiMessageToChatMessage, parseMessageContent } from '../../../../pages/Chat/models/messageParser';
import type { ChatMessage } from '../../../../pages/Chat/types';
import { ASSISTANT_CLIENT_TOOLS, executeAssistantTool, nodesForAssistant, type AssistantEditor } from './assistantTools';

const SESSION_STORAGE_PREFIX = 'agent-editor-assistant-session:';
const HISTORY_LIMIT = 50;

// User / assistant messages are rendered by the Chat page's MessageBubble
export interface AssistantMessage extends Omit<ChatMessage, 'role'> {
  role: 'user' | 'assistant' | 'tool';
  // Tool messages: validation outcome reported back to the assistant
  ok?: boolean;
  errors?: string[];
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
  const [sending, setSending] = useState(false);
  const [statusText, setStatusText] = useState<string>();
  const [error, setError] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef<string | null>(null);
  const editorRef = useRef(editor);
  editorRef.current = editor;
  // Session is per builder agent + edited agent
  const sessionKey = `${assistantAgentId ?? ''}:${agentKey}`;
  const sessionKeyRef = useRef(sessionKey);
  const agentKeyRef = useRef(agentKey);
  const assistantAgentIdRef = useRef(assistantAgentId);

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

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
    setError('');
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
  }, [agentKey, assistantAgentId, sessionKey, stopStream]);

  // Abort on unmount - server cancels the run when the stream drops
  useEffect(() => stopStream, [stopStream]);

  const addMessage = useCallback((message: AssistantMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!assistantAgentId || !message || sending) return;

      setSending(true);
      setError('');
      setStatusText('Sending...');
      addMessage({ id: nextId('user'), role: 'user', content: message, createdAt: new Date().toISOString() });

      const abortController = new AbortController();
      abortRef.current = abortController;
      runIdRef.current = null;

      try {
        await sessionsApi.chatStream(
          assistantAgentId,
          {
            input: { message, nodes: nodesForAssistant(editorRef.current.getNodes()) },
            sessionId: sessionId || undefined,
            clientTools: ASSISTANT_CLIENT_TOOLS,
          },
          {
            onInit: (data) => {
              runIdRef.current = data.runId;
              setSessionId(data.sessionId);
              writeSession(sessionKeyRef.current, data.sessionId);
            },
            onStatus: (data) => {
              if (data.statusText) setStatusText(data.statusText);
            },
            onClientToolCall: async (data) => {
              let execution;
              try {
                execution = executeAssistantTool(editorRef.current, data.name, data.args ?? {});
              } catch (err) {
                execution = { summary: data.name, result: { ok: false as const, errors: [String(err)] } };
              }
              const { summary, result } = execution;
              addMessage({
                id: nextId('tool'),
                role: 'tool',
                content: summary,
                createdAt: new Date().toISOString(),
                ok: result.ok,
                errors: result.errors,
              });
              try {
                await runsApi.submitToolResult(data.runId, data.toolCallId, result);
              } catch (err) {
                // 409 = already answered or timed out, nothing to do
                if (!(err instanceof ApiError && err.status === 409)) {
                  console.error('Failed to submit tool result:', err);
                }
              }
            },
            onDone: (data) => {
              if (data.cancelled) return;
              const { text: content, fileRefs } = parseMessageContent(data.response);
              if (!content) return;
              addMessage({
                id: nextId('assistant'),
                role: 'assistant',
                content,
                fileRefs: fileRefs.length ? fileRefs : undefined,
                createdAt: new Date().toISOString(),
                runId: data.runId,
              });
            },
            onError: (data) => setError(data.message),
          },
          abortController.signal
        );
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Failed to send message');
        }
      } finally {
        // A newer send/abort may have replaced the controller
        if (abortRef.current === abortController) abortRef.current = null;
        runIdRef.current = null;
        setSending(false);
        setStatusText(undefined);
      }
    },
    [assistantAgentId, sending, sessionId, addMessage]
  );

  const cancel = useCallback(async () => {
    const runId = runIdRef.current;
    if (assistantAgentId && runId) {
      try {
        await sessionsApi.cancelChat(assistantAgentId, runId);
      } catch {
        // Ignore cancel errors - aborting the stream cancels the run anyway
      }
    }
    stopStream();
  }, [assistantAgentId, stopStream]);

  const newChat = useCallback(() => {
    if (sending) cancel();
    writeSession(sessionKeyRef.current, null);
    setSessionId(null);
    setMessages([]);
    setError('');
  }, [sending, cancel]);

  return {
    messages,
    loadingHistory,
    sending,
    statusText,
    error,
    clearError: () => setError(''),
    send,
    cancel,
    newChat,
  };
}
