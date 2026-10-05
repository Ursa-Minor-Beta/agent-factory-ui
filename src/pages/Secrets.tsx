import { SecretsList } from '../components/Secrets';

export function SecretsPage() {
  return <SecretsList 
            description='Store encrypted secrets for use in HTTP nodes with {{secret:NAME}} syntax'
            />;
}
