import { Table, Text } from '@mantine/core';
import { type ReactNode } from 'react';

interface InfoTableRow {
  label: string;
  value: ReactNode;
  hide?: boolean;
}

interface InfoTableProps {
  rows: InfoTableRow[];
  labelWidth?: string | number;
  striped?: boolean;
  highlightOnHover?: boolean;
  fontSize?: 'xs' | 'sm' | 'md';
  minWidth?: number;
}

export function InfoTable({
  rows,
  labelWidth = '40%',
  striped = false,
  highlightOnHover = false,
  fontSize = 'xs',
  minWidth = 200,
}: InfoTableProps) {
  const visibleRows = rows.filter((row) => !row.hide);

  if (visibleRows.length === 0) {
    return null;
  }

  return (
    <Table.ScrollContainer minWidth={minWidth}>
      <Table striped={striped} highlightOnHover={highlightOnHover}>
        <Table.Tbody>
          {visibleRows.map((row, index) => (
            <Table.Tr key={index}>
              <Table.Td c="dimmed" fw={500} style={{ width: labelWidth }}>
                <Text size={fontSize}>{row.label}</Text>
              </Table.Td>
              <Table.Td>
                {typeof row.value === 'string' ? (
                  <Text size={fontSize}>{row.value}</Text>
                ) : (
                  row.value
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
