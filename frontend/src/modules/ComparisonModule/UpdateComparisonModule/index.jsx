import { ErpLayout } from '@/layout';
import UpdateItem from '@/modules/ErpPanelModule/UpdateItem';
import ComparisonForm from '@/modules/ComparisonModule/Forms/ComparisonForm';

export default function UpdateComparisonModule({ config }) {
  return (
    <ErpLayout>
      <UpdateItem config={config} UpdateForm={ComparisonForm} />
    </ErpLayout>
  );
} 