import path from 'path';

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  const proxy_url =
    process.env.VITE_DEV_REMOTE === 'remote'
      ? process.env.VITE_BACKEND_SERVER
      : 'http://localhost:8888/';

  // 使用环境变量或者默认值3000避免Mac下的80端口冲突
  const port = parseInt(process.env.VITE_PORT || process.env.PORT || '3000');

  const config = {
    plugins: [react()],
    resolve: {
      base: '/',
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: port,
      host: '0.0.0.0',
      // Same-origin 策略下 frontend 不再硬编码 backend 绝对 URL，所有 backend 调用
      // 都走 /api /download /export /public 同源路径，dev 环境靠 vite 把它们 proxy 到后端
      proxy: {
        '/api': { target: proxy_url, changeOrigin: true, secure: false, timeout: 30000 },
        '/download': { target: proxy_url, changeOrigin: true, secure: false, timeout: 30000 },
        '/export': { target: proxy_url, changeOrigin: true, secure: false, timeout: 30000 },
        '/public': { target: proxy_url, changeOrigin: true, secure: false, timeout: 30000 },
      },
    },
  };
  return defineConfig(config);
};
