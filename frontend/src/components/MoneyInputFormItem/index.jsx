import { Form, InputNumber } from 'antd';
import { useMoney } from '@/settings';
import currency from 'currency.js';
import { useEffect, useState } from 'react';

export default function MoneyInputFormItem({ 
  updatePrice, 
  value = 0, 
  readOnly = false,
  currency: selectedCurrency = null 
}) {
  const [currentCurrency, setCurrentCurrency] = useState(selectedCurrency);
  const { 
    amountFormatter,
    currency_symbol,
    currency_position,
    cent_precision
  } = useMoney();

  useEffect(() => {
    setCurrentCurrency(selectedCurrency);
  }, [selectedCurrency]);

  const formatMoney = (amount) => {
    if (!currentCurrency) {
      return amountFormatter({ amount });
    }

    const formattedAmount = currency(amount, {
      separator: currentCurrency.thousand_separator,
      decimal: currentCurrency.decimal_separator,
      symbol: '',
      precision: currentCurrency.cent_precision,
    }).format();

    return currentCurrency.currency_position === 'before'
      ? `${currentCurrency.currency_symbol} ${formattedAmount}`
      : `${formattedAmount} ${currentCurrency.currency_symbol}`;
  };

  return (
    <Form.Item>
      <InputNumber
        readOnly={readOnly}
        className="moneyInput"
        onChange={updatePrice}
        precision={currentCurrency?.cent_precision || cent_precision}
        value={value}
        controls={false}
        addonAfter={currency_position === 'after' ? (currentCurrency?.currency_symbol || currency_symbol) : undefined}
        addonBefore={currency_position === 'before' ? (currentCurrency?.currency_symbol || currency_symbol) : undefined}
        formatter={(value) => formatMoney(value)}
      />
    </Form.Item>
  );
}
