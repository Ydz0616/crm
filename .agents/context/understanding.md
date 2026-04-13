# 🧠 Ola Technologies — 完整理解

> 经过 4 轮创始人校准的事实基础文档。  
> 用途：所有 Prompt 的 context 源。所有开放问题已关闭。  
> 最后更新：2026-03-27

---

## 1. 公司介绍 — Ola Technologies

**一句话定义：** AI 原生的外贸金牌销售助手。用 Agent 驱动的 ERP/CRM 替代传统数据录入工具，实现 Lead-to-Cash 最小闭环。

**核心理念：**

- **不替代人，赋能人的判断力** — Ola 不是自动化机器人，而是销售的 24/7 决策伙伴
- **从被动式 SaaS 到 Agentic 工作流** — 交互方式从 GUI 转向意图驱动的自然语言界面 (LUI)
- **Spec-Driven Development (SDD)** — 将模糊的业务需求通过结构化模板喂给模型，强制按预设规范输出，从根源压缩幻觉空间
- **Robust over Fancy** — 系统不需要做得很 fancy，但必须做得很 robust

**目标用户：** 中小外贸企业的销售经理/团队

**典型用户画像 (Andy)：** 每天处理 97 项货物、6 家供应商的 Excel 报价单，手动核算美金成本、退税率、增值税、毛利率，80% 的时间花在处理碎片化的多平台消息（WhatsApp/Email/微信）和手工数据录入上。

---

## 2. 人员介绍

### 张元东 (Yuandong Zhang) — CEO / Tech Lead

- 杜克大学计算机科学荣誉学士，UCSD 计算机科学硕士在读
- 科研一作发表于 Nature, GRL, IJGIS 等一区期刊
- 自 2020 年起研究大模型架构，燃烧 5 亿 Token 技术验证
- 开发 A2A 智能体网络，拥有开发定制化 CRM 经验
- **角色：全栈主力开发，100% 功能都能开发**
- 扎实的计算机基础和代码能力
- 爱代码更爱销售 — 有外贸公司实习、ERP 产品开发、国际会议推销经验

### 王梓珩 (Will Wang) — Co-founder / COO

- 连续创业者 / 数字媒体营销背景
- 前昆山杜克大学创业教育研究助理 + 创新创业中心项目助理
- 拥有独立运营孵化器/创新实验室经验
- 管理过百万级别孵化资金，深度服务和孵化了 50+ 学生项目
- 丰富的 0-1 以及管理团队经验
- **角色：商务运营 + 用户关系 + 前端 UI 审美把关**
- **没有代码能力**，但有审美，可以帮助改前端 UI
- ⚠️ **不能动关键组件**，只能改前端样式/布局，否则会 mess up

### 刘致远 (Zhiyuan Liu) — 首席科学家

- 牛津大学克拉伦登学者
- 牛津大学实验心理学全奖博士
- 研究用户与 AI 系统之间的决策结构与信任机制
- 前耶鲁大学霍斯特曼学者
- 曾在耶鲁与三星的联合项目中主导多模态生理数据的收集与验证工作
- 拥有计算建模、社会与行为科学的复合背景
- **角色：不参与代码开发**，会体验功能、提供产品心理学方向指导
- 后期产品发展会深度用到他的心理学专业知识（用户决策、信任机制等）

### 三位创始人关系

- 四年前通过羽毛球双打相识，成为最好的兄弟
- 共同理念：颠覆性的技术是创造颠覆性商业模式、解放销售生产力的第一要素

---

## 3. 产品介绍 — 三个仓库、一条演进线

### 演进路径（关键认知）

```
nanobot (开源框架，上游依赖)
    ↓ 魔改
OlaIntel (Demo，已停止开发 ⚠️ 吸取经验但不再维护)
    ↓ 经验迁移
crm (正式产品 Ola — 唯一在全力开发的产品)
```

> **OlaIntel Demo 已放弃开发。** 原因：太 geek，用户用不懂。但其中的 WhatsApp 踩坑经验和用户体验洞察必须借鉴到 CRM 产品中。

---

### 📦 Repo 1: `nanobot` (上游开源框架)

**来源：** HKU Data Science Lab (HKUDS) — [github.com/HKUDS/nanobot](https://github.com/HKUDS/nanobot) (36.6k ⭐)  
**定位：** Ultra-lightweight personal AI assistant (~4,000 行核心代码)  
**最新版本：** v0.1.4.post6 — 持续活跃更新

**v0.1.4.post6 关键更新（截至 2026-03）：**

- Agent runtime 分解为可组合模块 (AgentRunner, HookContext)
- **litellm 被替换为原生 OpenAI + Anthropic SDK** — 完全重写了 provider 层
- 端到端 streaming 支持
- WeChat (微信) 作为完整通道加入
- Email 安全漏洞修复 (SPF/DKIM 验证)
- MCP tool schema 修复 nullable params
- per-session concurrent dispatch

**核心架构：**

```
nanobot/
├── agent/          # 🧠 Agent 核心 (loop, context, memory, skills, subagent, tools)
├── channels/       # 📱 12 个用户通道 (whatsapp, telegram, discord, feishu, weixin, wecom, slack, email, dingtalk, qq, matrix, mochat) + manager/registry
├── providers/      # 🤖 原生 SDK provider: anthropic, openai_responses, azure_openai, openai_codex, openai_compat, github_copilot — 其它模型 (DeepSeek/Mistral/Gemini/Ollama/OpenRouter) 通过 openai_compat 走 OpenAI 兼容协议接入（litellm 已移除）
├── bus/            # 🚌 消息路由
├── heartbeat/      # 💓 定时心跳
├── cron/           # ⏰ 定时任务
├── skills/         # 🎯 技能系统
├── session/        # 💬 会话管理
├── config/         # ⚙️ 配置
├── cli/            # 🖥️ 命令行
└── bridge/         # Node.js WhatsApp Bridge (Baileys)
```

**Ola 的用法：** Nanobot 作为微服务部署在 CRM 旁边（Docker Compose），不重写成 Node.js。Kubernetes 目前 overkill。

---

### 📦 Repo 2: `OlaIntel` (已停止开发的 Demo)

**状态：⚠️ 已放弃开发，仅做经验库使用**

**需要借鉴的经验：**

- WhatsApp Bridge 魔改：6 类消息路由、去重、LID/Phone JID 智能路由、自身号码发现
- 15 个部署踩坑记录 (DEPLOYMENT_LESSONS.md) — Baileys 类型不可靠、WhatsApp 限流、重连退避策略
- Agent 人格设计模式 (AGENTS.md 的安全层 + 路由 + 自我进化)
- MCP Server 模式：通过 FastMCP 将 Backend API 暴露为 Agent 工具
- Autopilot 机制：Boss/Agent 共享 WhatsApp 号的无缝切换

**不需要继续的：** OlaIntel 的 D3.js 关系图、PostgreSQL Schema、FastAPI Backend、Sprint B/C 任务

---

### 📦 Repo 3: `crm` (正式产品 — Ola) ⭐ 唯一活跃开发的产品

**项目名称：** Ola（Ola Technologies 自有产品，MERN Stack）  
**历史问题：** 过去 5 个月因未做 spec 导致开发效果越做越差 — 这就是做 prompt 库的核心原因  
**生产 URL：** `https://erp.olajob.cn`

**技术栈：**

| 层       | 技术                                                              |
| -------- | ----------------------------------------------------------------- |
| Backend  | Node.js 20, Express, **MongoDB** (Mongoose), JWT, Gotenberg (PDF) |
| Frontend | React 18, Ant Design, Redux Toolkit, Vite, Axios                  |
| Deploy   | Docker Compose (deploy.sh rsync + docker compose)                 |

**数据库决策：** 目前保持 MongoDB 不做大改（仍属 demo 阶段）。远期倾向 PostgreSQL（担忧 MongoDB vendor lock-in 和非关系型性能），但当前不紧急迁移。图数据库 (Neo4j) 可作为 BP 远期规划但不是产品当前优先。

**数据模型 (MongoDB Collections)：**

| Collection        | 关键字段                                                                                                                                                       | 说明                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Client**        | name, phone, country, address, email, assigned                                                                                                                 | 客户                                                                   |
| **Merch**         | serialNumber, serialNumberLong, serialNumberEasyWeld, description_en/cn, weight, VAT, ETR, unit_en/cn                                                          | 商品目录 ⭐ Agent 自动匹配询盘的基础                                   |
| **Quote**         | client, items[], currency, taxRate, discount, freight, status(draft→sent→accepted), notes, termsOfDelivery, paymentTerms, bankDetails, shippingMark, packaging | 报价单 ⚠️ 当前字段是为特定客户定制的魔改版本，未来需要让用户自定义表头 |
| **Invoice**       | client, items[], relatedPurchaseOrders[], converted(from quote), paymentStatus(unpaid/paid/partially)                                                          | 形式发票                                                               |
| **PurchaseOrder** | factory, items[], relatedInvoice, total, status                                                                                                                | 采购订单（面向工厂）                                                   |
| **Comparison**    | client, exchangeRate, items[](含 purchasePrice, grossProfit), total                                                                                            | 利润比对单                                                             |
| **Payment**       | —                                                                                                                                                              | 付款记录                                                               |
| **Factory**       | factory_code, factory_name, location, contact, tel1/tel2                                                                                                       | 供应商/工厂                                                            |

> ⚠️ **Quote 自定义问题：** 当前 Quote 的 notes, termsOfDelivery, paymentTerms, shippingMark, packaging 等字段是为创始人父亲的业务定制的。不同客户需要不同的表头字段。Demo 阶段可以简单处理，但产品化阶段需要设计用户可自定义表头的机制。

**前端页面结构：**

| 页面           | 状态                           | 说明                         |
| -------------- | ------------------------------ | ---------------------------- |
| Dashboard      | ✅ 已有                        | 仪表板                       |
| **Ask Ola**    | 🔧 UI Shell 已有，Agent 未接入 | **AI 对话入口 — 核心差异化** |
| Customer       | ✅ 已有                        | 客户 CRUD                    |
| Factory        | ✅ 已有                        | 工厂 CRUD                    |
| Merchandise    | ✅ 已有                        | 商品 CRUD                    |
| Quote          | ✅ 已有                        | 报价单 CRUD + PDF            |
| Invoice        | ✅ 已有                        | 发票 CRUD + PDF + 邮件       |
| Purchase Order | ✅ 已有                        | 采购单 CRUD                  |
| Comparison     | ✅ 已有                        | 利润比对                     |
| Payment        | ✅ 已有                        | 付款管理                     |
| Settings       | 🔧 需完善                      | 系统设定                     |
| Profile        | ✅ 已有                        | 个人资料                     |

---

## 4. 当前 Sprint 与核心任务

### 最高优先级：Prompt 库

**核心问题：** 过去 5 个月 AI Agent 生成的代码不 robust、取巧、不可维护、不可 scale。需要设计好的 Spec 来约束模型的生成行为。

**开发工作流：**

```
打开 Antigravity → 扔进去 prompt + 自己的东西 → Agent 开发 → 团队审核 → OK 就 push
```

**SDD 框架参考：** [OpenSpec](https://github.com/Fission-AI/OpenSpec) (34.9k ⭐, MIT)

- 核心理念：AI coding assistants are powerful but unpredictable when requirements live only in chat history
- 工作流：`/opsx:propose` → specs + design + tasks → `/opsx:apply` → implementation → `/opsx:archive`
- 哲学：fluid not rigid → iterative not waterfall → easy not complex → built for brownfield

### 第一步：减法（垃圾清理）

CRM 过去 5 个月给用户定制了太多功能，现在需要做减法。先清理已有功能，再加新功能。

### MVP 核心交付 — Lead-to-Quote 闭环（第一期）

**闭环流程：**

```
1. 客户通过 WhatsApp 发来询盘（碎片化聊天消息）
2. Ola Agent 从聊天消息中提取产品需求
3. Ola 自动匹配 Merch 集合（用户预先录入的 product catalog）
   - 找到了 → 自动关联 serialNumber, description, unit 等元信息
   - 没找到 → 明确提醒销售"这个产品没有找到，请补全"
   - ⚠️ 绝不可以 silent error
4. 在对话过程中，Ola 和销售一起创建 Quote
   - 产品名/序列号/描述 → 自动填充
   - 价格 → 留给销售自己填（Agent 不猜价格）
5. 创建的 Quote 出现在 Quote 栏目里
```

**MVP 保证项：**

1. ✅ 所有现有 CRUD 功能正常运作（不能改坏）
2. ✅ AskOla 可以正常对话交互
3. ✅ Lead-to-Quote 链路完整可用
4. ✅ WhatsApp 接入功能正常

**第二期优先级：** Email 接入 → Quote→Invoice→PO→Payment→Comparison 后续链路

---

## 5. 技术愿景 — Spec-Driven Development

### 核心方法论（得物技术启发 + OpenSpec 框架 + Ola 自研路线）

#### 一、数据确权边界

| 维度     | 负责方   | 说明                                       |
| -------- | -------- | ------------------------------------------ |
| 管理审批 | 人类主导 | 数据权限审批，合规性定责，业务口径最终确认 |
| 技术实现 | AI 辅助  | 人工确权后，技术执行动作可由 Code LLM 生成 |

#### 二、规范化 I/O（SDD 的核心）

- **问题：** Vibe Coding 导致代码风格发散、业务口径不一致、数据失真
- **解决：** 将模糊的业务需求通过结构化模板 (CSV/JSON/API) 喂给模型，强制按预设规范输出
- **OpenSpec 工具化：** propose → specs → design → tasks → apply → archive

#### 三、MCP 标准化集成（需要认真设计）

```
销售输入自然语言 → LLM → 判断需求 → MCP Tool Call → 查询 CRM MongoDB → 结构化 JSON → 模型根据上下文回复
```

MCP Server 是 Nanobot 与 CRM 的集成点，需要认真设计 Tool 接口。

#### 四、策略孵化中心（远期）

- **路径一：** 本体化建模理解多模态客户数据 → Agent 调用 Skills 计算模块
- **路径二：** 战略模型接受结构化文本 → 跨模块趋势判断与业务归因叙述

#### 五、风险管控

- **RAG + MCP 强绑定：** 严禁模型在无上下文情况下裸写业务代码
- **强类型校验：** Tool Call + 业务代码必须经过语法解析器静态检查
- **数据脱敏：** Prompt 提交前扫描，屏蔽/替换敏感数据
- **审计追溯：** 所有 AI 生成的代码变更带 AI 标签 + Prompt 日志
- **不可以 silent error：** 任何失败必须明确告知用户

---

## 6. 产品愿景时间线

### 短期 (MVP)

在 CRM 的 Ask Ola 中接入 Nanobot Agent → WhatsApp 询盘自动理解 → Merch 自动匹配 → 对话式创建 Quote

### 中期

- Email 通道接入
- Lead-to-Cash 完整闭环：Quote → Invoice → PO → Payment → Comparison
- 策略孵化：利润比对、报价策略推荐
- 本体化建模：结构化理解客户关系和产品关联

### 长期

> **让每个销售都拥有一个 24 小时在线的顶级搭档 — 不是替代人，而是赋能人的判断力。**

- AI 原生 ERP 彻底取代传统 Oracle / 聚水潭
- 给外贸做的 Palantir — 数据驱动的决策智能
- 按席位订阅 + 企业私有化部署 + 专属模型训练
- 利用致远的心理学研究：用户决策结构与信任机制

---

## 7. Onboarding Prompt 设计要求

### 核心逻辑

Prompt 库是**给 AI Agent (Antigravity) 的约束 spec**，不是给人类的文档。

### 必须实现的能力

**1. 身份识别：** Prompt 结尾让 Agent 问 "你是谁？"

| 用户回答                   | Agent 应理解的 Skillset                                      |
| -------------------------- | ------------------------------------------------------------ |
| "我是 zyd / 张元东"        | 主力开发，扎实基础，可以开发 100% 功能                       |
| "我是 wzh / 王梓珩 / Will" | 没有代码基础，只能改前端 UI/样式，**时刻提醒不要动关键组件** |
| "我是 lzy / 刘致远"        | 不参与开发，仅体验功能、提供反馈                             |

**2. 上下文注入：** 公司/产品/架构 context 一次性注入

**3. Spec 约束：** robust, maintainable, scalable 的代码生成规范，不取巧

**4. 上游感知：**

- Ola CRM 是 Ola Technologies 自有产品（MERN Stack），由元东主导架构演进
- Nanobot 来自 [HKUDS/nanobot](https://github.com/HKUDS/nanobot) v0.1.4.post6，持续更新
- SDD 方法论参考 [OpenSpec](https://github.com/Fission-AI/OpenSpec)

**5. 风险意识：** 不可以 silent error，所有失败明确告知

---

## 8. 已决定的技术决策

| 问题                     | 决策                                                |
| ------------------------ | --------------------------------------------------- |
| MongoDB vs PostgreSQL    | **目前保持 MongoDB**（demo 阶段），远期考虑迁 PGSQL |
| 图数据库 (Neo4j)         | **远期 BP 规划**，产品稳定优先                      |
| Nanobot 部署方式         | **Docker Compose 微服务**，MCP 连接 CRM backend     |
| CRM 代码重写             | **不重写**，在现有基础上做减法 + 集成 Agent         |
| Agent 逻辑重写为 Node.js | **不重写**，保持 Python Nanobot                     |
| Quote 自定义表头         | **Demo 阶段简单处理**，产品化阶段设计可配置机制     |
