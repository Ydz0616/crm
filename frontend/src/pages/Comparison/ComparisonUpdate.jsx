import useLanguage from '@/locale/useLanguage';
import UpdateComparisonModule from '@/modules/ComparisonModule/UpdateComparisonModule';

export default function ComparisonUpdate() {
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
  return <UpdateComparisonModule config={configPage} />;
} 