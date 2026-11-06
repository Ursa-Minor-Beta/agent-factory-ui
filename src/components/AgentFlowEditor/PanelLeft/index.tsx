import { useEffect, useState, useCallback, useRef, memo, type ReactNode, type RefObject } from 'react';
import { ActionIcon, Box, Tabs, Tooltip } from '@mantine/core';
import {
  IconHierarchy2,
  IconBrandGithub,
  IconComponents,
  IconPlayerPlay,
  IconPlus,
  IconSettings,
  IconSparkles,
  IconTemplate,
  type Icon,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { routes } from '../../../config/routes';
import type { NodeType, AgentExample } from '../../../api';
import type { Agent } from '../../../types/agent';
import type { NodeStatus } from '../../../types';
import type { ChatStatusEvent } from '../../../api/sessions';
import type { LayoutDirection } from '../utils/converters';
import { NodesTab } from './NodesTab';
import { SettingsTab } from './SettingsTab';
import { RunTab, type AgentRunner } from './RunTab';
import { TemplatesTab } from './TemplatesTab';
import { GitTab } from './GitTab';
import { AssistantTab, type AssistantEditor } from './AssistantTab';
import { AgentsNavigatorGraph } from '../../AgentsGraph';

const MIN_WIDTH = 120;
const MAX_WIDTH_RATIO = 0.7; // 40% of viewport
const STORAGE_KEY = 'agent-editor-palette-width';
const TAB_STORAGE_KEY = 'agent-editor-active-tab';

// Icon-only tab - names live in the tooltip to keep the narrow panel on one row
function IconTab({ value, label, icon: TabIcon, className }: { value: string; label: string; icon: Icon; className?: string }) {
  return (
    <Tooltip label={label} openDelay={300}>
      <Tabs.Tab value={value} aria-label={label} className={className}>
        <TabIcon size={16} style={{ display: 'block' }} />
      </Tabs.Tab>
    </Tooltip>
  );
}

interface PanelLeftProps {
  hidden?: boolean;
  header: ReactNode;
  isNodesDragging: boolean;
  nodeTypes: NodeType[];
  existingNodeTypes: Set<string>;
  edgeType: string;
  layoutDirection: LayoutDirection;
  agent: Partial<Agent> | null;
  hasNodes: boolean;
  activeTab?: string | null;
  savedAt?: number;
  onActiveTabChange?: (tab: string | null) => void;
  onAddNode: (nodeType: NodeType, exampleIndex?: number) => void;
  onEdgeTypeChange: (value: string) => void;
  onLayoutDirectionChange: (value: LayoutDirection) => void;
  onAgentInfoChange: (data: { name?: string; description?: string }) => Promise<void>;
  onWorkspaceChange?: (workspaceId: string | null) => Promise<void>;
  onLoadTemplate: (template: AgentExample) => void;
  onExport?: () => void;
  onAgentDeleted?: () => void;
  exporting?: boolean;
  onReloadAgent?: () => void;
  onRunStart?: () => void;
  onNodeStatus?: (nodeId: string, status: ChatStatusEvent['status'], minRunningMs: number) => void;
  onRunEnd?: () => void;
  onRunClear?: () => void;
  runRequest?: number;
  onRunInputsRequired?: () => void;
  onRunningChange?: (running: boolean) => void;
  assistantEditor: AssistantEditor;
  runnerRef?: RefObject<AgentRunner | null>;
}

export const PanelLeft = memo(function({ hidden, header, nodeTypes, existingNodeTypes, edgeType, layoutDirection, agent, hasNodes, activeTab: externalActiveTab, savedAt, onActiveTabChange, onAddNode, onEdgeTypeChange, onLayoutDirectionChange, onAgentInfoChange, onWorkspaceChange, onLoadTemplate, onExport, onAgentDeleted, exporting, onReloadAgent, onRunStart, onNodeStatus, onRunEnd, onRunClear, runRequest, onRunInputsRequired, onRunningChange, assistantEditor, runnerRef }: PanelLeftProps) {
  const [agentRunStatuses, setAgentRunStatuses] = useState<Record<string, NodeStatus>>({});
  const [assistantSending, setAssistantSending] = useState(false);
  const [viewingNodeType, setViewingNodeType] = useState<NodeType | null>(null);
  const handleNodeTypeBack = useCallback(() => setViewingNodeType(null), []);
  const [internalActiveTab, setInternalActiveTab] = useState<string | null>(() => {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    return saved || 'nodes';
  });

  // Use external tab if provided, otherwise internal
  const workspaceId = agent?.workspaceId;
  const requestedTab = externalActiveTab ?? internalActiveTab;
  // Relations tab only exists for agents in a workspace
  const activeTab = requestedTab === 'relations' && !workspaceId ? 'nodes' : requestedTab;
  const setActiveTab = (tab: string | null) => {
    if (onActiveTabChange) {
      onActiveTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 180;
  });
  const resizingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width));
  }, [width]);

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    }
  }, [activeTab]);

  // Cleanup resize state on unmount
  useEffect(() => {
    return () => {
      resizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    // Only handle left mouse button
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    // Get the container's left offset to calculate width correctly
    const containerLeft = containerRef.current?.getBoundingClientRect().left ?? 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO;
      const newWidth = e.clientX - containerLeft;
      setWidth(Math.max(MIN_WIDTH, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      resizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  return (
    <Box
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        display: hidden ? 'none' : 'flex',
        zIndex: 100,
      }}
    >
      <Box
        style={{
          width,
          height: '100%',
          background: 'var(--mantine-color-body)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          borderRight: '1px solid var(--mantine-color-default-border)',
          overflow: 'hidden',
        }}
      >
        <>
          {header}

          {/* display-none (not the default 'activity'): hidden tabs keep running effects, e.g. Run tab reacting to toolbar Run */}
          <Tabs value={activeTab} onChange={setActiveTab} keepMountedMode="display-none" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <Tabs.List px="xs" pt="xs">
              <IconTab 
                value="assistant" 
                label="Assistant" 
                icon={() => <IconSparkles size={16} style={{ display: 'block', color: 'var(--mantine-color-violet-5)' }}/>} 
                className={assistantSending ? 'run-tab-running' : undefined} 
                />
              <IconTab
                value="run"
                label="Run"
                icon={IconPlayerPlay}
                className={agent?.id && agentRunStatuses[agent.id] ? `run-tab-${agentRunStatuses[agent.id]}` : undefined}
              />
              <IconTab value="nodes" label="Nodes" icon={IconComponents} />
              <IconTab value="templates" label="Templates" icon={IconTemplate} />
              <IconTab value="settings" label="Settings" icon={IconSettings} />
              <IconTab value="git" label="Git" icon={IconBrandGithub} />
              {workspaceId && <IconTab value="relations" label="Relations" icon={IconHierarchy2} />}
            </Tabs.List>

            <Tabs.Panel value="assistant" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <AssistantTab
                agentKey={agent?.id ?? 'new'}
                editor={assistantEditor}
                onSendingChange={setAssistantSending}
              />
            </Tabs.Panel>

            <Tabs.Panel value="nodes" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <NodesTab
                nodeTypes={nodeTypes}
                existingNodeTypes={existingNodeTypes}
                viewingNodeType={viewingNodeType}
                onAddNode={onAddNode}
                onNodeClick={setViewingNodeType}
                onBack={handleNodeTypeBack}
              />
            </Tabs.Panel>

            <Tabs.Panel value="templates" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <TemplatesTab hasNodes={hasNodes} onLoadTemplate={onLoadTemplate} />
            </Tabs.Panel>

            <Tabs.Panel value="run" style={{ flex: 1, minHeight: 0 }} p="xs">
              <RunTab
                agent={agent}
                onRunStart={onRunStart}
                onNodeStatus={onNodeStatus}
                onRunEnd={onRunEnd}
                onRunClear={onRunClear}
                runRequest={runRequest}
                onInputsRequired={onRunInputsRequired}
                onRunningChange={onRunningChange}
                onAgentStatusesChange={setAgentRunStatuses}
                runnerRef={runnerRef}
              />
            </Tabs.Panel>

            <Tabs.Panel value="settings" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} p="xs">
              <SettingsTab
                agent={agent}
                edgeType={edgeType}
                layoutDirection={layoutDirection}
                onAgentInfoChange={onAgentInfoChange}
                onEdgeTypeChange={onEdgeTypeChange}
                onLayoutDirectionChange={onLayoutDirectionChange}
                onWorkspaceChange={onWorkspaceChange}
                onExport={onExport}
                onDeleted={onAgentDeleted}
                exporting={exporting}
              />
            </Tabs.Panel>

            {workspaceId && (
              <Tabs.Panel value="relations" style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                {activeTab === 'relations' && (
                  <AgentsNavigatorGraph
                    workspaceId={workspaceId}
                    currentAgentId={agent?.id}
                    newAgent={!agent?.id}
                    refreshKey={savedAt}
                    runStatuses={agentRunStatuses}
                  />
                )}
                {agent?.id && (
                  <Tooltip label="New agent">
                    <ActionIcon
                      component={Link}
                      to={routes.newAgentEditor(workspaceId)}
                      variant="default"
                      style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
                    >
                      <IconPlus size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Tabs.Panel>
            )}

            <Tabs.Panel value="git" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <GitTab agent={agent} savedAt={savedAt} onReloadAgent={onReloadAgent} />
            </Tabs.Panel>
          </Tabs>
        </>
      </Box>

      {/* Resize handle */}
      <Box
        onMouseDown={handleResizeStart}
        style={{
          width: 8,
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Box
          style={{
            width: 4,
            height: 40,
            borderRadius: 2,
            backgroundColor: 'var(--mantine-color-default-border)',
          }}
        />
      </Box>
    </Box>
  );
},
(prevProps, { isNodesDragging, ...rest }) => {  
  // Skip re-render while actively dragging nodes (performance optimization)
  if (isNodesDragging) return true
  // When not dragging, do shallow comparison of relevant props
  return Object.entries(rest).every( ([restKey, restVal]) => (
      restVal === prevProps[restKey as keyof typeof prevProps]
    ))
  }
);
