---
description: Ola CRM 代码推送 — 原子化提交 + Code Review + 测试验证
---

# 📤 Ola CRM 代码推送

> 本文件定义推送前的必走流程。每次推送必须原子化、可追溯、经过验证。

> ⚠️ 本 workflow 是开发循环的一环。完整流程：`develop → push → pr`
> 每次 /push 应该对应一个已完成并验证通过的 backlog item。

---

## 第零步：确认 Branch

### Branch 策略

| 操作者 | 开发 Branch |
|--------|-------------|
| zyd | `ZYD_FEAT` |
| wzh | `WZH_UI` |

**所有开发都不在 main 或 dev 上直接进行。**

1. 确认当前 branch：
```bash
git branch --show-current
```
- 如果在 `main` 或 `dev` → ❌ 停止！切换到正确的开发 branch
- 如果在 `ZYD_FEAT` 或 `WZH_UI` → ✅ 继续

2. 与 dev 同步：
```bash
git fetch origin
git log HEAD..origin/dev --oneline
```
- 如果 dev 有新 commit → 先 rebase：`git rebase origin/dev`

---

## 第一步：检查改动范围

```bash
git status
git diff --stat
```

**原子化原则：一次推送只包含一个功能/修复。**

如果 `git status` 显示的改动涉及多个不相关功能，必须拆分：

```bash
# 只暂存某个功能相关的文件
git add <file1> <file2>
# 其余文件留到下次推送
```

违反原子化的典型反例：
- ❌ 同一个 commit 里既修了 Quote 的 bug 又加了 Merch 的新字段
- ❌ 功能代码和无关的格式化/重命名混在一起
- ✅ 一个 commit = 一个 Quote 导出功能的完整实现

---

## 第二步：Code Review

**先阅读 `.agents/context/code_conventions.md` 获取完整代码规范。**

然后对所有改动的文件逐一检查：

```bash
git diff --staged
```

### A. 代码卫生检查

| 检查项 | 说明 |
|--------|------|
| □ `console.log` 未清理 | debug log 必须删除，`console.error/warn` 可保留 |
| □ hardcode 密钥/密码 | API key、Token 必须走环境变量 |
| □ TODO 未标注 owner | 格式：`// TODO(zyd): description, by YYYY-MM-DD` |
| □ 引入了新依赖 | 确认已沟通且 package.json 已更新 |
| □ 破坏已有功能 | 修改的文件是否影响其他 caller/依赖方 |

### B. 实现质量检查（对照 code_conventions.md）

**后端改动必查：**

| 检查项 | 说明 |
|--------|------|
| □ 响应格式统一 | 成功 `{ success: true, result, message }`，失败 `{ success: false, result: null, message }` |
| □ 错误分类正确 | 400=输入错误, 404=不存在, 409=冲突, 500=系统错误 — 不是所有错误都返回 500 |
| □ 输入校验完整 | req.body 用 Joi schema 校验；findOne 结果有 null check |
| □ 无 silent error | 每个 catch 块都有明确的错误返回，不是空 `catch(err) {}` |
| □ Controller 模式正确 | 自定义 Controller 遵循 `createCRUDController` + 覆盖模式 |
| □ Model 字段完整 | 新 Schema 包含 `removed`, `enabled`, `createdBy`, `created`, `updated` |
| □ 数值计算安全 | 用 `calculate.multiply/add/sub`，不用原生 `+` `-` `*`（浮点精度） |

**前端改动必查：**

| 检查项 | 说明 |
|--------|------|
| □ API 走 request 封装 | 不直接 `fetch()` 或 `new XMLHttpRequest()` |
| □ 只用 Ant Design | 不引入 Material UI / Chakra / Tailwind 等 |
| □ 组件命名 PascalCase | 文件名和组件名一致 |
| □ Redux 走 crud action | `crud.create`, `crud.list` 等标准调用 |

**命名与风格：**

| 检查项 | 说明 |
|--------|------|
| □ 变量/函数英文命名 | 中文注释可以，代码标识符必须英文 |
| □ 魔法数字用常量 | `const MAX_ITEMS = 50` 不写 `if (items.length > 50)` |
| □ 可扩展性 | 渠道标识用 `channel` 字段，不 hardcode `whatsapp` |

---

## 第三步：运行测试（如果有）

```bash
# 后端测试
cd backend && npx jest --verbose 2>/dev/null || echo "⚠️ 无后端测试或 Jest 未配置"

# 前端测试
cd frontend && npx vitest run 2>/dev/null || echo "⚠️ 无前端测试或 Vitest 未配置"
```

- 如果本次改动涉及已有测试覆盖的代码 → 测试必须全部通过
- 如果本次新增了 Controller/API → 建议同时提交对应的测试文件
- 如果暂无测试 → 跳过此步，但 Agent 应提醒用户补测试

---

## 第四步：生成 Commit Message

**格式：`type(scope): 简明描述`**

### type 类型

| type | 用途 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(quote): add freight calculation to quote creation` |
| `fix` | 修复 bug | `fix(merch): handle null unit_cn when Merch record missing` |
| `refactor` | 重构（不改功能） | `refactor(controller): extract validation to schemaValidate` |
| `docs` | 文档 | `docs(agents): add onboarding workflow` |
| `chore` | 杂务（依赖、配置） | `chore(deps): add jest and testing-library` |
| `style` | 样式/格式 | `style(quote): adjust table column width` |
| `test` | 测试 | `test(quote): add unit tests for create controller` |

### scope 范围

使用被改动的模块名：`quote`, `merch`, `invoice`, `client`, `comparison`, `auth`, `agents`, `deps`, `deploy` 等。

### 示例

```
feat(quote): add freight and discount fields to quote creation

- Added freight and discount to Quote schema
- Updated create controller to calculate total = subtotal + freight - discount
- Frontend QuoteForm now shows freight/discount input fields
- Unit auto-fills from Merch when available
```

**Agent 负责草拟 commit message，用户确认后执行。**

---

## 第五步：提交并推送到开发 Branch

```bash
git add <files>
git commit -m "type(scope): 描述"
git push origin ZYD_FEAT   # 或 WZH_UI（按身份）
```

**⚠️ 绝不直接 `git push origin main` 或 `git push origin dev`**

如果 commit 需要多行描述：

```bash
git commit -m "type(scope): 简明标题" -m "
- 改动点 1
- 改动点 2
- 改动点 3
"
```

---

## 推送后确认

```bash
# 确认推送成功
git log -1 --oneline
```

告知用户：

> 代码已推到 [BRANCH] ✅ 当前 backlog item 完成。
> 如需合并到 dev，请执行 `/pr`。
> 如果还有剩余 backlog items，继续开发循环的下一个 item。

---

> 📎 本 workflow 是开发链路的中间环：`develop → push → pr`
