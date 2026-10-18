import { Box, Loader, Alert, Center, Modal, Text, Group, Button } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';
import { ChatSidebar } from './ChatSidebar';
import { useAgentModal } from '../../components/AgentCreateModal';
import { useRunDetailsModal } from '../../components/RunDetailsModal';
import { useChatViewModel } from './viewmodels';

export function ChatPage() {
  const vm = useChatViewModel();
  const { openEditAgent } = useAgentModal();
  const { openRunDetails } = useRunDetailsModal();

  if (vm.agentLoading) {
    return (
      <Center style={{ height: '100%', minHeight: 400 }}>
        <Loader />
      </Center>
    );
  }

  if (!vm.agent) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="red">
        {vm.agentError || 'Agent not found'}
      </Alert>
    );
  }

  return (
    <Box
      style={{
        display: 'flex',
        height: '100vh',
        marginTop: 'calc(var(--app-shell-padding) * -1)',
        marginRight: 'calc(var(--app-shell-padding) * -1)',
        marginBottom: 'calc(var(--app-shell-padding) * -1)',
      }}
    >
      {/* Delete confirmation modal */}
      <Modal
        opened={!!vm.sessionToDelete}
        onClose={() => vm.setSessionToDelete(null)}
        title="Delete conversation"
        centered
        size="sm"
      >
        <Text size="sm" mb="lg">
          Are you sure you want to delete this conversation? This action cannot be undone.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={() => vm.setSessionToDelete(null)}>
            Cancel
          </Button>
          <Button color="red" onClick={vm.confirmDeleteSession}>
            Delete
          </Button>
        </Group>
      </Modal>

      {/* Sidebar */}
      <ChatSidebar
        sessions={vm.sessions}
        currentSessionId={vm.currentSessionId}
        loading={vm.sessionsLoading}
        onNewChat={vm.startNewChat}
        onSelectSession={vm.selectSession}
        onDeleteSession={vm.handleDeleteSession}
        onRenameSession={vm.renameSession}
        isMobile={vm.isMobile}
        isOpen={vm.sidebarOpen}
        onClose={() => vm.setSidebarOpen(false)}
      />

      {/* Main chat area */}
      <Box style={{ flex: 1, position: 'relative', minWidth: 0, overflow: 'hidden' }}>
        <ChatHeader
          agent={vm.agent}
          workspaceName={vm.workspaceName}
          isIncognito={vm.isIncognitoSession || (vm.isNewChat && vm.startIncognito)}
          isMobile={vm.isMobile}
          sidebarVisible={vm.sidebarOpen}
          onOpenSidebar={() => vm.setSidebarOpen(true)}
          onToggleSidebar={() => vm.setSidebarOpen(!vm.sidebarOpen)}
          onEditAgent={() => vm.agent && openEditAgent(vm.agent.id)}
        />

        <ChatMessages
          currentRunId={vm.currentRunId ?? undefined}
          messages={vm.messages}
          loading={vm.messagesLoading}
          sending={vm.sending}
          agentName={vm.agent.name}
          isNewChat={vm.isNewChat}
          isIncognito={vm.startIncognito}
          error={vm.error}
          errorRunId={vm.errorRunId}
          hasMore={vm.hasMoreMessages}
          loadingMore={vm.loadingMoreMessages}
          statusText={vm.statusText}
          inputHeight={vm.inputHeight}
          onClearError={vm.clearError}
          onRetry={vm.retry}
          onLoadMore={vm.loadMoreMessages}
          onViewRun={openRunDetails}
          onRepeat={vm.onRepeat}
        />

        <ChatInput
          isMobile={vm.isMobile}
          sending={vm.sending}
          inputSchema={vm.inputSchema}
          draftKey={vm.draftKey}
          onSend={vm.send}
          onCancel={vm.cancel}
          onHeightChange={vm.setInputHeight}
        />
      </Box>
    </Box>
  );
}
