import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Row, Col, Button, Tooltip } from 'antd';
import { DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useMoney, useDate } from '@/settings';
import calculate from '@/utils/calculate';
import { request } from '@/request';
import MerchCompleteAsync from '@/components/MerchCompleteAsync';

export default function ItemRow({ field, remove, current, formType = 'default' }) {
  const [totalState, setTotal] = useState(0);
  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState(0);

  // Check if this form is for Purchase Order - used for conditional rendering
  const isPurchaseOrder = formType === 'purchaseOrder';

  const money = useMoney();
  
  // Get form instance using Form.useFormInstance hook
  const form = Form.useFormInstance();

  const updateQt = (value) => {
    const numValue = Number(value) || 0;
    setQuantity(numValue);
    
    const currentPrice = price || form?.getFieldValue(['items', field.name, 'price']) || 0;
    updateTotal(numValue, currentPrice);
  };
  
  const updatePrice = (value) => {
    const numValue = Number(value) || 0;
    setPrice(numValue);
    
    const currentQuantity = quantity || form?.getFieldValue(['items', field.name, 'quantity']) || 0;
    updateTotal(currentQuantity, numValue);
  };

  const updateTotal = (qty, prc) => {
    const currentTotal = calculate.multiply(qty, prc);
    setTotal(currentTotal);
    
    if (form) {
      // Update the form values
      setTimeout(() => {
        const itemsField = form.getFieldValue('items') || [];
        if (itemsField[field.name]) {
          // Directly setting the total in the form
          form.setFieldValue(['items', field.name, 'total'], currentTotal);
        }
      }, 0);
    }
  };

  useEffect(() => {
    if (current) {
      // When it accesses the /payment/ endpoint,
      // it receives an invoice.item instead of just item
      // and breaks the code, but now we can check if items exists,
      // and if it doesn't we can access invoice.items.

      const { items, invoice } = current;

      if (invoice) {
        const item = invoice[field.name];

        if (item) {
          const itemQuantity = Number(item.quantity) || 0;
          const itemPrice = Number(item.price) || 0;
          
          setQuantity(itemQuantity);
          setPrice(itemPrice);
          
          const itemTotal = calculate.multiply(itemQuantity, itemPrice);
          setTotal(itemTotal);
          
          // Set the form values
          if (form) {
            // 确保设置所有字段值，包括laser
            form.setFieldValue(['items', field.name, 'total'], itemTotal);
            
            // 如果是PO且有laser字段，则设置laser的值
            if (isPurchaseOrder && item.laser !== undefined) {
              console.log('Setting laser value:', item.laser);
              form.setFieldValue(['items', field.name, 'laser'], item.laser);
            }
          }
        }
      } else {
        const item = items?.[field.name];

        if (item) {
          const itemQuantity = Number(item.quantity) || 0;
          const itemPrice = Number(item.price) || 0;
          
          setQuantity(itemQuantity);
          setPrice(itemPrice);
          
          const itemTotal = calculate.multiply(itemQuantity, itemPrice);
          setTotal(itemTotal);
          
          // Set the form values
          if (form) {
            // 确保设置所有字段值，包括laser
            form.setFieldValue(['items', field.name, 'total'], itemTotal);
            
            // 如果是PO且有laser字段，则设置laser的值
            if (isPurchaseOrder && item.laser !== undefined) {
              console.log('Setting laser value:', item.laser);
              form.setFieldValue(['items', field.name, 'laser'], item.laser);
            }
          }
        }
      }
    }
  }, [current, form]);

  // Calculate total whenever quantity or price changes
  useEffect(() => {
    const currentTotal = calculate.multiply(quantity, price);
    setTotal(currentTotal);
    
    // Update the form value
    if (form && quantity > 0 && price > 0) {
      form.setFieldValue(['items', field.name, 'total'], currentTotal);
    }
  }, [quantity, price, field.name, form]);

  const handleMerchSelect = (selectedMerch) => {
    console.log('Selected Merch:', selectedMerch);
    
    if (!form) {
      console.error('Form instance not found');
      return;
    }

    // Get the items array from the form
    const items = form.getFieldValue('items');
    
    // 获取当前的laser值，如果存在的话
    const currentLaser = items[field.name]?.laser || '';
    
    // Update the specific item in the items array
    items[field.name] = {
      ...items[field.name],
      itemName: selectedMerch.serialNumber,
      // Use Chinese description for PO and English for others
      description: isPurchaseOrder 
        ? (selectedMerch.description_cn || '') 
        : (selectedMerch.description_en || '')
    };
    
    // 如果是PO，保留之前的laser值
    if (isPurchaseOrder) {
      items[field.name].laser = currentLaser;
    }

    // Set the entire items array back to the form
    form.setFieldsValue({ items });

    console.log('Updated form values:', form.getFieldsValue());
  };

  // Calculate column widths based on form type
  const getColumnWidths = () => {
    if (isPurchaseOrder) {
      return {
        itemName: 7,
        description: 7,
        laser: 3,
        quantity: 2,
        price: 2,
        total: 3
      };
    } else {
      return {
        itemName: 8,
        description: 8,
        quantity: 2,
        price: 3,
        total: 3
      };
    }
  };

  const columnWidths = getColumnWidths();

  return (
    <Row 
      gutter={[12, 12]} 
      style={{ 
        position: 'relative',
        padding: '12px 0',
        borderBottom: '1px dashed #f0f0f0',
        alignItems: 'center'
      }}
    >
      <Col className="gutter-row" span={columnWidths.itemName}>
        <Form.Item
          {...field}
          validateTrigger={['onChange', 'onBlur']}
          name={[field.name, 'itemName']}
          rules={[{ required: true, message: 'Item name is required' }]}
          style={{ marginBottom: 0 }}
        >
          <MerchCompleteAsync
            entity="merch"
            displayLabels={['serialNumber']}
            searchFields="serialNumber"
            outputValue="serialNumber"
            onItemSelect={handleMerchSelect}
            placeholder="Select or enter item name"
          />
        </Form.Item>
      </Col>
      <Col className="gutter-row" span={columnWidths.description}>
        <Form.Item
          {...field}
          validateTrigger={['onChange', 'onBlur']}
          name={[field.name, 'description']}
          style={{ marginBottom: 0 }}
        >
          <Input.TextArea
            rows={1}
            style={{ minHeight: '32px' }}
            placeholder={isPurchaseOrder ? "中文描述" : "Item description"}
          />
        </Form.Item>
      </Col>
      
      {isPurchaseOrder && (
        <Col className="gutter-row" span={columnWidths.laser}>
          <Form.Item
            {...field}
            validateTrigger={['onChange', 'onBlur']}
            name={[field.name, 'laser']}
            style={{ marginBottom: 0 }}
          >
            <Input 
              placeholder="激光标记"
            />
          </Form.Item>
        </Col>
      )}
      
      <Col className="gutter-row" span={columnWidths.quantity} style={{ textAlign: 'center' }}>
        <Form.Item 
          name={[field.name, 'quantity']} 
          rules={[{ required: true, message: 'Quantity is required' }]}
          style={{ marginBottom: 0 }}
        >
          <InputNumber 
            style={{ width: '100%' }} 
            min={1} 
            onChange={updateQt} 
            placeholder="Qty"
            precision={0}
          />
        </Form.Item>
      </Col>
      <Col className="gutter-row" span={columnWidths.price} style={{ textAlign: 'right' }}>
        <Form.Item 
          name={[field.name, 'price']} 
          rules={[{ required: true, message: 'Price is required' }]}
          style={{ marginBottom: 0 }}
        >
          <InputNumber
            className="moneyInput"
            onChange={updatePrice}
            min={0}
            precision={2}
            controls={false}
            addonAfter={money.currency_position === 'after' ? money.currency_symbol : undefined}
            addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
            style={{ width: '100%' }}
            placeholder="Price"
          />
        </Form.Item>
      </Col>
      <Col className="gutter-row" span={columnWidths.total} style={{ textAlign: 'right' }}>
        <InputNumber
          readOnly
          className="moneyInput"
          value={totalState}
          min={0}
          precision={2}
          controls={false}
          addonAfter={money.currency_position === 'after' ? money.currency_symbol : undefined}
          addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
          formatter={(value) =>
            money.amountFormatter({ amount: value, currency_code: money.currency_code })
          }
          style={{ width: '100%', fontWeight: 'bold' }}
        />
      </Col>

      <Col flex="none">
        <Tooltip title="Remove item">
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => remove(field.name)} 
            style={{ marginLeft: '8px' }}
          />
        </Tooltip>
      </Col>
    </Row>
  );
}
