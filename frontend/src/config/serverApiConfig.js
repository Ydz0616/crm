// Get API URL from environment or use default
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_APP_API_URL) {
    return import.meta.env.VITE_APP_API_URL;
  }
  // 确保API路径正确
  return 'http://localhost:8888/api/';
};

// API URL 配置
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'http://129.226.142.103:30888/api/'  // 确保以斜杠结尾
  : 'http://localhost:8888/api/';

// 添加调试日志
console.warn('API_BASE_URL is set to:', API_BASE_URL);

export const BASE_URL =
  import.meta.env.PROD || import.meta.env.VITE_DEV_REMOTE
    ? import.meta.env.VITE_BACKEND_SERVER
    : 'http://localhost:8888/';

export const WEBSITE_URL = import.meta.env.PROD
  ? 'http://cloud.idurarapp.com/'
  : 'http://localhost:3000/';
export const DOWNLOAD_BASE_URL =
  import.meta.env.PROD || import.meta.env.VITE_DEV_REMOTE
    ? import.meta.env.VITE_BACKEND_SERVER + 'download/'
    : 'http://localhost:8888/download/';
export const ACCESS_TOKEN_NAME = 'x-auth-token';

export const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL || 'http://localhost:8888/';

// For debugging
console.log('API_BASE_URL:', API_BASE_URL);
console.log('BASE_URL:', BASE_URL);
console.log('FILE_BASE_URL:', FILE_BASE_URL);

//  console.log(
//    '🚀 Welcome to IDURAR ERP CRM! Did you know that we also offer commercial customization services? Contact us at hello@idurarapp.com for more information.'
//  );
