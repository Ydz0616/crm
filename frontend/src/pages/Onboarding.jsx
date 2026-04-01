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
  RocketOutlined,
} from '@ant-design/icons';

import { selectAuth } from '@/redux/auth/selectors';
import { request } from '@/request';

import logo from '@/style/images/logo.png';

// 国家列表（外贸常用 top countries + 完整列表可后续扩展）
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
      // 只校验当前 step 的字段
      if (currentStep === 0) {
        await form.validateFields(['firstName', 'lastName', 'phone', 'jobTitle']);
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

        // 更新 localStorage auth state → onboarded: true
        const auth_state = {
          current: response.result,
          isLoggedIn: true,
          isLoading: false,
          isSuccess: true,
        };
        window.localStorage.setItem('auth', JSON.stringify(auth_state));

        // 强制跳转到首页：Onboarding 在 Router 外部，无法用 useNavigate，
        // 且需要清除浏览器 URL（可能停留在 /register）
        window.location.href = '/';
      } else {
        setLoading(false);
        // errorHandler 已弹 notification
      }
    } catch (err) {
      setLoading(false);
      console.error('Onboarding submission failed:', err);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        {/* Header */}
        <div className="onboarding-header">
          <img src={logo} alt="Ola" className="onboarding-logo" />
          <h1 className="onboarding-title">
            {currentStep === 0 ? 'Welcome to Ola! 👋' : 'Almost there! 🏢'}
          </h1>
          <p className="onboarding-subtitle">
            {currentStep === 0
              ? "Let's set up your workspace in under a minute"
              : 'Tell us about your company for your documents'}
          </p>
        </div>

        {/* Steps indicator */}
        <Steps
          current={currentStep}
          items={steps}
          className="onboarding-steps"
          size="small"
        />

        {/* Form */}
        <Form
          form={form}
          layout="vertical"
          className="onboarding-form"
          initialValues={{
            firstName: currentUser?.name || '',
            lastName: currentUser?.surname || '',
          }}
        >
          {/* Step 1: About You */}
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
            <div className="onboarding-form-row">
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: 'First name is required' }]}
                className="onboarding-form-item"
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="First name"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="lastName"
                label="Last Name"
                className="onboarding-form-item"
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Last name"
                  size="large"
                />
              </Form.Item>
            </div>

            <Form.Item
              label="Email"
            >
              <Input
                prefix={<MailOutlined />}
                value={currentUser?.email || ''}
                disabled
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="phone"
              label="Phone"
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="+86 xxx xxxx xxxx"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="jobTitle"
              label="Job Title"
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="e.g. Sales Manager"
                size="large"
              />
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
                prefix={<BankOutlined />}
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
                suffixIcon={<GlobalOutlined />}
              />
            </Form.Item>

            <Form.Item
              name="companyAddress"
              label="Company Address"
            >
              <Input
                prefix={<EnvironmentOutlined />}
                placeholder="Street address, city, postal code"
                size="large"
              />
            </Form.Item>

            <div className="onboarding-form-row">
              <Form.Item
                name="companyPhone"
                label="Company Phone"
                className="onboarding-form-item"
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="Office phone"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="companyEmail"
                label="Company Email"
                className="onboarding-form-item"
                rules={[
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="contact@company.com"
                  size="large"
                />
              </Form.Item>
            </div>
          </div>
        </Form>

        {/* Actions */}
        <div className="onboarding-actions">
          {currentStep === 0 ? (
            <Button
              type="primary"
              size="large"
              onClick={handleNext}
              className="onboarding-btn-next"
            >
              Next →
            </Button>
          ) : (
            <>
              <Button
                size="large"
                onClick={handleBack}
                className="onboarding-btn-back"
              >
                ← Back
              </Button>
              <Button
                type="primary"
                size="large"
                onClick={handleSubmit}
                loading={loading}
                icon={<RocketOutlined />}
                className="onboarding-btn-submit"
              >
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Footer hint */}
        <p className="onboarding-footer-hint">
          You can update these details anytime in Settings
        </p>
      </div>
    </div>
  );
}
