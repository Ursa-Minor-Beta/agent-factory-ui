import { WebhooksList } from '../components/Webhooks';

export function WebhooksPage() {
  return <WebhooksList
            description='Public URLs that start an agent run on POST. The agent receives { body, headers, query } as input'
            />;
}
