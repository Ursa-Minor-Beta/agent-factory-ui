import { ProvidersList } from '../../components/Providers';

interface WorkspaceProvidersProps {
  workspaceId: string;
}

export function WorkspaceProviders({ workspaceId }: WorkspaceProvidersProps) {
  return (
    <ProvidersList
      workspaceId={workspaceId}
      description="Workspace scoped LLM providers"
      showSearch={false}
      columns={['name', 'provider', 'apiKey', 'baseUrl', 'default', 'actions']}
    />
  );
}
