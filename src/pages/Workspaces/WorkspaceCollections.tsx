import { CollectionsList } from '../../components/Collections';

interface WorkspaceCollectionsProps {
  workspaceId: string;
}

export function WorkspaceCollections({ workspaceId }: WorkspaceCollectionsProps) {
  return (
    <CollectionsList
      workspaceId={workspaceId}
      description="Workspace scoped Memory collections for storing structured data"
      showSearch={false}
      compact
    />
  );
}
