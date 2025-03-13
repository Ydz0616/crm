import { ErpLayout } from '@/layout';
import CreateItem from '@/modules/ErpPanelModule/CreateItem';
import ComparisonForm from '@/modules/ComparisonModule/Forms/ComparisonForm';

export default function CreateComparisonModule({ config }) {
  return (
    <ErpLayout>
      <CreateItem config={config} CreateForm={ComparisonForm} />
    </ErpLayout>
  );
} 