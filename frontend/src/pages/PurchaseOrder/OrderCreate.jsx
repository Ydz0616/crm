import useLanguage from '@/locale/useLanguage';
import CreatePOModule from '@/modules/POModule/CreatePOModule';

export default function POCreate() {
  const translate = useLanguage();

  const entity = 'purchaseorder';

  const Labels = {
    PANEL_TITLE: translate('purchase_order'),
    DATATABLE_TITLE: translate('purchase_order_list'),
    ADD_NEW_ENTITY: translate('add_new_purchase_order'),
    ENTITY_NAME: translate('purchase_order'),
  };

  const configPage = {
    entity,
    ...Labels,
  };
  return <CreatePOModule config={configPage} />;
}
