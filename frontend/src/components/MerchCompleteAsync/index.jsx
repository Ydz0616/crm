import { useState, useEffect, useRef } from 'react';

import { request } from '@/request';
import useOnFetch from '@/hooks/useOnFetch';
import useDebounce from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';

import { Select, Empty } from 'antd';
import useLanguage from '@/locale/useLanguage';

export default function MerchCompleteAsync({
  entity,
  displayLabels,
  searchFields,
  outputValue = '_id',
  redirectLabel = 'Add New',
  withRedirect = false,
  urlToRedirect = '/',
  value, /// this is for update
  onChange, /// this is for update
  onItemSelect, // New prop to handle item selection
}) {
  const translate = useLanguage();

  const addNewValue = { value: 'redirectURL', label: `+ ${translate(redirectLabel)}` };

  const [selectOptions, setOptions] = useState([]);
  const [currentValue, setCurrentValue] = useState(undefined);

  const isUpdating = useRef(true);
  const isSearching = useRef(false);

  const [searching, setSearching] = useState(false);

  const [valToSearch, setValToSearch] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  const navigate = useNavigate();

  const handleSelectChange = (newValue, option) => {
    isUpdating.current = false;
    if (onChange) {
      if (newValue) onChange(newValue);
    }
    if (newValue === 'redirectURL' && withRedirect) {
      navigate(urlToRedirect);
    }
    // Call onItemSelect with the full item data
    if (onItemSelect && option && option.data) {
      onItemSelect(option.data);
    }
  };

  const handleOnSelect = (value) => {
    setCurrentValue(value[outputValue] || value); // set nested value or value
  };

  const [, cancel] = useDebounce(
    () => {
      //  setState("Typing stopped");
      setDebouncedValue(valToSearch);
    },
    500,
    [valToSearch]
  );

  const asyncSearch = async (options) => {
    console.log('Async search called with options:', options);
    return await request.search({ entity, options });
  };

  let { onFetch, result, isSuccess, isLoading } = useOnFetch();

  const labels = (optionField) => {
    console.log('Labels function called with optionField:', optionField);
    if (!optionField) return '';
    
    // Only show the serial number in the dropdown
    if (displayLabels.includes('serialNumber')) {
      return optionField.serialNumber;
    }
    
    // Default behavior
    return displayLabels.map((x) => optionField[x]).join(' ');
  };
  

  useEffect(() => {
    console.log('useEffect called with debouncedValue:', debouncedValue);
    const options = {
      q: debouncedValue,
      fields: searchFields,
    };
    console.log('Debounced search triggered with value:', debouncedValue);
    console.log('Search options:', options);
    const callback = asyncSearch(options);
    onFetch(callback);

    return () => {
      cancel();
    };
  }, [debouncedValue]);

  const onSearch = (searchText) => {
    console.log('onSearch called with text:', searchText);
    isSearching.current = true;
    setSearching(true);
    // setOptions([]);
    // setCurrentValue(undefined);
    setValToSearch(searchText);
  };

  useEffect(() => {
    console.log('Search Result Effect:', {
      result,
      isSuccess,
      isLoading,
      selectOptions,
      currentValue
    });
    if (isSuccess) {
      setOptions(result);
    } else {
      setSearching(false);
    }
  }, [isSuccess, result]);
  useEffect(() => {
    // this for update Form , it's for setField
    if (value && isUpdating.current) {
      setOptions([value]);
      setCurrentValue(value[outputValue] || value); // set nested value or value
      onChange(value[outputValue] || value);
      isUpdating.current = false;
    }
  }, [value]);

  return (
    console.log('MerchCompleteAsync rendered with currentValue:', currentValue),
    <Select
      loading={isLoading}
      showSearch
      allowClear
      placeholder={translate('Search')}
      defaultActiveFirstOption={false}
      filterOption={false}
      notFoundContent={searching ? '... Searching' : <Empty />}
      value={currentValue}
      onSearch={onSearch}
      onClear={() => {
        // setOptions([]);
        // setCurrentValue(undefined);
        setSearching(false);
      }}
      onChange={handleSelectChange}
      // style: the wideth of this should follow the parent component
      style={{ width: '100%' }}
      // onSelect={handleOnSelect}
    >
      {selectOptions.map((optionField) => (
        <Select.Option
          key={optionField[outputValue] || optionField}
          value={optionField[outputValue] || optionField}
          data={optionField} // Store full item data
        >
          {labels(optionField)}
        </Select.Option>
      ))}
      {withRedirect && <Select.Option value={addNewValue.value}>{addNewValue.label}</Select.Option>}
    </Select>
  );
}
