import { useCallback, useEffect, useState } from 'react';
import { ActionIcon, Alert, Anchor, Card, Center, Group, Loader, Pagination, Table, Text, Tooltip } from '@mantine/core';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { Link } from 'react-router';
import { runsApi } from '../../../api';
import type { RunSummary } from '../../../types';
import { formatDuration } from '../../../types';
import { routes } from '../../../config/routes';
import { RunStatusBadge } from '../../RunDetailsModal/RunStatusBadge';
import { useRunDetailsModal } from '../../RunDetailsModal';
import dayjs, { DATE_TIME_FORMAT } from '../../../utils/dayjs';

const PAGE_SIZE = 20;

// Runs started by this schedule
export function ScheduleHistory({ scheduleId }: { scheduleId: string }) {
  const { openRunDetails } = useRunDetailsModal();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await runsApi.listAll({
        scheduleId,
        sortBy: 'startedAt',
        sortOrder: 'desc',
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
      });
      setRuns(response.runs.map((r) => ({ ...r, status: r.serviceStatus === 'active' ? 'running' : r.status })));
      setTotal(response.total);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  }, [scheduleId, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <Group justify="space-between" mb="sm">
        <Anchor component={Link} to={routes.runs({ scheduleId })} size="sm">Open in Runs</Anchor>
        <Tooltip label="Refresh">
          <ActionIcon variant="light" onClick={load} loading={loading}>
            <IconRefresh size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">{error}</Alert>
      )}

      <Card withBorder radius="lg" p={0}>
        {loading && runs.length === 0 ? (
          <Center py="xl"><Loader /></Center>
        ) : (
          <Table.ScrollContainer minWidth={480}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Due at</Table.Th>
                  <Table.Th>Started</Table.Th>
                  <Table.Th>Duration</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {runs.map((run) => (
                  <Table.Tr key={run.id} style={{ cursor: 'pointer' }} onClick={() => openRunDetails(run.id)}>
                    <Table.Td><RunStatusBadge status={run.status} /></Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {run.triggeredBy?.triggerType === 'schedule'
                          ? dayjs(run.triggeredBy.scheduledFor).format(DATE_TIME_FORMAT)
                          : 'Run now'}
                      </Text>
                    </Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{dayjs(run.startedAt).format(DATE_TIME_FORMAT)}</Text></Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{run.completedAt ? formatDuration(run.startedAt, run.completedAt) : '~'}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {runs.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text ta="center" c="dimmed" py="md" size="sm">No runs yet</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      {totalPages > 1 && (
        <Group justify="center" mt="md">
          <Pagination value={page} onChange={setPage} total={totalPages} size="sm" />
        </Group>
      )}
    </>
  );
}
