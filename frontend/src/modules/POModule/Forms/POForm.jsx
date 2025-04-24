import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { Form, Input, InputNumber, Button, Select, Divider, Row, Col, Card, Typography } from 'antd';
import { PlusOutlined, ShoppingOutlined, CalendarOutlined, DollarOutlined, DeleteOutlined } from '@ant-design/icons';
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

export default function PurchaseOrderForm({ subTotal = 0, current = null }) {
  const financeSettings = useSelector(selectFinanceSettings);
  console.log('Finance Settings:', financeSettings);
  
  const { last_purchase_order_number } = financeSettings;
  console.log('Last PO Number:', last_purchase_order_number);

  if (last_purchase_order_number === undefined) {
    console.log('Last PO Number is undefined!');
    return <></>;
  }

  return <LoadPurchaseOrderForm subTotal={subTotal} current={current} />;
}

function LoadPurchaseOrderForm({ subTotal = 0, current = null }) {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const { last_purchase_order_number } = useSelector(selectFinanceSettings);
  const [lastNumber, setLastNumber] = useState(() => last_purchase_order_number + 1);

  const [total, setTotal] = useState(0);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());

  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const { moneyFormatter } = useMoney();

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

  useEffect(() => {
    if (current) {
      const { year, number } = current;
      setCurrentYear(year);
      setLastNumber(number);
    }
  }, [current]);
  
  useEffect(() => {
    setTotal(Number.parseFloat(subTotal));
  }, [subTotal]);

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
          <ShoppingOutlined /> {translate('Purchase Order Information')}
        </Title>
        <Row gutter={[16, 16]}>
          <Col className="gutter-row" span={12}>
            <Form.Item
              name="factory"
              label={translate('Factory')}
              rules={[
                {
                  required: true,
                  message: translate('Please select a factory'),
                },
              ]}
            >
              <AutoCompleteAsync
                entity={'factory'}
                displayLabels={['factory_name']}
                searchFields={'factory_name'}
                redirectLabel={translate('Add New Factory')}
                withRedirect
                urlToRedirect={'/factory'}
              />
            </Form.Item>
          </Col>
          <Col className="gutter-row" span={12}>
            <Form.Item
              name="relatedInvoice"
              label={translate('Related Invoice')}
            >
              <AutoCompleteAsync
                entity={'invoice'}
                displayLabels={['number', 'client.name']}
                searchFields={'number,client.name'}
                redirectLabel={translate('Create New Invoice')}
                withRedirect
                urlToRedirect={'/invoice/create'}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col className="gutter-row" span={6}>
            <Form.Item
              label={translate('Purchase Order Number')}
              name="number"
              initialValue={lastNumber}
              rules={[
                {
                  required: true,
                  message: translate('Please enter a PO number'),
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
                  { value: 'accepted', label: translate('Accepted') },
                  { value: 'declined', label: translate('Declined') },
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
              label={translate('Expiry Date')}
              rules={[
                {
                  required: true,
                  type: 'object',
                  message: translate('Please select an expiry date'),
                },
              ]}
              initialValue={dayjs().add(30, 'days')}
            >
              <DatePicker style={{ width: '100%' }} format={dateFormat} />
            </Form.Item>
          </Col>
          <Col className="gutter-row" span={8}>
            <Form.Item
              label={translate('Discount')}
              name="discount"
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
                prefix={<DollarOutlined />}
                min={0}
              />
            </Form.Item>
          </Col>
          <Col className="gutter-row" span={24}>
            <Form.Item 
              label={translate('Notes')} 
              tooltip={translate('Add any special instructions or notes about this order')}
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
                              placeholder={`${translate('Note')} #${index + 1}`}
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
                        {translate('Add Note')}
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
          <ShoppingOutlined /> {translate('Order Items')}
        </Title>
        <div style={{ marginBottom: '10px' }}>
          <Row gutter={[12, 0]} style={{ fontWeight: 'bold', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <Col span={5}>{translate('Item Name')}</Col>
            <Col span={5}>{translate('Description')}</Col>
            <Col span={3}>{translate('Laser')}</Col>
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
                    formType="purchaseOrder"
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
                  <Text strong>{translate('Total')}:</Text>
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
