FROM dockerpull.cn/node:20.9.0-alpine

WORKDIR /usr/src/app

# 使用阿里云npm镜像
RUN npm config set registry https://registry.npmmirror.com && \
    npm install -g npm@10.2.4

COPY package*.json ./

RUN npm install

COPY . .

# 删除任何可能包含敏感信息的.env文件
RUN rm -f .env .env.local

EXPOSE 8888

# 使用环境变量运行应用（这些环境变量将由Kubernetes注入）
CMD ["npm", "run", "dev"]