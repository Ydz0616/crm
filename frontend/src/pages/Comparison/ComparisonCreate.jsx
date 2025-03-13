import useLanguage from '@/locale/useLanguage';
import CreateComparisonModule from '@/modules/ComparisonModule/CreateComparisonModule';

export default function ComparisonCreate() {
  const translate = useLanguage();

  const entity = 'comparison';

  const Labels = {
    PANEL_TITLE: translate('comparison'),
    DATATABLE_TITLE: translate('comparison_list'),
    ADD_NEW_ENTITY: translate('add_new_comparison'),
    ENTITY_NAME: translate('comparison'),
  };

  const configPage = {
    entity,
    ...Labels,
  };
  return <CreateComparisonModule config={configPage} />;
} 