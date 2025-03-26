#!/bin/bash

# 默认参数
TAG="latest"

# 帮助函数
function show_help {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --tag TAG               Docker image tag (default: latest)"
    echo "  --help                  Show this help message"
    exit 0
}

# 解析参数
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        --tag)
            TAG="$2"
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

echo "Building and pushing Docker images with tag: $TAG"

# 检查 Docker 登录状态 - 更可靠的方法
echo "Checking Docker login status..."
if ! docker system info | grep -q "Username"; then
    # 尝试第二种检测方法
    if ! docker info 2>/dev/null | grep -q "Username"; then
        # 最后尝试直接使用 docker-credential-helper
        if ! grep -q "https://index.docker.io/v1/" ~/.docker/config.json 2>/dev/null; then
            echo "You are not logged in to Docker Hub. Please run 'docker login' first."
            exit 1
        fi
    fi
fi

echo "Docker login verified. Proceeding with build..."

# 构建前端镜像
echo "Building frontend image..."
docker build -t yz743/easycrm:frontend-$TAG ./frontend
if [ $? -ne 0 ]; then
    echo "Failed to build frontend image"
    exit 1
fi

# 构建后端镜像
echo "Building backend image..."
docker build -t yz743/easycrm:backend-$TAG ./backend
if [ $? -ne 0 ]; then
    echo "Failed to build backend image"
    exit 1
fi

# 推送镜像
echo "Pushing images to Docker Hub..."
docker push yz743/easycrm:frontend-$TAG
docker push yz743/easycrm:backend-$TAG

echo "Images built and pushed successfully!"
echo "- Frontend: yz743/easycrm:frontend-$TAG"
echo "- Backend: yz743/easycrm:backend-$TAG"
echo ""
echo "You can now deploy to Kubernetes with:"
echo "./kubernetes/deploy.sh --tag $TAG --namespace crm-system" 