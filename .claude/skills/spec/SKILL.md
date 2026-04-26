---
name: spec
description: Spec-Driven Development loop for Ola CRM — runs the 6-phase cycle (PLAN → REVISE → APPROVE → BACKLOG → EXECUTE → TEST) for any non-trivial code change. Enforces the APPROVE gate, task.md discipline, robustness red lines, and Ola's verification pattern (temp _verify.js + curl 3-assertion E2E). Use when starting any backend or full-stack feature, any frontend work beyond pure CSS micro-tweaks, or any infra-touching change. Required for Ziyue on every change (no trivial 豁免). Yuandong gets a single-file trivial bypass; Will/Angel use /ui-tweak for small UI changes.
---

# Spec — Ola CRM Spec-Driven Development

> **用户什么语言, 你就用什么语言.** User Chinese → reply Chinese. Code identifiers stay English.
>
> **Robust over Fancy.** 永远选稳定可维护可测试，不是炫技。

## 0. 谁能 trivial 豁免

| 操作者 | trivial 豁免（跳 Phase 1-3） | 何时算 trivial |
|---|---|---|
| Yuandong | ✅ 允许 | 单文件 + 单一关心点 + 零业务逻辑变化（CSS 数值、变量重命名、注释修正、单行 typo） |
| Ziyue | ❌ **从不允许** | zyd 的明确决定。任何改动都走完 PLAN→APPROVE 才动手 |
| Will / Angel | UI 微调走 [/ui-tweak](../ui-tweak/SKILL.md)；组件重构 / 改 state / 改 props 接口来这里走完整 6 phase |

碰多于 1 个文件、碰任何 controller / model / Redux slice / API → 不 trivial。
**Phase 5（EXECUTE）+ Phase 6（TEST）永远不可豁免，对所有人。**

## 1. 6 Phase 循环

```
用户需求 → PLAN → REVISE → APPROVE → BACKLOG → [EXECUTE → TEST → /ship] × N
```

### Phase 1: PLAN

不写代码。复述用户的理解 → 列要改/新建的文件路径 → 每个文件的 import/require 依赖（谁 import 它，谁 call 它）→ 列方案文字描述 → 列验收标准。涉及多于 3 个不相关文件 → 建议拆分。多方案时给 pros/cons。

### Phase 2: REVISE

用户改方案，来回多次。按反馈修方案，不抢着写代码。直到用户满意。

### Phase 3: APPROVE — 硬门

用户**明确说**「approved / 开始 / 可以 / 没问题 / 干 / 上」之后才进 Phase 4。

- ❌「行吧」「嗯」「ok」**不算** — 再问一次「我开始？」
- ❌「我先快速试一下」**不算** — 试就是 EXECUTE，没 APPROVE 不能
- ❌ 隐含同意（用户没说不就是默许）**绝对不算**
- ✅ 仅限 Yuandong：「直接改」算（trivial 豁免范围内）

### Phase 4: BACKLOG

拆成 [task.md](../../../task.md) 里的独立 backlog item。task.md 是 gitignored 工作文档，永不 commit。

每个 item:
- **独立可验证** — 完成后能立刻测试
- **Atomic = function-level，不是 file-level** — 一个 function-level 改动跨 5 文件也归一个 item（schema + validate + controller 一起改的话不能拆，否则中间状态不一致）。`≤3 文件` 是软目标
- **明确验收** — 具体到能 curl / grep / vite build 验
- 状态：`[ ]` todo · `[/]` in-progress · `[x]` done · `[!]` blocked

### Phase 5: EXECUTE — 一次只做一件事

从 task.md 取第一个 `[ ]` → 标 `[/]` → **只做这一个 item**，不顺手修别的。逐文件实现，每个文件改完一句话说明动机。

发现 out-of-scope 问题 → 加到 task.md 「Discovered tech debt」段，**不当场修**。这一条违反就是漂移的开始。

### Phase 6: TEST — 永不豁免

按 item 验收标准验证。Ola 没有 jest/vitest 配置（这是有意决定，见 [feedback_verification_pattern](../../../../../.claude/projects/-Users-duke-Documents-GitHub-crm/memory/feedback_verification_pattern.md)）。验证方式：

- **后端逻辑：** 临时 `_verify.js` 紧挨改的文件，autoload 所有 model：
  ```javascript
  require('module-alias/register');
  require('@/models/utils');  // 关键：autoload 所有 Mongoose model
  // ... 断言 ...
  ```
  跑完 `rm` 掉。永远不 commit `_verify.js`。
- **HTTP 接口：** curl **至少 3 条断言**（[feedback_acceptance_criteria_depth](../../../../../.claude/projects/-Users-duke-Documents-GitHub-crm/memory/feedback_acceptance_criteria_depth.md)）：
  1. Happy path → `success: true` + 期望的 result shape
  2. Negative case → 400 / 404 / 409 + 具体中文 message
  3. **Protocol 入口之后的第二次调用** — 不是只测第一步就完事
- **前端：** `cd frontend && npx vite build` 必过（eslint 配置经常坏，可跳）
- **infra 改动**（见 §4）→ curl E2E 3 条强制

通过 → 问用户「可以 push 了吗?」→ 等明确 OK → [/ship](../ship/SKILL.md) → 标 `[x]` → 回 Phase 5。
失败 → 修到通过，**不跳下一个**。

## 2. 横切红线（写代码时这些是底线）

[/onboard](../onboard/SKILL.md) §3 列了完整红线。写代码时这些必须过：

- **后端：**
  - 响应 shape 必须 `{ success, result, message }`（成功失败都是）
  - 错误码分类正确：400 输入错 / 404 不存在 / 409 冲突 / 500 系统错。**不是所有错都返 500**
  - 输入用 Joi schema 校验（在 controller 入口）
  - 新 Mongoose Schema 必须含 `removed / enabled / createdBy / created / updated` 五字段
  - 钱算用 [`helpers.calculate.multiply/add/sub`](../../../backend/src/helpers/index.js) — 永远不用原生 `+ - *`
  - 所有 controller 方法被 `catchErrors()` 包装（在 [handlers/errorHandlers.js](../../../backend/src/handlers/errorHandlers.js)）
  - Soft delete via `removed: true`，不物理删
- **前端：**
  - API 必须走 [request/](../../../frontend/src/request/) 封装，不直接 `fetch()` / `XMLHttpRequest`
  - 只用 AntD，不引 Material UI / Chakra / Tailwind
  - Redux 走 `crud` slice 标准 action（`crud.create / read / update / delete / list`）
  - 组件 PascalCase，文件名和组件名一致
- **通用：**
  - No silent catch — 每个 catch 块返回具体错误
  - No `setTimeout` 假装异步 — 用真 async/await
  - No `// @ts-ignore` / `// eslint-disable` 绕 bug
  - TODO 格式 `// TODO(owner): desc, by 2026-MM-DD`
  - 不引入新 npm 依赖（要先说理由 + 等同意）

**模板就在 codebase 里，不要凭记忆写：**
- Controller 模式（createCRUDController + 覆盖）→ [quoteController/index.js](../../../backend/src/controllers/appControllers/quoteController/index.js)
- 自定义 create with Joi + 业务校验 → [quoteController/create.js](../../../backend/src/controllers/appControllers/quoteController/create.js) + [quoteController/schemaValidate.js](../../../backend/src/controllers/appControllers/quoteController/schemaValidate.js)
- Mongoose Schema 五字段 → 任一 [models/appModels/](../../../backend/src/models/appModels/)
- 前端 ErpPanelModule 用法 → [pages/Quote/](../../../frontend/src/pages/Quote/)
- request 封装 → [request/request.js](../../../frontend/src/request/request.js)

## 3. Infra-change 升级路径 — 触到立刻停

碰下面任意一个，**停止 EXECUTE，明确告诉 Yuandong 这是 infra 改动，等显式 go-ahead**：

- [createCRUDController](../../../backend/src/controllers/middlewaresControllers/createCRUDController/)
- [errorHandlers](../../../backend/src/handlers/errorHandlers.js)
- [appApi.js auto-route registration](../../../backend/src/routes/appRoutes/appApi.js)
- nginx 配置 / Cloudflare 设置
- [docker-compose.yml](../../../docker-compose.yml)
- auth middleware
- 任何 `.env*` 文件
- `.env.production` 在 Box1 上（永远 SSH 改，不本地改）

部署后**必须**立刻 curl E2E（每个生产 domain 独立验证），3 条断言：
1. `curl -sS https://<domain>/health` → 200 + `{ status: 'ok' }`
2. `curl -sS https://<domain>/api/setting/listAll` → **401**（未带 cookie）
3. 完整 login + cookie + 受保护接口 → 200 + 真数据

任一断言失败 → **立即回滚**，不在生产 debug。参考 [feedback_infra_change_curl_e2e](../../../../../.claude/projects/-Users-duke-Documents-GitHub-crm/memory/feedback_infra_change_curl_e2e.md) 和 [feedback_production_rigor_2026_04_21](../../../../../.claude/projects/-Users-duke-Documents-GitHub-crm/memory/feedback_production_rigor_2026_04_21.md)（PR #111 nginx 截断 bug 就是这条缺失导致的）。

## 4. 出口

- 当前 item Phase 6 通过 → 问「可以 push 了吗?」→ Yuandong/Ziyue/Will/Angel 明确 OK → [/ship](../ship/SKILL.md) → 标 `[x]` → 回 Phase 5 拿下一个 `[ ]`
- task.md 所有 item `[x]` → [/ship](../ship/SKILL.md) 创建 PR 到 dev（**不是 main**）
- 中途遇 §3 infra 触发 → 停 → 等 Yuandong 明确批 → 走 §3 流程
