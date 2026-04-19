# 📐 Ola CRM 代码规范

> 本文件是 Ola CRM 代码库的代码规范和模板。Agent 在写代码前必须读取本文件。
> 所有代码必须遵循此处定义的模式，不可自创新架构。

---

## 📌 总则

- 中文注释可以，但**代码变量/函数名必须是英文**
- 所有 TODO 标注 owner 和 deadline：`// TODO(zyd): description, by YYYY-MM-DD`
- **不引入新 npm 依赖**，除非明确说明理由并获得用户同意
- git commit message 格式：`type(scope): description`（type = feat/fix/refactor/docs/chore）
- 遵循 Ola CRM 既有的代码组织模式，不自创新架构

---

## 🔧 后端规范 (Node.js / Express / MongoDB)

### 项目结构

```
backend/src/
├── controllers/
│   ├── appControllers/          # 业务 Controller（每个业务一个文件夹）
│   │   ├── quoteController/     # 示例：报价单
│   │   │   ├── index.js         # 导出所有方法，覆盖 CRUD 默认方法
│   │   │   ├── create.js        # 自定义 create 逻辑
│   │   │   ├── update.js        # 自定义 update 逻辑
│   │   │   ├── read.js          # 自定义 read 逻辑
│   │   │   └── schemaValidate.js # Joi 校验
│   │   └── ...
│   └── middlewaresControllers/
│       └── createCRUDController/ # 默认 CRUD 工厂（不要修改）
├── models/
│   └── appModels/               # Mongoose Schema（文件名 = Collection 名）
├── routes/
│   └── appRoutes/
│       └── appApi.js            # 路由注册
├── handlers/
│   └── errorHandlers.js         # 全局错误处理（catchErrors 包装器）
└── helpers/
    └── index.js                 # 计算工具（calculate.multiply, calculate.add 等）
```

### Controller 模式（必须遵循）

自定义 Controller 的标准 index.js：

```javascript
// 1. 先用 createCRUDController 获取默认 CRUD 方法
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('ModelName');

// 2. 引入自定义方法
const create = require('./create');
const update = require('./update');

// 3. 覆盖需要自定义的方法
methods.create = create;
methods.update = update;

// 4. 导出
module.exports = methods;
```

### 标准成功/失败响应格式

```javascript
// ✅ 成功响应 — 必须包含 success, result, message
return res.status(200).json({
  success: true,
  result: data,
  message: 'Operation completed successfully',
});

// ❌ 失败响应 — 必须包含 success: false, result: null, message
return res.status(400).json({
  success: false,
  result: null,
  message: '具体的错误原因，不能是模糊的 "Something went wrong"',
});
```

### 错误处理模板

所有 controller 方法都被 `catchErrors()` 包装（定义在 `handlers/errorHandlers.js`），会自动捕获未预期异常（500）。但你仍然需要处理**业务逻辑错误**：

```javascript
const create = async (req, res) => {
  // 1. 输入验证
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: error.details[0]?.message,
    });
  }

  // 2. 业务逻辑校验 — 不可以省略
  const existingRecord = await Model.findOne({ uniqueField: value.uniqueField, removed: false });
  if (existingRecord) {
    return res.status(409).json({
      success: false,
      result: null,
      message: `记录已存在: ${value.uniqueField}`,
    });
  }

  // 3. 核心操作
  const result = await new Model(value).save();

  // 4. 成功响应
  return res.status(200).json({
    success: true,
    result,
    message: 'Created successfully',
  });
};
```

> ⚠️ `catchErrors()` 只处理未预期异常。业务校验失败必须由你显式返回 400/409。

### Model 注册机制

新增业务 Model 的步骤：
1. 在 `backend/src/models/appModels/` 下创建 `YourModel.js`
2. 文件名首字母大写 = Mongoose model 名称（自动注册）
3. `models/utils/index.js` 会自动扫描 `appModels/` 目录，生成 routesList
4. `routes/appRoutes/appApi.js` 会根据 routesList 自动注册标准 CRUD 路由
5. 如果需要自定义逻辑，在 `controllers/appControllers/` 下创建对应 Controller 文件夹

### Mongoose Schema 必须包含的字段

```javascript
const schema = new mongoose.Schema({
  // ... 你的业务字段 ...

  removed: { type: Boolean, default: false },     // 软删除标记（必须）
  enabled: { type: Boolean, default: true },       // 启用状态
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
});
```

---

## 🎨 前端规范 (React / Ant Design / Vite)

### 项目结构

```
frontend/src/
├── pages/          # 页面组件（每个业务一个文件夹或文件）
├── modules/        # 可复用的业务模块
├── forms/          # 表单组件
├── components/     # 通用 UI 组件
├── redux/          # Redux Toolkit（crud / erp / auth / settings）
├── request/        # Axios 封装（request.js + errorHandler.js + successHandler.js）
├── router/         # 路由配置
├── hooks/          # 自定义 Hooks
├── context/        # React Context
├── layout/         # 布局组件
├── locale/         # 国际化
├── style/          # 全局样式
└── utils/          # 工具函数
```

### API 调用规范

前端所有 API 调用必须走 `request/` 封装的 Axios instance。不可以直接 `fetch()` 或 `new XMLHttpRequest()`。

响应处理已经由 `successHandler.js` 和 `errorHandler.js` 统一处理：

```javascript
import { request } from '@/request';

// 标准调用方式
const { success, result, message } = await request.create({ entity: 'quote', jsonData: data });

if (success) {
  // 处理成功
} else {
  // success === false 时 errorHandler 已经弹了 notification
  // 这里做额外的 UI 状态处理（如关闭弹窗、重置表单）
}
```

### 前端错误处理模板

```javascript
try {
  const response = await request.create({ entity: 'quote', jsonData: formData });
  if (!response.success) {
    setLoading(false);
    return;  // errorHandler 已弹 notification
  }
  message.success('报价单创建成功');
  navigate('/quote');
} catch (err) {
  setLoading(false);
  console.error('Quote creation failed:', err);
}
```

### 组件规范

- 组件命名：PascalCase，文件名和组件名一致
- 使用 Ant Design 组件库，**不引入其他 UI 框架**（不用 Material UI, Chakra, Tailwind 等）
- Redux 操作走 `crud` slice 的标准 action（`crud.create`, `crud.read`, `crud.update`, `crud.delete`, `crud.list`）
- 不在组件内直接调用 `mongoose` 或数据库操作（前端永远通过 API）
