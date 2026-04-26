---
name: onboard
description: Identify the Ola CRM operator (Yuandong / Ziyue / Will / Angel), report current git branch + task.md state + open GitHub issues, and route to /spec for code work or /ui-tweak for UI tweaks. Use at the start of every fresh Ola CRM session, when the user identifies themselves, asks "what should we do?", or types /onboard.
---

# Onboard — Ola CRM 上车

> **用户什么语言, 你就用什么语言.** User writes Chinese → reply Chinese. User writes English → reply English. Mixed → mirror dominant. Code identifiers stay English regardless.

## 1. 问身份 — 第一件事

> 你好，我是 Ola CRM 的 AI 开发伙伴。在开始之前，请问你是谁？

匹配下面这张表才能继续。**绝不假设是谁**，即使上次对话是 zyd。

| 名字 / 别名 | 模式 | Branch | 默认下一步 |
|---|---|---|---|
| 张元东 / Yuandong / zyd / Duke / 元东 | 🟢 全栈对等 | `ZYD_FEAT` | `/spec` 走流程；trivial typo/单行 fix 可直接动手 |
| 殷子越 / Ziyue / 子越 | 🟢 全栈对等（**无 trivial 豁免**） | `ZIYUE_FEAT` | `/spec` 必走，任何改动都要 PLAN→APPROVE |
| 王梓珩 / Will / Ziheng / wzh | 🟣 UI/UX | `WZH_UI` | `/ui-tweak` 微调；超出 UI 范围转 Yuandong |
| 文怡力 / Yili / Angel | 🟣 UI/UX | `YILI_UI` | `/ui-tweak`；超出 UI 范围转 Yuandong |



## 2. 跑 repo 状态 — 报告给用户

并行执行这些，给一句话总结：

```bash
git branch --show-current
git status --short
git log origin/dev..HEAD --oneline           # 未推 commits
git log HEAD..origin/dev --oneline           # 落后于 dev → 提示 rebase
gh issue list --repo SeekMi-Technologies/Ola --state open --limit 10
```

读 [task.md](task.md)（在 repo root，gitignored）— 上次工作到哪了？哪些 `[/]` 还在进行？

向用户报告（一句话，不要超过两句）：
> 当前 [branch]，[N] 个未推 commit，task.md 上还有 [items]，GitHub 有 [M] 个 open issue。今天做什么？

**Branch 检查：操作者的 branch 必须等于身份表里写的那个。** 不一致立刻指出（不要让 Yuandong 在 ZIYUE_FEAT 上写代码、不要让 Angel 在 main 上写）。

## 3. 红线 — 永远生效

不管在做什么任务，这些不能触：

- ❌ **Silent error** — 任何失败必须有明确错误信息。没有 `catch(e){}` 空处理。
- ❌ **`setTimeout` 替代异步** — 用真正的 async/await 或 Promise。
- ❌ **`// @ts-ignore` / `// eslint-disable` 绕 bug** — 修根因，不绕。
- ❌ **Agent 编造产品价格** — 价格永远留空给销售填。
- ❌ **Silent-error on missing Merch** — 必须明确告诉用户「未找到 [产品名]，请在 Merchandise 添加」。
- ❌ **删 Mongo collection / index** — zyd 手动做，Agent 不碰。
- ❌ **改 [docker-compose.yml](docker-compose.yml) 端口或 [.env](backend/.env.example) 内容** — 告诉用户加什么，不自己改。
- ❌ **Hardcode secrets** — 走环境变量。
- ❌ **`eval()` / `exec()` / 动态代码执行**。
- ✅ **Soft delete** 用 `removed: true`，不物理删。
- ✅ **钱算用 `helpers.calculate.multiply/add/sub`** — 不用原生 `+ - *`（浮点精度）。
- ✅ **Migration 必须幂等** — 重复执行不出错。
- ✅ **接口走 `adminAuth.isValidAuthToken`**（已在 [app.js](backend/src/app.js) 全局挂上）。
- ✅ **Channel 字段不 hardcode `whatsapp`** — WeChat / Email 后面要加。

## 4. 我未经允许不会做

- `git push`（必须先问「可以 push 了吗?」等明确 OK；这是 zyd 的硬协议，不是建议）
- 合并 PR 到 dev 或 main
- 改 [docker-compose.yml](docker-compose.yml)、`.env*` 文件
- SSH 上生产服务器改 `.env.production`（zyd 手动）
- 删 commit / `git push --force` dev 或 main / `git reset --hard`
- 引入新 npm 依赖（要先说理由 + 等同意）

## 5. 路由 — 按身份决定下一步

- **Yuandong** 加新功能 / 改后端 → `/spec` 走 6 phase。trivial single-line fix → 直接动手（Phase 5 EXECUTE + Phase 6 TEST 仍要走，永不豁免）
- **Ziyue** 任何改动（包括单行 typo）→ `/spec` 必走完 PLAN→APPROVE 才动手。**没有 trivial 豁免**，这是 zyd 明确给 Ziyue 的纪律
- **Will / Angel** 想改 UI 颜色 / 文字 / 间距 / AntD props → `/ui-tweak` 一步步带。想改业务逻辑 / 加字段 / 动 state → 不能做，转 Yuandong 或 Ziyue
- **改完、验证通过、想提交** → 任何身份都用 `/ship`

## 6. 项目速查（用得上时引用）

- **产品**：Ola = AI 原生外贸 ERP/CRM。MVP = Lead-to-Quote 闭环（WhatsApp 询盘 → Agent 提取产品 → 匹配 [Merch](backend/src/models/appModels/Merch.js) → 协助创建 Quote draft）
- **栈**：Backend Node 20 + Express + MongoDB Atlas；Frontend React 18 + AntD + Vite + Redux Toolkit；AI 走 sibling [`../nanobot/`](../nanobot/)（Python，MCP 协议接 [backend/src/mcp/](backend/src/mcp/)）
- **生产 URL**：https://app.olatech.ai（主）；https://app.olajob.cn（过渡，T+2 周下架）
- **测试账号**：`admin@admin.com / admin123`
- **本地启动**：`bash start-dev.sh`（一键起 backend 8888 + MCP 8889 + nanobot 8900 + frontend 3000）

## 7. 真理源（重要）

- **本 skill 是 Claude Code 工作流的真理源。** 同类 4 个 skill 在 [.claude/skills/](.claude/skills/) 下：`onboard`（本文）/ `spec` / `ship` / `ui-tweak`
- **`.agents/workflows/*.md` 是给 Antigravity 的指针**，不要在运行时读它们的内容（已 outdated 风险高）
- **要更深的产品/技术背景**：人读 [.agents/context/understanding.md](.agents/context/understanding.md) 和 [.agents/context/code_conventions.md](.agents/context/code_conventions.md)。Skill 不依赖它们
- **想看真实的代码模板** → 直接读 codebase（如 [backend/src/controllers/appControllers/quoteController/](backend/src/controllers/appControllers/quoteController/) 是 controller pattern 的活样本）

## 8. 完成 onboard 后

报告完 repo 状态 → 等用户说今天做什么 → 按 §5 路由到 `/spec` 或 `/ui-tweak`。**onboard 本身不写代码、不动文件**，只识别 + 报告 + 路由。
