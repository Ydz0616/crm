import { useState, useEffect } from 'react';
import { request } from '@/request';
import useFetch from '@/hooks/useFetch';
import { Select, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { generate as uniqueId } from 'shortid';
import color from '@/utils/color';
import useLanguage from '@/locale/useLanguage';

const SelectAsync = ({
  entity,
  displayLabels = ['name'],
  outputValue = '_id',
  redirectLabel = '',
  withRedirect = false,
  urlToRedirect = '/',
  placeholder = 'select',
  value,
  onChange,
  filters = {},
  searchFields,
  disabled = false,
  notFoundContent,
}) => {
  const translate = useLanguage();
  const [selectOptions, setOptions] = useState([]);
  const [currentValue, setCurrentValue] = useState(undefined);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      if (entity) {
        setLoading(true);
        try {
          let options = {};
          
          // 处理filters对象，转换为后端API期望的格式
          if (filters && Object.keys(filters).length > 0) {
            const filterKey = Object.keys(filters)[0];
            const filterValue = filters[filterKey];
            
            if (filterKey && filterValue) {
              options.filter = filterKey;
              options.equal = filterValue;
            }
          }
          
          // 如果提供了searchFields，添加到options中
          if (searchFields) {
            options.searchFields = searchFields;
          }
          
          const response = await request.list({ entity, options });
          
          if (response.success) {
            setOptions(response.result);
          }
        } catch (error) {
          console.error(`Error loading ${entity} data:`, error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [entity, JSON.stringify(filters)]);

  const labels = (optionField) => {
    return displayLabels.map((x) => optionField[x]).join(' ');
  };
  
  useEffect(() => {
    if (value !== undefined) {
      const val = value[outputValue] ?? value;
      setCurrentValue(val);
      onChange && onChange(val);
    }
  }, [value]);

  const handleSelectChange = (newValue, option) => {
    if (newValue === 'redirectURL') {
      navigate(urlToRedirect);
    } else {
      const val = newValue[outputValue] ?? newValue;
      setCurrentValue(newValue);
      onChange && onChange(val, option);
    }
  };

  const optionsList = () => {
    const list = [];

    selectOptions.map((optionField) => {
      const value = optionField[outputValue] ?? optionField;
      const label = labels(optionField);
      const currentColor = optionField[outputValue]?.color ?? optionField?.color;
      const labelColor = color.find((x) => x.color === currentColor);
      list.push({ value, label, color: labelColor?.color });
    });

    return list;
  };

  return (
    <Select
      loading={loading}
      disabled={disabled || loading}
      value={currentValue}
      onChange={handleSelectChange}
      placeholder={placeholder}
      notFoundContent={notFoundContent}
      showSearch
      filterOption={(input, option) => 
        option.children.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
      }
    >
      {optionsList()?.map((option) => {
        return (
          <Select.Option key={`${uniqueId()}`} value={option.value} label={option.label}>
            <Tag bordered={false} color={option.color}>
              {option.label}
            </Tag>
          </Select.Option>
        );
      })}
      {withRedirect && (
        <Select.Option value={'redirectURL'}>{`+ ` + translate(redirectLabel)}</Select.Option>
      )}
    </Select>
  );
};

export default SelectAsync;
