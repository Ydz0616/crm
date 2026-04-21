import axios from 'axios';
import errorHandler from '@/request/errorHandler';
import successHandler from '@/request/successHandler';

// 注意：这里所有请求用相对路径（不加 API_BASE_URL 前缀）。request.js 已经
// 设置了 axios.defaults.baseURL = API_BASE_URL。再拼前缀会触发 axios 的
// URL 合并 bug —— 形如 `${API_BASE_URL}login` = `/api/login`，axios 只把
// 带 `://` 的字符串视为绝对，所以会把 `/api/` + `/api/login` 拼成
// `/api/api/login`，backend 404 → fall-through → 401 "No auth token"。
// 之前 API_BASE_URL 是 `https://app.olajob.cn/api/` 因为含 `://` 绝对模式被
// 跳过 baseURL 合并才偶然能跑通；换 same-origin 相对路径后才暴露。

export const login = async ({ loginData }) => {
  try {
    const response = await axios.post(`login?timestamp=${Date.now()}`, loginData);

    const { status, data } = response;

    successHandler(
      { data, status },
      {
        notifyOnSuccess: false,
        notifyOnFailed: true,
      }
    );
    return data;
  } catch (error) {
    console.error('Login error:', error);
    return errorHandler(error);
  }
};

export const register = async ({ registerData }) => {
  try {
    const response = await axios.post('register', registerData);

    const { status, data } = response;

    successHandler(
      { data, status },
      {
        notifyOnSuccess: true,
        notifyOnFailed: true,
      }
    );
    return data;
  } catch (error) {
    return errorHandler(error);
  }
};

export const verify = async ({ userId, emailToken }) => {
  try {
    const response = await axios.get(`verify/${userId}/${emailToken}`);

    const { status, data } = response;

    successHandler(
      { data, status },
      {
        notifyOnSuccess: true,
        notifyOnFailed: true,
      }
    );
    return data;
  } catch (error) {
    return errorHandler(error);
  }
};

export const resetPassword = async ({ resetPasswordData }) => {
  try {
    const response = await axios.post('resetpassword', resetPasswordData);

    const { status, data } = response;

    successHandler(
      { data, status },
      {
        notifyOnSuccess: true,
        notifyOnFailed: true,
      }
    );
    return data;
  } catch (error) {
    return errorHandler(error);
  }
};
export const logout = async () => {
  axios.defaults.withCredentials = true;
  try {
    // window.localStorage.clear();
    const response = await axios.post(`logout?timestamp=${Date.now()}`);
    const { status, data } = response;

    successHandler(
      { data, status },
      {
        notifyOnSuccess: false,
        notifyOnFailed: true,
      }
    );
    return data;
  } catch (error) {
    return errorHandler(error);
  }
};

//  console.log(
//    '🚀 Welcome to Ola ERP CRM!'
//  );
