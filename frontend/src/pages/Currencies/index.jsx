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
      title: translate('Currency Position'),
      dataIndex: 'currency_position',
    },
    {
      title: translate('Decimal Separator'),
      dataIndex: 'decimal_separator',
    },
    {
      title: translate('Thousand Separator'),
      dataIndex: 'thousand_separator',
    },
    {
      title: translate('Cent Precision'),
      dataIndex: 'cent_precision',
    },
    {
      title: translate('Zero Format'),
      dataIndex: 'zero_format',
      render: (zero_format) => (
        <Switch
          checked={zero_format}
          checkedChildren={<CheckOutlined />}
          unCheckedChildren={<CloseOutlined />}
          disabled
        />
      ),
    },
    {
      title: translate('Default'),
      dataIndex: 'is_default',
      render: (is_default) => (
        <Switch
          checked={is_default}
          checkedChildren={<CheckOutlined />}
          unCheckedChildren={<CloseOutlined />}
          disabled
        />
      ),
    },
    {
      title: translate('Enabled'),
      dataIndex: 'enabled',
      render: (enabled) => (
        <Switch
          checked={enabled}
          checkedChildren={<CheckOutlined />}
          unCheckedChildren={<CloseOutlined />}
          disabled
        />
      ),
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
      title: translate('Currency Position'),
      dataIndex: 'currency_position',
    },
    {
      title: translate('Decimal Separator'),
      dataIndex: 'decimal_separator',
    },
    {
      title: translate('Thousand Separator'),
      dataIndex: 'thousand_separator',
    },
    {
      title: translate('Cent Precision'),
      dataIndex: 'cent_precision',
    },
    {
      title: translate('Zero Format'),
      dataIndex: 'zero_format',
      render: (_, record) => (
        <Switch
          checked={record.zero_format}
          checkedChildren={<CheckOutlined />}
          unCheckedChildren={<CloseOutlined />}
        />
      ),
    },
    {
      title: translate('Default'),
      dataIndex: 'is_default',
      render: (_, record) => (
        <Switch
          checked={record.is_default}
          checkedChildren={<CheckOutlined />}
          unCheckedChildren={<CloseOutlined />}
        />
      ),
    },
    {
      title: translate('Enabled'),
      dataIndex: 'enabled',
      key: 'enabled',
      onCell: (record, rowIndex) => ({
        props: {
          style: {
            width: '60px',
          },
        },
      }),
      render: (_, record) => (
        <Switch
          checked={record.enabled}
          checkedChildren={<CheckOutlined />}
          unCheckedChildren={<CloseOutlined />}
        />
      ),
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
