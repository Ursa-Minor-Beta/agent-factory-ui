import { Card, Table, Text } from '@mantine/core';
import type { AgentSchedule } from '../../../types';
import { describeTrigger } from '../../../utils/cron';
import { WorkspaceBadge } from '../../Workspace';
import { ScheduleLastRun, ScheduleNextRun, ScheduleStateBadge } from '../ScheduleBadges';
import { ScheduleRowActions, ScheduleToggle, type ScheduleRowHandlers } from './ScheduleRowActions';

export type ScheduleColumn = 'workspace' | 'name' | 'status' | 'agent' | 'schedule' | 'nextRun' | 'lastRun' | 'enabled' | 'actions';

export const DEFAULT_COLUMNS: ScheduleColumn[] = ['name', 'status', 'schedule', 'nextRun', 'lastRun', 'enabled', 'actions'];

const COLUMN_LABELS: Record<ScheduleColumn, string> = {
  workspace: 'Workspace',
  name: 'Name',
  status: 'Status',
  agent: 'Agent',
  schedule: 'Schedule',
  nextRun: 'Next run',
  lastRun: 'Last run',
  enabled: 'Enabled',
  actions: '',
};

interface SchedulesTableProps {
  schedules: AgentSchedule[];
  columns: ScheduleColumn[];
  handlers: ScheduleRowHandlers;
}

export function SchedulesTable({ schedules, columns, handlers }: SchedulesTableProps) {
  const showColumn = (col: ScheduleColumn) => columns.includes(col);

  return (
    <Card withBorder radius="lg" p={0}>
      <Table.ScrollContainer minWidth={900}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              {columns.map((col) => (
                <Table.Th key={col} style={col === 'actions' ? { width: 120 } : undefined}>
                  {COLUMN_LABELS[col]}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {schedules.map((schedule) => (
              <Table.Tr key={schedule.id} style={{ cursor: 'pointer' }} onClick={() => handlers.onEdit(schedule)}>
                {showColumn('workspace') && (
                  <Table.Td><WorkspaceBadge workspaceName={schedule.workspaceName} /></Table.Td>
                )}
                {showColumn('name') && (
                  <Table.Td>
                    <Text size="sm" fw={500}>{schedule.name}</Text>
                    {schedule.description && (
                      <Text size="xs" c="dimmed" lineClamp={1}>{schedule.description}</Text>
                    )}
                  </Table.Td>
                )}
                {showColumn('status') && (
                  <Table.Td><ScheduleStateBadge schedule={schedule} showActive /></Table.Td>
                )}
                {showColumn('agent') && (
                  <Table.Td><Text size="sm" ff="monospace">{schedule.agentName ?? schedule.agentId}</Text></Table.Td>
                )}
                {showColumn('schedule') && (
                  <Table.Td><Text size="sm">{describeTrigger(schedule.trigger, schedule.timezone)}</Text></Table.Td>
                )}
                {showColumn('nextRun') && <Table.Td><ScheduleNextRun schedule={schedule} /></Table.Td>}
                {showColumn('lastRun') && <Table.Td><ScheduleLastRun schedule={schedule} /></Table.Td>}
                {showColumn('enabled') && (
                  <Table.Td><ScheduleToggle schedule={schedule} handlers={handlers} /></Table.Td>
                )}
                {showColumn('actions') && (
                  <Table.Td><ScheduleRowActions schedule={schedule} handlers={handlers} /></Table.Td>
                )}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}
