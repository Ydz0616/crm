# 第一阶段：构建应用
FROM dockerpull.cn/node:20.9.0-alpine AS build

WORKDIR /usr/src/app

RUN npm config set registry https://registry.npmmirror.com && \
    npm install -g npm@10.2.4

COPY package*.json ./

RUN npm install

COPY . .

# 构建生产版本
RUN npm run build

# 第二阶段：创建生产容器
FROM dockerpull.cn/nginx:stable-alpine

# 从构建阶段复制构建成果到nginx
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# 暴露80端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]