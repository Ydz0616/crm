FROM dockerpull.cn/node:20.9.0-alpine

WORKDIR /usr/src/app

# 安装中文字体，用于Gotenberg渲染PDF中的中文
RUN apk update && apk add --no-cache \
    font-noto \
    font-noto-cjk

# 使用阿里云npm镜像
RUN npm config set registry https://registry.npmmirror.com && \
    npm install -g npm@10.2.4

COPY package*.json ./

# 安装依赖
RUN npm install

COPY . .

# 仅在生产环境删除环境文件
ARG NODE_ENV=production
RUN if [ "$NODE_ENV" = "production" ]; then rm -f .env .env.local; fi

EXPOSE 8888

# 使用环境变量运行应用（这些环境变量将由Kubernetes注入）
CMD ["npm", "run", "dev"]