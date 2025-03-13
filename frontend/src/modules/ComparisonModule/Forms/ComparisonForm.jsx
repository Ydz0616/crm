import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { Form, Input, InputNumber, Button, Select, Divider, Row, Col, Typography, Spin, Tooltip } from 'antd';
import { PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { DatePicker } from 'antd';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import MerchCompleteAsync from '@/components/MerchCompleteAsync';
import SelectCurrency from '@/components/SelectCurrency';
import SelectAsync from '@/components/SelectAsync';
import MoneyInputFormItem from '@/components/MoneyInputFormItem';
import { selectFinanceSettings } from '@/redux/settings/selectors';
import { useDate, useMoney } from '@/settings';
import useLanguage from '@/locale/useLanguage';
import calculate from '@/utils/calculate';
import { useSelector } from 'react-redux';
import { request } from '@/request';

const { Text } = Typography;

// Custom row component for Comparison Form that handles purchase price lookup
const ComparisonItemRow = ({ field, remove, form, clientId, exchangeRate = 6.5 }) => {
  const translate = useLanguage();
  const [loading, setLoading] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState(null);
  const [grossProfit, setGrossProfit] = useState(null);
  const [vatEtr, setVatEtr] = useState({ VAT: 1.13, ETR: 0.13 });
  const [dataSource, setDataSource] = useState(null);

  // Get current values from form
  const getFormItemValue = (key) => form.getFieldValue(['items', field.name, key]);
  
  // Handle item selection - receive selected merch data directly
  const handleMerchSelect = (selectedMerch) => {
    if (!selectedMerch || !clientId) return;
    
    console.log('Selected Merch:', selectedMerch);
    
    if (!form) {
      console.error('Form instance not found');
      return;
    }

    // Get the items array from the form - exactly like in ItemRow.jsx
    const items = form.getFieldValue('items');
    
    // Extract VAT and ETR directly from the selected merch
    const vatValue = selectedMerch.VAT || 1.13;
    const etrValue = selectedMerch.ETR || 0.13;
    
    // Update the specific item in the items array - exactly like in ItemRow.jsx but with VAT and ETR
    items[field.name] = {
      ...items[field.name],
      itemName: selectedMerch.serialNumber,
      description: selectedMerch.description_en || '',
      VAT: vatValue,
      ETR: etrValue
    };

    // Set the entire items array back to the form - exactly like in ItemRow.jsx
    form.setFieldsValue({ items });

    console.log('Updated form values:', form.getFieldsValue());
    
    // Update local state for the component
    setVatEtr({ VAT: vatValue, ETR: etrValue });
    
    setLoading(true);
    try {
      // Get the item name from the selected merch
      const itemName = selectedMerch.serialNumber;
      
      // Call API to get purchase price based on item and client
      request.get({
        entity: `/comparison/getPurchasePrice?itemName=${itemName}&clientId=${clientId}&VAT=${vatValue}&ETR=${etrValue}`,
      }).then(({ data }) => {
        if (data.success && data.result) {
          setPurchasePrice(data.result.purchasePrice);
          setDataSource(data.result.source);
          
          // Get the current items again (could have changed)
          const updatedItems = form.getFieldValue('items');
          
          // Update the specific item in the items array
          updatedItems[field.name] = {
            ...updatedItems[field.name],
            purchasePrice: data.result.purchasePrice
          };
          
          // Set the entire items array back to the form
          form.setFieldsValue({ items: updatedItems });
          
          console.log('Updated with purchase price:', form.getFieldsValue());
          
          // Calculate gross profit if we have price too
          const price = updatedItems[field.name].price;
          if (price && data.result.purchasePrice) {
            calculateGrossProfit(price, data.result.purchasePrice, vatValue, etrValue);
          }
        } else {
          setPurchasePrice(null);
          setGrossProfit(null);
        }
        setLoading(false);
      }).catch(error => {
        console.error('Error fetching purchase price:', error);
        setLoading(false);
      });
    } catch (error) {
      console.error('Error in handleMerchSelect:', error);
      setLoading(false);
    }
  };
  
  // Handle price change
  const handlePriceChange = (price) => {
    console.log('Price changed to:', price);
    if (price === null || price === undefined) return;
    
    // Get the current items
    const items = form.getFieldValue('items');
    const currentItem = items[field.name];
    
    // Update price in the form
    items[field.name] = {
      ...currentItem,
      price: price
    };
    
    // Set back the entire items array
    form.setFieldsValue({ items });
    
    // Get purchase price and other values for calculation
    const pPrice = currentItem.purchasePrice;
    const vatValue = currentItem.VAT || vatEtr.VAT;
    const etrValue = currentItem.ETR || vatEtr.ETR;
    
    console.log('Price change - values for calculation:', { price, pPrice, vatValue, etrValue });
    
    if (price && pPrice) {
      calculateGrossProfit(price, pPrice, vatValue, etrValue);
    } else {
      setGrossProfit(null);
    }
  };
  
  // Handle purchase price change
  const handlePurchasePriceChange = (pPrice) => {
    console.log('Purchase price changed to:', pPrice);
    if (pPrice === null || pPrice === undefined) return;
    
    // Get the current items
    const items = form.getFieldValue('items');
    const currentItem = items[field.name];
    
    // Update purchase price in the form
    items[field.name] = {
      ...currentItem,
      purchasePrice: pPrice
    };
    
    // Set back the entire items array
    form.setFieldsValue({ items });
    
    // Get other values for calculation
    const price = currentItem.price;
    const vatValue = currentItem.VAT || vatEtr.VAT;
    const etrValue = currentItem.ETR || vatEtr.ETR;
    
    console.log('Purchase price change - values for calculation:', { price, pPrice, vatValue, etrValue });
    
    if (price && pPrice) {
      calculateGrossProfit(price, pPrice, vatValue, etrValue);
    } else {
      setGrossProfit(null);
    }
  };
  
  // Handle VAT change
  const handleVatChange = (vatValue) => {
    console.log('VAT changed to:', vatValue);
    if (vatValue === null || vatValue === undefined) return;
    
    // Get the current items
    const items = form.getFieldValue('items');
    const currentItem = items[field.name];
    
    // Update VAT in the form
    items[field.name] = {
      ...currentItem,
      VAT: vatValue
    };
    
    // Set back the entire items array
    form.setFieldsValue({ items });
    
    // Update state
    setVatEtr(prev => ({ ...prev, VAT: vatValue }));
    
    // Get values for calculation
    const price = currentItem.price;
    const pPrice = currentItem.purchasePrice;
    const etrValue = currentItem.ETR || vatEtr.ETR;
    
    console.log('VAT change - values for calculation:', { price, pPrice, vatValue, etrValue });
    
    if (price && pPrice) {
      calculateGrossProfit(price, pPrice, vatValue, etrValue);
    }
  };
  
  // Handle ETR change
  const handleEtrChange = (etrValue) => {
    console.log('ETR changed to:', etrValue);
    if (etrValue === null || etrValue === undefined) return;
    
    // Get the current items
    const items = form.getFieldValue('items');
    const currentItem = items[field.name];
    
    // Update ETR in the form
    items[field.name] = {
      ...currentItem,
      ETR: etrValue
    };
    
    // Set back the entire items array
    form.setFieldsValue({ items });
    
    // Update state
    setVatEtr(prev => ({ ...prev, ETR: etrValue }));
    
    // Get values for calculation
    const price = currentItem.price;
    const pPrice = currentItem.purchasePrice;
    const vatValue = currentItem.VAT || vatEtr.VAT;
    
    console.log('ETR change - values for calculation:', { price, pPrice, vatValue, etrValue });
    
    if (price && pPrice) {
      calculateGrossProfit(price, pPrice, vatValue, etrValue);
    }
  };

  // Calculate gross profit - similar to how create.js calculates item totals
  const calculateGrossProfit = (price, pPrice, VAT = 1.13, ETR = 0.13) => {
    console.log('Calculate gross profit inputs:', { price, pPrice, VAT, ETR, exchangeRate });
    
    if (!price || !pPrice || !exchangeRate) {
      console.log('Missing required values for calculation');
      return;
    }
    
    // Ensure all values are numbers
    price = Number(price);
    pPrice = Number(pPrice);
    VAT = Number(VAT);
    ETR = Number(ETR);
    const exRate = Number(exchangeRate);
    
    // Calculate USD expense
    const expenseRMB = pPrice * (VAT - ETR) / VAT;
    const expenseUSD = expenseRMB / exRate;
    
    // Calculate gross profit percentage
    let grossProfitValue = 0;
    
    if (price > expenseUSD) {
      const profit = (price - expenseUSD) / price;
      grossProfitValue = Math.round(profit * 1000) / 1000;
    }
    
    console.log('Calculated gross profit:', grossProfitValue);
    
    // Update local state
    setGrossProfit(grossProfitValue);
    
    // Get the current items
    const items = form.getFieldValue('items');
    if (!items) return;
    
    // Update the specific item with the calculated value
    items[field.name] = {
      ...items[field.name],
      grossProfit: grossProfitValue
    };
    
    // Set the updated items array back to the form
    form.setFieldsValue({ items });
    
    return grossProfitValue;
  };
  
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: '10px' }}>
      <Col className="gutter-row" span={6}>
        <Form.Item
          name={[field.name, 'itemName']}
          fieldKey={[field.fieldKey, 'itemName']}
          rules={[{ required: true, message: translate('Please select an item') }]}
        >
          <MerchCompleteAsync
            entity="merch"
            displayLabels={['serialNumber']}
            searchFields="serialNumber"
            outputValue="serialNumber"
            onItemSelect={handleMerchSelect}
          />
        </Form.Item>
      </Col>
      
      {/* Description field hidden but still included in form data */}
      <Form.Item
        name={[field.name, 'description']}
        fieldKey={[field.fieldKey, 'description']}
        hidden
      >
        <Input />
      </Form.Item>
      
      <Col className="gutter-row" span={3}>
        <Form.Item
          name={[field.name, 'quantity']}
          fieldKey={[field.fieldKey, 'quantity']}
          rules={[{ required: true, message: translate('Please enter quantity') }]}
        >
          <InputNumber 
            style={{ width: '100%' }} 
            min={1} 
            placeholder={translate('Quantity')} 
          />
        </Form.Item>
      </Col>
      
      <Col className="gutter-row" span={3}>
        <Form.Item
          name={[field.name, 'price']}
          fieldKey={[field.fieldKey, 'price']}
          rules={[{ required: true, message: translate('Please enter price') }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={0.01}
            placeholder={translate('Price')}
            onChange={handlePriceChange}
          />
        </Form.Item>
      </Col>
      
      <Col className="gutter-row" span={3}>
        <Form.Item
          name={[field.name, 'purchasePrice']}
          fieldKey={[field.fieldKey, 'purchasePrice']}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={0.01}
            placeholder={translate('Purchase Price')}
            onChange={handlePurchasePriceChange}
            suffix={loading ? <Spin size="small" /> : null}
          />
        </Form.Item>
        {dataSource && (
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {dataSource === 'client_history' ? translate('Client history') : translate('Region history')}
          </Text>
        )}
      </Col>
      
      <Col className="gutter-row" span={3}>
        <Form.Item
          name={[field.name, 'VAT']}
          fieldKey={[field.fieldKey, 'VAT']}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={1}
            step={0.01}
            placeholder={translate('VAT')}
            onChange={handleVatChange}
          />
        </Form.Item>
      </Col>
      
      <Col className="gutter-row" span={3}>
        <Form.Item
          name={[field.name, 'ETR']}
          fieldKey={[field.fieldKey, 'ETR']}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={0.01}
            placeholder={translate('ETR')}
            onChange={handleEtrChange}
          />
        </Form.Item>
      </Col>
      
      <Col className="gutter-row" span={3}>
        <Form.Item
          name={[field.name, 'grossProfit']}
          fieldKey={[field.fieldKey, 'grossProfit']}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={0.001}
            placeholder={translate('GP')}
            readOnly
            formatter={(value) => value ? `${(value * 100).toFixed(1)}%` : ''}
          />
        </Form.Item>
      </Col>
      
      <Col className="gutter-row" span={1}>
        <Button danger onClick={() => remove(field.name)} type="link">
          X
        </Button>
      </Col>
    </Row>
  );
};

export default function ComparisonForm({ subTotal = 0, current = null }) {
  const [form] = Form.useForm();
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const { last_comparison_number } = useSelector(selectFinanceSettings) || { last_comparison_number: 0 };
  const [lastNumber, setLastNumber] = useState(() => last_comparison_number + 1);
  const [client, setClient] = useState(null);
  const [clientRequired, setClientRequired] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(6.5);
  const [taxRate, setTaxRate] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const { moneyFormatter } = useMoney();

  // Handle currency change
  const handleCurrencyChange = (value, currencyObject) => {
    if (currencyObject) {
      const newCurrency = {
        currency_symbol: currencyObject.currency_symbol,
        currency_position: currencyObject.currency_position,
        decimal_separator: currencyObject.decimal_separator,
        thousand_separator: currencyObject.thousand_separator,
        cent_precision: currencyObject.cent_precision
      };
      setSelectedCurrency(newCurrency);
    }
  };

  // Handle tax rate change
  const handleTaxChange = (value) => {
    setTaxRate(value / 100);
  };

  // Handle client selection
  const handleClientChange = (clientId) => {
    setClient(clientId);
    setClientRequired(false);
  };

  // Handle exchange rate change
  const handleExchangeRateChange = (value) => {
    setExchangeRate(value);
    
    // Get current form values
    const items = form.getFieldValue('items');
    if (!items) return;
    
    // Make a copy of the items to update
    const updatedItems = { ...items };
    
    // Recalculate gross profit for all items
    Object.keys(items).forEach(fieldName => {
      const item = items[fieldName];
      if (item && item.price && item.purchasePrice && item.VAT && item.ETR) {
        // Calculate USD expense
        const expenseRMB = item.purchasePrice * (item.VAT - item.ETR) / item.VAT;
        const expenseUSD = expenseRMB / value;
        
        // Calculate gross profit percentage
        let grossProfitValue = 0;
        
        if (item.price > expenseUSD) {
          const profit = (item.price - expenseUSD) / item.price;
          grossProfitValue = Math.round(profit * 1000) / 1000;
        }
        
        // Update the form field
        updatedItems[fieldName] = {
          ...updatedItems[fieldName],
          grossProfit: grossProfitValue
        };
      }
    });
    
    // Set the entire items array back to the form
    form.setFieldsValue({ items: updatedItems });
    console.log('Updated form values after exchange rate change:', form.getFieldsValue());
  };

  // Load current data when editing
  useEffect(() => {
    if (current) {
      const { taxRate = 0, year, number, exchangeRate = 6.5, client } = current;
      setTaxRate(taxRate / 100);
      setCurrentYear(year);
      setLastNumber(number);
      setClient(client._id);
      setExchangeRate(exchangeRate);
    }
  }, [current]);

  // Update totals when subtotal or tax rate changes
  useEffect(() => {
    const currentTaxTotal = calculate.multiply(subTotal, taxRate);
    setTaxTotal(Number.parseFloat(currentTaxTotal));
    setTotal(Number.parseFloat(calculate.add(subTotal, currentTaxTotal)));
  }, [subTotal, taxRate]);

  // Auto-add first row when form loads
  const addField = useRef(false);
  useEffect(() => {
    addField.current.click();
  }, []);

  return (
    <>
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={8}>
          <Form.Item
            name="client"
            label={translate('Client')}
            rules={[
              {
                required: clientRequired,
                message: translate('Please select a client')
              },
            ]}
          >
            <AutoCompleteAsync
              entity={'client'}
              displayLabels={['name']}
              searchFields={'name'}
              redirectLabel={'Add New Client'}
              withRedirect
              urlToRedirect={'/customer'}
              onChange={handleClientChange}
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={4}>
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
        <Col className="gutter-row" span={5}>
          <Form.Item
            name="exchangeRate"
            label={
              <span>
                {translate('Exchange Rate')}
                <Tooltip title={translate('Expected exchange rate for profit calculation')}>
                  <InfoCircleOutlined style={{ marginLeft: 5 }} />
                </Tooltip>
              </span>
            }
            initialValue={exchangeRate}
            rules={[
              {
                required: true,
                message: translate('Please enter exchange rate')
              },
            ]}
          >
            <InputNumber 
              style={{ width: '100%' }}
              min={0.01}
              step={0.01}
              onChange={handleExchangeRateChange}
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={3}>
          <Form.Item
            label={translate('number')}
            name="number"
            initialValue={lastNumber}
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={3}>
          <Form.Item
            label={translate('year')}
            name="year"
            initialValue={currentYear}
            rules={[
              {
                required: true,
              },
            ]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={8}>
          <Form.Item
            name="date"
            label={translate('Date')}
            rules={[
              {
                required: true,
                type: 'object',
              },
            ]}
            initialValue={dayjs()}
          >
            <DatePicker style={{ width: '100%' }} format={dateFormat} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={6}>
          <Form.Item
            name="expiredDate"
            label={translate('Expire Date')}
            rules={[
              {
                required: true,
                type: 'object',
              },
            ]}
            initialValue={dayjs().add(30, 'days')}
          >
            <DatePicker style={{ width: '100%' }} format={dateFormat} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={5}>
          <Form.Item
            label={translate('status')}
            name="status"
            rules={[
              {
                required: false,
              },
            ]}
            initialValue={'draft'}
          >
            <Select
              options={[
                { value: 'draft', label: translate('Draft') },
                { value: 'pending', label: translate('Pending') },
                { value: 'sent', label: translate('Sent') },
                { value: 'approved', label: translate('Approved') },
                { value: 'rejected', label: translate('Rejected') },
              ]}
            ></Select>
          </Form.Item>
        </Col>
      </Row>
      <Divider dashed />
      
      <Row gutter={[12, 12]} style={{ position: 'relative' }}>
        <Col className="gutter-row" span={6}>
          <p>{translate('Item')}</p>
        </Col>
        <Col className="gutter-row" span={3}>
          <p>{translate('Quantity')}</p>
        </Col>
        <Col className="gutter-row" span={3}>
          <p>{translate('Price')}</p>
        </Col>
        <Col className="gutter-row" span={3}>
          <p>
            {translate('Purchase Price')}
            <Tooltip title={translate('RMB price from purchase order')}>
              <InfoCircleOutlined style={{ marginLeft: 5 }} />
            </Tooltip>
          </p>
        </Col>
        <Col className="gutter-row" span={3}>
          <p>
            {translate('VAT')}
            <Tooltip title={translate('Value-Added Tax')}>
              <InfoCircleOutlined style={{ marginLeft: 5 }} />
            </Tooltip>
          </p>
        </Col>
        <Col className="gutter-row" span={3}>
          <p>
            {translate('ETR')}
            <Tooltip title={translate('Export Tax Rebate')}>
              <InfoCircleOutlined style={{ marginLeft: 5 }} />
            </Tooltip>
          </p>
        </Col>
        <Col className="gutter-row" span={3}>
          <p>
            {translate('GP')}
            <Tooltip title={translate('Gross profit percentage')}>
              <InfoCircleOutlined style={{ marginLeft: 5 }} />
            </Tooltip>
          </p>
        </Col>
      </Row>
      
      <Form.List name="items">
        {(fields, { add, remove }) => (
          <>
            {fields.map((field) => (
              <ComparisonItemRow 
                key={field.key} 
                field={field} 
                remove={remove} 
                form={form}
                clientId={client}
                exchangeRate={exchangeRate}
              />
            ))}
            <Form.Item>
              <Button
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
                ref={addField}
                disabled={!client}
              >
                {translate('Add item')}
              </Button>
              {!client && (
                <Text type="warning" style={{ display: 'block', marginTop: '8px' }}>
                  {translate('Please select a client first to add items')}
                </Text>
              )}
            </Form.Item>
          </>
        )}
      </Form.List>
      
      <Divider dashed />
      <div style={{ position: 'relative', width: '100%', float: 'right' }}>
        <Row gutter={[12, -5]}>
          <Col className="gutter-row" span={5}>
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />} block>
                {translate('Save')}
              </Button>
            </Form.Item>
          </Col>
        </Row>
      </div>
    </>
  );
} 