import { useEffect, useState } from 'react';
import { Alert, Box, Group, Loader, Stack, Text } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconAlertCircle } from '@tabler/icons-react';
import { schedulesApi } from '../../../api';
import type { ScheduleTrigger } from '../../../types';
import dayjs, { browserTimezone } from '../../../utils/dayjs';

const PREVIEW_COUNT = 5;
const PREVIEW_DEBOUNCE_MS = 400;
const PREVIEW_FORMAT = 'ddd, D MMM YYYY HH:mm';

interface PreviewState {
  runs: string[];
  error: string;
  loading: boolean;
}

function useSchedulePreview(trigger: ScheduleTrigger | null, timezone: string): PreviewState {
  // Serialized - trigger is rebuilt from the form on every render
  const key = trigger ? JSON.stringify({ trigger, timezone }) : '';
  const [debouncedKey] = useDebouncedValue(key, PREVIEW_DEBOUNCE_MS);
  const [state, setState] = useState<PreviewState>({ runs: [], error: '', loading: false });

  useEffect(() => {
    if (!debouncedKey) {
      setState({ runs: [], error: '', loading: false });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));
    schedulesApi
      .preview({ ...JSON.parse(debouncedKey), count: PREVIEW_COUNT })
      .then(({ nextRuns }) => {
        if (cancelled) return;
        setState({
          runs: nextRuns,
          error: nextRuns.length === 0 ? 'Schedule has no upcoming runs' : '',
          loading: false,
        });
      })
      .catch((err) => {
        if (!cancelled) setState({ runs: [], error: err instanceof Error ? err.message : 'Preview failed', loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedKey]);

  return state;
}

interface SchedulePreviewProps {
  trigger: ScheduleTrigger | null;
  timezone: string;
}

// Next run times in the schedule timezone, plus local time when it differs
export function SchedulePreview({ trigger, timezone }: SchedulePreviewProps) {
  const { runs, error, loading } = useSchedulePreview(trigger, timezone);
  const localTz = browserTimezone();
  const showLocal = timezone !== localTz;

  return (
    <Box>
      <Group gap="xs" mb={2}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Next runs</Text>
        {loading && <Loader size={12} />}
      </Group>
      {error ? (
        <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />} p="xs">
          <Text size="sm">{error}</Text>
        </Alert>
      ) : !trigger ? (
        <Text size="xs" c="dimmed">Complete the schedule to see upcoming runs</Text>
      ) : (
        <Stack gap={0}>
          {runs.map((run) => (
            <Group key={run} gap="xs" wrap="wrap">
              <Text size="xs" c="dimmed">{dayjs(run).tz(timezone).format(PREVIEW_FORMAT)}</Text>
              {showLocal && (
                <Text size="xs" c="dimmed" opacity={0.7}>({dayjs(run).tz(localTz).format(PREVIEW_FORMAT)} local)</Text>
              )}
            </Group>
          ))}
        </Stack>
      )}
    </Box>
  );
}
