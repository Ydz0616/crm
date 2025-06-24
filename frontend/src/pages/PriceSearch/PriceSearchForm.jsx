import React, { useState } from 'react';
import { Form, Input, Button, DatePicker, Row, Col, message } from 'antd';
import { SearchOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';
import { request } from '@/request';
import SelectAsync from '@/components/SelectAsync';
import MerchCompleteAsync from '@/components/MerchCompleteAsync';

const { RangePicker } = DatePicker;

// 单个商品行组件
const ItemRow = ({ field, remove }) => {
  const translate = useLanguage();
  
  return (
    <Row gutter={16} style={{ marginBottom: '10px' }}>
      <Col xs={20} sm={20} md={22}>
        <Form.Item
          name={[field.name, 'itemName']}
          rules={[{ required: true, message: translate('Please enter item serial number') }]}
          style={{ marginBottom: 0 }}
        >
          <MerchCompleteAsync
            entity="merch"
            displayLabels={['serialNumber']}
            searchFields="serialNumber"
            outputValue="serialNumber"
            placeholder={translate('Enter item serial number')}
          />
        </Form.Item>
      </Col>
      <Col xs={4} sm={4} md={2}>
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => remove(field.name)}
        />
      </Col>
    </Row>
  );
};

const PriceSearchForm = ({ onSearchResults, setLoading }) => {
  const translate = useLanguage();
  const [form] = Form.useForm();

  const handleSearch = async (values) => {
    try {
      setLoading(true);
      
      // 处理商品序列号数组
      const itemNames = values.items.map(item => item.itemName).filter(Boolean);
      
      if (itemNames.length === 0) {
        message.error('请输入至少一个商品序列号');
        setLoading(false);
        return;
      }
      
      // 准备日期范围
      let startDate = null;
      let endDate = null;
      
      if (values.dateRange && values.dateRange.length === 2) {
        startDate = values.dateRange[0].format('YYYY-MM-DD');
        endDate = values.dateRange[1].format('YYYY-MM-DD');
      }
      
      // 发送请求
      const response = await request.post({
        entity: '/priceSearch/history',
        jsonData: {
          clientId: values.clientId,
          itemNames: itemNames,
          startDate: startDate,
          endDate: endDate
        }
      });
      
      if (response.success) {
        onSearchResults(response.result.items, response.result.logs);
        message.success('搜索完成');
      } else {
        message.error(response.message || '搜索失败');
      }
    } catch (error) {
      console.error('搜索出错:', error);
      message.error('搜索过程中出错');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSearch}
      style={{ marginBottom: 24 }}
      initialValues={{
        items: [{}] // 初始化一个空行
      }}
    >
      <Row gutter={16}>
        <Col xs={24} sm={24} md={12}>
          <Form.Item
            name="clientId"
            label={translate('select_client')}
            rules={[{ required: true, message: translate('Please select a client') }]}
          >
            <SelectAsync
              entity="client"
              displayLabels={['name']}
              searchFields="name"
              outputValue="_id"
            />
          </Form.Item>
        </Col>
        
        <Col xs={24} sm={24} md={12}>
          <Form.Item
            name="dateRange"
            label={translate('date_range')}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
      
      <div style={{ marginBottom: '10px' }}>
        <Row gutter={[12, 0]} style={{ fontWeight: 'bold', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
          <Col span={22}>{translate('item_serial_numbers')}</Col>
          <Col span={2}></Col>
        </Row>
      </div>
      
      <Form.List name="items">
        {(fields, { add, remove }) => (
          <>
            {fields.map(field => (
              <ItemRow 
                key={field.key} 
                field={field} 
                remove={remove} 
              />
            ))}
            <Form.Item>
              <Button
                type="dashed"
                onClick={() => add()}
                style={{ width: '100%', marginTop: '10px' }}
                icon={<PlusOutlined />}
              >
                {translate('Add Item')}
              </Button>
            </Form.Item>
          </>
        )}
      </Form.List>
      
      <Form.Item>
        <Button 
          type="primary" 
          htmlType="submit" 
          icon={<SearchOutlined />}
        >
          Search
        </Button>
      </Form.Item>
    </Form>
  );
};

export default PriceSearchForm; 