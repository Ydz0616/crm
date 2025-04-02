FROM dockerpull.cn/node:20.9.0-alpine

WORKDIR /usr/src/app

RUN npm config set registry https://registry.npmmirror.com && \
    npm install -g npm@10.2.4

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

# 用环境变量指定端口
ENV PORT=3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]