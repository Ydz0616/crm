import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { Form, Input, InputNumber, Button, Select, Divider, Row, Col, Card, Typography } from 'antd';
import { PlusOutlined, ShoppingOutlined, CalendarOutlined, DollarOutlined, UserOutlined, DeleteOutlined } from '@ant-design/icons';
import { DatePicker } from 'antd';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import ItemRow from '@/modules/ErpPanelModule/ItemRow';
import MoneyInputFormItem from '@/components/MoneyInputFormItem';
import { selectFinanceSettings } from '@/redux/settings/selectors';
import { useDate, useMoney } from '@/settings';
import useLanguage from '@/locale/useLanguage';
import calculate from '@/utils/calculate';
import { useSelector } from 'react-redux';
import SelectCurrency from '@/components/SelectCurrency';

const { Title, Text } = Typography;

export default function InvoiceForm({ subTotal = 0, current = null }) {
  const { last_invoice_number } = useSelector(selectFinanceSettings);

  if (last_invoice_number === undefined) {
    return <></>;
  }

  return <LoadInvoiceForm subTotal={subTotal} current={current} />;
}

function LoadInvoiceForm({ subTotal = 0, current = null }) {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const { moneyFormatter } = useMoney();
  const { last_invoice_number } = useSelector(selectFinanceSettings);
  const [total, setTotal] = useState(0);
  const [freight, setFreight] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [lastNumber, setLastNumber] = useState(() => last_invoice_number + 1);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  
  const handleCurrencyChange = (value, currencyObject) => {
    console.log('Currency Change - Value:', value);
    console.log('Currency Change - Object:', currencyObject);
    
    if (currencyObject) {
      const newCurrency = {
        currency_symbol: currencyObject.currency_symbol,
        currency_position: currencyObject.currency_position,
        decimal_separator: currencyObject.decimal_separator,
        thousand_separator: currencyObject.thousand_separator,
        cent_precision: currencyObject.cent_precision
      };
      console.log('Setting new currency:', newCurrency);
      setSelectedCurrency(newCurrency);
    }
  };

  const handleFreightChange = (value) => {
    const freightValue = Number(value) || 0;
    setFreight(freightValue);
  };

  const handleDiscountChange = (value) => {
    const discountValue = Number(value) || 0;
    setDiscount(discountValue);
  };

  useEffect(() => {
    if (current) {
      const { year, number, freight = 0, discount = 0 } = current;
      setCurrentYear(year);
      setLastNumber(number);
      setFreight(freight);
      setDiscount(discount);
    }
  }, [current]);
  
  useEffect(() => {
    // 计算总价 = 小计 + 运费 - 折扣
    const freightTotal = calculate.add(subTotal, freight);
    const finalTotal = calculate.sub(freightTotal, discount);
    setTotal(Number.parseFloat(finalTotal));
  }, [subTotal, freight, discount]);

  const addField = useRef(false);

  useEffect(() => {
    addField.current.click();
  }, []);

  // 确保notes是一个数组，即使它在current中不存在或为null
  const initialNotes = Array.isArray(current?.notes) ? current.notes : [];

  return (
    <>
      <Card className="card-form" style={{ marginBottom: '16px' }}>
        <Title level={4}>
          <UserOutlined /> {translate('Invoice Information')}
        </Title>
        <Row gutter={[16, 16]}>
          <Col className="gutter-row" span={12}>
            <Form.Item
              name="client"
              label={translate('Client')}
              rules={[
                {
                  required: true,
                  message: translate('Please select a client'),
                },
              ]}
            >
              <AutoCompleteAsync
                entity={'client'}
                displayLabels={['name']}
                searchFields={'name'}
                redirectLabel={translate('Add New Client')}
                withRedirect
                urlToRedirect={'/customer'}
                placeholder={translate('Select or enter client')}
              />
            </Form.Item>
          </Col>
          <Col className="gutter-row" span={6}>
            <Form.Item
              label={translate('Invoice Number')}
              name="number"
              initialValue={lastNumber}
              rules={[
                {
                  required: true,
                  message: translate('Please enter an invoice number'),
                },
              ]}
            >
              <Input prefix="#" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col className="gutter-row" span={6}>
            <Form.Item
              label={translate('Year')}
              name="year"
              initialValue={currentYear}
              rules={[
                {
                  required: true,
                  message: translate('Please enter a year'),
                },
              ]}
            >
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col className="gutter-row" span={6}>
            <Form.Item
              label={translate('Status')}
              name="status"
              initialValue={'draft'}
            >
              <Select
                options={[
                  { value: 'draft', label: translate('Draft') },
                  { value: 'pending', label: translate('Pending') },
                  { value: 'sent', label: translate('Sent') },
                ]}
              />
            </Form.Item>
          </Col>
          <Col className="gutter-row" span={6}>
            <Form.Item
              name="currency"
              label={translate('Currency')}
              rules={[
                {
                  required: true,
                  message: translate('Please select currency'),
                },
              ]}
            >
              <SelectCurrency
                value={selectedCurrency}
                onChange={handleCurrencyChange}
                entity={'currencies'}
                outputValue={'currency_code'}
                displayLabels={['currency_symbol','currency_name']}
                withRedirect={true}
                urlToRedirect="/currencies"
                redirectLabel={translate('Add New Currency')}
                placeholder={translate('Select currency')}
              />
            </Form.Item>
          </Col>
          <Col className="gutter-row" span={6}>
            <Form.Item
              name="freight"
              label={translate('Freight')}
              initialValue={0}
              rules={[
                {
                  type: 'number',
                  message: translate('Please enter a valid freight amount'),
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                step={0.01}
                precision={2}
                min={0}
                onChange={handleFreightChange}
              />
            </Form.Item>
          </Col>
          <Col className="gutter-row" span={6}>
            <Form.Item
              name="discount"
              label={translate('Discount')}
              initialValue={0}
              rules={[
                {
                  type: 'number',
                  message: translate('Please enter a valid discount amount'),
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                step={0.01}
                precision={2}
                min={0}
                onChange={handleDiscountChange}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card className="card-form" style={{ marginBottom: '16px' }}>
        <Title level={4}>
          <CalendarOutlined /> {translate('Dates & Notes')}
        </Title>
        <Row gutter={[16, 16]}>
          <Col className="gutter-row" span={8}>
            <Form.Item
              name="date"
              label={translate('Issue Date')}
              rules={[
                {
                  required: true,
                  type: 'object',
                  message: translate('Please select a date'),
                },
              ]}
              initialValue={dayjs()}
            >
              <DatePicker style={{ width: '100%' }} format={dateFormat} />
            </Form.Item>
          </Col>
          <Col className="gutter-row" span={8}>
            <Form.Item
              name="expiredDate"
              label={translate('Due Date')}
              rules={[
                {
                  required: true,
                  type: 'object',
                  message: translate('Please select a due date'),
                },
              ]}
              initialValue={dayjs().add(30, 'days')}
            >
              <DatePicker style={{ width: '100%' }} format={dateFormat} />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card className="card-form" style={{ marginBottom: '16px' }}>
        <Title level={4}>
          <CalendarOutlined /> {translate('Terms & Conditions')}
        </Title>
        <Row gutter={[16, 16]}>
          <Col className="gutter-row" span={24}>
            <Form.Item 
              label={translate('Terms of Delivery (Incoterms® 2020)')} 
              style={{ marginBottom: '16px' }}
            >
              <Form.List name="termsOfDelivery" initialValue={current?.termsOfDelivery || []}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, index) => (
                      <Row key={field.key} style={{ marginBottom: '8px' }}>
                        <Col span={22}>
                          <Form.Item
                            {...field}
                            noStyle
                          >
                            <Input 
                              placeholder={`${translate('Terms of Delivery')} #${index + 1}`}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={2} style={{ paddingLeft: '8px' }}>
                          <Button 
                            type="text" 
                            danger 
                            onClick={() => remove(field.name)} 
                            icon={<DeleteOutlined />}
                          />
                        </Col>
                      </Row>
                    ))}
                    <Form.Item>
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        icon={<PlusOutlined />}
                        style={{ width: '100%' }}
                      >
                        {translate('Add Term of Delivery')}
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Form.Item>
          </Col>
          
          <Col className="gutter-row" span={24}>
            <Form.Item 
              label={translate('Shipping Mark')} 
              style={{ marginBottom: '16px' }}
            >
              <Form.List name="shippingMark" initialValue={current?.shippingMark || []}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, index) => (
                      <Row key={field.key} style={{ marginBottom: '8px' }}>
                        <Col span={22}>
                          <Form.Item
                            {...field}
                            noStyle
                          >
                            <Input 
                              placeholder={`${translate('Shipping Mark')} #${index + 1}`}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={2} style={{ paddingLeft: '8px' }}>
                          <Button 
                            type="text" 
                            danger 
                            onClick={() => remove(field.name)} 
                            icon={<DeleteOutlined />}
                          />
                        </Col>
                      </Row>
                    ))}
                    <Form.Item>
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        icon={<PlusOutlined />}
                        style={{ width: '100%' }}
                      >
                        {translate('Add Shipping Mark')}
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Form.Item>
          </Col>
          
          <Col className="gutter-row" span={24}>
            <Form.Item 
              label={translate('Payment Terms')} 
              style={{ marginBottom: '16px' }}
            >
              <Form.List name="paymentTerms" initialValue={current?.paymentTerms || []}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, index) => (
                      <Row key={field.key} style={{ marginBottom: '8px' }}>
                        <Col span={22}>
                          <Form.Item
                            {...field}
                            noStyle
                          >
                            <Input 
                              placeholder={`${translate('Payment Term')} #${index + 1}`}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={2} style={{ paddingLeft: '8px' }}>
                          <Button 
                            type="text" 
                            danger 
                            onClick={() => remove(field.name)} 
                            icon={<DeleteOutlined />}
                          />
                        </Col>
                      </Row>
                    ))}
                    <Form.Item>
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        icon={<PlusOutlined />}
                        style={{ width: '100%' }}
                      >
                        {translate('Add Payment Term')}
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Form.Item>
          </Col>
          
          <Col className="gutter-row" span={24}>
            <Form.Item 
              label={translate('Bank Details')} 
              style={{ marginBottom: '16px' }}
            >
              <Form.Item name="bankDetails" initialValue={current?.bankDetails || ''}>
                <Select
                  placeholder={translate('Select Bank')}
                  style={{ width: '100%' }}
                  options={[
                    { value: 'boc', label: 'BOC' },
                    { value: 'everbright', label: 'Everbright' },
                    { value: 'rural', label: 'Rural' },
                    { value: 'vtb', label: 'VTB' },
                  ]}
                />
              </Form.Item>
            </Form.Item>
          </Col>
          
          <Col className="gutter-row" span={24}>
            <Form.Item 
              label={translate('Packaging')} 
              style={{ marginBottom: '16px' }}
            >
              <Form.List name="packaging" initialValue={current?.packaging || []}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, index) => (
                      <Row key={field.key} style={{ marginBottom: '8px' }}>
                        <Col span={22}>
                          <Form.Item
                            {...field}
                            noStyle
                          >
                            <Input 
                              placeholder={`${translate('Packaging')} #${index + 1}`}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={2} style={{ paddingLeft: '8px' }}>
                          <Button 
                            type="text" 
                            danger 
                            onClick={() => remove(field.name)} 
                            icon={<DeleteOutlined />}
                          />
                        </Col>
                      </Row>
                    ))}
                    <Form.Item>
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        icon={<PlusOutlined />}
                        style={{ width: '100%' }}
                      >
                        {translate('Add Packaging')}
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Form.Item>
          </Col>
          
          <Col className="gutter-row" span={24}>
            <Form.Item 
              label={translate('Shipment & Documents')} 
              style={{ marginBottom: '16px' }}
            >
              <Form.List name="shipmentDocuments" initialValue={current?.shipmentDocuments || []}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, index) => (
                      <Row key={field.key} style={{ marginBottom: '8px' }}>
                        <Col span={22}>
                          <Form.Item
                            {...field}
                            noStyle
                          >
                            <Input 
                              placeholder={`${translate('Shipment & Document')} #${index + 1}`}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={2} style={{ paddingLeft: '8px' }}>
                          <Button 
                            type="text" 
                            danger 
                            onClick={() => remove(field.name)} 
                            icon={<DeleteOutlined />}
                          />
                        </Col>
                      </Row>
                    ))}
                    <Form.Item>
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        icon={<PlusOutlined />}
                        style={{ width: '100%' }}
                      >
                        {translate('Add Shipment & Document')}
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Form.Item>
          </Col>
          
          <Col className="gutter-row" span={24}>
            <Form.Item 
              label={translate('Other conditions')} 
              tooltip={translate('Add any special instructions or conditions about this invoice')}
              style={{ marginBottom: '8px' }}
            >
              <Form.List name="notes" initialValue={initialNotes}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, index) => (
                      <Row key={field.key} style={{ marginBottom: '8px' }}>
                        <Col span={22}>
                          <Form.Item
                            {...field}
                            noStyle
                          >
                            <Input 
                              placeholder={`${translate('Condition')} #${index + 1}`}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={2} style={{ paddingLeft: '8px' }}>
                          <Button 
                            type="text" 
                            danger 
                            onClick={() => remove(field.name)} 
                            icon={<DeleteOutlined />}
                          />
                        </Col>
                      </Row>
                    ))}
                    <Form.Item>
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        icon={<PlusOutlined />}
                        style={{ width: '100%' }}
                      >
                        {translate('Add Condition')}
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card className="card-form" style={{ marginBottom: '16px' }}>
        <Title level={4}>
          <ShoppingOutlined /> {translate('Invoice Items')}
        </Title>
        <div style={{ marginBottom: '10px' }}>
          <Row gutter={[12, 0]} style={{ fontWeight: 'bold', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <Col span={6}>{translate('Item Name')}</Col>
            <Col span={8}>{translate('Description')}</Col>
            <Col span={2} style={{ textAlign: 'center' }}>{translate('Quantity')}</Col>
            <Col span={3} style={{ textAlign: 'right' }}>{translate('Price')}</Col>
            <Col span={3} style={{ textAlign: 'right' }}>{translate('Total')}</Col>
            <Col span={1}></Col>
          </Row>
        </div>
        <Form.List name="items">
          {(fields, { add, remove }) => {
            return (
              <div>
                {fields.map((field) => (
                  <ItemRow 
                    key={field.key} 
                    remove={remove} 
                    field={field} 
                    current={current}
                    formType="invoice"
                  />
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => {
                      add();
                    }}
                    style={{ width: '100%', marginTop: '20px' }}
                    ref={addField}
                    icon={<PlusOutlined />}
                  >
                    {translate('Add Item')}
                  </Button>
                </Form.Item>
              </div>
            );
          }}
        </Form.List>
      </Card>

      <Card className="card-form">
        <Row gutter={[16, 16]}>
          <Col span={12} offset={12}>
            <div style={{ 
              background: '#f5f5f5', 
              padding: '20px', 
              borderRadius: '5px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}>
              <Row gutter={[12, 12]}>
                <Col span={12} style={{ textAlign: 'right' }}>
                  <Text strong>{translate('Sub Total')}:</Text>
                </Col>
                <Col span={12}>
                  <MoneyInputFormItem readOnly value={subTotal} />
                </Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                  <Text strong>{translate('Freight')}:</Text>
                </Col>
                <Col span={12}>
                  <MoneyInputFormItem readOnly value={freight} />
                </Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                  <Text strong>{translate('Discount')}:</Text>
                </Col>
                <Col span={12}>
                  <MoneyInputFormItem readOnly value={discount} />
                </Col>
                <Divider style={{ margin: '12px 0' }} />
                <Col span={12} style={{ textAlign: 'right' }}>
                  <Text strong style={{ fontSize: '16px' }}>{translate('Total')}:</Text>
                </Col>
                <Col span={12}>
                  <MoneyInputFormItem 
                    readOnly 
                    value={total} 
                    style={{ 
                      fontWeight: 'bold', 
                      fontSize: '18px',
                      color: '#1890ff'
                    }} 
                  />
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
      </Card>
    </>
  );
}
