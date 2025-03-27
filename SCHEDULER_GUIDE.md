# TKE 集群定时开关配置指南

## 1. 准备工作

### 1.1 安装腾讯云 CLI
```bash
# 下载并安装腾讯云 CLI
curl -L https://github.com/tencentyun/tcli/releases/latest/download/tcli-linux-x86_64.tar.gz | tar -xz
sudo mv tcli /usr/local/bin/
```

### 1.2 配置腾讯云 CLI
```bash
# 配置密钥
tcli configure
# 输入 SecretId 和 SecretKey
```

## 2. 创建定时任务脚本

### 2.1 创建启动脚本 (start_cluster.sh)
```bash
#!/bin/bash

# 设置环境变量
export TENCENTCLOUD_SECRET_ID="your_secret_id"
export TENCENTCLOUD_SECRET_KEY="your_secret_key"

# 启动集群节点
tcli tke cluster-start --cluster-id your-cluster-id

# 等待节点启动
sleep 300

# 启动所有节点
for node in $(tcli tke node-list --cluster-id your-cluster-id | grep -o 'ins-[a-zA-Z0-9]*'); do
    tcli tke node-start --cluster-id your-cluster-id --node-id $node
done
```

### 2.2 创建停止脚本 (stop_cluster.sh)
```bash
#!/bin/bash

# 设置环境变量
export TENCENTCLOUD_SECRET_ID="your_secret_id"
export TENCENTCLOUD_SECRET_KEY="your_secret_key"

# 停止所有节点
for node in $(tcli tke node-list --cluster-id your-cluster-id | grep -o 'ins-[a-zA-Z0-9]*'); do
    tcli tke node-stop --cluster-id your-cluster-id --node-id $node
done

# 等待节点停止
sleep 300

# 停止集群
tcli tke cluster-stop --cluster-id your-cluster-id
```

## 3. 配置定时任务

### 3.1 使用 crontab
```bash
# 编辑 crontab
crontab -e

# 添加以下内容
0 8 * * 1-5 /path/to/start_cluster.sh >> /var/log/cluster_scheduler.log 2>&1
0 20 * * 1-5 /path/to/stop_cluster.sh >> /var/log/cluster_scheduler.log 2>&1
```

### 3.2 使用腾讯云云函数（推荐）

1. 创建云函数
```bash
# 创建启动函数
tcli scf create-function \
    --name start-cluster \
    --runtime Python3.6 \
    --handler index.main_handler \
    --code start_cluster.py

# 创建停止函数
tcli scf create-function \
    --name stop-cluster \
    --runtime Python3.6 \
    --handler index.main_handler \
    --code stop_cluster.py
```

2. 创建触发器
```bash
# 创建启动触发器（每天早上 8 点）
tcli scf create-trigger \
    --function-name start-cluster \
    --type timer \
    --config '{"cron":"0 8 * * 1-5"}'

# 创建停止触发器（每天晚上 8 点）
tcli scf create-trigger \
    --function-name stop-cluster \
    --type timer \
    --config '{"cron":"0 20 * * 1-5"}'
```

## 4. 注意事项

1. 确保脚本中的 SecretId 和 SecretKey 安全存储
2. 建议使用云函数方式，更可靠且便于管理
3. 设置适当的等待时间，确保节点完全启动/停止
4. 记录日志以便追踪问题
5. 考虑节假日调整
6. 确保应用有适当的优雅关闭机制

## 5. 成本估算

假设：
- 2个节点，每个节点配置 4核8G
- 按量计费价格：0.5元/核/小时
- 每天运行 12 小时（8:00-20:00）
- 每月工作日 22 天

每月成本计算：
```
2节点 × 4核 × 0.5元/核/小时 × 12小时 × 22天 = 1,056元/月
```

## 6. 故障处理

1. 检查日志
```bash
tail -f /var/log/cluster_scheduler.log
```

2. 手动干预
```bash
# 手动启动集群
tcli tke cluster-start --cluster-id your-cluster-id

# 手动停止集群
tcli tke cluster-stop --cluster-id your-cluster-id
```

3. 联系支持
- 腾讯云工单系统
- 技术支持热线：4009-100-100 