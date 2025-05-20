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
  const [unitLabels, setUnitLabels] = useState({ en: '', cn: '' });

  // Check if this form is for Purchase Order or Invoice - used for conditional rendering
  const isPurchaseOrder = formType === 'purchaseOrder';
  const isInvoice = formType === 'invoice';
  const showLaser = isPurchaseOrder || isInvoice;

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
            
            // Set unit values if they exist
            if (item.unit_en) {
              form.setFieldValue(['items', field.name, 'unit_en'], item.unit_en);
            }
            if (item.unit_cn) {
              form.setFieldValue(['items', field.name, 'unit_cn'], item.unit_cn);
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
            
            // Set unit values if they exist
            if (item.unit_en) {
              form.setFieldValue(['items', field.name, 'unit_en'], item.unit_en);
            }
            if (item.unit_cn) {
              form.setFieldValue(['items', field.name, 'unit_cn'], item.unit_cn);
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
      // Use appropriate description based on form type
      description: isPurchaseOrder 
        ? (selectedMerch.description_cn || '') 
        : (selectedMerch.description_en || ''),
      // 存储单位信息 - Always store both unit values regardless of form type
      unit_en: selectedMerch.unit_en || '',
      unit_cn: selectedMerch.unit_cn || ''
    };
    
    // 更新单位显示状态 (for internal tracking, even if not displayed)
    setUnitLabels({
      en: selectedMerch.unit_en || '',
      cn: selectedMerch.unit_cn || ''
    });
    
    // 如果是PO或Invoice，保留之前的laser值
    if (showLaser) {
      items[field.name].laser = currentLaser;
    }

    // Set the entire items array back to the form
    form.setFieldsValue({ items });

    console.log('Updated form values:', form.getFieldsValue());
  };

  // Calculate column widths based on form type
  const getColumnWidths = () => {
    if (showLaser) {
      return {
        itemName: 5, 
        description: 5, 
        laser: 3,
        quantity: 2,    // 减小数量列的宽度
        price: 3,       // 价格列宽度为3
        total: 3,
        deleteBtn: 1    // 为删除按钮预留空间
      };
    } else {
      return {
        itemName: 6, 
        description: 7, 
        quantity: 2,    // 减小数量列的宽度
        price: 3,       // 价格列宽度为3
        total: 3,
        deleteBtn: 1    // 为删除按钮预留空间
      };
    }
  };

  const columnWidths = getColumnWidths();

  return (
    <Row 
      gutter={[12, 12]} 
      style={{ 
        position: 'relative',
        padding: '6px 0', 
        borderBottom: '1px dashed #f0f0f0',
        alignItems: 'center',
        whiteSpace: 'nowrap', 
        overflow: 'hidden' 
      }}
    >
      <Col className="gutter-row" span={columnWidths.itemName}>
        <Form.Item
          {...field}
          validateTrigger={['onChange', 'onBlur']}
          name={[field.name, 'itemName']}
          rules={[{ required: true, message: 'Required' }]}
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
          {...field}
          validateTrigger={['onChange', 'onBlur']}
          name={[field.name, 'description']}
          style={{ marginBottom: 0 }}
        >
          <Input
            style={{ minHeight: '32px' }}
            placeholder={isPurchaseOrder ? "中文描述" : "Description"}
          />
        </Form.Item>
      </Col>
      
      {showLaser && (
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
      
      <Col className="gutter-row" span={columnWidths.quantity}>
        <Form.Item
          {...field}
          validateTrigger={['onChange', 'onBlur']}
          name={[field.name, 'quantity']}
          rules={[{ required: true, message: 'Required' }]}
          style={{ marginBottom: 0 }}
        >
          <InputNumber
            min={0}
            style={{ width: '100%' }}
            placeholder="Qty"
            onChange={updateQt}
          />
        </Form.Item>
      </Col>
      
      {/* Hidden form items for storing unit values */}
      <Form.Item
        {...field}
        hidden
        name={[field.name, 'unit_en']}
        style={{ marginBottom: 0 }}
      />
      <Form.Item
        {...field}
        hidden
        name={[field.name, 'unit_cn']}
        style={{ marginBottom: 0 }}
      />
      
      <Col className="gutter-row" span={columnWidths.price}>
        <Form.Item
          {...field}
          validateTrigger={['onChange', 'onBlur']}
          name={[field.name, 'price']}
          rules={[{ required: true, message: 'Required' }]}
          style={{ marginBottom: 0 }}
        >
          <InputNumber
            className="moneyInput"
            min={0}
            style={{ width: '100%' }}
            placeholder="Price"
            onChange={updatePrice}
            controls={false}
            addonAfter={money.currency_position === 'after' ? money.currency_symbol : undefined}
            addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
          />
        </Form.Item>
      </Col>
      
      <Col className="gutter-row" span={columnWidths.total}>
        <Form.Item
          {...field}
          name={[field.name, 'total']}
          style={{ marginBottom: 0 }}
        >
          <InputNumber
            className="moneyInput"
            min={0}
            readOnly
            style={{ width: '100%' }}
            value={totalState}
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
