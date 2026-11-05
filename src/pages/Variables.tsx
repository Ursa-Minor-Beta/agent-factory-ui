import { VariablesList } from '../components/Variables';

export function VariablesPage() {
  return <VariablesList
            description='Store plain-text variables for use in any node input with {{var:NAME}} syntax'
            />;
}
