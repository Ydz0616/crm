import { ErpLayout } from '@/layout';
import ReadItem from '@/modules/ErpPanelModule/ReadItem';
import useLanguage from '@/locale/useLanguage';

export default function ReadComparisonModule({ config }) {
  const translate = useLanguage();
  return (
    <ErpLayout>
      <ReadItem config={config} />
    </ErpLayout>
  );
} 