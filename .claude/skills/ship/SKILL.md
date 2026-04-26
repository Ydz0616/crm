---
name: ship
description: Atomic commit + push + PR for Ola CRM. Auto-detects operator's branch (Yuandong→ZYD_FEAT / Ziyue→ZIYUE_FEAT / Will→WZH_UI / Angel→YILI_UI), runs pre-commit code review, asks for explicit push authorization, pushes to the operator's feature branch, and creates a PR to dev (never main). Use after a backlog item passes Phase 6 verification (or after a /ui-tweak change is approved). Never push without asking first — this is a hard zyd protocol.
---

# Ship — 原子提交 + PR 到 dev

> **用户什么语言, 你就用什么语言.** Code identifiers stay English regardless.
>
> **Push 协议是硬的：** 在执行 `git push` 之前**必须**显式问操作者「可以 push 了吗?」并等明确 OK。这条不是建议，是 zyd 的规则。

## 1. Pre-flight — branch 校验 + 与 dev 同步

```bash
git branch --show-current
git fetch origin
git status --short
```

操作者的 branch **必须**等于身份表里写的那个：

| 操作者 | Branch |
|---|---|
| Yuandong | `ZYD_FEAT` |
| Ziyue | `ZIYUE_FEAT` |
| Will | `WZH_UI` |
| Angel | `YILI_UI` |

- 在 `main` 或 `dev` → ❌ 立刻停。让用户切到正确 branch
- 不在自己的 branch → ❌ 停。提醒"你应该在 X 上而不是 Y"
- 在正确 branch → ✅ 继续

```bash
git log HEAD..origin/dev --oneline    # 落后于 dev 的 commits
```

有输出 → 提醒用户先 rebase：

```bash
git rebase origin/dev
# 如有冲突 → 解决后 git rebase --continue
```

## 2. Atomicity — 一次 push = 一件事

```bash
git status
git diff --stat
```

**原子化原则：一次推送只包含一个 backlog item / 一个功能 / 一个修复。**

如果 `git status` 显示的改动跨多个不相关 concern，强制拆分：
```bash
git add <file1> <file2>            # 只暂存当前 item 相关的文件
# 其余文件留到下一次 commit
```

违反原子化的反例：
- ❌ 同 commit 里既修了 Quote bug 又给 Merch 加新字段
- ❌ 功能代码和无关的格式化/重命名混在一起
- ✅ 一个 commit = 一个 Quote 导出功能的完整实现（即使跨 5 文件，function-level atomic OK）

## 3. Pre-commit code review — 走一遍 checklist

```bash
git diff --staged
```

逐文件过这些（不通过就修，不要"算了下次再说"）：

**通用：**
- [ ] `console.log` 已清理（`console.error/warn` 可保留）
- [ ] 没有 hardcoded secrets / API key / Token
- [ ] TODO 都有 owner + 日期：`// TODO(zyd): desc, by 2026-MM-DD`
- [ ] 没引入新 npm 依赖（如果有，必须先和 zyd 沟通且 `package.json` 已更新）
- [ ] 没破坏已有功能（grep 改动函数的 caller 确认）

**后端改动：**
- [ ] 响应 shape `{ success, result, message }` 一致（成功失败都是）
- [ ] 错误码分类正确（400/404/409/500，不是所有都 500）
- [ ] Joi schemaValidate 在 controller 入口
- [ ] 每个 catch 块都返回明确错误，没有 `catch(e){}` 空处理
- [ ] 新 Schema 有 `removed/enabled/createdBy/created/updated` 五字段
- [ ] 钱算用 `helpers.calculate.*`

**前端改动：**
- [ ] API 走 `request/` 封装（不直接 `fetch`）
- [ ] 只用 AntD（无 Material UI / Chakra / Tailwind）
- [ ] Redux 走 `crud` slice 标准 action
- [ ] 组件 PascalCase
- [ ] `cd frontend && npx vite build` 必过

**完整模板对照** → [/spec](../spec/SKILL.md) §2 + 直接读 codebase ([backend/src/controllers/appControllers/quoteController/](../../../backend/src/controllers/appControllers/quoteController/) 是 controller pattern 活样本)。

## 4. Commit message — type(scope): desc

格式：`type(scope): 简明描述`

| type | 用途 | 示例 |
|---|---|---|
| `feat` | 新功能 | `feat(quote): add freight calculation` |
| `fix` | bug fix | `fix(merch): handle null unit_cn when missing` |
| `refactor` | 重构（不改功能） | `refactor(controller): extract validation` |
| `docs` | 文档 | `docs(skills): add ship workflow` |
| `chore` | 杂务（依赖、配置） | `chore(deps): add @modelcontextprotocol/sdk` |
| `style` | 样式 / 格式 | `style(quote): adjust column width` |
| `test` | 测试 | `test(quote): add curl assertions for create` |

**scope** = 被改动的模块名：`quote / merch / invoice / client / comparison / auth / agents / mcp / nanobot / deps / deploy / skills / ola`

多行描述（推荐用 heredoc）：
```bash
git commit -m "$(cat <<'EOF'
feat(quote): add freight + discount fields

- Quote schema 加 freight + discount Number 字段
- create controller 算 total = subtotal + freight - discount
- QuoteForm 加对应输入框
- Unit 自动从 Merch 填
EOF
)"
```

**Agent 草拟 commit message → 给用户看 → 用户确认后执行。**

## 5. PUSH PROTOCOL — 硬规则

**在 `git push` 之前必须显式问：**

> 我现在要 push 到 [BRANCH] 了，可以吗？

等用户明确说「可以 / OK / push 吧 / 行」之后才执行。

**不允许的反模式：**
- ❌ 默认用户同意，直接 push
- ❌ 用户说「commit 一下」就理解为「也 push」
- ❌ 在 PR 流程里隐含 push 已批

push 命令：
```bash
git push origin $(git branch --show-current)
```

**绝不直接 `git push origin main` 或 `git push origin dev`。**
**绝不 `git push --force` 到 dev / main**（feature branch 上 rebase 后 force-push 自己的 branch 是 OK 的）。

push 后确认：
```bash
git log -1 --oneline
git log origin/$(git branch --show-current) -1 --oneline   # remote 同步了
```

## 6. PR 创建 — `--base dev`，永远不是 main

如果当前 backlog item 是这次工作的最后一个（task.md 全 `[x]`），创建 PR：

```bash
CURRENT_BRANCH=$(git branch --show-current)
gh pr create \
  --base dev \
  --head "$CURRENT_BRANCH" \
  --title "type(scope): 简明描述" \
  --body "$(cat <<'EOF'
## 改动内容

- 改动点 1
- 改动点 2

## 验证

- [x] 后端 _verify.js / curl 通过
- [x] 前端 vite build 通过
- [ ] (如适用) curl E2E 3 断言通过

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- `--base dev` 固定（**绝不 main**；dev → main 由 Yuandong 手动在 GitHub 操作）
- title 复用最近一批 commit 的整体描述
- body 列实际改动 + 勾验证项
- 关联 GitHub issues 用 `Closes #N` / `Refs #N`

```bash
gh pr list --state open --head "$CURRENT_BRANCH"
```

告诉用户 PR URL，让他去 GitHub review/merge。

## 7. 冲突处理

PR 有冲突 → 本地解决：
```bash
git fetch origin
git rebase origin/dev
# 解冲突 → git add → git rebase --continue
git push origin "$(git branch --show-current)" --force-with-lease
```

`--force-with-lease`（不是裸 `--force`）：保护远端被别人推过的情况。
**永远不 force-push 到 dev / main。**

## 8. Infra-change variant

如果 commit 触到 [/spec](../spec/SKILL.md) §3 列的 infra 文件，push 后**强制**多走一步：部署完成后**立即** curl E2E 3 断言（每个生产 domain 独立验证）：

1. `curl -sS https://<domain>/health` → 200 + `{ status: 'ok' }`
2. `curl -sS https://<domain>/api/setting/listAll` → **401**（未带 cookie）
3. 完整 login flow → 200 + 真数据

任一断言失败 → **立即回滚**，不在生产 debug。这条断言跑通之前，task.md 的 `[/]` 不能标 `[x]`。

参考 [feedback_infra_change_curl_e2e](../../../../../.claude/projects/-Users-duke-Documents-GitHub-crm/memory/feedback_infra_change_curl_e2e.md) 和 [feedback_production_rigor_2026_04_21](../../../../../.claude/projects/-Users-duke-Documents-GitHub-crm/memory/feedback_production_rigor_2026_04_21.md)。
