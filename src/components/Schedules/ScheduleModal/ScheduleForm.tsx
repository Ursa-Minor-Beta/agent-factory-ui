import { useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconAlertCircle, IconAlertTriangle } from '@tabler/icons-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { agentsApi, schedulesApi } from '../../../api';
import type { AgentSchedule, InputSchema } from '../../../types';
import { getScheduleState } from '../../../types';
import { getInputSchema } from '../../../pages/Chat/types';
import {
  defaultFormValues,
  getErrorTarget,
  isTriggerChanged,
  toCreatePayload,
  toFormValues,
  toUpdatePayload,
  type ScheduleErrorTarget,
  type ScheduleFormValues,
} from './formModel';
import { WhenSection } from './WhenSection';
import { InputSection } from './InputSection';
import { SessionSection } from './SessionSection';

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <Box>
      {title && <Text size="sm" fw={600} mb="xs">{title}</Text>}
      <Card withBorder radius="lg" p="md">
        {children}
      </Card>
    </Box>
  );
}

interface ScheduleFormProps {
  /** null = create */
  schedule: AgentSchedule | null;
  initialAgentId?: string | null;
  /** Limits the agent select: id = that workspace, null = global agents, undefined = all */
  workspaceId?: string | null;
  /** Form submitted */
  onSaved: (schedule: AgentSchedule) => void;
  /** Changed in place without submitting (e.g. "Start new session") */
  onUpdated: (schedule: AgentSchedule) => void;
  onCancel: () => void;
}

export function ScheduleForm({ schedule, initialAgentId, workspaceId, onSaved, onUpdated, onCancel }: ScheduleFormProps) {
  const isEdit = !!schedule;
  const { control, register, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm<ScheduleFormValues>({
    // Edit starts from the saved schedule; refilled once the agent's input schema is loaded
    defaultValues: schedule ? toFormValues(schedule, {}) : defaultFormValues(initialAgentId ?? ''),
  });
  const agentId = useWatch({ control, name: 'agentId' });
  const values = useWatch({ control }) as ScheduleFormValues;

  const [agentOptions, setAgentOptions] = useState<{ value: string; label: string }[]>([]);
  const [schema, setSchema] = useState<InputSchema>({});
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [jsonValid, setJsonValid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<ScheduleErrorTarget, string>>>({});

  // Agent select - create only, agentId can't change after creation
  useEffect(() => {
    if (isEdit) return;
    agentsApi
      .list({ workspaceId, sortBy: 'name', sortOrder: 'asc', limit: 100 })
      .then(({ agents }) => {
        setAgentOptions(agents.map((a) => ({ value: a.id, label: a.name })));
        // Agent prefilled from the URL (agent editor)
        const prefilled = agents.find((a) => a.id === getValues('agentId'));
        if (prefilled) prefillName(prefilled.name);
      })
      .catch(() => setAgentOptions([]));
  }, [isEdit, workspaceId]);

  // Input schema of the selected agent; the form is (re)filled once it is known
  useEffect(() => {
    if (!agentId) {
      setSchema({});
      return;
    }
    let cancelled = false;
    setSchemaLoading(true);
    agentsApi
      .getById(agentId)
      .then((agent) => {
        if (cancelled) return;
        const agentSchema = getInputSchema(agent);
        setSchema(agentSchema);
        if (schedule) reset(toFormValues(schedule, agentSchema));
      })
      .catch(() => {
        if (!cancelled && schedule) reset(toFormValues(schedule, {}));
      })
      .finally(() => !cancelled && setSchemaLoading(false));
    return () => {
      cancelled = true;
    };
  }, [agentId, schedule?.id]);

  // New schedule: name defaults to the agent name, never overwriting a typed one
  const prefillName = (agentName: string) => {
    if (!getValues('name').trim()) setValue('name', agentName, { shouldValidate: !!errors.name });
  };

  const showServerError = (message: string) => {
    const target = getErrorTarget(message);
    setServerErrors({ [target]: message });
  };

  const onSubmit = async (formValues: ScheduleFormValues) => {
    setServerErrors({});
    setSaving(true);
    try {
      if (schedule) {
        const patch = toUpdatePayload(schedule, formValues, schema);
        if (!patch) return showServerError('Complete the schedule ("trigger")');
        onSaved(Object.keys(patch).length ? await schedulesApi.update(schedule.id, patch) : schedule);
      } else {
        const payload = toCreatePayload(formValues, schema);
        if (!payload) return showServerError('Complete the schedule ("trigger")');
        onSaved(await schedulesApi.create(payload));
      }
    } catch (err) {
      showServerError(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleStartNewSession = async () => {
    if (!schedule) return;
    try {
      const updated = await schedulesApi.update(schedule.id, { sessionId: null });
      setValue('sessionId', null);
      setValue('continueSession', false);
      onUpdated(updated);
    } catch (err) {
      showServerError(err instanceof Error ? err.message : 'Failed to reset session');
    }
  };

  const triggerMaxRuns = schedule && schedule.trigger.type !== 'once' ? schedule.trigger.maxRuns : undefined;
  const showRunCountWarning = !!schedule && !!triggerMaxRuns && isTriggerChanged(schedule, values);
  const wasStopped = !!schedule && getScheduleState(schedule) === 'stoppedAfterFailures';

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap="lg">
        {serverErrors.form && (
          <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
            {serverErrors.form}
          </Alert>
        )}

        <Stack gap="sm">
          {isEdit ? (
            <TextInput label="Agent" value={schedule.agentName ?? schedule.agentId} readOnly variant="filled" />
          ) : (
            <Controller
              name="agentId"
              control={control}
              rules={{ required: 'Agent is required' }}
              render={({ field }) => (
                <Select
                  label="Agent"
                  placeholder="Select an agent"
                  data={agentOptions}
                  searchable
                  withAsterisk
                  error={errors.agentId?.message}
                  {...field}
                  onChange={(v, option) => {
                    field.onChange(v ?? '');
                    if (option) prefillName(option.label);
                  }}
                />
              )}
            />
          )}
          <TextInput
            label="Name"
            withAsterisk
            error={errors.name?.message || serverErrors.name}
            {...register('name', { required: 'Name is required', validate: (v) => !!v.trim() || 'Name is required' })}
          />
          <Textarea label="Description" autosize minRows={1} maxRows={4} {...register('description')} />
        </Stack>

        {agentId && (
          <>
            <Section title="Input">
              {schemaLoading ? (
                <Text size="sm" c="dimmed">Loading agent input…</Text>
              ) : (
                <InputSection control={control} schema={schema} error={serverErrors.input} onJsonValidChange={setJsonValid} />
              )}
            </Section>

            <Section title="Session">
              <SessionSection
                control={control}
                agentId={agentId}
                savedSessionId={schedule?.sessionMode === 'session' ? schedule.sessionId : null}
                onStartNewSession={isEdit ? handleStartNewSession : undefined}
                error={serverErrors.session}
              />
            </Section>
          </>
        )}

        <Section title="When">
          <WhenSection control={control} register={register} error={serverErrors.when} atError={serverErrors.at} />
          {showRunCountWarning && (
            <Alert mt="sm" color="yellow" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
              <Text size="sm">
                Changing the schedule resets the run count ({schedule.runCount} of {triggerMaxRuns} runs used).
              </Text>
            </Alert>
          )}
        </Section>

        <Section title="Advanced">
          <Stack gap="sm">
            <Controller
              name="skipOverlap"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <Checkbox
                  label="Skip if previous run is still running"
                  checked={value}
                  onChange={(e) => onChange(e.currentTarget.checked)}
                  {...field}
                />
              )}
            />
            <Controller
              name="stopAfterFailures"
              control={control}
              render={({ field: { onChange, ...field } }) => (
                <NumberInput
                  label="Stop after N consecutive failures"
                  description="0 = never stop"
                  min={0}
                  allowDecimal={false}
                  maw={260}
                  onChange={(v) => onChange(Number(v) || 0)}
                  {...field}
                />
              )}
            />
          </Stack>
        </Section>

        <Section>
          <Controller
            name="enabled"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Switch
                label="Enabled"
                description={wasStopped && value ? 'Re-enabling resets the failure count.' : undefined}
                checked={value}
                onChange={(e) => onChange(e.currentTarget.checked)}
                {...field}
              />
            )}
          />
        </Section>

        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel}>Cancel</Button>
          <Button type="submit" loading={saving} disabled={!jsonValid}>
            {isEdit ? 'Save' : 'Create schedule'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
