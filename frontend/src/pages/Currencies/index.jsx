import React from 'react';

import useLanguage from '@/locale/useLanguage';

import { Switch } from 'antd';
import { CloseOutlined, CheckOutlined } from '@ant-design/icons';
import CrudModule from '@/modules/CrudModule/CrudModule';
import CurrencyForm from '@/forms/CurrencyForm';

export default function Currencies() {
  const translate = useLanguage();
  const entity = 'currencies';
  const searchConfig = {
    displayLabels: ['currency_name'],
    searchFields: 'currency_name',
    outputValue: '_id',
  };

  const deleteModalLabels = ['currency_name'];

  const readColumns = [
    {
      title: translate('Currency Name'),
      dataIndex: 'currency_name',
    },
    {
      title: translate('Currency Code'),
      dataIndex: 'currency_code',
    },
    {
      title: translate('Currency Symbol'),
      dataIndex: 'currency_symbol',
    },
    {
      title: translate('Enabled'),
      dataIndex: 'enabled',
    },
  ];

  const dataTableColumns = [
    {
      title: translate('Currency Name'),
      dataIndex: 'currency_name',
    },
    {
      title: translate('Currency Code'),
      dataIndex: 'currency_code',
    },
    {
      title: translate('Currency Symbol'),
      dataIndex: 'currency_symbol',
    },
    {
      title: translate('Enabled'),
      dataIndex: 'enabled',
      key: 'enabled',
      onCell: (record, rowIndex) => {
        return {
          props: {
            style: {
              width: '60px',
            },
          },
        };
      },
      render: (_, record) => {
        return (
          <Switch
            checked={record.enabled}
            checkedChildren={<CheckOutlined />}
            unCheckedChildren={<CloseOutlined />}
          />
        );
      },
    },
  ];

  const Labels = {
    PANEL_TITLE: translate('currencies'),
    DATATABLE_TITLE: translate('currencies_list'),
    ADD_NEW_ENTITY: translate('add_new_currency'),
    ENTITY_NAME: translate('currencies'),
  };

  const configPage = {
    entity,
    ...Labels,
  };

  const config = {
    ...configPage,
    readColumns,
    dataTableColumns,
    searchConfig,
    deleteModalLabels,
  };

  return (
    <CrudModule
      createForm={<CurrencyForm />}
      updateForm={<CurrencyForm isUpdateForm={true} />}
      config={config}
    />
  );
}
