import { Alert, Box, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { Controller, type Control } from 'react-hook-form';
import type { InputSchema } from '../../../types';
import { AgentInputField } from '../../../pages/Chat/AgentInputField';
import { JsonEditor } from '../../JsonEditor';
import type { ScheduleFormValues } from './formModel';

interface InputSectionProps {
  control: Control<ScheduleFormValues>;
  schema: InputSchema;
  error?: string;
  onJsonValidChange: (valid: boolean) => void;
}

// Agent input for each run: a form from the agent's input schema (as in Chat), JSON otherwise
export function InputSection({ control, schema, error, onJsonValidChange }: InputSectionProps) {
  const fields = Object.entries(schema);

  return (
    <Stack gap="sm">
      {fields.length > 0 ? (
        <Controller
          name="inputValues"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Stack gap="sm">
              {fields.map(([key, fieldSchema]) => (
                <AgentInputField
                  key={key}
                  fieldKey={key}
                  schema={fieldSchema}
                  value={value[key] ?? ''}
                  onChange={(k, v) => onChange({ ...value, [k]: v })}
                  autosize
                  minRows={1}
                  maxRows={6}
                />
              ))}
            </Stack>
          )}
        />
      ) : (
        <Box>
          <Text size="xs" c="dimmed" mb={4}>The agent has no input schema - edit the input as JSON</Text>
          <Controller
            name="inputJson"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Box h={160}>
                <JsonEditor
                  value={value}
                  height={160}
                  showLineNumbers={false}
                  onChange={(v, isValid) => {
                    onJsonValidChange(isValid);
                    if (isValid && v && typeof v === 'object' && !Array.isArray(v)) onChange(v);
                  }}
                />
              </Box>
            )}
          />
        </Box>
      )}
      {error && (
        <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />} p="xs">
          <Text size="sm">{error}</Text>
        </Alert>
      )}
    </Stack>
  );
}
