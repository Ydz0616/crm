# K3s和ArgoCD快速部署指南

## 安装K3s
```bash
# 单节点安装K3s
curl -sfL https://get.k3s.io | sh -

# 获取kubeconfig
sudo cat /etc/rancher/k3s/k3s.yaml > ~/.kube/config
sudo chmod 600 ~/.kube/config
export KUBECONFIG=~/.kube/config

# 验证安装
kubectl get nodes
```

## 安装ArgoCD
```bash
# 创建命名空间
kubectl create namespace argocd

# 安装ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 等待pods启动
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n argocd

# 获取ArgoCD初始密码
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

## 部署应用示例
```bash
# 创建应用命名空间
kubectl create namespace app

# 创建应用
cat <<EOF | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/yourusername/myapp.git
    targetRevision: HEAD
    path: kubernetes
  destination:
    server: https://kubernetes.default.svc
    namespace: app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
EOF
```

## 访问ArgoCD UI
```bash
# 端口转发ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# 访问 https://localhost:8080
# 用户名: admin
# 密码: 上面获取的初始密码
```

## 清理
```bash
# 卸载K3s
/usr/local/bin/k3s-uninstall.sh

# 删除ArgoCD
kubectl delete namespace argocd
``` 