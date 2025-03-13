import useLanguage from '@/locale/useLanguage';
import ReadComparisonModule from '@/modules/ComparisonModule/ReadComparisonModule';

export default function ComparisonRead() {
  const translate = useLanguage();

  const entity = 'comparison';

  const Labels = {
    PANEL_TITLE: translate('comparison'),
    DATATABLE_TITLE: translate('comparison_list'),
    ENTITY_NAME: translate('comparison'),
  };

  const configPage = {
    entity,
    ...Labels,
  };
  return <ReadComparisonModule config={configPage} />;
} 