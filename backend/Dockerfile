FROM dockerpull.cn/node:20.9.0-alpine

WORKDIR /usr/src/app

# 使用阿里云npm镜像
RUN npm config set registry https://registry.npmmirror.com && \
    npm install -g npm@10.2.4

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8888

# Use environment variable to decide whether to run setup
CMD ["sh", "-c", "if [ \"$RUN_SETUP\" = \"true\" ]; then npm run setup && npm run dev; else npm run dev; fi"]