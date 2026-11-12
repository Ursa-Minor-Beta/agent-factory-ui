import { useEffect, useRef } from 'react';
import { Text } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { schedulesApi, type ListSchedulesOptions } from '../../../api';
import type { AgentSchedule } from '../../../types';
import { describeTrigger } from '../../../utils/cron';
import {
  DataTable,
  type DataTableColumn,
  type DataTableHandle,
  type DataTableQuery,
  type SortValue,
} from '../../common/DataTable';
import { WorkspaceBadge, useWorkspaceFilterOptions, GLOBAL_WORKSPACE } from '../../Workspace';
import { ScheduleLastRun, ScheduleNextRun, ScheduleStateBadge } from '../ScheduleBadges';
import { subscribeScheduleEvents } from '../scheduleEvents';
import { ScheduleRowActions, ScheduleToggle, type ScheduleRowHandlers } from './ScheduleRowActions';

export type ScheduleColumn =
  | 'workspace'
  | 'name'
  | 'status'
  | 'agent'
  | 'schedule'
  | 'nextRun'
  | 'lastRun'
  | 'runCount'
  | 'enabled'
  | 'actions';

type SchedulesSortBy = NonNullable<ListSchedulesOptions['sortBy']>;

interface SchedulesFilters {
  workspaceId: string | null;
  name: string;
  description: string;
  triggerType: string | null;
  sessionMode: string | null;
  nextRunAfter: Date | null;
  nextRunBefore: Date | null;
  lastStatus: string | null;
  enabled: string | null;
}

const INITIAL_SORT: SortValue<SchedulesSortBy> = { sortBy: 'name', sortOrder: 'asc' };

const TRIGGER_TYPE_OPTIONS = [
  // Same labels as the schedule modal
  { value: 'cron', label: 'Repeat' },
  { value: 'once', label: 'Once' },
  { value: 'interval', label: 'Interval' },
];

const SESSION_MODE_OPTIONS = [
  { value: 'session', label: 'Session' },
  { value: 'incognito', label: 'Incognito' },
];

const LAST_STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'skipped', label: 'Skipped' },
];

const ENABLED_OPTIONS = [
  { value: 'true', label: 'Enabled' },
  { value: 'false', label: 'Disabled' },
];

interface SchedulesTableProps {
  /** string = workspace, null = global only, undefined = all (adds a workspace filter) */
  workspaceId?: string | null;
  agentId?: string;
  /** Columns to leave out; all are shown by default */
  excludeColumns?: ScheduleColumn[];
  handlers: ScheduleRowHandlers;
  onCreate?: () => void;
  onDelete?: () => void;
}

// Desktop view: loads through DataTable and applies modal saves/deletes to its rows
export function SchedulesTable({
  workspaceId,
  agentId,
  excludeColumns = [],
  handlers,
  onCreate,
  onDelete,
}: SchedulesTableProps) {
  const showColumn = (col: ScheduleColumn) => !excludeColumns.includes(col);
  const tableRef = useRef<DataTableHandle<AgentSchedule>>(null);
  const filterByWorkspace = workspaceId === undefined;
  const workspaceOptions = useWorkspaceFilterOptions(filterByWorkspace);
  // Latest scope and callbacks for the event subscription, which is set up once
  const latestRef = useRef({ workspaceId, agentId, onCreate, onDelete });
  latestRef.current = { workspaceId, agentId, onCreate, onDelete };

  const loadSchedules = async ({ filters, sort }: DataTableQuery<SchedulesFilters, SchedulesSortBy>) => {
    const options: ListSchedulesOptions = { ...sort, agentId };
    if (!filterByWorkspace) {
      options.workspaceId = workspaceId;
    } else if (filters.workspaceId) {
      options.workspaceId = filters.workspaceId === GLOBAL_WORKSPACE ? null : filters.workspaceId;
    }
    if (filters.enabled) options.enabled = filters.enabled === 'true';
    if (filters.name) options.name = filters.name;
    if (filters.description) options.description = filters.description;
    if (filters.triggerType) options.triggerType = filters.triggerType as ListSchedulesOptions['triggerType'];
    if (filters.sessionMode) options.sessionMode = filters.sessionMode as ListSchedulesOptions['sessionMode'];
    if (filters.lastStatus) options.lastStatus = filters.lastStatus as ListSchedulesOptions['lastStatus'];
    if (filters.nextRunAfter) options.nextRunAfter = filters.nextRunAfter.toISOString();
    if (filters.nextRunBefore) options.nextRunBefore = filters.nextRunBefore.toISOString();

    const rows = await schedulesApi.list(options);
    return { rows, total: rows.length };
  };

  useEffect(() => subscribeScheduleEvents({
    onSaved: (schedule) => {
      const table = tableRef.current;
      if (!table) return;
      if (table.getRows().some((s) => s.id === schedule.id)) {
        table.setRows((rows) => rows.map((s) => (s.id === schedule.id ? { ...s, ...schedule } : s)));
      } else {
        // New schedule - refetch so the current filters and sort apply to it
        table.reload();
      }
    },
    onDeleted: (id) => {
      const table = tableRef.current;
      if (!table?.getRows().some((s) => s.id === id)) return;
      table.setRows((rows) => rows.filter((s) => s.id !== id));
      table.setTotal((total) => total - 1);
      latestRef.current.onDelete?.();
    },
    onCreated: (schedule) => {
      const { agentId: agent, workspaceId: workspace } = latestRef.current;
      if (agent && schedule.agentId !== agent) return;
      if (workspace !== undefined && schedule.workspaceId !== workspace) return;
      latestRef.current.onCreate?.();
    },
  }), []);

  const columns: DataTableColumn<AgentSchedule, SchedulesFilters>[] = [
    {
      key: 'workspace',
      header: 'Workspace',
      hidden: !showColumn('workspace'),
      filter: filterByWorkspace
        ? { type: 'select', key: 'workspaceId', placeholder: 'Workspace', options: workspaceOptions }
        : undefined,
      render: (schedule) => <WorkspaceBadge workspaceName={schedule.workspaceName} />,
    },
    {
      key: 'name',
      header: 'Name',
      hidden: !showColumn('name'),
      sortable: true,
      filter: [
        { type: 'text', key: 'name', placeholder: 'Search by name', icon: <IconSearch size={16} /> },
        { type: 'text', key: 'description', placeholder: 'Search description' },
      ],
      render: (schedule) => (
        <>
          <Text size="sm" fw={500}>{schedule.name}</Text>
          {schedule.description && (
            <Text size="xs" c="dimmed" lineClamp={1}>{schedule.description}</Text>
          )}
        </>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      hidden: !showColumn('status'),
      render: (schedule) => <ScheduleStateBadge schedule={schedule} showActive />,
    },
    {
      key: 'agent',
      header: 'Agent',
      hidden: !showColumn('agent'),
      render: (schedule) => (
        <Text size="sm" ff="monospace">{schedule.agentName ?? schedule.agentId}</Text>
      ),
    },
    {
      key: 'schedule',
      header: 'Schedule',
      hidden: !showColumn('schedule'),
      filter: [
        { type: 'select', key: 'triggerType', placeholder: 'Trigger', options: TRIGGER_TYPE_OPTIONS },
        { type: 'select', key: 'sessionMode', placeholder: 'Session mode', options: SESSION_MODE_OPTIONS },
      ],
      render: (schedule) => <Text size="sm">{describeTrigger(schedule.trigger, schedule.timezone)}</Text>,
    },
    {
      key: 'nextRunAt',
      header: 'Next run',
      hidden: !showColumn('nextRun'),
      sortable: true,
      filter: [
        { type: 'date', key: 'nextRunAfter', placeholder: 'Next run after' },
        { type: 'date', key: 'nextRunBefore', placeholder: 'Next run before' },
      ],
      render: (schedule) => <ScheduleNextRun schedule={schedule} />,
    },
    {
      key: 'lastRunAt',
      header: 'Last run',
      hidden: !showColumn('lastRun'),
      sortable: true,
      filter: { type: 'select', key: 'lastStatus', placeholder: 'Last status', options: LAST_STATUS_OPTIONS },
      render: (schedule) => <ScheduleLastRun schedule={schedule} />,
    },
    {
      key: 'runCount',
      header: 'Runs',
      hidden: !showColumn('runCount'),
      sortable: true,
      render: (schedule) => (
        <Text size="sm" c="dimmed">
          {schedule.runCount}
        </Text>
      ),
    },
    {
      key: 'enabled',
      header: 'Enabled',
      hidden: !showColumn('enabled'),
      stopPropagation: true,
      filter: { type: 'select', key: 'enabled', placeholder: 'Status', options: ENABLED_OPTIONS },
      render: (schedule) => <ScheduleToggle schedule={schedule} handlers={handlers} />,
    },
    {
      key: 'actions',
      pinned: true,
      width: 120,
      hidden: !showColumn('actions'),
      stopPropagation: true,
      render: (schedule) => <ScheduleRowActions schedule={schedule} handlers={handlers} />,
    },
  ];

  return (
    <DataTable
      // Remount when the scope changes so the list reloads for it
      key={`${workspaceId ?? 'all'}:${agentId ?? ''}`}
      ref={tableRef}
      columns={columns}
      getRowId={(schedule) => schedule.id}
      loadData={loadSchedules}
      emptyMessage="No schedules yet"
      noMatchMessage="No schedules match your filters"
      onRowClick={handlers.onEdit}
      initialSort={INITIAL_SORT}
      paginated={false}
      itemLabel={['schedule', 'schedules']}
    />
  );
}
