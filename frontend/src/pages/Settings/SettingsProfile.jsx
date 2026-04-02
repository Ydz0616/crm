import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Form, Input, Button, message } from 'antd';
import { InfoCircleOutlined, UserOutlined, MailOutlined } from '@ant-design/icons';

import { selectAuth } from '@/redux/auth/selectors';
import * as actionTypes from '@/redux/auth/types';
import { request } from '@/request';

export default function SettingsProfile() {
  const { current: currentUser } = useSelector(selectAuth);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    if (currentUser) {
      form.setFieldsValue({
        name: currentUser.name,
        surname: currentUser.surname,
        email: currentUser.email,
      });
    }
  }, [currentUser, form]);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      // 保持和旧接口一致的 payload (email, name, surname)
      const payload = {
        name: values.name,
        surname: values.surname,
        email: currentUser.email, // 确保 email 不能被表单欺骗修改
      };

      const { success, result, message: msg } = await request.patch({
        entity: 'admin/profile/update',
        jsonData: payload,
      });

      if (success) {
        message.success('Profile updated successfully!');
        
        // 更新 localStorage 的 auth state
        const storedAuth = JSON.parse(window.localStorage.getItem('auth'));
        if (storedAuth) {
          storedAuth.current = { ...storedAuth.current, ...payload };
          window.localStorage.setItem('auth', JSON.stringify(storedAuth));
        }

        // 同步 Redux store
        dispatch({ type: actionTypes.REQUEST_SUCCESS, payload: storedAuth.current });
      } else {
        message.error(msg || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      message.error('An error occurred during update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-section">
      {/* Title */}
      <h1 className="profile-title">Profile</h1>
      <p className="profile-subtitle">Manage your personal details</p>

      {/* Info banner */}
      <div className="profile-info-banner">
        <InfoCircleOutlined />
        <span>Changes to your profile will apply to all of your workspaces.</span>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        className="profile-form-container"
      >
        <div className="profile-form-row">
          <Form.Item
            name="name"
            label={<span className="profile-form-label">First Name</span>}
            className="profile-form-group"
            rules={[{ required: true, message: 'First name is required' }]}
          >
            <Input className="profile-form-input" prefix={<UserOutlined style={{color: '#bfbfbf', marginRight: 5}}/>} />
          </Form.Item>

          <Form.Item
            name="surname"
            label={<span className="profile-form-label">Last Name</span>}
            className="profile-form-group"
          >
            <Input className="profile-form-input" prefix={<UserOutlined style={{color: '#bfbfbf', marginRight: 5}}/>} />
          </Form.Item>
        </div>

        <div className="profile-email-row" style={{ marginTop: '24px' }}>
          <Form.Item
            name="email"
            label={<span className="profile-form-label">Primary email address</span>}
            className="profile-form-group"
            style={{ width: '100%' }}
          >
            <Input className="profile-form-input" disabled prefix={<MailOutlined style={{color: '#bfbfbf', marginRight: 5}}/>} />
          </Form.Item>
        </div>

        <Form.Item style={{ marginTop: '32px' }}>
          <Button type="primary" htmlType="submit" size="large" loading={loading}>
            Save Changes
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
