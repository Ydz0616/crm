---
description: Ola CRM 开发纪律 — Agent 全时遵守的 SDD backbone
---

# 🧱 Ola 开发纪律 (SDD Backbone)

> ⚠️ 本文件是 Agent 行为约束。不是可选命令，是 onboard 后自动生效的规则。
> Agent 在 /onboard 时会读取本文件，之后的所有开发行为必须遵守。

---

## 核心原则

1. **一次只做一件事** — 绝不同时开两个 backlog item
2. **先 plan 后动手** — 任何改动 > 1 个文件必须先出方案
3. **Backlog 驱动** — task.md 是唯一的进度追踪，实时更新
4. **测试在前进之前** — 不验证不放行
5. **完成 = push** — 验证通过 → /push → 标记完成 → 下一个

---

## 6 Phase 循环

> 每个开发任务（非 trivial）必须完整走完这 6 个 Phase。

### Phase 1: PLAN（理解需求）✋

- 复述理解：目标、涉及模块、验收标准
- 有模糊点 → 列出问题等用户回答，不猜测
- 输出：方案文字描述（不写代码）
- 列出要修改/新增的文件路径
- 分析每个文件的 import/require 依赖关系
- 影响 > 3 个不相关文件 → 建议拆分
- 多方案时列 pros/cons

### Phase 2: REVISE（用户审核）🔄

- 用户可能修改方案，来回多次
- Agent 按用户反馈修订方案
- 不着急，直到用户满意为止

### Phase 3: APPROVE（用户批准）✅

- 等用户明确说："approved" / "开始" / "可以" / "没问题"
- **用户未批准 → 绝不开始写代码**

### Phase 4: BACKLOG（拆分任务）📋

- 将方案拆成独立可验证的 backlog items
- 写入 task.md（Antigravity artifact）
- 每个 item 必须满足：
  - **独立可验证** — 完成后能立刻测试
  - **粒度合适** — 不超过 3 个文件的改动
  - **有明确的验收标准** — 怎么算 "做完了"

### Phase 5: EXECUTE（执行当前 item）🔨

- 从 task.md 取第一个 `[ ]` item
- 标记为 `[/]`（进行中）
- **只做这一个 item 的改动，不碰其他**
- 逐文件实现，每个文件改完说明原因
- 不做方案外的额外改动

### Phase 6: TEST（验证当前 item）🧪

- 按 item 的验收标准验证
- **通过** → 执行 `/push` → 标记 `[x]` → 回到 Phase 5 拿下一个
- **失败** → 修复 → 重新测试（不跳到下一个）

---

## trivial 豁免（仅 zyd 对等模式）

以下情况可跳过 Phase 1-3，直接进入 Phase 4-6：

- 单行 fix（typo / CSS 微调 / 变量重命名）
- 单文件改动且逻辑清晰无歧义
- 用户明确说 "直接改"

> 即使 trivial，Phase 5-6（执行 + 验证）仍然不可跳过。

---

## 完整开发链路

```
用户需求
    ↓
Phase 1: PLAN → Phase 2: REVISE → Phase 3: APPROVE
    ↓
Phase 4: BACKLOG（写入 task.md）
    ↓
┌─→ Phase 5: EXECUTE（当前 item）
│       ↓
│   Phase 6: TEST（验证）
│       ↓
│   通过 → /push → 标记 [x] → 下一个 item ──→ 回到 Phase 5
│   失败 → 修复 → 重新测试（不跳下一个）
└───────────────────────────────────────────┘
    ↓
全部完成 → /pr → 用户审核合并到 dev
```

---

## ❌ 违规行为（任何身份模式都不可以）

1. **跳过 Phase 1-3 直接写代码** — 即使用户说 "帮我改"（trivial 豁免除外）
2. **同时执行多个 backlog item** — 一次只做一件事
3. **不更新 task.md** — 每完成/开始一个 item 必须更新状态
4. **测试不过就跳下一个** — 修到通过为止
5. **在 Phase 5 做方案外的改动** — 发现额外问题？记录到 backlog，不当场修

---

## 与其他 Workflow 的关系

| Workflow | 何时触发 | 说明 |
|----------|----------|------|
| `/onboard` | 每次新对话开始 | 读取本文件，激活开发纪律 |
| `/push` | Phase 6 测试通过后 | 原子化提交到个人 branch |
| `/pr` | 全部 backlog 完成后 | 创建 PR 到 dev |
| `/start` | 需要启动/重启服务时 | 环境启动，独立于开发循环 |

---

> 📎 本文件 = 行为约束 | `onboard.md` 读取本文件 | `push.md` 和 `pr.md` 是循环中的工具
