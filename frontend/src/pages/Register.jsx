import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import useLanguage from '@/locale/useLanguage';
import { Form, Button, Typography } from 'antd';

import { register } from '@/redux/auth/actions';
import { selectAuth } from '@/redux/auth/selectors';
import RegisterForm from '@/forms/RegisterForm';
import Loading from '@/components/Loading';
import AuthModule from '@/modules/AuthModule';

const { Text } = Typography;

const RegisterPage = () => {
  const translate = useLanguage();
  const { isLoading } = useSelector(selectAuth);
  const dispatch = useDispatch();

  const onFinish = (values) => {
    // 剔除 confirmPassword，后端 API 需要 name, surname, email, password
    const { confirmPassword, ...registerData } = values;
    dispatch(register({ registerData }));
  };

  // 注册成功后 Redux 自动设为 isLoggedIn=true（auto-login），
  // OlaOs 会检测 onboarded===false 并显示上车表单。无需手动 navigate。

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
