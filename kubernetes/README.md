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

### 前提条件

1. 已安装 ArgoCD
2. 已配置 Kubernetes 集群访问

### 部署步骤

1. **手动创建包含敏感信息的 Secret**：

```bash
# 创建命名空间
kubectl create namespace crm-system

# 创建包含敏感信息的 Secret
kubectl create secret generic crm-secrets -n crm-system \
  --from-literal=mongodb-uri="mongodb+srv://用户名:密码@主机/数据库" \
  --from-literal=jwt-secret="你的JWT密钥"
```

2. **应用 ArgoCD 应用定义**：

```bash
# 应用 ArgoCD 配置
kubectl apply -f argocd-app.yaml
```

3. **验证部署状态**：

```bash
# 检查应用状态
kubectl get pods -n crm-system
```

### 更新镜像标签

当你有新版本的Docker镜像时，你可以：

1. 在 ArgoCD UI 中设置参数覆盖
2. 或编辑 backend-deployment.yaml 和 frontend-deployment.yaml 文件中的 ${TAG} 占位符，然后提交更改

### 注意事项

- Secret 资源必须在应用 ArgoCD 配置之前手动创建
- 敏感信息不存储在 Git 仓库中
- 确保 ArgoCD 有足够权限访问 Git 仓库和 Kubernetes 集群

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

## 安全最佳实践

由于这个仓库是公开的，请特别注意以下安全建议：

1. **敏感信息处理**：
   - 永远不要在代码或配置文件中硬编码密码或密钥
   - 使用 `deploy.sh` 脚本部署时，通过命令行参数传递敏感信息
   - 使用安全的方式存储和传递这些值（如密码管理器）

2. **部署示例**：
```bash
# 安全的部署方式
./deploy.sh \
  --tag v1.0.0 \
  --namespace crm-system \
  --mongodb-uri "mongodb+srv://用户名:密码@主机/数据库" \
  --jwt-secret "你的安全密钥"
```

3. **使用 ArgoCD 时**：
   - 创建包含敏感信息的 Kubernetes Secret 对象
   - 确保这些 Secret 对象不在 Git 仓库中

```bash
# 手动创建 Secret
kubectl create secret generic crm-secrets -n crm-system \
  --from-literal=mongodb-uri="mongodb+srv://用户名:密码@主机/数据库" \
  --from-literal=jwt-secret="你的安全密钥"
```

4. **密码轮换**：
   - 定期更换密码和密钥
   - 如有泄露迹象，立即更换

## 环境变量处理

项目使用以下方式处理环境变量：

1. **本地开发**：
   - 使用 `.env` 文件（不提交到 Git）
   - 可以参考 `.env.example` 创建自己的 `.env` 文件

2. **生产环境**：
   - 通过 Kubernetes Secret 注入环境变量
   - 所有敏感配置都存储在 `crm-secrets` Secret 中
   - 部署配置中的环境变量优先级高于 `.env` 文件

### 转换 .env 到 Kubernetes Secret

如果你有现有的 `.env` 文件，可以用以下命令转换为 Kubernetes Secret：

```bash
# 从 .env 文件创建 Secret
kubectl create secret generic crm-secrets -n crm-system \
  --from-literal=mongodb-uri="$(grep DATABASE .env | cut -d '=' -f2- | tr -d '\"')" \
  --from-literal=jwt-secret="$(grep JWT_SECRET .env | cut -d '=' -f2- | tr -d '\"')"
```

## 自动IP配置

系统使用ConfigMap存储服务URL，通过ArgoCD PreSync钩子自动获取外部IP地址并更新配置，避免了硬编码IP地址带来的问题。

### 手动运行配置更新

如需手动更新配置，可以直接运行config-update-job.yaml中定义的作业：

```bash
# 应用配置更新作业
kubectl apply -f kubernetes/config-update-job.yaml
```

### 与ArgoCD集成

使用ArgoCD进行部署时，config-update-job.yaml已包含了PreSync钩子，会自动在同步前运行配置更新作业。

## 故障排除

如果应用无法正常访问，请检查：

1. ConfigMap是否包含正确的IP地址:
```bash
kubectl get configmap crm-config -n crm-system -o yaml
```

2. Pods是否正常运行:
```bash
kubectl get pods -n crm-system
```

3. 手动重启应用以应用最新配置:
```bash
kubectl rollout restart deployment/crm-frontend -n crm-system
kubectl rollout restart deployment/crm-backend -n crm-system
```

## 多IP环境

如果您的环境有多个外部IP，配置更新作业将使用第一个节点的外部IP。如需指定特定IP，可以手动设置ConfigMap:

```bash
# 手动设置特定IP
kubectl patch configmap crm-config -n crm-system --type=merge -p '{"data":{"api-base-url":"http://您的特定IP:30888/api/","backend-url":"http://您的特定IP:30888/","file-base-url":"http://您的特定IP:30888/","allowed-origins":"http://localhost:3000,http://frontend:3000,http://您的特定IP:30080,http://您的特定IP"}}'
```

## ArgoCD 集成

### 自动更新 ConfigMap

项目包含了一个与 ArgoCD 集成的自动化解决方案，用于解决外部 IP 地址的配置问题：

1. `config-update-job.yaml` 文件定义了一个 Kubernetes Job，该 Job 被标记为 ArgoCD 的 PreSync 钩子
2. 该 Job 会在应用同步之前自动运行，检测集群的外部 IP，并更新 ConfigMap 中的 URL 配置
3. 此解决方案解决了 `allowed-origins` 配置缺失的问题，确保 CORS 策略正确配置

使用 ArgoCD 进行部署时的工作流程：

1. ArgoCD 将首先运行 PreSync 钩子 Job
2. Job 会自动更新 ConfigMap 配置中的 IP 地址和allowed-origins字段
3. 然后 ArgoCD 会继续部署应用的其余部分

这种方法消除了手动更新 ConfigMap 的需要，确保应用程序始终使用正确的外部 IP 地址配置。 