import { SecretsList } from '../../components/Secrets';

interface WorkspaceSecretsProps {
  workspaceId: string;
}

export function WorkspaceSecrets({ workspaceId }: WorkspaceSecretsProps) {
  return (
    <SecretsList
      workspaceId={workspaceId}
      description="Workspace scoped Encrypted secrets. For use with {{secret:NAME}} syntax"
      showSearch={false}
      columns={['name', 'value', 'description', 'created', 'actions']}
    />
  );
}
