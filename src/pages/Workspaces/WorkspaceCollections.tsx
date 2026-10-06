import { CollectionsList } from '../../components/Collections';

interface WorkspaceCollectionsProps {
  workspaceId: string;
}

export function WorkspaceCollections({ workspaceId }: WorkspaceCollectionsProps) {
  return (
    <CollectionsList
      workspaceId={workspaceId}
      description="Workspace-scoped memory collections. Falls back to global if not found."
      showSearch={false}
      columns={['name', 'description', 'records', 'fields', 'created', 'actions']}
    />
  );
}
