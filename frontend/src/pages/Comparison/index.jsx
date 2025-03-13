import useLanguage from '@/locale/useLanguage';
import ComparisonDataTableModule from '@/modules/ComparisonModule/ComparisonDataTableModule';
import dayjs from 'dayjs';
import { Tag } from 'antd';
import { tagColor } from '@/utils/statusTagColor';
import { useMoney, useDate } from '@/settings';

export default function Comparison() {
  const translate = useLanguage();
  const entity = 'comparison';
  const { dateFormat } = useDate();
  const { moneyFormatter } = useMoney();
  
  const searchConfig = {
    entity: 'client',
    displayLabels: ['name'],
    searchFields: 'name',
  };
  
  const deleteModalLabels = ['number', 'client.name'];
  
  const dataTableColumns = [
    {
      title: translate('Number'),
      dataIndex: 'number',
    },
    {
      title: translate('Client'),
      dataIndex: ['client', 'name'],
    },
    {
      title: translate('Date'),
      dataIndex: 'date',
      render: (date) => {
        return dayjs(date).format(dateFormat);
      },
    },
    {
      title: translate('Status'),
      dataIndex: 'status',
      render: (status) => {
        return <Tag color={tagColor(status)}>{translate(status)}</Tag>;
      },
    },
    {
      title: translate('Total'),
      dataIndex: 'total',
      onCell: () => {
        return {
          style: {
            textAlign: 'right',
            whiteSpace: 'nowrap',
            direction: 'ltr',
          },
        };
      },
      render: (total, record) => moneyFormatter({ amount: total, currency_code: record.currency }),
    },
  ];

  const Labels = {
    PANEL_TITLE: translate('comparison'),
    DATATABLE_TITLE: translate('comparison_list'),
    ADD_NEW_ENTITY: translate('add_new_comparison'),
    ENTITY_NAME: translate('comparison'),
  };

  const configPage = {
    entity,
    ...Labels,
    dataTableColumns,
    searchConfig,
    deleteModalLabels,
  };
  
  return <ComparisonDataTableModule config={configPage} />;
} 