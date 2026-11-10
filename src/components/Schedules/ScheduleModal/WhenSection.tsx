import { useMemo, useState } from 'react';
import {
  Alert,
  Chip,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { DateTimePicker, TimeInput } from '@mantine/dates';
import { IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import { Controller, useWatch, type Control, type UseFormRegister } from 'react-hook-form';
import { HOUR_STEPS, MINUTE_STEPS, type CronPresetKind } from '../../../utils/cron';
import { buildCronExpression, buildTrigger, effectiveTimezone, type ScheduleFormValues } from './formModel';
import { SchedulePreview } from './SchedulePreview';

const KIND_OPTIONS: { value: CronPresetKind; label: string }[] = [
  { value: 'minutes', label: 'Every N minutes' },
  { value: 'hours', label: 'Every N hours' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const WEEKDAYS = [
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
  { value: '0', label: 'Sun' },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  .map((label, i) => ({ value: String(i + 1), label }));

const DAYS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

const UNIT_OPTIONS = [
  { value: 'minutes', label: 'minutes' },
  { value: 'hours', label: 'hours' },
  { value: 'days', label: 'days' },
];

interface WhenSectionProps {
  control: Control<ScheduleFormValues>;
  register: UseFormRegister<ScheduleFormValues>;
  error?: string;
  atError?: string;
}

export function WhenSection({ control, register, error, atError }: WhenSectionProps) {
  const values = useWatch({ control }) as ScheduleFormValues;
  const trigger = buildTrigger(values);
  const timezones = useMemo(() => Intl.supportedValuesOf('timeZone'), []);
  const [now] = useState(() => new Date());
  const { triggerType, cronAdvanced, cronKind, monthDay } = values;
  const showTime = !['minutes', 'hours'].includes(cronKind);

  const limits = (
    <SimpleGrid cols={{ base: 1, sm: triggerType === 'cron' ? 3 : 2 }}>
      {triggerType === 'cron' && (
        <Controller
          name="startAt"
          control={control}
          render={({ field }) => (
            <DateTimePicker label="Start date" placeholder="Now" clearable valueFormat="D MMM YYYY HH:mm" {...field} />
          )}
        />
      )}
      <Controller
        name="endAt"
        control={control}
        render={({ field }) => (
          <DateTimePicker label="End date" placeholder="Never" clearable valueFormat="D MMM YYYY HH:mm" {...field} />
        )}
      />
      <Controller
        name="maxRuns"
        control={control}
        render={({ field }) => (
          <NumberInput label="Max runs" placeholder="Unlimited" min={1} allowDecimal={false} {...field} />
        )}
      />
    </SimpleGrid>
  );

  return (
    <Stack gap="sm">
      <Controller
        name="triggerType"
        control={control}
        render={({ field }) => (
          <SegmentedControl
            fullWidth
            data={[
              { value: 'cron', label: 'Repeat' },
              { value: 'once', label: 'Once' },
              { value: 'interval', label: 'Interval' },
            ]}
            {...field}
          />
        )}
      />

      {triggerType === 'cron' && (
        <>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {cronAdvanced ? 'Cron expression: minute hour day month weekday' : 'Repeat on a calendar'}
            </Text>
            <Controller
              name="cronAdvanced"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <Switch label="Advanced" size="xs" checked={value} onChange={(e) => onChange(e.currentTarget.checked)} {...field} />
              )}
            />
          </Group>

          {cronAdvanced ? (
            <TextInput ff="monospace" placeholder="0 9 * * 1-5" {...register('cronExpression')} />
          ) : (
            <Stack gap="sm">
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <Controller
                  name="cronKind"
                  control={control}
                  render={({ field }) => (
                    <Select label="Frequency" data={KIND_OPTIONS} allowDeselect={false} {...field} />
                  )}
                />
                {cronKind === 'minutes' && (
                  <Controller
                    name="minuteStep"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <Select
                        label="Every"
                        data={MINUTE_STEPS.map((n) => ({ value: String(n), label: `${n} minutes` }))}
                        value={String(value)}
                        onChange={(v) => v && onChange(Number(v))}
                        allowDeselect={false}
                        {...field}
                      />
                    )}
                  />
                )}
                {cronKind === 'hours' && (
                  <Group grow gap="sm">
                    <Controller
                      name="hourStep"
                      control={control}
                      render={({ field: { value, onChange, ...field } }) => (
                        <Select
                          label="Every"
                          data={HOUR_STEPS.map((n) => ({ value: String(n), label: n === 1 ? '1 hour' : `${n} hours` }))}
                          value={String(value)}
                          onChange={(v) => v && onChange(Number(v))}
                          allowDeselect={false}
                          {...field}
                        />
                      )}
                    />
                    <Controller
                      name="time"
                      control={control}
                      render={({ field: { value, onChange, ...field } }) => (
                        <NumberInput
                          label="At minute"
                          min={0}
                          max={59}
                          allowDecimal={false}
                          clampBehavior="strict"
                          value={Number(value.split(':')[1]) || 0}
                          onChange={(v) => onChange(`00:${String(Number(v) || 0).padStart(2, '0')}`)}
                          {...field}
                        />
                      )}
                    />
                  </Group>
                )}
                {cronKind === 'yearly' && (
                  <Controller
                    name="month"
                    control={control}
                    render={({ field }) => <Select label="Month" data={MONTHS} allowDeselect={false} {...field} />}
                  />
                )}
                {(cronKind === 'monthly' || cronKind === 'yearly') && (
                  <Controller
                    name="monthDay"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <Select
                        label="Day"
                        data={DAYS}
                        value={String(value)}
                        onChange={(v) => v && onChange(Number(v))}
                        allowDeselect={false}
                        {...field}
                      />
                    )}
                  />
                )}
                {showTime && (
                  <Controller
                    name="time"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <TimeInput label="At" value={value} onChange={(e) => onChange(e.currentTarget.value)} {...field} />
                    )}
                  />
                )}
              </SimpleGrid>

              {cronKind === 'weekly' && (
                <Controller
                  name="weekDays"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <Chip.Group multiple value={value} onChange={onChange}>
                      <Group gap={6}>
                        {WEEKDAYS.map((d) => (
                          <Chip key={d.value} value={d.value} size="xs">{d.label}</Chip>
                        ))}
                      </Group>
                    </Chip.Group>
                  )}
                />
              )}
              {cronKind === 'weekly' && values.weekDays.length === 0 && (
                <Text size="xs" c="red">Pick at least one day</Text>
              )}
              {(cronKind === 'monthly' || cronKind === 'yearly') && monthDay > 28 && (
                <Text size="xs" c="dimmed">Months without day {monthDay} are skipped.</Text>
              )}
              <Text size="xs" c="dimmed" ff="monospace">cron: {buildCronExpression(values)}</Text>
            </Stack>
          )}

          <Controller
            name="timezone"
            control={control}
            render={({ field }) => (
              <Select label="Timezone" data={timezones} searchable allowDeselect={false} limit={100} {...field} />
            )}
          />
          {limits}
        </>
      )}

      {triggerType === 'once' && (
        <Controller
          name="at"
          control={control}
          render={({ field }) => (
            <DateTimePicker
              label="Run at"
              placeholder="Pick date and time"
              withAsterisk
              minDate={now}
              valueFormat="D MMM YYYY HH:mm"
              error={atError}
              {...field}
            />
          )}
        />
      )}

      {triggerType === 'interval' && (
        <>
          <Group grow gap="sm" align="flex-start">
            <Controller
              name="intervalValue"
              control={control}
              render={({ field: { onChange, ...field } }) => (
                <NumberInput
                  label="Every"
                  min={1}
                  allowDecimal={false}
                  onChange={(v) => onChange(Number(v) || 0)}
                  {...field}
                />
              )}
            />
            <Controller
              name="intervalUnit"
              control={control}
              render={({ field }) => <Select label="Unit" data={UNIT_OPTIONS} allowDeselect={false} {...field} />}
            />
          </Group>
          <Text size="xs" c="dimmed">
            <IconInfoCircle size={12} style={{ verticalAlign: 'middle' }} /> Use Interval for periods a calendar can't
            express, like every 90 minutes or every 10 days. Minimum 1 minute.
          </Text>
          <Controller
            name="anchorAt"
            control={control}
            render={({ field }) => (
              <DateTimePicker label="First run" placeholder="Now" clearable valueFormat="D MMM YYYY HH:mm" {...field} />
            )}
          />
          {limits}
        </>
      )}

      {error && (
        <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />} p="xs">
          <Text size="sm">{error}</Text>
        </Alert>
      )}

      <SchedulePreview trigger={trigger} timezone={effectiveTimezone(values)} />
    </Stack>
  );
}
