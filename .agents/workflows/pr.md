---
description: Ola CRM PR 创建 — 从开发 branch 合并到 dev
---

# 🔀 Ola CRM Pull Request

> 将已推送的开发 branch 合并到 dev（开发集成版）。
> 本 workflow 通常在所有 backlog items 完成后执行。

---

## 第一步：确认 gh CLI 可用

```bash
gh --version
```

如果没有安装或认证失败：

```bash
# macOS 安装
brew install gh

# 认证（按交互提示完成）
gh auth login
```

如果出现权限错误（如 `mkdir ~/.config/gh: permission denied`）：

```bash
sudo mkdir -p ~/.config/gh
sudo chown -R $(whoami) ~/.config/gh
gh auth login
```

安装/认证完成后，再次确认：

```bash
gh auth status
```

预期输出包含 `✓ Logged in to github.com`。

---

## 第二步：确认推送状态

```bash
# 确认当前 branch
git branch --show-current    # 应在 ZYD_FEAT 或 WZH_UI

# 确认所有改动已推送
git log origin/$(git branch --show-current)..HEAD --oneline
```

- 如果有未推送的 commit → 先执行 `/push`
- 如果输出为空 → ✅ 已全部推送，继续

---

## 第三步：与 dev 同步

```bash
# 确保 dev 是最新的
git fetch origin

# 检查是否有冲突风险
git log origin/dev..origin/$(git branch --show-current) --oneline
```

如果 dev 有新的 commit 不在当前 branch 上，提醒用户可能需要先 rebase。

---

## 第四步：创建 PR

```bash
# 获取当前 branch 名
CURRENT_BRANCH=$(git branch --show-current)

# 创建 PR 到 dev
gh pr create \
  --base dev \
  --head "$CURRENT_BRANCH" \
  --title "type(scope): 简明描述" \
  --body "## 改动内容

- 改动点 1
- 改动点 2

## 验证

- [x] 本地测试通过
- [ ] 不破坏现有功能"
```

### PR 内容规则

- `--base` 固定为 `dev`（**不是 main**）
- `--title` 复用最近一批 commit 的整体描述，格式同 commit message
- `--body` 由 Agent 根据实际改动自动生成：
  - 列出所有改动的文件和原因
  - 勾选已完成的验证项

---

## 第五步：确认 PR 创建成功

```bash
gh pr list --state open --head $(git branch --show-current)
```

告知用户：

> PR 已创建 ✅
> 链接：[PR URL]
> 请去 GitHub 审核并合并到 dev。

---

## ⚠️ 注意事项

- **dev → main 的合并**由 zyd 手动在 GitHub 操作，Agent 不参与
- 如果 PR 有冲突，Agent 协助用户在本地 rebase 解决后重新推送
- 一个 PR 应对应一个完整的开发任务（可包含多个 backlog items 的 commit）

---

> 📎 本 workflow 是开发链路的最后一环：`develop → push → pr`
