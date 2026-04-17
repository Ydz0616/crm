const Joi = require('joi');

// 所有 Joi 错误信息强制中文输出：
// - 避免把 path 语法（如 "notes[0]" / "items[0].price"）暴露给非技术用户
// - 前端 Form.List / Form.Item 的 rules 是第一道防线；此处是兜底
// - 单条消息尽量自带字段语义（哪一项出错、期望什么）
const schema = Joi.object({
  client: Joi.alternatives()
    .try(Joi.string(), Joi.object())
    .required()
    .messages({
      'any.required': '请选择客户',
      'alternatives.match': '客户字段格式不正确',
    }),
  number: Joi.alternatives()
    .try(Joi.string(), Joi.number())
    .required()
    .messages({
      'any.required': '请填写报价单编号',
      'alternatives.match': '报价单编号格式不正确',
    }),
  year: Joi.number()
    .required()
    .messages({
      'any.required': '请填写年份',
      'number.base': '年份必须是数字',
    }),
  status: Joi.string()
    .required()
    .messages({
      'any.required': '请选择报价状态',
      'string.base': '报价状态必须是文字',
      'string.empty': '请选择报价状态',
    }),
  notes: Joi.array()
    .items(
      Joi.string().messages({
        'string.base': '备注项必须是文字',
        'string.empty': '请填写备注内容或删除该项',
      }),
    )
    .default([])
    .messages({
      'array.base': '备注必须是数组',
    }),
  termsOfDelivery: Joi.array()
    .items(
      Joi.string().messages({
        'string.base': '交付条款项必须是文字',
        'string.empty': '请填写交付条款或删除该项',
      }),
    )
    .default([])
    .messages({
      'array.base': '交付条款必须是数组',
    }),
  paymentTerms: Joi.array()
    .items(
      Joi.string().messages({
        'string.base': '付款条款项必须是文字',
        'string.empty': '请填写付款条款或删除该项',
      }),
    )
    .default([])
    .messages({
      'array.base': '付款条款必须是数组',
    }),
  expiredDate: Joi.date()
    .required()
    .messages({
      'any.required': '请填写有效期',
      'date.base': '有效期必须是有效的日期',
    }),
  date: Joi.date()
    .required()
    .messages({
      'any.required': '请填写报价日期',
      'date.base': '报价日期必须是有效的日期',
    }),
  currency: Joi.string()
    .valid('USD', 'CNY')
    .required()
    .messages({
      'any.required': '请选择币种',
      'any.only': '币种只能是 USD 或 CNY',
      'string.base': '币种必须是文字',
      'string.empty': '请选择币种',
    }),
  exchangeRate: Joi.number()
    .positive()
    .default(1)
    .messages({
      'number.base': '汇率必须是数字',
      'number.positive': '汇率必须大于 0',
    }),
  freight: Joi.number()
    .default(0)
    .messages({
      'number.base': '运费必须是数字',
    }),
  discount: Joi.number()
    .default(0)
    .messages({
      'number.base': '折扣必须是数字',
    }),
  items: Joi.array()
    .items(
      Joi.object({
        _id: Joi.string().allow('').optional(),
        itemName: Joi.string()
          .required()
          .messages({
            'any.required': '产品 SKU / 编号为必填',
            'string.empty': '产品 SKU / 编号不能为空',
            'string.base': '产品 SKU / 编号必须是文字',
          }),
        description: Joi.string().allow(''),
        laser: Joi.string().allow(''),
        quantity: Joi.number()
          .required()
          .messages({
            'any.required': '产品数量为必填',
            'number.base': '产品数量必须是数字',
          }),
        price: Joi.number()
          .required()
          .messages({
            'any.required': '产品单价为必填',
            'number.base': '产品单价必须是数字',
          }),
        total: Joi.number()
          .required()
          .messages({
            'any.required': '产品小计为必填',
            'number.base': '产品小计必须是数字',
          }),
        unit_en: Joi.string().allow(''),
        unit_cn: Joi.string().allow(''),
      })
        .required()
        .messages({
          'object.base': '产品项格式不正确',
        }),
    )
    .min(1)
    .required()
    .messages({
      'any.required': '报价单必须至少包含一个产品',
      'array.min': '报价单必须至少包含一个产品',
      'array.base': '产品列表格式不正确',
      'array.includesRequiredUnknowns': '报价单必须至少包含一个产品',
    }),
  taxRate: Joi.alternatives()
    .try(Joi.number(), Joi.string())
    .default(0)
    .messages({
      'alternatives.match': '税率格式不正确',
    }),
});

module.exports = schema;
