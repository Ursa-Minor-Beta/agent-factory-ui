import { useEffect, useState } from 'react';
import { Anchor, Button, Group, Radio, SegmentedControl, Select, Stack, Text } from '@mantine/core';
import { IconExternalLink, IconRefresh } from '@tabler/icons-react';
import { Link } from 'react-router';
import { Controller, useWatch, type Control } from 'react-hook-form';
import { sessionsApi } from '../../../api';
import type { Session } from '../../../types';
import { routes } from '../../../config/routes';
import type { ScheduleFormValues } from './formModel';

// Center the radio against label + description instead of the first line
const RADIO_STYLES = { body: { alignItems: 'center' } };

interface SessionSectionProps {
  control: Control<ScheduleFormValues>;
  agentId: string;
  /** Session the saved schedule writes to (edit only) */
  savedSessionId: string | null;
  onStartNewSession?: () => Promise<void>;
  error?: string;
}

export function SessionSection({ control, agentId, savedSessionId, onStartNewSession, error }: SessionSectionProps) {
  const sessionMode = useWatch({ control, name: 'sessionMode' });
  const continueSession = useWatch({ control, name: 'continueSession' });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [resetting, setResetting] = useState(false);
  const pickSession = sessionMode === 'session' && continueSession && !savedSessionId;

  useEffect(() => {
    if (!pickSession || !agentId) return;
    sessionsApi
      .list({ agentId, status: 'active', limit: 100 })
      .then((list) => setSessions(list.filter((s) => !s.incognito)))
      .catch(() => setSessions([]));
  }, [pickSession, agentId]);

  const handleStartNew = async () => {
    if (!onStartNewSession) return;
    setResetting(true);
    try {
      await onStartNewSession();
    } finally {
      setResetting(false);
    }
  };

  return (
    <Stack gap="sm">
      <Controller
        name="sessionMode"
        control={control}
        render={({ field }) => (
          <Radio.Group {...field}>
            <Stack gap="xs">
              <Radio styles={RADIO_STYLES} value="incognito" label="Incognito" description="Nothing is saved except the run record." />
              <Radio
                styles={RADIO_STYLES}
                value="session"
                label="Chat session"
                description="All runs go into one chat conversation you can open in Chat."
              />
            </Stack>
          </Radio.Group>
        )}
      />

      {sessionMode === 'session' && savedSessionId && (
        <Stack gap="sm" pl="xl">
          <Anchor component={Link} to={routes.agentChat(agentId, savedSessionId)} size="sm">
            <Group gap={4}><IconExternalLink size={14} />Open conversation</Group>
          </Anchor>
          {onStartNewSession && (
            <Button size="xs" variant="subtle" leftSection={<IconRefresh size={14} />} loading={resetting} onClick={handleStartNew}>
              Start new session
            </Button>
          )}
        </Stack>
      )}

      {sessionMode === 'session' && !savedSessionId && (
        <Stack gap="xs" pl="xl">
          <Controller
            name="continueSession"
            control={control}
            render={({ field: { value, onChange } }) => (
              <SegmentedControl
                size="xs"
                data={[
                  { value: 'new', label: 'New session' },
                  { value: 'existing', label: 'Continue existing session' },
                ]}
                value={value ? 'existing' : 'new'}
                onChange={(v) => onChange(v === 'existing')}
              />
            )}
          />
          {continueSession && (
            <Controller
              name="sessionId"
              control={control}
              render={({ field }) => (
                <Select
                  placeholder={sessions.length ? 'Select a session' : 'No sessions for this agent'}
                  data={sessions.map((s) => ({
                    value: s.id,
                    label: s.title || `Session ${new Date(s.createdAt).toLocaleString()}`,
                  }))}
                  searchable
                  {...field}
                />
              )}
            />
          )}
        </Stack>
      )}

      {error && <Text size="sm" c="red">{error}</Text>}
    </Stack>
  );
}
