import React from 'react';
import { Form, Input } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';

import useLanguage from '@/locale/useLanguage';

export default function RegisterForm() {
  const translate = useLanguage();
  return (
    <div>
      <Form.Item style={{ marginBottom: 0 }}>
        <Form.Item
          label={translate('first_name')}
          name="name"
          rules={[
            {
              required: true,
              message: 'Please input your first name!',
            },
          ]}
          style={{ display: 'inline-block', width: 'calc(50% - 8px)' }}
        >
          <Input
            prefix={<UserOutlined className="site-form-item-icon" />}
            placeholder={translate('first_name')}
            size="large"
          />
        </Form.Item>

        <Form.Item
          label={translate('last_name')}
          name="surname"
          style={{ display: 'inline-block', width: 'calc(50% - 8px)', margin: '0 0 0 16px' }}
        >
          <Input
            prefix={<UserOutlined className="site-form-item-icon" />}
            placeholder={translate('last_name')}
            size="large"
          />
        </Form.Item>
      </Form.Item>
      
      <Form.Item
        label={translate('email')}
        name="email"
        rules={[
          {
            required: true,
            message: 'Please input your email!',
          },
          {
            type: 'email',
            message: 'Invalid email address!',
          },
        ]}
      >
        <Input
          prefix={<MailOutlined className="site-form-item-icon" />}
          placeholder={translate('email')}
          type="email"
          size="large"
        />
      </Form.Item>

      <Form.Item
        label={translate('password')}
        name="password"
        rules={[
          {
            required: true,
            message: 'Please input your password!',
          },
          {
            min: 8,
            message: 'Password must be at least 8 characters.',
          }
        ]}
      >
        <Input.Password
          prefix={<LockOutlined className="site-form-item-icon" />}
          placeholder={translate('password')}
          size="large"
        />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        label="Confirm Password"
        dependencies={['password']}
        rules={[
          {
            required: true,
            message: 'Please confirm your password!',
          },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('The two passwords that you entered do not match!'));
            },
          }),
        ]}
      >
        <Input.Password
          prefix={<LockOutlined className="site-form-item-icon" />}
          placeholder="Confirm Password"
          size="large"
        />
      </Form.Item>
    </div>
  );
}
