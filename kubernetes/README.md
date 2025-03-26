# Kubernetes 部署指南

本文件夹包含在 Kubernetes 上部署 CRM 系统所需的配置文件。

## 部署架构

- **前端服务**：React 应用，提供用户界面
- **后端服务**：Node.js 应用，提供 API
- **数据库**：MongoDB，存储数据
- **入口**：Nginx Ingress 控制器，管理流量

## 镜像仓库

所有镜像存储在私有 Docker Hub 仓库：`yz743/easycrm`

镜像命名约定：
- 前端：`yz743/easycrm:frontend-<标签>`
- 后端：`yz743/easycrm:backend-<标签>`

## 部署方法

### 手动部署

使用项目提供的部署脚本可以轻松部署：

```bash
# 部署到默认命名空间
./deploy.sh --tag v1.0.0 --mongodb-uri mongodb://user:password@host:port/dbname

# 部署到指定命名空间
./deploy.sh --namespace crm-system --tag v1.0.0 --mongodb-uri mongodb://user:password@host:port/dbname
```

### 使用 ArgoCD 部署

1. 确保您的 ArgoCD 已正确设置
2. 修改 `argocd-app.yaml` 中的仓库 URL
3. 应用 ArgoCD 应用定义：

```bash
kubectl apply -f argocd-app.yaml
```

## 配置说明

- **configmap.yaml**：非敏感配置信息
- **secrets.yaml**：敏感信息（如数据库连接字符串）
- **backend-deployment.yaml**：后端服务部署配置
- **frontend-deployment.yaml**：前端服务部署配置
- **ingress.yaml**：入口配置

## 构建和推送镜像

使用以下命令构建和推送镜像：

```bash
# 登录 Docker Hub
docker login

# 构建和推送前端镜像
docker build -t yz743/easycrm:frontend-v1.0.0 ./frontend
docker push yz743/easycrm:frontend-v1.0.0

# 构建和推送后端镜像
docker build -t yz743/easycrm:backend-v1.0.0 ./backend
docker push yz743/easycrm:backend-v1.0.0
```

## 故障排除

如果部署失败，请检查：

1. **镜像拉取问题**：确保集群可以访问私有 Docker Hub 仓库
2. **MongoDB 连接问题**：验证 URI 是否正确
3. **资源限制**：确保集群有足够资源
4. **日志**：查看 Pod 日志获取详细错误信息

```bash
kubectl logs deployment/crm-backend -n <namespace>
kubectl logs deployment/crm-frontend -n <namespace>
``` 