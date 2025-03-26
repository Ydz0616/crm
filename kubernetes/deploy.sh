#!/bin/bash

# 默认参数
NAMESPACE="default"
TAG="latest"
MONGODB_URI=""  # 不设置默认值，需要用户提供
JWT_SECRET=""   # 不设置默认值，需要用户提供

# 帮助函数
function show_help {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --namespace NAMESPACE   Kubernetes namespace (default: default)"
    echo "  --tag TAG               Docker image tag (default: latest)"
    echo "  --mongodb-uri URI       MongoDB connection URI (required)"
    echo "  --jwt-secret SECRET     JWT secret key (required)"
    echo "  --help                  Show this help message"
    exit 0
}

# 验证必填参数
function validate_params {
    if [ -z "$MONGODB_URI" ]; then
        echo "Error: --mongodb-uri is required"
        show_help
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        echo "Error: --jwt-secret is required"
        show_help
    fi
}

# 解析参数
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        --mongodb-uri)
            MONGODB_URI="$2"
            shift 2
            ;;
        --jwt-secret)
            JWT_SECRET="$2"
            shift 2
            ;;
        --help)
            show_help
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            ;;
    esac
done

# 验证必填参数
validate_params

# 创建命名空间（如果不存在）
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# 对字符串进行 base64 编码
BASE64_MONGODB_URI=$(echo -n "$MONGODB_URI" | base64)
BASE64_JWT_SECRET=$(echo -n "$JWT_SECRET" | base64)

# 创建临时目录
TEMP_DIR=$(mktemp -d)
echo "Created temp directory: $TEMP_DIR"

# 复制并替换模板文件
for file in $(find kubernetes -name "*.yaml"); do
    echo "Processing $file..."
    BASENAME=$(basename $file)
    cat $file | \
        sed "s|\${TAG}|$TAG|g" | \
        sed "s|\${BASE64_MONGODB_URI}|$BASE64_MONGODB_URI|g" | \
        sed "s|\${BASE64_JWT_SECRET}|$BASE64_JWT_SECRET|g" \
        > $TEMP_DIR/$BASENAME
done

# 应用 Kubernetes 配置
echo "Applying configurations to namespace $NAMESPACE..."
kubectl apply -f $TEMP_DIR/configmap.yaml -n $NAMESPACE
kubectl apply -f $TEMP_DIR/secrets.yaml -n $NAMESPACE
kubectl apply -f $TEMP_DIR/backend-deployment.yaml -n $NAMESPACE
kubectl apply -f $TEMP_DIR/frontend-deployment.yaml -n $NAMESPACE
kubectl apply -f $TEMP_DIR/ingress.yaml -n $NAMESPACE

# 清理临时目录
rm -rf $TEMP_DIR
echo "Deployment completed!" 