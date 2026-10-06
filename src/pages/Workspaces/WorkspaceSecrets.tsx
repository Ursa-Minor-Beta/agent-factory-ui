import { SecretsList } from '../../components/Secrets';

interface WorkspaceSecretsProps {
  workspaceId: string;
}

export function WorkspaceSecrets({ workspaceId }: WorkspaceSecretsProps) {
  return (
    <SecretsList
      workspaceId={workspaceId}
      description="Workspace-scoped secrets for {{secret:NAME}} syntax. Falls back to global if not found."
      showSearch={false}
      columns={['name', 'value', 'description', 'created', 'actions']}
    />
  );
}
