import { ErpLayout } from '@/layout';
import ErpPanel from '@/modules/ErpPanelModule';
import useLanguage from '@/locale/useLanguage';
import { FileTextOutlined } from '@ant-design/icons';

export default function ComparisonDataTableModule({ config }) {
  const translate = useLanguage();
  return (
    <ErpLayout>
      <ErpPanel
        config={config}
        extra={[
          {
            label: translate('Show Details'),
            key: 'read',
            icon: <FileTextOutlined />,
          },
        ]}
      ></ErpPanel>
    </ErpLayout>
  );
} 