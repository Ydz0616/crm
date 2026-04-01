import { useState, useEffect } from 'react';
import { Form, Input, Button, Select, message } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { request } from '@/request';
import Loading from '@/components/Loading';

const COUNTRY_OPTIONS = [
  { value: 'CN', label: '🇨🇳 China' },
  { value: 'US', label: '🇺🇸 United States' },
  { value: 'DE', label: '🇩🇪 Germany' },
  { value: 'GB', label: '🇬🇧 United Kingdom' },
  { value: 'JP', label: '🇯🇵 Japan' },
  { value: 'KR', label: '🇰🇷 South Korea' },
  { value: 'RU', label: '🇷🇺 Russia' },
  { value: 'IN', label: '🇮🇳 India' },
  { value: 'BR', label: '🇧🇷 Brazil' },
  { value: 'AU', label: '🇦🇺 Australia' },
  { value: 'CA', label: '🇨🇦 Canada' },
  { value: 'FR', label: '🇫🇷 France' },
  { value: 'IT', label: '🇮🇹 Italy' },
  { value: 'ES', label: '🇪🇸 Spain' },
  { value: 'NL', label: '🇳🇱 Netherlands' },
  { value: 'TR', label: '🇹🇷 Turkey' },
  { value: 'MX', label: '🇲🇽 Mexico' },
  { value: 'TH', label: '🇹🇭 Thailand' },
  { value: 'VN', label: '🇻🇳 Vietnam' },
  { value: 'ID', label: '🇮🇩 Indonesia' },
  { value: 'MY', label: '🇲🇾 Malaysia' },
  { value: 'PH', label: '🇵🇭 Philippines' },
  { value: 'SA', label: '🇸🇦 Saudi Arabia' },
  { value: 'AE', label: '🇦🇪 UAE' },
  { value: 'EG', label: '🇪🇬 Egypt' },
  { value: 'ZA', label: '🇿🇦 South Africa' },
  { value: 'NG', label: '🇳🇬 Nigeria' },
  { value: 'PK', label: '🇵🇰 Pakistan' },
  { value: 'BD', label: '🇧🇩 Bangladesh' },
  { value: 'AR', label: '🇦🇷 Argentina' },
  { value: 'CL', label: '🇨🇱 Chile' },
  { value: 'CO', label: '🇨🇴 Colombia' },
  { value: 'PE', label: '🇵🇪 Peru' },
  { value: 'PL', label: '🇵🇱 Poland' },
  { value: 'SE', label: '🇸🇪 Sweden' },
  { value: 'NO', label: '🇳🇴 Norway' },
  { value: 'DK', label: '🇩🇰 Denmark' },
  { value: 'FI', label: '🇫🇮 Finland' },
  { value: 'NZ', label: '🇳🇿 New Zealand' },
  { value: 'SG', label: '🇸🇬 Singapore' },
  { value: 'HK', label: '🇭🇰 Hong Kong' },
  { value: 'TW', label: '🇹🇼 Taiwan' }
].sort((a, b) => a.label.localeCompare(b.label));

export default function SettingsGeneral() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setFetching(true);
      const response = await request.listAll({ entity: 'setting' });
      if (response.success && response.result) {
        const settingsObj = {};
        response.result.forEach((item) => {
          settingsObj[item.settingKey] = item.settingValue;
        });
        form.setFieldsValue(settingsObj);
      }
    } catch (error) {
      console.error('Failed to fetch settings', error);
      message.error('Failed to load company settings');
    } finally {
      setFetching(false);
    }
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      const settingsArray = Object.keys(values).map((key) => ({
        settingKey: key,
        settingValue: values[key] === undefined || values[key] === null ? '' : values[key],
      }));

      const response = await request.patch({
        entity: 'setting/updateManySetting',
        jsonData: { settings: settingsArray },
      });

      if (response.success) {
        message.success('Company settings updated successfully!');
      } else {
        message.error(response.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Update settings error:', error);
      message.error('An error occurred while updating settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="general-settings-section">
      <h1 className="general-settings-title">Company Settings</h1>
      <p className="general-settings-subtitle">
        Manage your company information
      </p>

      <hr className="general-settings-divider" />

      <Loading isLoading={fetching}>
        <div className="general-company-block">
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            className="general-form-container"
          >
            <div className="general-fields-row">
              <Form.Item
                name="company_name"
                label={<span className="general-field-label">Company Name</span>}
                className="general-field-group"
                rules={[{ required: true, message: 'Company name is required' }]}
              >
                <Input className="general-field-input" size="large" placeholder="Enter company name" />
              </Form.Item>

              <Form.Item
                name="company_email"
                label={<span className="general-field-label">Company Email</span>}
                className="general-field-group"
                rules={[{ type: 'email', message: 'Enter a valid email' }]}
              >
                <Input className="general-field-input" size="large" placeholder="Enter company email" />
              </Form.Item>
            </div>

            <div className="general-fields-row">
              <Form.Item
                name="company_phone"
                label={<span className="general-field-label">Company Phone</span>}
                className="general-field-group"
              >
                <Input className="general-field-input" size="large" placeholder="Enter phone number" />
              </Form.Item>

              <Form.Item
                name="company_website"
                label={<span className="general-field-label">Company Website</span>}
                className="general-field-group"
              >
                <Input className="general-field-input" size="large" placeholder="Enter website URL" />
              </Form.Item>
            </div>

            <div className="general-fields-row">
              <Form.Item
                name="company_address"
                label={<span className="general-field-label">Company Address</span>}
                className="general-field-group"
              >
                <Input className="general-field-input" size="large" placeholder="Enter address" />
              </Form.Item>

              <Form.Item
                name="company_state"
                label={<span className="general-field-label">State</span>}
                className="general-field-group"
              >
                <Input className="general-field-input" size="large" placeholder="Enter state" />
              </Form.Item>
            </div>

            <div className="general-fields-row">
              <Form.Item
                name="company_country"
                label={<span className="general-field-label">Country</span>}
                className="general-field-group"
                rules={[{ required: true, message: 'Company country is required' }]}
              >
                <Select
                  showSearch
                  placeholder="Select your country"
                  optionFilterProp="label"
                  options={COUNTRY_OPTIONS}
                  size="large"
                  suffixIcon={<GlobalOutlined className="site-form-item-icon" />}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                name="company_tax_number"
                label={<span className="general-field-label">Tax Number</span>}
                className="general-field-group"
              >
                <Input className="general-field-input" size="large" placeholder="Enter tax number" />
              </Form.Item>
            </div>

            <div className="general-fields-row">
              <Form.Item
                name="company_vat_number"
                label={<span className="general-field-label">VAT Number</span>}
                className="general-field-group"
              >
                <Input className="general-field-input" size="large" placeholder="Enter VAT number" />
              </Form.Item>

              <Form.Item
                name="company_reg_number"
                label={<span className="general-field-label">Registration Number</span>}
                className="general-field-group"
              >
                <Input className="general-field-input" size="large" placeholder="Enter registration number" />
              </Form.Item>
            </div>

            <Form.Item style={{ marginTop: '32px' }}>
              <Button type="primary" htmlType="submit" size="large" loading={loading}>
                Save Changes
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Loading>
    </div>
  );
}
