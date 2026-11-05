import { Alert, Center, Loader, Modal, Stack } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useRunDetailsModal } from './useRunDetailsModal';
import { useRunDetails } from './useRunDetails';
import { RunDetailsTitle } from './RunDetailsTitle';
import { RunSummaryCard, RunInputOutput } from './RunSummaryCard';
import { NodeStatesSection } from './NodeStatesSection';
import { ChildRunsSection } from './ChildRunsSection';

export function RunDetailsModal() {
  const { runId, isOpen, closeRunDetails, showBackButton, trail, goBack } = useRunDetailsModal();
  const { run, loading, error, cancelling, refresh, cancel } = useRunDetails(runId, isOpen);
  // Breadcrumb trail for child runs opened from this run
  const childTrail = run ? [...trail, { id: run.id, name: run.agentName || run.agentId }] : trail;

  return (
    <Modal
      opened={isOpen}
      onClose={closeRunDetails}
      title={
        <RunDetailsTitle
          run={run}
          trail={trail}
          showBackButton={showBackButton}
          onBack={goBack}
          loading={loading}
          cancelling={cancelling}
          onRefresh={refresh}
          onCancel={cancel}
        />
      }
      fullScreen
    >
      {error ? (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          {error}
        </Alert>
      ) : !run ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : (
        <Stack gap="lg">
          <RunSummaryCard run={run} />
          <RunInputOutput run={run} />
          <NodeStatesSection run={run} childTrail={childTrail} />
          {!!run.childRuns?.length && <ChildRunsSection childRuns={run.childRuns} childTrail={childTrail} />}
        </Stack>
      )}
    </Modal>
  );
}
