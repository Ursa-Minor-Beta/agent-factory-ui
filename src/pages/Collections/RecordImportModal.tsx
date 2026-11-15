import { useState } from 'react';
import { Modal, Stack, Text, Group, Button, Alert, Progress } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { memoryApi } from '../../api';
import type { MemoryRecord } from '../../types';
import { getRecordUserFields } from '../../types';
import { FileDropZone } from '../../components/FileDropZone';

interface RecordImportModalProps {
  opened: boolean;
  onClose: () => void;
  onImported: () => void;
  collectionId: string;
}

// Accepts an export file ({ records: [...] }) or a plain array of records
function parseRecords(content: string): Record<string, unknown>[] {
  const parsed = JSON.parse(content);
  const records = Array.isArray(parsed) ? parsed : parsed?.records;
  if (!Array.isArray(records)) throw new Error('Expected an export file or an array of records');
  return records.map((record: MemoryRecord) => getRecordUserFields(record));
}

export function RecordImportModal({ opened, onClose, onImported, collectionId }: RecordImportModalProps) {
  const [records, setRecords] = useState<Record<string, unknown>[] | null>(null);
  const [fileError, setFileError] = useState('');
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);

  const handleClose = () => {
    if (importing) return;
    setRecords(null);
    setFileError('');
    setDone(0);
    setFailed([]);
    onClose();
  };

  const handleFile = (content: string) => {
    setDone(0);
    setFailed([]);
    try {
      setRecords(parseRecords(content));
      setFileError('');
    } catch (err) {
      setRecords(null);
      setFileError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  const handleImport = async () => {
    if (!records) return;
    setImporting(true);
    setDone(0);
    const errors: string[] = [];
    for (const [i, record] of records.entries()) {
      try {
        await memoryApi.createRecord(collectionId, record);
      } catch (err) {
        errors.push(`#${i + 1}: ${err instanceof Error ? err.message : 'Failed'}`);
      }
      setDone(i + 1);
    }
    setFailed(errors);
    setImporting(false);
    onImported();
    if (errors.length === 0) handleClose();
  };

  const total = records?.length ?? 0;

  return (
    <Modal opened={opened} onClose={handleClose} title="Import Records" centered>
      <Stack>
        <FileDropZone accept=".json" label="Drop an exported .json file here or click to select" onFileContent={handleFile} />

        {fileError && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {fileError}
          </Alert>
        )}

        {records && (
          <Text size="sm">
            {total} record{total === 1 ? '' : 's'} found. They will be added to this collection as new records.
          </Text>
        )}

        {(importing || done > 0) && total > 0 && <Progress value={(done / total) * 100} animated={importing} />}

        {failed.length > 0 && (
          <Alert color="red" icon={<IconAlertCircle size={16} />} title={`${failed.length} of ${total} failed`}>
            <Text size="xs" style={{ whiteSpace: 'pre-wrap', maxHeight: 150, overflow: 'auto' }}>
              {failed.join('\n')}
            </Text>
          </Alert>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={handleClose} disabled={importing}>
            {failed.length > 0 ? 'Close' : 'Cancel'}
          </Button>
          <Button onClick={handleImport} loading={importing} disabled={!total || failed.length > 0}>
            Import
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
