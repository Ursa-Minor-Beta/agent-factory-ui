import { useState } from 'react';
import { Alert, Badge, Box, Button, Code, Group, SegmentedControl, Select, Stack, Switch, Text, Textarea } from '@mantine/core';
import { IconAlertCircle, IconPlayerPlay } from '@tabler/icons-react';
import { webhooksApi } from '../../api';
import type { WebhookTestInput, WebhookTestResult } from '../../types';
import { JsonEditor } from '../JsonEditor';
import { KeyValueRows, rowsToRecord, type KeyValueRow } from './KeyValueRows';

const LOG_COLORS = { log: 'gray', warn: 'yellow', error: 'red' } as const;

const toJson = (data: unknown) => JSON.stringify(data, null, 2);

interface WebhookTestPanelProps {
  webhookId: string;
  // Handler in the editor differs from the saved one - the test runs the saved version
  unsavedHandler: boolean;
}

export function WebhookTestPanel({ webhookId, unsavedHandler }: WebhookTestPanelProps) {
  const [method, setMethod] = useState('POST');
  const [headers, setHeaders] = useState<KeyValueRow[]>([{ key: 'content-type', value: 'application/json' }]);
  const [query, setQuery] = useState<KeyValueRow[]>([]);
  const [bodyMode, setBodyMode] = useState<'json' | 'text'>('json');
  const [jsonBody, setJsonBody] = useState('{\n  "hello": "world"\n}');
  const [textBody, setTextBody] = useState('');
  const [overrideRaw, setOverrideRaw] = useState(false);
  const [rawBody, setRawBody] = useState('');
  const [running, setRunning] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [result, setResult] = useState<WebhookTestResult | null>(null);

  const handleRun = async () => {
    setRequestError('');
    const input: WebhookTestInput = { method, headers: rowsToRecord(headers), query: rowsToRecord(query) };
    if (bodyMode === 'json') {
      if (jsonBody.trim()) {
        try {
          input.body = JSON.parse(jsonBody);
        } catch {
          setRequestError('Body is not valid JSON');
          return;
        }
      }
    } else {
      input.body = textBody;
    }
    if (overrideRaw) input.rawBody = rawBody;

    setRunning(true);
    try {
      setResult(await webhooksApi.test(webhookId, input));
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setRunning(false);
    }
  };

  const response = result?.result?.response;
  const runInput = result?.result?.run?.input;

  return (
    <Stack gap="sm">
      {unsavedHandler && (
        <Alert color="yellow" variant="light" icon={<IconAlertCircle size={16} />}>
          The handler has unsaved changes - the test runs the saved version.
        </Alert>
      )}

      <Select
        label="Method"
        size="xs"
        w={120}
        data={['POST', 'GET', 'PUT', 'PATCH', 'DELETE']}
        value={method}
        onChange={(v) => setMethod(v ?? 'POST')}
        allowDeselect={false}
        comboboxProps={{ withinPortal: true }}
      />
      <KeyValueRows label="Headers" rows={headers} onChange={setHeaders} />
      <KeyValueRows label="Query" rows={query} onChange={setQuery} />

      <Stack gap={4}>
        <Group justify="space-between">
          <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Body</Text>
          <SegmentedControl
            size="xs"
            value={bodyMode}
            onChange={(v) => setBodyMode(v as 'json' | 'text')}
            data={[{ label: 'JSON', value: 'json' }, { label: 'Text', value: 'text' }]}
          />
        </Group>
        {bodyMode === 'json' ? (
          <JsonEditor value={null} text={jsonBody} onTextChange={setJsonBody} height={160} showLineNumbers={false} />
        ) : (
          <Textarea size="xs" autosize minRows={4} maxRows={10} value={textBody} onChange={(e) => setTextBody(e.currentTarget.value)} styles={{ input: { fontFamily: 'monospace' } }} />
        )}
      </Stack>

      <Switch size="xs" label="Override raw body (e.g. for exact signature checks)" checked={overrideRaw} onChange={(e) => setOverrideRaw(e.currentTarget.checked)} />
      {overrideRaw && (
        <Textarea size="xs" autosize minRows={3} maxRows={8} placeholder="rawBody" value={rawBody} onChange={(e) => setRawBody(e.currentTarget.value)} styles={{ input: { fontFamily: 'monospace' } }} />
      )}

      <Group>
        <Button size="xs" leftSection={<IconPlayerPlay size={14} />} loading={running} onClick={handleRun}>
          Run test
        </Button>
      </Group>

      {requestError && (
        <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>{requestError}</Alert>
      )}

      {result && (
        <Stack gap="sm">
          {result.error && (
            <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />} title="Handler error">
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{result.error}</Text>
            </Alert>
          )}

          <Box>
            <Text size="xs" c="dimmed" tt="uppercase" fw={500} mb={4}>Agent would receive</Text>
            {runInput ? <Code block fz="xs">{toJson(runInput)}</Code> : <Text size="sm" c="dimmed">No run</Text>}
          </Box>

          <Box>
            <Group gap="xs" mb={4}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Response</Text>
              <Badge size="sm" variant="light" color={(response?.status ?? 202) < 400 ? 'green' : 'red'}>
                {response?.status ?? (runInput ? 202 : 200)}
              </Badge>
            </Group>
            {response?.headers && Object.keys(response.headers).length > 0 && (
              <Code block fz="xs" mb={4}>
                {Object.entries(response.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}
              </Code>
            )}
            {response?.body !== undefined ? (
              <Code block fz="xs">{typeof response.body === 'string' ? response.body : toJson(response.body)}</Code>
            ) : (
              <Text size="sm" c="dimmed">Default body</Text>
            )}
          </Box>

          {result.result?.dedupeKey && (
            <Text size="xs" c="dimmed">Dedupe key: <Code fz="xs">{result.result.dedupeKey}</Code></Text>
          )}

          <Box>
            <Text size="xs" c="dimmed" tt="uppercase" fw={500} mb={4}>Logs</Text>
            {result.logs.length === 0 ? (
              <Text size="sm" c="dimmed">No logs</Text>
            ) : (
              <Stack gap={2}>
                {result.logs.map((log, i) => (
                  <Group key={i} gap="xs" wrap="nowrap" align="flex-start">
                    <Badge size="xs" variant="light" color={LOG_COLORS[log.level]} w={50}>{log.level}</Badge>
                    <Text size="xs" ff="monospace" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{log.message}</Text>
                  </Group>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
