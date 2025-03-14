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
const ComparisonItemRow = ({ field, remove, form, clientId, exchangeRate = 6.5, onValuesChange }) => {
  const translate = useLanguage();
  const [loading, setLoading] = useState(false);
  const [vatEtr, setVatEtr] = useState({ VAT: 1.13, ETR: 0.13 });
  const [dexp, setDexp] = useState(null);
  const [grossProfit, setGrossProfit] = useState(null);
  const [subP, setSubP] = useState(null);
  const [subS, setSubS] = useState(null);

  console.log('Rendering ComparisonItemRow with field:', field);
  
  // Calculate USD expense
  const calculateUsdExpense = (exp, vat, etr, rate) => {
    console.log('Calculating USD expense with:', { exp, vat, etr, rate });
    if (!exp || !vat || !etr || !rate) return null;
    
    // Ensure all values are numbers
    exp = Number(exp);
    vat = Number(vat);
    etr = Number(etr);
    rate = Number(rate);
    
    // Calculate USD expense: exp * (VAT - ETR) / VAT / E
    const usdExpense = exp * (vat - etr) / vat / rate;
    
    // Round to 2 decimal places
    const roundedUsdExpense = Math.round(usdExpense * 100) / 100;
    
    console.log('Calculated USD expense:', usdExpense, 'Rounded:', roundedUsdExpense);
    return roundedUsdExpense;
  };
  
  // Calculate gross profit percentage
  const calculateGrossProfit = (price, dexpValue) => {
    console.log('Calculating gross profit with:', { price, dexpValue });
    if (!price || !dexpValue) return null;
    
    // Ensure all values are numbers
    price = Number(price);
    dexpValue = Number(dexpValue);
    
    if (price <= 0) return 0;
    
    // Calculate gross profit: (Price - DExp) / Price * 100%
    const grossProfitValue = (price - dexpValue) / price * 100;
    
    // Round to 2 decimal places
    const roundedGrossProfit = Math.round(grossProfitValue * 100) / 100;
    
    console.log('Calculated gross profit:', grossProfitValue, 'Rounded:', roundedGrossProfit);
    return roundedGrossProfit;
  };
  
  // Calculate subtotals
  const calculateSubtotals = (qty, price, exp) => {
    console.log('Calculating subtotals with:', { qty, price, exp });
    if (!qty) return { subP: null, subS: null };
    
    // Ensure all values are numbers
    qty = Number(qty);
    
    let calculatedSubP = null;
    let calculatedSubS = null;
    
    if (exp) {
      const expNum = Number(exp);
      calculatedSubP = Math.round(qty * expNum * 100) / 100;
    }
    
    if (price) {
      const priceNum = Number(price);
      calculatedSubS = Math.round(qty * priceNum * 100) / 100;
    }
    
    console.log('Calculated subtotals:', { subP: calculatedSubP, subS: calculatedSubS });
    return { subP: calculatedSubP, subS: calculatedSubS };
  };
  
  // Update USD expense in the form and state
  const updateDexp = (expValue) => {
    // Get current values
    const items = form.getFieldValue('items');
    const currentItem = items[field.name];
    
    const vatValue = currentItem.VAT || vatEtr.VAT;
    const etrValue = currentItem.ETR || vatEtr.ETR;
    
    // Calculate USD expense
    const usdExpense = calculateUsdExpense(expValue, vatValue, etrValue, exchangeRate);
    
    // Update form with calculated value
    items[field.name] = {
      ...currentItem,
      DExp: usdExpense
    };
    
    // Set the entire items array back to the form
    form.setFieldsValue({ items });
    
    // Update local state
    setDexp(usdExpense);
    
    // If we have a price, update the gross profit too
    if (currentItem.Price && usdExpense) {
      updateGrossProfit(currentItem.Price, usdExpense);
    }
    
    // Notify parent of changes
    if (onValuesChange) {
      onValuesChange(items);
    }
  };
  
  // Update gross profit in form and state
  const updateGrossProfit = (price, dexpValue) => {
    // Calculate gross profit
    const gpValue = calculateGrossProfit(price, dexpValue);
    
    // Get current items
    const items = form.getFieldValue('items');
    const currentItem = items[field.name];
    
    // Update form with calculated value
    items[field.name] = {
      ...currentItem,
      GP: gpValue
    };
    
    // Set the entire items array back to the form
    form.setFieldsValue({ items });
    
    // Update local state
    setGrossProfit(gpValue);
    
    // Notify parent of changes
    if (onValuesChange) {
      onValuesChange(items);
    }
  };
  
  // Update subtotals in form and state
  const updateSubtotals = (qty, price, exp) => {
    // Calculate subtotals
    const { subP: calculatedSubP, subS: calculatedSubS } = calculateSubtotals(qty, price, exp);
    
    // Get current items
    const items = form.getFieldValue('items');
    const currentItem = items[field.name];
    
    // Update form with calculated values
    items[field.name] = {
      ...currentItem,
      SubP: calculatedSubP,
      SubS: calculatedSubS
    };
    
    // Set the entire items array back to the form
    form.setFieldsValue({ items });
    
    // Update local state
    setSubP(calculatedSubP);
    setSubS(calculatedSubS);
    
    // Notify parent of changes
    if (onValuesChange) {
      onValuesChange(items);
    }
  };
  
  // Handle quantity change
  const handleQtyChange = (qtyValue) => {
    console.log('Quantity changed to:', qtyValue);
    
    // Get the items array
    const items = form.getFieldValue('items');
    const currentItem = items[field.name];
    
    // Update quantity in the items array
    items[field.name] = {
      ...currentItem,
      Qty: qtyValue
    };
    
    // Set entire items array back to form
    form.setFieldsValue({ items });
    
    // Update subtotals
    updateSubtotals(qtyValue, currentItem.Price, currentItem.Exp);
  };
  
  // Handle price change
  const handlePriceChange = (priceValue) => {
    console.log('Price changed to:', priceValue);
    
    // Get the items array
    const items = form.getFieldValue('items');
    const currentItem = items[field.name];
    
    // Update price in the items array
    items[field.name] = {
      ...currentItem,
      Price: priceValue
    };
    
    // Set entire items array back to form
    form.setFieldsValue({ items });
    
    // Update gross profit if we have DExp
    if (priceValue && currentItem.DExp) {
      updateGrossProfit(priceValue, currentItem.DExp);
    }
    
    // Update subtotals if we have quantity
    if (currentItem.Qty) {
      updateSubtotals(currentItem.Qty, priceValue, currentItem.Exp);
    }
  };
  
  // Handle expense (buy-in price) change
  const handleExpChange = (expValue) => {
    console.log('Expense changed to:', expValue);
    
    // Get the items array
    const items = form.getFieldValue('items');
    const currentItem = items[field.name];
    
    // Update expense in the items array
    items[field.name] = {
      ...items[field.name],
      Exp: expValue
    };
    
    // Set entire items array back to form
    form.setFieldsValue({ items });
    
    // Update dollar expense calculation
    updateDexp(expValue);
    
    // Update subtotals if we have quantity
    if (currentItem.Qty) {
      updateSubtotals(currentItem.Qty, currentItem.Price, expValue);
    }
  };
  
  // Handle item selection
  const handleMerchSelect = (selectedMerch) => {
    console.log('Item selected:', selectedMerch);
    
    if (!selectedMerch) {
      console.error('No item selected');
      return;
    }
    
    if (!form) {
      console.error('Form instance not found');
      return;
    }
    
    console.log('Form instance:', form);
    
    // Get the items array from the form
    const items = form.getFieldValue('items');
    console.log('Current items:', items);
    
    // Extract VAT and ETR from selected merch
    const vatValue = selectedMerch.VAT || 1.13;
    const etrValue = selectedMerch.ETR || 0.13;
    console.log('Setting VAT/ETR values:', { vatValue, etrValue });
    
    // Update the item in the items array
    items[field.name] = {
      ...items[field.name],
      itemName: selectedMerch.serialNumber,
      description: selectedMerch.description_en || '',
      VAT: vatValue,
      ETR: etrValue
    };
    
    console.log('Updated items:', items);
    
    // Set entire items array back to form
    form.setFieldsValue({ items });
    
    // Verify the form values were set
    console.log('Form values after update:', form.getFieldsValue());
    
    // Update local state
    setVatEtr({ VAT: vatValue, ETR: etrValue });
    
    // Recalculate USD expense if we have an expense value
    const expValue = items[field.name].Exp;
    if (expValue) {
      updateDexp(expValue);
    }
    
    // Notify parent of changes
    if (onValuesChange) {
      onValuesChange(items);
    }
  };
  
  // Handle VAT change
  const handleVatChange = (vatValue) => {
    console.log('VAT changed to:', vatValue);
    
    // Get the items array
    const items = form.getFieldValue('items');
    
    // Update VAT in the items array
    items[field.name] = {
      ...items[field.name],
      VAT: vatValue
    };
    
    // Set entire items array back to form
    form.setFieldsValue({ items });
    
    // Update local state
    setVatEtr(prev => ({ ...prev, VAT: vatValue }));
    
    // Recalculate USD expense if we have an expense value
    const expValue = items[field.name].Exp;
    if (expValue) {
      updateDexp(expValue);
    }
    
    // Notify parent of changes
    if (onValuesChange) {
      onValuesChange(items);
    }
  };
  
  // Handle ETR change
  const handleEtrChange = (etrValue) => {
    console.log('ETR changed to:', etrValue);
    
    // Get the items array
    const items = form.getFieldValue('items');
    
    // Update ETR in the items array
    items[field.name] = {
      ...items[field.name],
      ETR: etrValue
    };
    
    // Set entire items array back to form
    form.setFieldsValue({ items });
    
    // Update local state
    setVatEtr(prev => ({ ...prev, ETR: etrValue }));
    
    // Recalculate USD expense if we have an expense value
    const expValue = items[field.name].Exp;
    if (expValue) {
      updateDexp(expValue);
    }
    
    // Notify parent of changes
    if (onValuesChange) {
      onValuesChange(items);
    }
  };
  
  // Effect to update USD expense and subtotals when exchange rate changes
  useEffect(() => {
    // Get current values
    const items = form.getFieldValue('items');
    if (!items || !items[field.name]) return;
    
    const currentItem = items[field.name];
    const expValue = currentItem.Exp;
    
    if (expValue) {
      updateDexp(expValue);
    }
  }, [exchangeRate]);
  
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: '10px' }}>
      <Col className="gutter-row" span={4}>
        <Form.Item
          name={[field.name, 'itemName']}
          fieldKey={[field.fieldKey, 'itemName']}
          rules={[{ required: true, message: translate('Please select an item') }]}
          label={translate('Item')}
        >
          <MerchCompleteAsync
            entity="merch"
            displayLabels={['serialNumber']}
            searchFields="serialNumber"
            outputValue="serialNumber"
            onItemSelect={(selectedMerch) => {
              console.log('MerchCompleteAsync onItemSelect called with:', selectedMerch);
              if (selectedMerch) {
                console.log('Selected item details:', {
                  serialNumber: selectedMerch.serialNumber,
                  description: selectedMerch.description_en,
                  VAT: selectedMerch.VAT || 'Not provided',
                  ETR: selectedMerch.ETR || 'Not provided'
                });
              }
              handleMerchSelect(selectedMerch);
            }}
          />
        </Form.Item>
      </Col>
      
      <Col className="gutter-row" span={2}>
        <Form.Item
          name={[field.name, 'Qty']}
          fieldKey={[field.fieldKey, 'Qty']}
          label={translate('Qty')}
          rules={[{ required: true, message: translate('Please enter quantity') }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={1}
            precision={0}
            placeholder={translate('Quantity')}
            onChange={handleQtyChange}
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
      
      {/* VAT field hidden but still included in form data */}
      <Form.Item
        name={[field.name, 'VAT']}
        fieldKey={[field.fieldKey, 'VAT']}
        hidden
      >
        <InputNumber onChange={handleVatChange} />
      </Form.Item>
      
      {/* ETR field hidden but still included in form data */}
      <Form.Item
        name={[field.name, 'ETR']}
        fieldKey={[field.fieldKey, 'ETR']}
        hidden
      >
        <InputNumber onChange={handleEtrChange} />
      </Form.Item>
      
      {/* DExp field hidden but still included in form data */}
      <Form.Item
        name={[field.name, 'DExp']}
        fieldKey={[field.fieldKey, 'DExp']}
        hidden
      >
        <InputNumber />
      </Form.Item>
      
      <Col className="gutter-row" span={3}>
        <Form.Item
          name={[field.name, 'Price']}
          fieldKey={[field.fieldKey, 'Price']}
          label={translate('Price (USD)')}
          rules={[{ required: true, message: translate('Please enter price') }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={0.01}
            controls={false}
            keyboard
            stringMode
            placeholder={translate('Sell price')}
            onChange={(value) => {
              console.log('Raw price input:', value);
              handlePriceChange(value);
            }}
            addonBefore="$"
          />
        </Form.Item>
      </Col>
      
      <Col className="gutter-row" span={3}>
        <Form.Item
          name={[field.name, 'Exp']}
          fieldKey={[field.fieldKey, 'Exp']}
          label={translate('Exp (CNY)')}
          rules={[{ required: true, message: translate('Please enter expense') }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={0.01}
            controls={false}
            keyboard
            stringMode
            placeholder={translate('Buy-in price')}
            onChange={(value) => {
              console.log('Raw expense input:', value);
              handleExpChange(value);
            }}
            addonBefore="¥"
          />
        </Form.Item>
      </Col>
      
      <Col className="gutter-row" span={3}>
        <Form.Item
          name={[field.name, 'GP']}
          fieldKey={[field.fieldKey, 'GP']}
          label={translate('GP (%)')}
        >
          <InputNumber
            style={{ width: '100%' }}
            disabled
            precision={2}
            placeholder={translate('Gross Profit')}
            formatter={value => value ? `${value}%` : ''}
          />
        </Form.Item>
      </Col>
      
      <Col className="gutter-row" span={3}>
        <Form.Item
          name={[field.name, 'SubP']}
          fieldKey={[field.fieldKey, 'SubP']}
          label={translate('SubP (CNY)')}
        >
          <InputNumber
            style={{ width: '100%' }}
            disabled
            precision={2}
            placeholder={translate('Subtotal Purchase')}
            formatter={value => value ? `¥${value}` : ''}
          />
        </Form.Item>
      </Col>
      
      <Col className="gutter-row" span={3}>
        <Form.Item
          name={[field.name, 'SubS']}
          fieldKey={[field.fieldKey, 'SubS']}
          label={translate('SubS (USD)')}
        >
          <InputNumber
            style={{ width: '100%' }}
            disabled
            precision={2}
            placeholder={translate('Subtotal Sales')}
            formatter={value => value ? `$${value}` : ''}
          />
        </Form.Item>
      </Col>
      
      <Col className="gutter-row" span={1}>
        <Button danger onClick={() => remove(field.name)} type="link" style={{ marginTop: '30px' }}>
          X
        </Button>
      </Col>
    </Row>
  );
};

export default function ComparisonForm() {
  const [form] = Form.useForm();
  const translate = useLanguage();
  const [client, setClient] = useState("some-test-client"); // Hardcode a client ID for testing
  const [exchangeRate, setExchangeRate] = useState(6.5); // Default exchange rate
  const [realExchangeRate, setRealExchangeRate] = useState(6.8); // Default real exchange rate
  const [summaryValues, setSummaryValues] = useState({
    tSell: 0,
    tExp: 0,
    tTaxBack: 0,
    tRSell: 0,
    eGP: 0,
    eGPM: 0
  });
  
  console.log('Rendering ComparisonForm');
  
  // Initialize form with default values
  useEffect(() => {
    console.log('Setting initial form values');
    form.setFieldsValue({
      client: client,
      exchangeRate: exchangeRate,
      realExchangeRate: realExchangeRate,
      items: []
    });
  }, []);
  
  // Handle client selection
  const handleClientChange = (clientId) => {
    console.log('Client changed to:', clientId);
    setClient(clientId);
  };
  
  // Handle exchange rate change
  const handleExchangeRateChange = (value) => {
    console.log('Exchange rate changed to:', value);
    setExchangeRate(value);
  };
  
  // Handle real exchange rate change
  const handleRealExchangeRateChange = (value) => {
    console.log('Real exchange rate changed to:', value);
    setRealExchangeRate(value);
    updateSummary();
  };
  
  // Calculate summary values
  const updateSummary = () => {
    const items = form.getFieldValue('items');
    if (!items || Object.keys(items).length === 0) {
      setSummaryValues({
        tSell: 0,
        tExp: 0,
        tTaxBack: 0,
        tRSell: 0,
        eGP: 0,
        eGPM: 0
      });
      return;
    }
    
    // Calculate totals
    let totalSell = 0;
    let totalExp = 0;
    let totalTaxBack = 0;
    
    Object.values(items).forEach(item => {
      // Add subtotal sales to total sell
      if (item.SubS) {
        totalSell += Number(item.SubS);
      }
      
      // Add subtotal purchase to total expense
      if (item.SubP) {
        totalExp += Number(item.SubP);
      }
      
      // Calculate tax return for this item: Exp * ETR / VAT
      if (item.Exp && item.ETR && item.VAT) {
        const taxReturn = Number(item.Exp) * Number(item.ETR) / Number(item.VAT);
        totalTaxBack += taxReturn;
      }
    });
    
    // Round to 2 decimal places
    totalSell = Math.round(totalSell * 100) / 100;
    totalExp = Math.round(totalExp * 100) / 100;
    totalTaxBack = Math.round(totalTaxBack * 100) / 100;
    
    // Calculate Total RMB Sells: TSell * RealE
    const totalRmbSell = totalSell * realExchangeRate;
    
    // Calculate Expected Gross Profit: TRSell + TTB - TExp
    const expectedGrossProfit = totalRmbSell + totalTaxBack - totalExp;
    
    // Calculate Expected Gross Profit Margin: EGP / TRSell
    const expectedGrossProfitMargin = totalRmbSell > 0 ? 
      (expectedGrossProfit / totalRmbSell * 100) : 0;
    
    // Round final values
    const finalTotalRmbSell = Math.round(totalRmbSell * 100) / 100;
    const finalExpectedGrossProfit = Math.round(expectedGrossProfit * 100) / 100;
    const finalExpectedGrossProfitMargin = Math.round(expectedGrossProfitMargin * 100) / 100;
    
    setSummaryValues({
      tSell: totalSell,
      tExp: totalExp,
      tTaxBack: totalTaxBack,
      tRSell: finalTotalRmbSell,
      eGP: finalExpectedGrossProfit,
      eGPM: finalExpectedGrossProfitMargin
    });
    
    console.log('Updated summary values:', {
      tSell: totalSell,
      tExp: totalExp,
      tTaxBack: totalTaxBack,
      tRSell: finalTotalRmbSell,
      eGP: finalExpectedGrossProfit,
      eGPM: finalExpectedGrossProfitMargin
    });
  };
  
  // Handle form item changes
  const handleItemsChange = () => {
    console.log('Items changed, updating summary');
    updateSummary();
  };
  
  // Handle form submission
  const onFinish = (values) => {
    console.log('Form submitted with values:', values);
  };
  
  // Auto-add first row when form loads
  const addField = useRef(null);
  useEffect(() => {
    if (addField.current) {
      console.log('Auto-adding first field');
      addField.current.click();
    }
  }, []);
  
  // Update summary when form values change - this was causing an infinite loop
  // useEffect(() => {
  //   updateSummary();
  // }, [form.getFieldsValue(), realExchangeRate]);
  
  // Better approach: only update when realExchangeRate changes
  useEffect(() => {
    updateSummary();
  }, [realExchangeRate]);
  
  return (
    <div>
      <h2>Comparison Form Test</h2>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={(changedValues, allValues) => {
          console.log('Form values changed:', { changedValues, allValues });
          updateSummary();
        }}
      >
        <Row gutter={[12, 12]}>
          <Col span={12}>
            <Form.Item
              name="client"
              label={translate('Client')}
              rules={[{ required: true, message: translate('Please select a client') }]}
            >
              <SelectAsync
                entity={'client'}
                displayLabels={['name']}
                outputValue="_id"
                onChange={handleClientChange}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="exchangeRate"
              label={translate('Exchange Rate (E)')}
              rules={[{ required: true, message: translate('Please enter exchange rate') }]}
              initialValue={exchangeRate}
              tooltip={translate('USD to CNY exchange rate for GP calculation')}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0.01}
                step={0.01}
                precision={2}
                placeholder={translate('Exchange Rate')}
                onChange={handleExchangeRateChange}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="realExchangeRate"
              label={translate('Real Exchange Rate (RealE)')}
              rules={[{ required: true, message: translate('Please enter real exchange rate') }]}
              initialValue={realExchangeRate}
              tooltip={translate('Actual USD to CNY exchange rate for final comparison')}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0.01}
                step={0.01}
                precision={2}
                placeholder={translate('Real Exchange Rate')}
                onChange={handleRealExchangeRateChange}
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Divider orientation="left">{translate('Items')}</Divider>
        
        <Form.List name="items">
          {(fields, { add, remove }) => (
            <>
              {console.log('Form.List fields:', fields)}
              
              {fields.map((field) => (
                <ComparisonItemRow
                  key={field.key}
                  field={field}
                  remove={remove}
                  form={form}
                  clientId={client}
                  exchangeRate={exchangeRate}
                  onValuesChange={handleItemsChange}
                />
              ))}
              
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => {
                    console.log('Adding new item');
                    add({ VAT: 1.13, ETR: 0.13, Qty: 1 }); // Add with default values
                    setTimeout(updateSummary, 100); // Update summary after a short delay
                  }}
                  icon={<PlusOutlined />}
                  ref={addField}
                >
                  {translate('Add Item')}
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
        
        <Divider orientation="left">{translate('Summary')}</Divider>
        
        <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
          <Col span={8}>
            <div className="summary-item">
              <div className="summary-label">{translate('Total Sells (TSell)')}</div>
              <div className="summary-value">${summaryValues.tSell.toFixed(2)}</div>
              <div className="summary-description">{translate('Sum of all subtotal sales in USD')}</div>
            </div>
          </Col>
          <Col span={8}>
            <div className="summary-item">
              <div className="summary-label">{translate('Total Expense (TExp)')}</div>
              <div className="summary-value">¥{summaryValues.tExp.toFixed(2)}</div>
              <div className="summary-description">{translate('Sum of all subtotal purchases in CNY')}</div>
            </div>
          </Col>
          <Col span={8}>
            <div className="summary-item">
              <div className="summary-label">{translate('Total Tax Back (TTB)')}</div>
              <div className="summary-value">¥{summaryValues.tTaxBack.toFixed(2)}</div>
              <div className="summary-description">{translate('Sum of all tax returns')}</div>
            </div>
          </Col>
          <Col span={8}>
            <div className="summary-item">
              <div className="summary-label">{translate('Total RMB Sells (TRSell)')}</div>
              <div className="summary-value">¥{summaryValues.tRSell.toFixed(2)}</div>
              <div className="summary-description">{translate('Total sells converted to CNY')}</div>
            </div>
          </Col>
          <Col span={8}>
            <div className="summary-item">
              <div className="summary-label">{translate('Expected Gross Profit (EGP)')}</div>
              <div className="summary-value">¥{summaryValues.eGP.toFixed(2)}</div>
              <div className="summary-description">{translate('TRSell + TTB - TExp')}</div>
            </div>
          </Col>
          <Col span={8}>
            <div className="summary-item">
              <div className="summary-label">{translate('Expected Gross Profit Margin (EGPM)')}</div>
              <div className="summary-value">{summaryValues.eGPM.toFixed(2)}%</div>
              <div className="summary-description">{translate('EGP / TRSell')}</div>
            </div>
          </Col>
        </Row>
        
        <Form.Item>
          <Button type="primary" htmlType="submit">
            {translate('Submit')}
          </Button>
        </Form.Item>
      </Form>
      
      <style jsx="true">{`
        .summary-item {
          border: 1px solid #f0f0f0;
          padding: 16px;
          border-radius: 4px;
          background-color: #fafafa;
        }
        .summary-label {
          font-weight: bold;
          margin-bottom: 8px;
        }
        .summary-value {
          font-size: 20px;
          color: #1890ff;
          margin-bottom: 8px;
        }
        .summary-description {
          color: #888;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
} 