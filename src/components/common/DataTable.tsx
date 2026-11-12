import {
  Alert,
  Box,
  Button,
  type ButtonVariant,
  Card,
  Center,
  Checkbox,
  Group,
  Loader,
  Pagination,
  Paper,
  Select,
  Table,
  Text,
  Transition,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
  IconSelector,
  IconSquareCheck,
} from '@tabler/icons-react';
import {
  type CSSProperties,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TableFilters, getInitialFilters, hasActiveFilters, type FilterField } from './TableFilters';

const PAGE_SIZES = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;
// One key for every table, so the choice applies app-wide
const PAGE_SIZE_STORAGE_KEY = 'table-pageSize';

function getSavedPageSize() {
  const saved = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
  return PAGE_SIZES.includes(saved) ? saved : DEFAULT_PAGE_SIZE;
}

export interface DataTableColumn<T, V = unknown> {
  key: string;
  header?: ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  /** Hide the column; a function receives the current filter values */
  hidden?: boolean | ((filters: V) => boolean);
  /** Header click sorts by this column; `key` is used as the `sortBy` value */
  sortable?: boolean;
  /** Filter field(s) shown in the filter bar for this column; shown even while the column is hidden */
  filter?: FilterField<V> | FilterField<V>[];
  /** Clicks inside the cell don't trigger `onRowClick` (e.g. action buttons) */
  stopPropagation?: boolean;
  render: (row: T) => ReactNode;
}

export type SortOrder = 'asc' | 'desc';

export interface SortValue<S extends string = string> {
  sortBy: S;
  sortOrder: SortOrder;
}

/** Everything the parent needs to build the list request */
export interface DataTableQuery<V, S extends string = string> {
  filters: V;
  sort?: SortValue<S>;
  page: number;
  pageSize: number;
}

export interface DataTableBulkAction<T> {
  label: string;
  icon?: ReactNode;
  color?: string;
  variant?: ButtonVariant;
  /** Receives the currently selected rows */
  onClick: (rows: T[]) => void;
}

export interface DataTableResult<T> {
  rows: T[];
  total: number;
}

/** Imperative access for the parent, e.g. optimistic updates after a mutation */
export interface DataTableHandle<T> {
  reload: () => Promise<void>;
  getRows: () => T[];
  setRows: (update: (rows: T[]) => T[]) => void;
  setTotal: (update: (total: number) => number) => void;
  clearSelection: () => void;
}

interface DataTableProps<T, V, S extends string> {
  ref?: Ref<DataTableHandle<T>>;
  columns: DataTableColumn<T, V>[];
  getRowId: (row: T) => string;
  /** Called on mount and whenever filters, sort or page change; errors are shown above the table */
  loadData: (query: DataTableQuery<V, S>) => Promise<DataTableResult<T>>;
  /** Error from outside the table (e.g. a failed row action), shown in the same alert as load errors */
  error?: string;
  onErrorClose?: () => void;
  emptyMessage?: ReactNode;
  /** Shown instead of `emptyMessage` when filters are active */
  noMatchMessage?: ReactNode;
  onRowClick?: (row: T) => void;
  rowStyle?: (row: T) => CSSProperties | undefined;
  /** Extra filter fields that don't belong to a column; rendered after the column filters */
  extraFilters?: FilterField<V>[];
  /** Adds a checkbox column and a bar with these buttons that slides over the filters while rows are selected.
   * Selection is cleared when the query changes. */
  bulkActions?: DataTableBulkAction<T>[];
  /** Starting sort; applies to columns marked `sortable` */
  initialSort?: SortValue<S>;
  /** Set to false for APIs that return the whole list; hides the pager and records-per-page select */
  paginated?: boolean;
  /** `[singular, plural]` noun for the "Showing 1-20 of 45 runs" and "1 run selected" labels */
  itemLabel?: [string, string];
  striped?: boolean;
  highlightOnHover?: boolean;
}

export function DataTable<T, V = unknown, S extends string = string>({
  ref,
  columns,
  getRowId,
  loadData,
  error,
  onErrorClose,
  emptyMessage = 'No data',
  noMatchMessage,
  onRowClick,
  rowStyle,
  extraFilters,
  bulkActions,
  initialSort,
  paginated = true,
  itemLabel = ['item', 'items'],
  striped = true,
  highlightOnHover = true,
}: DataTableProps<T, V, S>) {
  const filterFields = [...columns.flatMap((column) => column.filter ?? []), ...(extraFilters ?? [])];

  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pageSize, setPageSize] = useState(getSavedPageSize);
  const [filters, setFilters] = useState(() => getInitialFilters(filterFields));
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({ filters, sort, page, pageSize }),
    [filters, sort, page, pageSize]
  );

  // Latest callbacks, so loading only re-runs when the query changes
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectable = Boolean(bulkActions?.length);

  const latestRef = useRef({ loadData });
  useEffect(() => {
    latestRef.current = { loadData };
  });

  const topRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const load = useCallback(async (q: DataTableQuery<V, S>) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const result = await latestRef.current.loadData(q);
      // Ignore responses that were superseded by a newer request
      if (requestId !== requestIdRef.current) return;
      setData(result.rows);
      setTotal(result.total);
      setLoadError('');
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setLoadError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
    load(query);
  }, [query, load]);

  useImperativeHandle(
    ref,
    () => ({
      reload: () => load(query),
      getRows: () => data,
      setRows: setData,
      setTotal,
      clearSelection: () => setSelectedIds(new Set()),
    }),
    [load, query, data]
  );

  const visibleColumns = columns.filter(
    (column) => !(typeof column.hidden === 'function' ? column.hidden(filters) : column.hidden)
  );
  const allSelected = data.length > 0 && data.every((row) => selectedIds.has(getRowId(row)));
  const totalPages = Math.ceil(total / pageSize);
  const selectedCount = selectedIds.size;

  const handleToggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(data.map(getRowId)));
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSort = (key: string) => {
    const sortOrder = sort?.sortBy === key && sort.sortOrder === 'asc' ? 'desc' : 'asc';
    setSort({ sortBy: key as S, sortOrder });
    setPage(1);
  };

  const handleFiltersChange = (values: V) => {
    for (const field of filterFields) {
      if (field.storageKey) {
        localStorage.setItem(field.storageKey, JSON.stringify(values[field.key]));
      }
    }
    setFilters(values);
    setPage(1);
  };

  const handleBottomPageChange = (next: number) => {
    setPage(next);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePageSizeChange = (next: number) => {
    localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(next));
    setPageSize(next);
    setPage(1);
  };

  const renderHeader = (column: DataTableColumn<T, V>) => {
    if (!column.sortable) return column.header;
    const sorted = sort?.sortBy === column.key;
    const SortIcon = !sorted ? IconSelector : sort.sortOrder === 'asc' ? IconChevronUp : IconChevronDown;
    return (
      <UnstyledButton fw="inherit" fz="inherit" onClick={() => handleSort(column.key)}>
        <Group gap={4} wrap="nowrap">
          {column.header}
          <SortIcon size={14} style={{ opacity: sorted ? 1 : 0.5 }} />
        </Group>
      </UnstyledButton>
    );
  };

  // Rendered both above and below the table
  const renderPagination = (position: 'top' | 'bottom') =>
    paginated && total > 0 && (
      <Group justify="space-between" {...(position === 'top' ? { mb: 'md' } : { mt: 'md' })}>
        <Text size="sm" c="dimmed">
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}{' '}
          {itemLabel[1]}
        </Text>
        <Group gap="sm">
          <Select
            size="xs"
            aria-label="Records per page"
            value={String(pageSize)}
            onChange={(val) => val && handlePageSizeChange(Number(val))}
            data={PAGE_SIZES.map((size) => ({ value: String(size), label: `${size} / page` }))}
            allowDeselect={false}
            style={{ width: 110 }}
          />
          {totalPages > 1 && (
            <Pagination
              value={page}
              onChange={position === 'bottom' ? handleBottomPageChange : setPage}
              total={totalPages}
            />
          )}
        </Group>
      </Group>
    );

  return (
    <>
      {selectable && bulkActions && (
        // Zero-height sticky anchor: the bar overlays the filters and stays visible while scrolling
        <Box
          style={{
            position: 'sticky',
            top: 'calc(var(--app-shell-header-height, 0px) + var(--mantine-spacing-md))',
            zIndex: 10,
            height: 0,
          }}
        >
          <Transition mounted={selectedCount > 0} transition="slide-down" duration={200}>
            {(styles) => (
              <Paper
                withBorder
                p="md"
                mb="md"
                radius="md"
                shadow="md"
                style={{
                  ...styles,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  borderColor: 'var(--mantine-color-cyan-6)',
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="xs">
                    <IconSquareCheck size={20} style={{ color: 'var(--mantine-color-cyan-6)' }} />
                    <div>
                      <Text size="sm" fw={600} c="cyan.9">
                        {selectedCount} {itemLabel[selectedCount === 1 ? 0 : 1]} selected
                      </Text>
                      <Text size="xs" c="dimmed">
                        Choose an action to perform on selected items
                      </Text>
                    </div>
                  </Group>
                  <Group gap="xs">
                    <Button
                      variant="light"
                      color="gray"
                      size="sm"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      Clear
                    </Button>
                    {bulkActions.map((action) => (
                      <Button
                        key={action.label}
                        color={action.color}
                        variant={action.variant}
                        size="sm"
                        leftSection={action.icon}
                        onClick={() =>
                          action.onClick(data.filter((row) => selectedIds.has(getRowId(row))))
                        }
                      >
                        {action.label}
                      </Button>
                    ))}
                  </Group>
                </Group>
              </Paper>
            )}
          </Transition>
        </Box>
      )}

      <Box
        ref={topRef}
        style={{
          position: 'relative',
          // Keep clear of the fixed app header when scrolled into view
          scrollMarginTop: 'calc(var(--app-shell-header-height, 0px) + var(--mantine-spacing-md))',
        }}
      >
        <TableFilters
          fields={filterFields}
          values={filters}
          onChange={handleFiltersChange}
          onRefresh={() => load(query)}
          loading={loading}
        />
      </Box>

      {(loadError || error) && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          mb="md"
          withCloseButton
          onClose={() => {
            setLoadError('');
            onErrorClose?.();
          }}
        >
          {loadError || error}
        </Alert>
      )}

      {renderPagination('top')}

      <Card withBorder>
        {loading && data.length === 0 ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : (
          <Table striped={striped} highlightOnHover={highlightOnHover}>
            <Table.Thead>
              <Table.Tr>
                {selectable && (
                  <Table.Th style={{ width: 40 }}>
                    <Checkbox
                      size="xs"
                      checked={allSelected}
                      indeterminate={selectedCount > 0 && !allSelected}
                      onChange={handleToggleAll}
                    />
                  </Table.Th>
                )}
                {visibleColumns.map((column) => (
                  <Table.Th
                    key={column.key}
                    style={{ width: column.width, textAlign: column.align }}
                    aria-sort={
                      column.sortable && sort?.sortBy === column.key
                        ? sort.sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    {renderHeader(column)}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map((row) => {
                const id = getRowId(row);
                return (
                  <Table.Tr
                    key={id}
                    style={{ cursor: onRowClick ? 'pointer' : undefined, ...rowStyle?.(row) }}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {selectable && (
                      <Table.Td onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          size="xs"
                          checked={selectedIds.has(id)}
                          onChange={() => handleToggleRow(id)}
                        />
                      </Table.Td>
                    )}
                    {visibleColumns.map((column) => (
                      <Table.Td
                        key={column.key}
                        style={{ textAlign: column.align }}
                        onClick={column.stopPropagation ? (e) => e.stopPropagation() : undefined}
                      >
                        {column.render(row)}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                );
              })}
              {data.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={visibleColumns.length + (selectable ? 1 : 0)}>
                    <Text ta="center" c="dimmed" py="md">
                      {noMatchMessage && hasActiveFilters(filterFields, filters) ? noMatchMessage : emptyMessage}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {renderPagination('bottom')}
    </>
  );
}
