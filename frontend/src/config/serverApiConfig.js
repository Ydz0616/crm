// Same-origin 默认：访问任何域名都自动打同源 /api、/download、/export、/public
// 这样 app.olatech.ai 和 app.olajob.cn 共用一份 build，无跨域 cookie/CORS 问题
// VITE_BACKEND_SERVER 仍可用作 override（例如嵌入第三方站点时指定绝对后端）
const BACKEND_SERVER = import.meta.env.VITE_BACKEND_SERVER || '/';

export const BASE_URL = BACKEND_SERVER;
export const API_BASE_URL = import.meta.env.VITE_APP_API_URL || BACKEND_SERVER + 'api/';
export const DOWNLOAD_BASE_URL = BACKEND_SERVER + 'download/';
export const EXCEL_EXPORT_BASE_URL = BACKEND_SERVER + 'export/excel/';
export const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL || BACKEND_SERVER;
export const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL || '';

export const ACCESS_TOKEN_NAME = 'x-auth-token';
