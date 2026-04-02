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
      proxy: {
        '/api': {
          target: proxy_url,
          changeOrigin: true,
          secure: false,
          timeout: 30000,
        },
        '/export': {
          target: proxy_url,
          changeOrigin: true,
          secure: false,
          timeout: 30000,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
      },
    },
  };
  return defineConfig(config);
};
