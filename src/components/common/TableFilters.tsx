import { ActionIcon, Button, Group, Select, Switch, TextInput, Tooltip } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconRefresh } from '@tabler/icons-react';
import { type ReactNode, useEffect, useState } from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterFieldBase<V> {
  key: keyof V & string;
  width?: number | string;
  /** Keep the value on "Clear filters" and don't count it as an active filter (e.g. view toggles) */
  persistent?: boolean;
  /** Starting value; defaults to the empty value of the field type */
  defaultValue?: V[keyof V];
  /** Remember the value in localStorage under this key (JSON-serializable values only, not dates) */
  storageKey?: string;
}

/** Value: `string | null` */
export interface SelectFilterField<V> extends FilterFieldBase<V> {
  type: 'select';
  placeholder?: string;
  options: FilterOption[];
}

/** Value: `string` - committed on blur or Enter, not on every keystroke */
export interface TextFilterField<V> extends FilterFieldBase<V> {
  type: 'text';
  placeholder?: string;
  icon?: ReactNode;
}

/** Value: `Date | null` */
export interface DateFilterField<V> extends FilterFieldBase<V> {
  type: 'date';
  placeholder?: string;
}

/** Value: `boolean` */
export interface SwitchFilterField<V> extends FilterFieldBase<V> {
  type: 'switch';
  label: string;
}

export type FilterField<V> =
  | SelectFilterField<V>
  | TextFilterField<V>
  | DateFilterField<V>
  | SwitchFilterField<V>;

interface TableFiltersProps<V> {
  fields: FilterField<V>[];
  values: V;
  onChange: (values: V) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

const emptyValues = {
  select: null,
  text: '',
  date: null,
  switch: false,
} as const;

export function getInitialFilters<V>(fields: FilterField<V>[]): V {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    let value: unknown = field.defaultValue ?? emptyValues[field.type];
    if (field.storageKey) {
      const saved = localStorage.getItem(field.storageKey);
      if (saved !== null) {
        try {
          value = JSON.parse(saved);
        } catch {
          // ignore malformed saved value
        }
      }
    }
    values[field.key] = value;
  }
  return values as V;
}

export function hasActiveFilters<V>(fields: FilterField<V>[], values: V): boolean {
  return fields.some((field) => !field.persistent && Boolean(values[field.key]));
}

interface TextFilterProps {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  icon?: ReactNode;
  width: number | string;
}

function TextFilter({ value, onCommit, placeholder, icon, width }: TextFilterProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const next = draft.trim();
    if (next !== value) onCommit(next);
  };

  return (
    <TextInput
      placeholder={placeholder}
      value={draft}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      leftSection={icon}
      style={{ width }}
    />
  );
}

export function TableFilters<V>({
  fields,
  values,
  onChange,
  onRefresh,
  loading = false,
}: TableFiltersProps<V>) {
  const setValue = (key: keyof V, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  const hasFilters = hasActiveFilters(fields, values);

  const handleClear = () => {
    const next = { ...values };
    for (const field of fields) {
      if (!field.persistent) {
        (next as Record<string, unknown>)[field.key] = emptyValues[field.type];
      }
    }
    onChange(next);
  };

  const renderField = (field: FilterField<V>) => {
    const value = values[field.key] as unknown;
    switch (field.type) {
      case 'select':
        return (
          <Select
            key={field.key}
            placeholder={field.placeholder}
            value={value as string | null}
            onChange={(val) => setValue(field.key, val)}
            data={field.options}
            clearable
            style={{ width: field.width ?? 140 }}
          />
        );
      case 'text':
        return (
          <TextFilter
            key={field.key}
            placeholder={field.placeholder}
            value={value as string}
            onCommit={(val) => setValue(field.key, val)}
            icon={field.icon}
            width={field.width ?? 200}
          />
        );
      case 'date':
        return (
          <DatePickerInput
            key={field.key}
            placeholder={field.placeholder}
            value={value as Date | null}
            onChange={(val) => setValue(field.key, val ? new Date(val) : null)}
            clearable
            style={{ width: field.width ?? 150 }}
          />
        );
      case 'switch':
        return (
          <Switch
            key={field.key}
            label={field.label}
            checked={value as boolean}
            onChange={(e) => setValue(field.key, e.currentTarget.checked)}
            size="sm"
          />
        );
    }
  };

  return (
    <Group mb="md" gap="sm" wrap="wrap">
      {fields.map(renderField)}
      {onRefresh && (
        <Tooltip label="Refresh">
          <ActionIcon variant="light" onClick={onRefresh} loading={loading}>
            <IconRefresh size={18} />
          </ActionIcon>
        </Tooltip>
      )}
      {hasFilters && (
        <Button variant="subtle" size="xs" onClick={handleClear}>
          Clear filters
        </Button>
      )}
    </Group>
  );
}
