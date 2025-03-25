FROM dockerpull.cn/node:20.9.0-alpine

WORKDIR /usr/src/app

# 使用阿里云npm镜像
RUN npm config set registry https://registry.npmmirror.com && \
    npm install -g npm@10.2.4

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]