import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Form, Input, Select, Button, Steps, message } from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  BankOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';

import { selectAuth } from '@/redux/auth/selectors';
import { request } from '@/request';
import AuthModule from '@/modules/AuthModule';
import Loading from '@/components/Loading';

// 国家列表
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

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { current: currentUser } = useSelector(selectAuth);

  const steps = [
    { title: 'About You', icon: <UserOutlined /> },
    { title: 'Your Company', icon: <BankOutlined /> },
  ];

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['phone', 'jobTitle']);
      }
      setCurrentStep(1);
    } catch (err) {
      // 校验失败，AntD 自动显示错误
    }
  };

  const handleBack = () => {
    setCurrentStep(0);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const response = await request.post({
        entity: 'admin/onboarding',
        jsonData: values,
      });

      if (response.success) {
        message.success('Welcome to Ola! 🎉');

        const auth_state = {
          current: response.result,
          isLoggedIn: true,
          isLoading: false,
          isSuccess: true,
        };
        window.localStorage.setItem('auth', JSON.stringify(auth_state));
        window.location.href = '/';
      } else {
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
      console.error('Onboarding submission failed:', err);
    }
  };

  const FormContainer = () => {
    return (
      <Loading isLoading={loading}>
        <Steps
          current={currentStep}
          items={steps}
          size="small"
          style={{ marginBottom: 30 }}
        />

        <Form
          form={form}
          layout="vertical"
          className="login-form" 
        >
          {/* Step 1: About You */}
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
            <Form.Item label="Email">
              <Input
                prefix={<MailOutlined className="site-form-item-icon" />}
                value={currentUser?.email || ''}
                disabled
                size="large"
              />
            </Form.Item>

            <Form.Item name="phone" label="Phone">
              <Input
                prefix={<PhoneOutlined className="site-form-item-icon" />}
                placeholder="+86 xxx xxxx xxxx"
                size="large"
              />
            </Form.Item>

            <Form.Item name="jobTitle" label="Job Title">
              <Input
                prefix={<UserOutlined className="site-form-item-icon" />}
                placeholder="e.g. Sales Manager"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                className="login-form-button"
                onClick={handleNext}
                size="large"
              >
                Continue
              </Button>
            </Form.Item>
          </div>

          {/* Step 2: Your Company */}
          <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
            <Form.Item
              name="companyName"
              label="Company Name"
              rules={[{ required: true, message: 'Company name is required' }]}
            >
              <Input
                prefix={<BankOutlined className="site-form-item-icon" />}
                placeholder="Your company's legal name"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="companyCountry"
              label="Country"
              rules={[{ required: true, message: 'Please select your country' }]}
            >
              <Select
                showSearch
                placeholder="Select your country"
                optionFilterProp="label"
                options={COUNTRY_OPTIONS}
                size="large"
                suffixIcon={<GlobalOutlined className="site-form-item-icon" />}
              />
            </Form.Item>

            <Form.Item name="companyAddress" label="Company Address">
              <Input
                prefix={<EnvironmentOutlined className="site-form-item-icon" />}
                placeholder="Street address, city, postal code"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="companyPhone"
              label="Company Phone"
            >
              <Input
                prefix={<PhoneOutlined className="site-form-item-icon" />}
                placeholder="Office phone"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="companyEmail"
              label="Company Email"
              rules={[
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input
                prefix={<MailOutlined className="site-form-item-icon" />}
                placeholder="contact@company.com"
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 30 }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <Button onClick={handleBack} size="large" style={{ flex: 1 }}>
                  Back
                </Button>
                <Button type="primary" onClick={handleSubmit} loading={loading} size="large" style={{ flex: 2 }}>
                  Complete Workspace
                </Button>
              </div>
            </Form.Item>
          </div>
        </Form>
      </Loading>
    );
  };

  const title = currentStep === 0 ? 'Welcome to Ola! 👋' : 'Almost there! 🏢';

  return <AuthModule authContent={<FormContainer />} AUTH_TITLE={title} />;
}
