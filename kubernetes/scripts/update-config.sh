#!/bin/bash

# 获取节点的外部IP地址
EXTERNAL_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}')

# 如果没有获取到ExternalIP，尝试使用InternalIP作为备用
if [ -z "$EXTERNAL_IP" ]; then
  echo "No ExternalIP found, falling back to InternalIP"
  EXTERNAL_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
fi

echo "Detected External IP: $EXTERNAL_IP"

# 首先获取当前的ConfigMap以保留其他配置项
echo "Retrieving current ConfigMap..."
kubectl get configmap crm-config -n crm-system -o yaml > /tmp/current-configmap.yaml 2>/dev/null || echo "ConfigMap does not exist yet"

# 创建或更新ConfigMap
if [ -f "/tmp/current-configmap.yaml" ] && grep -q "kind: ConfigMap" "/tmp/current-configmap.yaml"; then
  echo "Updating existing ConfigMap..."
  # 使用sed替换URL值
  sed -i.bak "s|api-base-url: \"http://.*\"|api-base-url: \"http://${EXTERNAL_IP}:30888/api/\"|g" /tmp/current-configmap.yaml
  sed -i.bak "s|backend-url: \"http://.*\"|backend-url: \"http://${EXTERNAL_IP}:30888/\"|g" /tmp/current-configmap.yaml
  sed -i.bak "s|file-base-url: \"http://.*\"|file-base-url: \"http://${EXTERNAL_IP}:30888/\"|g" /tmp/current-configmap.yaml
  
  # 应用更新后的ConfigMap
  kubectl apply -f /tmp/current-configmap.yaml
else
  echo "Creating new ConfigMap..."
  # 创建一个新的ConfigMap
  cat <<EOF > /tmp/new-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: crm-config
  namespace: crm-system
data:
  API_TIMEOUT: "30000"
  LOG_LEVEL: "info"
  MAX_UPLOAD_SIZE: "10485760"
  api-base-url: "http://${EXTERNAL_IP}:30888/api/"
  backend-url: "http://${EXTERNAL_IP}:30888/"
  file-base-url: "http://${EXTERNAL_IP}:30888/"
EOF
  kubectl apply -f /tmp/new-configmap.yaml
fi

echo "ConfigMap updated with External IP: $EXTERNAL_IP"

# 重启部署以应用新的配置
echo "Restarting deployments to apply new configuration..."
kubectl rollout restart deployment/crm-frontend -n crm-system
kubectl rollout restart deployment/crm-backend -n crm-system

echo "Done! Your application should now be accessible at:"
echo "Frontend: http://${EXTERNAL_IP}:30080"
echo "Backend: http://${EXTERNAL_IP}:30888" 