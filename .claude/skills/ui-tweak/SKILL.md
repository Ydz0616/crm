---
name: ui-tweak
description: Foolproof guided UI micro-edit for Will and Angel (Ola UI/UX teammates) — change a button color, copy text, AntD prop, layout className, spacing, or font. Walks the user through plain-language intake → locate the file → preview the change → verify with vite build → hand off to /ship. Hard-walled scope: only CSS / .less / .scss / className / 文案 / AntD props. Refuses anything that needs business logic, state, Redux, request, or backend changes — those route to Yuandong or Ziyue. Use when a UI/UX teammate wants a small visual change.
---

# UI Tweak — 给 Will / Angel 的傻瓜版前端微调

> **用户什么语言, 你就用什么语言.** Will/Angel 默认中文 — 你也用中文。无术语，多举例，每一步都让用户看见你在做什么。
>
> **核心承诺**：你不用懂代码。你描述要改什么，我帮你找到文件、改、给你看效果、push 到你的 branch。

## 1. 听你想改什么 — 用大白话

第一步**永远是问**，不要猜：

> 你好！我帮你改 UI。先告诉我，你想改的是哪一种？
>
> 1. **颜色** — 比如某个按钮变绿、背景变浅
> 2. **文字** — 比如把"新建"改成"添加新报价单"
> 3. **大小** — 字大一点、按钮小一点、卡片宽一点
> 4. **位置** — 把这个挪到右边、上下颠倒
> 5. **AntD 组件 prop** — 比如让 input 变成大号、加个 placeholder
> 6. **别的** — 描述一下你想要什么效果

听用户回答。如果用户描述模糊（"那个看起来怪怪的"），追问到具体：
- 哪个页面？（"Quote 列表页" / "Ask Ola" / "登录页"）
- 哪个元素？（"右上角的按钮" / "输入框旁边的提示文字"）
- 怎么改？（"颜色变浅一点" — 多浅？"# 颜色 + 形容词" 都行，我会试）

## 2. 帮你找到文件 — 你不用搜

用户说完后，**你（Claude）**去 codebase 找：

```bash
# 如果是文字改动 — 直接 grep 字符串
grep -rn "新建" frontend/src/                 # 找「新建」按钮
grep -rn "新建报价单" frontend/src/

# 如果是颜色 / 样式 — 找页面
ls frontend/src/pages/Quote/                  # Quote 相关页面
ls frontend/src/modules/QuoteModule/          # Quote 模块（包含 forms）
ls frontend/src/forms/                        # 各种表单

# 如果是 AntD 组件配置 — 找 component 文件
grep -rn "Button" frontend/src/pages/Quote/   # Quote 页所有 Button
```

找到候选位置后，**给用户看 + 确认**：

> 我找到了，应该是这里：
>
> [QuoteList.jsx 第 42 行](frontend/src/pages/Quote/QuoteList.jsx#L42)
>
> ```jsx
> <Button type="primary" onClick={handleNew}>新建</Button>
> ```
>
> 这是 Quote 列表页右上角的"新建"按钮，点了会跳转到新建报价单页面。
>
> 是这一个吗？

**不要直接改，等用户说"对，就是这个"再动手。** 如果用户说"不是"，再问"那是哪个？" 或继续搜。

## 3. 你能改 / 不能改 — 硬墙

**✅ 可以改：**
- `.css`、`.less`、`.scss` 文件里所有内容
- JSX 里的 `className="..."`
- JSX 里的中文 / 英文文案字符串（按钮文字、placeholder、tooltip 文案、错误提示文案）
- AntD 组件的 props：`type`、`size`、`shape`、`placeholder`、`title`、`tooltip`、`style={{ ... }}`、`disabled` 静态值
- 布局结构调整（`<Row>` `<Col>` 的 `gutter`、`span`，`<Space>` 的 `size` 和 `direction`，`<Card>` 的 `bordered`、`hoverable`）
- 图标替换（AntD `<Icon>` 换名字）
- 图片 `<img src="..." />` 路径

**❌ 不能改（碰到任何一个，立刻停 + 转 Yuandong/Ziyue）：**
- `useState`、`useEffect`、`useMemo` 等任何 React Hook
- `dispatch(...)` 任何 Redux action
- `request.create / read / update / delete / list` 任何 API 调用
- 任何 `props` 接口定义 / TypeScript type / PropTypes
- 任何 `if/else`、`map`、`filter`、`reduce` 控制流
- `backend/` 下任何文件（**完全不能碰**）
- `frontend/src/redux/`、`frontend/src/request/`、`frontend/src/router/` 下任何文件
- `package.json`、`vite.config.js`、`.env*`
- 加新的 `import` 语句（除了 import 一个新的 AntD 组件名 — 这个 OK）

**判断不确定时：默认拒绝 + 问 Yuandong。** 错杀好过越界。

**当用户的需求超出"可以改"范围**，话术：

> 你想要的这个改动需要改业务逻辑（不只是 UI），我不能直接做。
>
> 我转给 Yuandong / Ziyue 处理 — 你可以这样跟他说：
> "[在 Quote 列表页] 我想 [加一个状态字段]"
>
> 我帮你把要点列出来，他看到就懂。

不要找借口绕过这堵墙。

## 4. 改之前先给你看 diff

确认了文件 + 用户说要改 → **不要直接改**。先给用户看你打算改成什么：

> 我准备这样改：
>
> **改前：**
> ```jsx
> <Button type="primary">新建</Button>
> ```
>
> **改后：**
> ```jsx
> <Button type="primary" size="large">添加新报价单</Button>
> ```
>
> 也就是把按钮文字从"新建"改成"添加新报价单"，并且把按钮变大。
>
> 看着对吗？我现在改？

等用户说「对 / OK / 改吧」再 Edit 文件。

## 5. 改完跑 vite build + 让你眼看

改完后，**两步验证**：

**第一步：build 不能挂**
```bash
cd frontend && npx vite build 2>&1 | tail -20
```
- build 通过 → 继续下一步
- build 失败 → 立刻 revert（`git checkout -- <file>`），告诉用户"改完页面 build 不过，我把改动还原了。错误是：[错误内容]"

**第二步：眼看效果**

启动 dev server（如果还没起）：
```bash
# 如果后端也在本地：
cd frontend && npm run dev
# 如果后端不在本地（推荐 Will/Angel 用这个，不用配后端）：
cd frontend && npm run dev:remote
```

告诉用户：

> dev server 起好了，浏览器打开 http://localhost:3000
> 跳到 [Quote 列表页]（点左边导航的"报价单"）
> 看一下按钮是不是你想要的样子？
>
> 我等你确认。

**等用户回复**。Will/Angel 说「好」/「没问题」之前不要往下走。

如果用户说「不对，颜色再深一点」/「字再大一点」→ 回到 §4，再调一轮，再让看。可以来回多次，这是正常的。

## 6. 用户满意 → 交给 /ship

用户确认好了：

> 改好了 ✅ 我现在准备 push 到你的 branch（[WZH_UI / YILI_UI]），可以吗？

等用户说「可以」→ 调用 [/ship](../ship/SKILL.md) 流程，但只跑前端 checklist：

- ✅ vite build 已通过
- ✅ 没碰 backend/
- ✅ 没引入新依赖
- ✅ 改动只在 css / className / 文案 / AntD props 范围

commit message 用 `style(scope): desc` 格式，比如：
```
style(quote): 「新建」按钮文字改为「添加新报价单」+ 改成大号
```

push 到操作者的 branch（Will → `WZH_UI` / Angel → `YILI_UI`）。**绝不 push 到 main / dev**。

## 7. 失败模式 → 转给 Yuandong

下面这些情况，**立刻转 Yuandong**，不要硬撑：

- 🚫 用户描述的元素你找不到对应文件（搜 3 次还没头绪）
- 🚫 改完 vite build 挂了，revert 后告诉用户但用户还是想要这个改动
- 🚫 用户说"我想加一个新字段 / 新按钮 / 新页面" — 这是新功能，不是 tweak
- 🚫 用户说"那个数据不对" — 是后端 / 数据问题，不是 UI
- 🚫 用户说"我想让点击之后跳到 X" — 是路由 / state 改动，不是 UI

转的话术：

> 这个改动超出我的范围，需要 Yuandong / Ziyue 处理（涉及 [业务逻辑 / 数据 / 路由]）。
>
> 你可以这样跟他说：
> "[页面/位置] 我想 [需求]"
>
> 比如："Quote 列表页我想加一个'状态'筛选下拉框"
>
> 等他做完你再来 /ui-tweak 我帮你调样式。

## 8. 别忘了

- **每改一个文件之前先给用户看 diff**，不要默默改
- **每改完一次都让用户眼看**，不要默默 commit
- **一次只做一件事** — 用户同时说「按钮变大 + 卡片变宽 + 文字加粗」→ 拆开，一次一个，每个都过 §4-§5
- **耐心** — Will/Angel 不写代码，他们的判断标准是"看着对不对"，不是"代码对不对"。你的任务是让"看着对"成立
