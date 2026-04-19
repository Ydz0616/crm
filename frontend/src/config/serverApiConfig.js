const BACKEND_SERVER = import.meta.env.VITE_BACKEND_SERVER;

if (!BACKEND_SERVER) {
  throw new Error(
    '[serverApiConfig] VITE_BACKEND_SERVER is required. ' +
      'Set it in frontend/.env for dev (e.g. http://localhost:8888/) ' +
      'or pass as docker build ARG for prod (e.g. https://app.olajob.cn/).'
  );
}

export const BASE_URL = BACKEND_SERVER;
export const API_BASE_URL = import.meta.env.VITE_APP_API_URL || BACKEND_SERVER + 'api/';
export const DOWNLOAD_BASE_URL = BACKEND_SERVER + 'download/';
export const EXCEL_EXPORT_BASE_URL = BACKEND_SERVER + 'export/excel/';
export const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL || BACKEND_SERVER;
export const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL || '';

export const ACCESS_TOKEN_NAME = 'x-auth-token';
