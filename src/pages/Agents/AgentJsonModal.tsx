import { useState, useRef } from 'react';
import { Modal, Box, Text } from '@mantine/core';
import type { AgentJsonModalProps } from './types';

export function AgentJsonModal({ agent, onClose, isMobile }: AgentJsonModalProps) {
  const [splitPercent, setSplitPercent] = useState(50);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <Modal
      opened={!!agent}
      onClose={onClose}
      title={`${agent?.name} - Structure`}
      fullScreen
    >
      {agent && (
        <Box
          ref={containerRef}
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            height: 'calc(100vh - 120px)',
            userSelect: isDraggingRef.current ? 'none' : undefined,
          }}
          onMouseMove={(e) => {
            if (!isDraggingRef.current || isMobile || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const percent = ((e.clientX - rect.left) / rect.width) * 100;
            setSplitPercent(Math.min(Math.max(percent, 20), 80));
          }}
          onMouseUp={() => { isDraggingRef.current = false; }}
          onMouseLeave={() => { isDraggingRef.current = false; }}
        >
          <Box style={{
            width: isMobile ? '100%' : `${splitPercent}%`,
            flex: isMobile ? 1 : undefined,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            paddingRight: isMobile ? 0 : 8,
          }}>
            <Text fw={600} mb="xs">Nodes ({agent.nodes.length})</Text>
            <Box
              component="pre"
              style={{
                backgroundColor: 'var(--mantine-color-dark-7)',
                padding: 12,
                borderRadius: 8,
                overflow: 'auto',
                flex: 1,
                fontSize: 12,
                margin: 0,
              }}
            >
              {JSON.stringify(agent.nodes, null, 2)}
            </Box>
          </Box>

          {!isMobile && (
            <Box
              onMouseDown={() => { isDraggingRef.current = true; }}
              style={{
                width: 8,
                cursor: 'col-resize',
                backgroundColor: 'var(--mantine-color-dark-5)',
                borderRadius: 4,
                transition: 'background-color 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--mantine-color-cyan-7)'; }}
              onMouseLeave={(e) => {
                if (!isDraggingRef.current) {
                  e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-5)';
                }
              }}
            />
          )}

          <Box style={{
            width: isMobile ? '100%' : `${100 - splitPercent}%`,
            flex: isMobile ? 1 : undefined,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            paddingLeft: isMobile ? 0 : 8,
            marginTop: isMobile ? 16 : 0,
          }}>
            <Text fw={600} mb="xs">Edges ({agent.edges.length})</Text>
            <Box
              component="pre"
              style={{
                backgroundColor: 'var(--mantine-color-dark-7)',
                padding: 12,
                borderRadius: 8,
                overflow: 'auto',
                flex: 1,
                fontSize: 12,
                margin: 0,
              }}
            >
              {JSON.stringify(agent.edges, null, 2)}
            </Box>
          </Box>
        </Box>
      )}
    </Modal>
  );
}
