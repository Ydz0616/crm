import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';

import useLanguage from '@/locale/useLanguage';
import { Form, Button, Typography, notification } from 'antd';

import { register } from '@/redux/auth/actions';
import { selectAuth } from '@/redux/auth/selectors';
import RegisterForm from '@/forms/RegisterForm';
import Loading from '@/components/Loading';
import AuthModule from '@/modules/AuthModule';

const { Text } = Typography;

const RegisterPage = () => {
  const translate = useLanguage();
  const { isLoading, isSuccess } = useSelector(selectAuth);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const onFinish = (values) => {
    // 剔除 confirmPassword, 因为后端 API 只需要 name, email, password
    const { confirmPassword, ...registerData } = values;
    dispatch(register({ registerData }));
  };

  useEffect(() => {
    if (isSuccess) {
      // 当 register success 返回时
      notification.success({
        message: 'Registration Successful',
        description: 'You can now log in with your new credentials.',
      });
      dispatch({ type: 'AUTH_RESET_STATE' });
      // 成功后自动跳转到 Login 页面强制用户输入密码以获取包含身份令牌的 Context
      navigate('/login');
    }
  }, [isSuccess]);

  const FormContainer = () => {
    return (
      <Loading isLoading={isLoading}>
        <Form
          layout="vertical"
          name="register_form"
          className="login-form"
          onFinish={onFinish}
        >
          <RegisterForm />
          
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="login-form-button"
              loading={isLoading}
              size="large"
            >
              Sign up
            </Button>
          </Form.Item>
          
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <Text>Already have an account? </Text>
            <Link to="/login">Log in</Link>
          </div>
        </Form>
      </Loading>
    );
  };

  return <AuthModule authContent={<FormContainer />} AUTH_TITLE="Sign up" />;
};

export default RegisterPage;
