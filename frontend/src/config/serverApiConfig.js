// Get API URL from environment or use default
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_APP_API_URL) {
    return import.meta.env.VITE_APP_API_URL;
  }
  // 确保API路径正确
  return 'http://localhost:8888/api/';
};

// API URL 配置
export const API_BASE_URL = import.meta.env.VITE_APP_API_URL 
  ? import.meta.env.VITE_APP_API_URL  // 使用环境变量
  : 'http://localhost:8888/api/';     // 本地开发默认值

// 添加调试日志
console.warn('API_BASE_URL is set to:', API_BASE_URL);

export const BASE_URL =
  import.meta.env.PROD || import.meta.env.VITE_DEV_REMOTE
    ? import.meta.env.VITE_BACKEND_SERVER || 'http://localhost:8888/'
    : 'http://localhost:8888/';

export const WEBSITE_URL = import.meta.env.PROD
  ? import.meta.env.VITE_WEBSITE_URL || 'http://localhost:3000/'
  : 'http://localhost:3000/';
  
export const DOWNLOAD_BASE_URL =
  import.meta.env.PROD || import.meta.env.VITE_DEV_REMOTE
    ? (import.meta.env.VITE_BACKEND_SERVER || 'http://localhost:8888/') + 'download/'
    : 'http://localhost:8888/download/';

// Excel导出URL配置
export const EXCEL_EXPORT_BASE_URL =
  import.meta.env.PROD || import.meta.env.VITE_DEV_REMOTE
    ? (import.meta.env.VITE_BACKEND_SERVER || 'http://localhost:8888/') + 'export/excel/'
    : 'http://localhost:8888/export/excel/';
    
export const ACCESS_TOKEN_NAME = 'x-auth-token';

export const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL || 'http://localhost:8888/';

// For debugging
console.log('API_BASE_URL:', API_BASE_URL);
console.log('BASE_URL:', BASE_URL);
console.log('FILE_BASE_URL:', FILE_BASE_URL);
console.log('EXCEL_EXPORT_BASE_URL:', EXCEL_EXPORT_BASE_URL);

//  console.log(
//    '🚀 Welcome to Ola ERP CRM!'
//  );
