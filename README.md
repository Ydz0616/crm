# EasyCRM

EasyCRM 是一个基于 Node.js 和 React.js 的开源 CRM 系统，使用 Ant Design 和 Redux 构建。

## 功能特点

- 📊 客户关系管理
- 💼 销售管理
- 📝 文档管理
- 📈 报表统计
- 👥 用户权限管理
- 📱 响应式设计
- 🌐 多语言支持

## 技术栈

### 后端
- Node.js
- Express.js
- MongoDB
- JWT 认证
- RESTful API

### 前端
- React.js
- Ant Design
- Redux
- Vite
- Axios

## 快速开始

### 本地开发

1. 克隆仓库
```bash
git clone https://github.com/yourusername/easycrm.git
cd easycrm
```

2. 安装依赖
```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

3. 配置环境变量
```bash
# 后端 (.env)
DATABASE=mongodb://localhost:27017/easycrm
JWT_SECRET=your_jwt_secret
PORT=8888

# 前端 (.env)
VITE_APP_API_URL=http://localhost:8888/api
VITE_BACKEND_SERVER=http://localhost:8888
VITE_FILE_BASE_URL=http://localhost:8888
```

4. 启动服务
```bash
# 启动后端
cd backend
npm run dev

# 启动前端
cd frontend
npm run dev
```

### 生产环境部署

详细的部署指南请参考 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

## 项目结构

```
easycrm/
├── backend/                # 后端代码
│   ├── src/               # 源代码
│   ├── tests/             # 测试文件
│   └── package.json       # 后端依赖
├── frontend/              # 前端代码
│   ├── src/              # 源代码
│   ├── public/           # 静态资源
│   └── package.json      # 前端依赖
├── kubernetes/           # Kubernetes 配置
│   ├── backend-deployment.yaml
│   └── frontend-deployment.yaml
├── DEPLOYMENT_GUIDE.md   # 部署指南
└── README.md            # 项目说明
```

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式

- 项目维护者：[Your Name](mailto:your.email@example.com)
- 项目链接：[https://github.com/yourusername/easycrm](https://github.com/yourusername/easycrm)

## 致谢

- [Ant Design](https://ant.design/)
- [React](https://reactjs.org/)
- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/) 