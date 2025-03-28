# EasyCRM 部署指南

## 1. ArgoCD 安装和配置

### 1.1 安装 ArgoCD
```bash
# 创建 argocd 命名空间
kubectl create namespace argocd

# 安装 ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 暴露 ArgoCD 服务
kubectl port-forward svc/argocd-server -n argocd 8080:443

# 获取初始管理员密码
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

### 1.2 访问 ArgoCD
- URL: http://<node-ip>:8080
- 用户名: admin
- 密码: 上一步获取的密码

## 2. 应用部署准备

### 2.1 创建命名空间
```bash
kubectl create namespace crm-system
```

### 2.2 创建 Secrets
```bash
# 创建包含 MongoDB URI 和 JWT Secret 的 secret
kubectl create secret generic crm-secrets \
  --from-literal=mongodb-uri="mongodb://your-mongodb-uri" \
  --from-literal=jwt-secret="your-jwt-secret" \
  -n crm-system
```

### 2.3 构建和推送 Docker 镜像
```bash
# 构建后端镜像 (AMD64)
docker build --platform linux/amd64 -t yz743/easycrm:backend-v1.0.6 ./backend
docker push yz743/easycrm:backend-v1.0.5

# 构建前端镜像 (AMD64)
docker build --platform linux/amd64 -t yz743/easycrm:frontend-v1.0.5 ./frontend
docker push yz743/easycrm:frontend-v1.0.5
```

## 3. 部署配置

### 3.1 后端配置 (backend-deployment.yaml)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crm-backend
  labels:
    app: crm-backend
    app.kubernetes.io/instance: easycrm
    app.kubernetes.io/part-of: crm
    app.kubernetes.io/component: backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: crm-backend
  template:
    metadata:
      labels:
        app: crm-backend
        app.kubernetes.io/instance: easycrm
        app.kubernetes.io/part-of: crm
        app.kubernetes.io/component: backend
    spec:
      containers:
      - name: crm-backend
        image: yz743/easycrm:backend-v1.0.6
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 3000
          name: http
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "200m"
            memory: "256Mi"
        env:
        - name: DATABASE
          valueFrom:
            secretKeyRef:
              name: crm-secrets
              key: mongodb-uri
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: crm-secrets
              key: jwt-secret
        - name: PORT
          value: "3000"
        - name: NODE_ENV
          value: "production"
        - name: OPENSSL_CONF
          value: "/dev/null"
        - name: PUBLIC_SERVER_FILE
          value: "http://129.226.142.103:30888"
        - name: NODE_TLS_REJECT_UNAUTHORIZED
          value: "0"
        - name: BYPASS_AUTH
          value: "true"
        livenessProbe:
          tcpSocket:
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        readinessProbe:
          tcpSocket:
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
---
apiVersion: v1
kind: Service
metadata:
  name: crm-backend
  labels:
    app.kubernetes.io/instance: easycrm
    app.kubernetes.io/part-of: crm
    app.kubernetes.io/component: backend
spec:
  selector:
    app: crm-backend
  ports:
  - port: 3000
    targetPort: http
    protocol: TCP
    name: http
    nodePort: 30888
  type: NodePort
```

### 3.2 前端配置 (frontend-deployment.yaml)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crm-frontend
  labels:
    app: crm-frontend
    app.kubernetes.io/instance: easycrm
    app.kubernetes.io/part-of: crm
    app.kubernetes.io/component: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: crm-frontend
  template:
    metadata:
      labels:
        app: crm-frontend
        app.kubernetes.io/instance: easycrm
        app.kubernetes.io/part-of: crm
        app.kubernetes.io/component: frontend
    spec:
      containers:
      - name: crm-frontend
        image: yz743/easycrm:frontend-v1.0.5
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 3000
          name: http
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "200m"
            memory: "256Mi"
        env:
        - name: NODE_ENV
          value: "production"
        - name: VITE_APP_API_URL
          value: "http://129.226.142.103:30888/api"
        - name: VITE_BACKEND_SERVER
          value: "http://129.226.142.103:30888"
        - name: VITE_FILE_BASE_URL
          value: "http://129.226.142.103:30888"
        livenessProbe:
          httpGet:
            path: /
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
---
apiVersion: v1
kind: Service
metadata:
  name: crm-frontend
  labels:
    app.kubernetes.io/instance: easycrm
    app.kubernetes.io/part-of: crm
    app.kubernetes.io/component: frontend
spec:
  selector:
    app: crm-frontend
  ports:
  - port: 80
    targetPort: http
    protocol: TCP
    name: http
    nodePort: 30080
  type: NodePort
```

## 4. 部署应用

### 4.1 使用 kubectl 部署
```bash
# 部署后端
kubectl apply -f kubernetes/backend-deployment.yaml -n crm-system

# 部署前端
kubectl apply -f kubernetes/frontend-deployment.yaml -n crm-system
```

### 4.2 使用 ArgoCD 部署
1. 登录 ArgoCD 界面
2. 点击 "New App"
3. 选择 "Import an existing app from Git repo"
4. 填写应用信息：
   - Application Name: easycrm
   - Project: default
   - Repository URL: 您的 Git 仓库地址
   - Path: kubernetes
   - Cluster: in-cluster
   - Namespace: crm-system

## 5. 访问应用

### 5.1 应用访问地址
```
前端：http://<node-ip>:30080
后端：http://<node-ip>:30888
ArgoCD：http://<node-ip>:8080
```

### 5.2 健康检查
- 前端：http://<node-ip>:30080/
- 后端：http://<node-ip>:30888/api/health

## 6. 维护命令

### 6.1 查看状态
```bash
# 查看服务状态
kubectl get svc -n crm-system

# 查看 pod 状态
kubectl get pods -n crm-system

# 查看日志
kubectl logs -f deployment/crm-frontend -n crm-system
kubectl logs -f deployment/crm-backend -n crm-system
```

### 6.2 更新部署
```bash
# 更新镜像
kubectl set image deployment/crm-frontend crm-frontend=yz743/easycrm:frontend-v1.0.x -n crm-system
kubectl set image deployment/crm-backend crm-backend=yz743/easycrm:backend-v1.0.x -n crm-system

# 重启部署
kubectl rollout restart deployment crm-frontend -n crm-system
kubectl rollout restart deployment crm-backend -n crm-system
```

## 7. 常见问题解决

### 7.1 CORS 问题
- 确保后端 CORS 配置正确
- 检查前端环境变量中的 API URL 是否正确
- 确保没有多余的斜杠

### 7.2 白屏问题
- 检查前端环境变量配置
- 检查浏览器控制台错误
- 确保 API 请求正常

### 7.3 登录问题
- 检查 MongoDB 连接
- 检查 JWT 配置
- 检查网络连接

## 8. 注意事项
1. 确保使用 AMD64 架构构建镜像
2. 环境变量中的 URL 不要有多余的斜杠
3. 保持前后端版本号一致
4. 定期检查日志和监控
5. 备份 MongoDB 数据
6. 确保 Kubernetes 集群有足够的资源
7. 注意网络安全配置
8. 定期更新镜像版本 