import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, message, InputNumber, Switch, Spin, Alert, Empty } from 'antd';
import { SearchOutlined, LinkOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';
import { request } from '@/request';
import SelectAsync from '@/components/SelectAsync';

const FullComparisonForm = ({ onComparisonResults, setLoading }) => {
  const translate = useLanguage();
  const [form] = Form.useForm();
  const [useCny, setUseCny] = useState(false);
  const [clientId, setClientId] = useState(null);
  const [clientName, setClientName] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [noInvoicesFound, setNoInvoicesFound] = useState(false);

  // 当客户选择变化时，加载该客户的发票
  useEffect(() => {
    const loadInvoices = async () => {
      if (!clientId) {
        setInvoices([]);
        setNoInvoicesFound(false);
        return;
      }

      setLoadingInvoices(true);
      setNoInvoicesFound(false);
      try {
        // 使用正确的过滤参数格式：filter=client&equal=clientId
        const response = await request.list({ 
          entity: 'invoice', 
          options: { 
            filter: 'client',
            equal: clientId
          } 
        });
        
        if (response.success) {
          setInvoices(response.result);
          if (response.result.length === 0) {
            setNoInvoicesFound(true);
          }
        } else {
          message.error('加载发票失败');
        }
      } catch (error) {
        console.error('加载发票出错:', error);
        message.error('加载发票过程中出错');
      } finally {
        setLoadingInvoices(false);
      }
    };

    loadInvoices();
  }, [clientId]);

  const handleClientChange = (value, option) => {
    setClientId(value);
    // 保存客户名称，用于显示
    if (option && option.label) {
      setClientName(option.label);
    }
    // 清除已选择的发票
    form.setFieldsValue({ invoiceId: undefined });
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      if (!values.invoiceId) {
        message.error('请选择一个发票');
        setLoading(false);
        return;
      }
      
      // 发送请求
      const response = await request.post({
        entity: '/comparison/fullComparison',
        jsonData: {
          invoiceId: values.invoiceId,
          exchangeRate: values.exchangeRate,
          conversionRate: values.conversionRate,
          useCny: values.useCny
        }
      });
      
      if (response.success) {
        onComparisonResults(response.result);
        message.success('比较计算完成');
      } else {
        message.error(response.message || '计算失败');
      }
    } catch (error) {
      console.error('比较计算出错:', error);
      message.error('计算过程中出错');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      style={{ marginBottom: 24 }}
      initialValues={{
        exchangeRate: 7,
        conversionRate: 7,
        useCny: false
      }}
    >
      <Row gutter={16} align="middle">
        <Col xs={24} sm={24} md={8}>
          <Form.Item
            name="clientId"
            label={translate('select_client')}
            rules={[{ required: true, message: translate('Please select a client') }]}
            tooltip={translate('First select a client to see their invoices')}
          >
            <SelectAsync
              entity="client"
              displayLabels={['name']}
              searchFields="name"
              outputValue="_id"
              onChange={handleClientChange}
              placeholder={translate('Select client first')}
            />
          </Form.Item>
        </Col>
        
        <Col xs={1} sm={1} md={1} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 5 }}>
          <LinkOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
        </Col>
        
        <Col xs={23} sm={23} md={7}>
          <Form.Item
            name="invoiceId"
            label={translate('select_invoice')}
            rules={[{ required: true, message: translate('Please select an invoice') }]}
            tooltip={clientId ? translate('Select invoice from this client') : translate('Please select a client first')}
          >
            <SelectAsync
              entity="invoice"
              displayLabels={['number']}
              searchFields="number"
              outputValue="_id"
              filters={{ client: clientId }}
              disabled={!clientId || loadingInvoices}
              notFoundContent={
                loadingInvoices ? <Spin size="small" /> : 
                noInvoicesFound ? <Empty description={`${translate('No invoices found for')} ${clientName}`} /> : null
              }
              placeholder={clientId ? translate('Select invoice') : translate('Select client first')}
            />
          </Form.Item>
        </Col>
        
        <Col xs={24} sm={24} md={8}>
          <Form.Item
            name="useCny"
            label={translate('use_cny')}
            valuePropName="checked"
          >
            <Switch 
              onChange={(checked) => {
                setUseCny(checked);
                form.setFieldsValue({ useCny: checked });
              }}
            />
          </Form.Item>
        </Col>
      </Row>
      
      {clientId && noInvoicesFound && (
        <Alert
          message={translate('No invoices found')}
          description={`${translate('No invoices found for client')}: ${clientName}`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="exchangeRate"
            label={translate('profit_calculation_rate')}
            rules={[{ required: !useCny, message: translate('Please enter exchange rate') }]}
            tooltip={translate('Used for profit margin calculation')}
            hidden={useCny}
          >
            <InputNumber
              min={0.01}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder={translate('Enter USD to CNY rate')}
              disabled={useCny}
            />
          </Form.Item>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="conversionRate"
            label={translate('total_conversion_rate')}
            rules={[{ required: !useCny, message: translate('Please enter conversion rate') }]}
            tooltip={translate('Used for converting invoice total to CNY')}
            hidden={useCny}
          >
            <InputNumber
              min={0.01}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder={translate('Enter USD to CNY rate')}
              disabled={useCny}
            />
          </Form.Item>
        </Col>
      </Row>
      
      <Form.Item>
        <Button 
          type="primary" 
          htmlType="submit" 
          icon={<SearchOutlined />}
          disabled={!clientId || noInvoicesFound}
        >
          {translate('Calculate')}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default FullComparisonForm; 