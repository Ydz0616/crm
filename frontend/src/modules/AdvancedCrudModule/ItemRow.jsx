import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Row, Col, Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useMoney } from '@/settings';
import calculate from '@/utils/calculate';
import MerchCompleteAsync from '@/components/MerchCompleteAsync';

export default function ItemRow({ field, remove, current = null }) {
  const [totalState, setTotal] = useState(undefined);
  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [unitLabels, setUnitLabels] = useState({ en: '', cn: '' });

  const money = useMoney();
  
  const updateQt = (value) => {
    setQuantity(value);
  };
  
  const updatePrice = (value) => {
    setPrice(value);
  };

  useEffect(() => {
    if (current) {
      // When it accesses the /payment/ endpoint,
      // it receives an invoice.item instead of just item
      // and breaks the code, but now we can check if items exists,
      // and if it doesn't we can access invoice.items.

      const { items, invoice } = current;

      if (invoice) {
        const item = invoice[field.fieldKey];

        if (item) {
          setQuantity(item.quantity);
          setPrice(item.price);
          
          if (item.unit_en || item.unit_cn) {
            setUnitLabels({
              en: item.unit_en || '',
              cn: item.unit_cn || ''
            });
          }
        }
      } else {
        const item = items[field.fieldKey];

        if (item) {
          setQuantity(item.quantity);
          setPrice(item.price);
          
          if (item.unit_en || item.unit_cn) {
            setUnitLabels({
              en: item.unit_en || '',
              cn: item.unit_cn || ''
            });
          }
        }
      }
    }
  }, [current]);

  useEffect(() => {
    const currentTotal = calculate.multiply(price, quantity);
    setTotal(currentTotal);
  }, [price, quantity]);

  const handleMerchSelect = (selectedMerch) => {
    console.log('Selected Merch:', selectedMerch);
    
    const form = field.form;
    if (!form) {
      console.error('Form instance not found');
      return;
    }

    if (selectedMerch.unit_en || selectedMerch.unit_cn) {
      setUnitLabels({
        en: selectedMerch.unit_en || '',
        cn: selectedMerch.unit_cn || ''
      });
      
      form.setFieldValue([field.name, 'unit_en'], selectedMerch.unit_en || '');
      form.setFieldValue([field.name, 'unit_cn'], selectedMerch.unit_cn || '');
    }
  };
  
  const columnWidths = {
    itemName: 6,
    description: 7,
    quantity: 2,
    price: 3,
    total: 3,
    deleteBtn: 1
  };
  
  return (
    <Row gutter={[12, 12]} style={{ 
      position: 'relative', 
      padding: '6px 0', 
      borderBottom: '1px dashed #f0f0f0',
      alignItems: 'center',
      whiteSpace: 'nowrap',
      overflow: 'hidden'
    }}>
      <Col className="gutter-row" span={columnWidths.itemName}>
        <Form.Item
          name={[field.name, 'itemName']}
          rules={[
            {
              required: true,
              message: 'Required'
            },
            {
              pattern: /^(?!\s*$)[\s\S]+$/, // Regular expression to allow spaces, alphanumeric, and special characters, but not just spaces
              message: 'Cannot be empty'
            },
          ]}
          style={{ marginBottom: 0 }}
        >
          <MerchCompleteAsync
            entity="merch"
            displayLabels={['serialNumber']}
            searchFields="serialNumber"
            outputValue="serialNumber"
            onItemSelect={handleMerchSelect}
            placeholder="Item Name"
          />
        </Form.Item>
      </Col>
      
      <Col className="gutter-row" span={columnWidths.description}>
        <Form.Item 
          name={[field.name, 'description']}
          style={{ marginBottom: 0 }}
        >
          <Input placeholder="Description" />
        </Form.Item>
      </Col>
      
      <Col className="gutter-row" span={columnWidths.quantity}>
        <Form.Item 
          name={[field.name, 'quantity']} 
          rules={[{ required: true, message: 'Required' }]}
          style={{ marginBottom: 0 }}
        >
          <InputNumber 
            style={{ width: '100%' }} 
            min={0} 
            onChange={updateQt}
            placeholder="Qty"
          />
        </Form.Item>
      </Col>
      
      {/* Hidden form items for storing unit values */}
      <Form.Item
        name={[field.name, 'unit_en']}
        hidden
      />
      <Form.Item
        name={[field.name, 'unit_cn']}
        hidden
      />
      
      <Col className="gutter-row" span={columnWidths.price}>
        <Form.Item 
          name={[field.name, 'price']} 
          rules={[{ required: true, message: 'Required' }]}
          style={{ marginBottom: 0 }}
        >
          <InputNumber
            className="moneyInput"
            onChange={updatePrice}
            min={0}
            controls={false}
            addonAfter={money.currency_position === 'after' ? money.currency_symbol : undefined}
            addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
            placeholder="Price"
          />
        </Form.Item>
      </Col>
      
      <Col className="gutter-row" span={columnWidths.total}>
        <Form.Item 
          name={[field.name, 'total']}
          style={{ marginBottom: 0 }}
        >
          <InputNumber
            readOnly
            className="moneyInput"
            value={totalState}
            min={0}
            controls={false}
            addonAfter={money.currency_position === 'after' ? money.currency_symbol : undefined}
            addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
            formatter={(value) => money.amountFormatter({ amount: value })}
          />
        </Form.Item>
      </Col>

      <Col className="gutter-row" span={columnWidths.deleteBtn}>
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => remove(field.name)}
          style={{ marginLeft: '8px' }}
        />
      </Col>
    </Row>
  );
}
