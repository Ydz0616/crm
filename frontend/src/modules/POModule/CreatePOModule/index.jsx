import { ErpLayout } from '@/layout';
import CreateItem from '@/modules/ErpPanelModule/CreateItem';
import POForm from '@/modules/POModule/Forms/POForm';

export default function CreatePOModule({ config }) {
  return (
    <ErpLayout>
    <CreateItem config={config} CreateForm={POForm} />
    </ErpLayout>
  );
}


