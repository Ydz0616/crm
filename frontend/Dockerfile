# 单阶段构建 - 保留Node.js环境
FROM dockerpull.cn/node:20.9.0-alpine

WORKDIR /usr/src/app

RUN npm config set registry https://registry.npmmirror.com && \
    npm install -g npm@10.2.4

COPY package*.json ./

RUN npm install

COPY . .

# 构建生产版本
RUN npm run build

# 暴露3000端口
EXPOSE 3000

# 以开发模式启动应用
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]