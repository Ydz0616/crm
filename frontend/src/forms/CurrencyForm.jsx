import React from 'react';
import { Switch, Form, Input, InputNumber } from 'antd';
import { CloseOutlined, CheckOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';

export default function CurrencyForm({ isUpdateForm = false }) {
  const translate = useLanguage();
  return (
    <>
    {/* name */}
      <Form.Item
        label={translate('Currency Name')}
        name="currency_name"
        rules={[
          {
            required: true,
            message: 'Please input currency name!',
          },
        ]}
      >
        <Input />
      </Form.Item>
      {/* code */}
      <Form.Item
        label={translate('Currency Code')}
        name="currency_code"
        rules={[
          {
            required: true,
            message: 'Please input currency code!',
          },
        ]}
      >
        <Input />


      </Form.Item>
      <Form.Item
        label={translate('CurrencySymbol')}
        name="currency_symbol"
        rules={[
          {
            required: true,
            message: 'Please input currency symbol!',
          },
        ]}
      >
        <Input />
      </Form.Item>
      
      <Form.Item
        label={translate('Decimal Separator')}
        name="decimal_separator"
        rules={[
          {
            required: true,
            message: 'Please input decimal separator!',
          },
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label={translate('Thousand Separator')}
        name="thousand_separator"
        rules={[
          {
            required: true,
            message: 'Please input thousand separator!',
          },
        ]}
      >
        <Input />
      </Form.Item>

      {/* cent precision */}
      <Form.Item
        label={translate('Cent Precision')}
        name="cent_precision"
        rules={[
          {
            required: true,
            message: 'Please input cent precision!',
          },
        ]}
      >
        <InputNumber />
      </Form.Item>

      {/* zero format */}
      <Form.Item
        label={translate('Zero Format')}
        name="zero_format"
        valuePropName="checked"
      >
        <Switch checkedChildren={<CheckOutlined />} unCheckedChildren={<CloseOutlined />} />
      </Form.Item>
      {/* enabled */}

      <Form.Item
        label={translate('enabled')}
        name="enabled"
        style={{
          display: 'inline-block',
          width: 'calc(50%)',
          paddingRight: '5px',
        }}
        valuePropName="checked"
        initialValue={true}
      >
        <Switch checkedChildren={<CheckOutlined />} unCheckedChildren={<CloseOutlined />} />
      </Form.Item>

      <Form.Item
        label={translate('Default')}
        name="isDefault"
        style={{
          display: 'inline-block',
          width: 'calc(50%)',
          paddingLeft: '5px',
        }}
        valuePropName="checked"
      >
        <Switch checkedChildren={<CheckOutlined />} unCheckedChildren={<CloseOutlined />} />
      </Form.Item>
    </>
  );
}
