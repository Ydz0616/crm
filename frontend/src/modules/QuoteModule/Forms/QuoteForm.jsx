import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { Form, Input, InputNumber, Button, Select, Divider, Row, Col, Card, Typography } from 'antd';
import { PlusOutlined, ShoppingOutlined, CalendarOutlined, DollarOutlined, UserOutlined } from '@ant-design/icons';
import { DatePicker } from 'antd';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import ItemRow from '@/modules/ErpPanelModule/ItemRow';
import MoneyInputFormItem from '@/components/MoneyInputFormItem';
import { selectFinanceSettings } from '@/redux/settings/selectors';
import { useDate, useMoney } from '@/settings';
import useLanguage from '@/locale/useLanguage';
import calculate from '@/utils/calculate';
import { useSelector } from 'react-redux';
import SelectAsync from '@/components/SelectAsync';
import SelectCurrency from '@/components/SelectCurrency';

const { Title, Text } = Typography;

export default function QuoteForm({ subTotal = 0, current = null }) {
  const { last_quote_number } = useSelector(selectFinanceSettings);

  if (last_quote_number === undefined) {
    return <></>;
  }

  return <LoadQuoteForm subTotal={subTotal} current={current} />;
}

function LoadQuoteForm({ subTotal = 0, current = null }) {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const { last_quote_number } = useSelector(selectFinanceSettings);
  const [lastNumber, setLastNumber] = useState(() => last_quote_number + 1);

  const [total, setTotal] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const handelTaxChange = (value) => {
    setTaxRate(value / 100);
  };

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
      const { taxRate = 0, year, number } = current;
      setTaxRate(taxRate / 100);
      setCurrentYear(year);
      setLastNumber(number);
    }
  }, [current]);
  useEffect(() => {
    const currentTotal = calculate.add(calculate.multiply(subTotal, taxRate), subTotal);
    setTaxTotal(Number.parseFloat(calculate.multiply(subTotal, taxRate)));
    setTotal(Number.parseFloat(currentTotal));
  }, [subTotal, taxRate]);

  const addField = useRef(false);

  useEffect(() => {
    addField.current.click();
  }, []);

  return (
    <>
      <Card className="card-form" style={{ marginBottom: '16px' }}>
        <Title level={4}>
          <UserOutlined /> {translate('Quote Information')}
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
              label={translate('Quote Number')}
              name="number"
              initialValue={lastNumber}
              rules={[
                {
                  required: true,
                  message: translate('Please enter a quote number'),
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
          <Col className="gutter-row" span={6}>
            <Form.Item
              name="taxRate"
              label={translate('Tax Rate %')}
              rules={[
                {
                  required: true,
                  message: translate('Please select a tax rate'),
                },
              ]}
            >
              <SelectAsync
                value={taxRate}
                onChange={handelTaxChange}
                entity={'taxes'}
                outputValue={'taxValue'}
                displayLabels={['taxName']}
                withRedirect={true}
                urlToRedirect="/taxes"
                redirectLabel={translate('Add New Tax')}
                placeholder={translate('Select Tax Value')}
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
          <Col className="gutter-row" span={24}>
            <Form.Item 
              label={translate('Notes')} 
              name="notes"
              tooltip={translate('Add any special instructions or notes about this quote')}
            >
              <Input.TextArea 
                style={{ width: '100%' }} 
                rows={4} 
                placeholder={translate('Enter any additional notes or information here...')}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card className="card-form" style={{ marginBottom: '16px' }}>
        <Title level={4}>
          <ShoppingOutlined /> {translate('Quote Items')}
        </Title>
        <div style={{ marginBottom: '10px' }}>
          <Row gutter={[12, 0]} style={{ fontWeight: 'bold', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <Col span={8}>{translate('Item Name')}</Col>
            <Col span={8}>{translate('Description')}</Col>
            <Col span={2} style={{ textAlign: 'center' }}>{translate('Quantity')}</Col>
            <Col span={3} style={{ textAlign: 'right' }}>{translate('Price')}</Col>
            <Col span={3} style={{ textAlign: 'right' }}>{translate('Total')}</Col>
          </Row>
        </div>
        <Form.List name="items">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <ItemRow key={field.key} remove={remove} field={field} current={current} />
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add()}
                  style={{ width: '100%', marginTop: '20px' }}
                  icon={<PlusOutlined />}
                  ref={addField}
                >
                  {translate('Add Item')}
                </Button>
              </Form.Item>
            </>
          )}
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
                  <Text strong>{translate('Tax')} ({taxRate * 100}%):</Text>
                </Col>
                <Col span={12}>
                  <MoneyInputFormItem readOnly value={taxTotal} />
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
