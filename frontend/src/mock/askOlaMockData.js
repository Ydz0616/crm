/**
 * Ask Ola Mock Data — Lead-to-Quote conversation flow
 * 8 messages demonstrating all 5 block types + 2 widget types
 */

const MOCK_MESSAGES = [
  // 1. User: inquiry + file attachment
  {
    id: 'msg_001',
    role: 'user',
    timestamp: '2026-04-04T10:00:00Z',
    blocks: [
      { type: 'text', content: '帮我看下这个询盘，客户需要几种钢丝绳产品。' },
      { type: 'file', filename: 'inquiry_20260404.pdf', fileType: 'pdf', size: '1.2 MB', url: '#' },
    ],
  },

  // 2. Assistant: thinking + text + merch_match widget + action
  {
    id: 'msg_002',
    role: 'assistant',
    timestamp: '2026-04-04T10:00:15Z',
    blocks: [
      {
        type: 'thinking',
        content:
          '正在解析 PDF 文件...\n提取到 5 个产品需求项\n正在匹配商品库...\n匹配完成：3 个精确匹配，2 个未匹配',
      },
      {
        type: 'text',
        content:
          '我已经解析了询盘文件，以下是匹配结果。共提取到 **5 个商品需求**，其中 **3 个已匹配**到商品库，**2 个未匹配**。',
      },
      {
        type: 'widget',
        widgetType: 'merch_match',
        data: {
          matched: [
            { serialNumber: 'WR-6001', name: '6mm 镀锌钢丝绳 (6x19)', confidence: 98 },
            { serialNumber: 'WR-8002', name: '8mm 不锈钢钢丝绳 (7x7)', confidence: 95 },
            { serialNumber: 'WR-1003', name: '10mm 涂塑钢丝绳 (6x37)', confidence: 91 },
          ],
          unmatched: ['12mm 特种合金钢丝绳', '5mm 铜芯钢丝绳'],
        },
      },
      {
        type: 'action',
        actions: [
          { label: '生成报价单', actionId: 'create_quote', primary: true },
          { label: '补充未匹配商品', actionId: 'add_unmatched' },
          { label: '跳过', actionId: 'skip' },
        ],
      },
    ],
  },

  // 3. User: text instruction
  {
    id: 'msg_003',
    role: 'user',
    timestamp: '2026-04-04T10:01:00Z',
    blocks: [
      { type: 'text', content: '直接生成报价单，未匹配的先跳过。' },
    ],
  },

  // 4. Assistant: text + quote_draft widget
  {
    id: 'msg_004',
    role: 'assistant',
    timestamp: '2026-04-04T10:01:10Z',
    blocks: [
      {
        type: 'text',
        content: '好的，我已经根据匹配结果为你生成了报价单草稿：',
      },
      {
        type: 'widget',
        widgetType: 'quote_draft',
        data: {
          quoteNumber: 'QT-20260404-001',
          clientName: 'Shanghai Steel Trading Co.',
          items: [
            { serialNumber: 'WR-6001', name: '6mm 镀锌钢丝绳 (6x19)', quantity: 500, unit: '米', price: 4.5 },
            { serialNumber: 'WR-8002', name: '8mm 不锈钢钢丝绳 (7x7)', quantity: 300, unit: '米', price: 8.2 },
            { serialNumber: 'WR-1003', name: '10mm 涂塑钢丝绳 (6x37)', quantity: 200, unit: '米', price: 6.8 },
          ],
        },
      },
    ],
  },

  // 5. User: follow-up question
  {
    id: 'msg_005',
    role: 'user',
    timestamp: '2026-04-04T10:02:00Z',
    blocks: [
      { type: 'text', content: '6mm 的市场价大概多少？我定价是不是偏低了？' },
    ],
  },

  // 6. Assistant: rich markdown text
  {
    id: 'msg_006',
    role: 'assistant',
    timestamp: '2026-04-04T10:02:15Z',
    blocks: [
      {
        type: 'text',
        content: `根据最近 30 天的市场数据，**6mm 镀锌钢丝绳 (6x19)** 的价格区间如下：

- **FOB 价格**：¥4.2 — ¥5.8 / 米
- **市场均价**：¥4.8 / 米
- **你的报价**：¥4.5 / 米（低于均价 6.3%）

**建议**：

1. 如果客户是长期合作伙伴，¥4.5 是一个有竞争力的价格
2. 如果是新客户，建议提高到 **¥5.0** 以上以保持利润率
3. 大批量订单（>1000 米）可以考虑阶梯定价`,
      },
    ],
  },

  // 7. User: confirmation
  {
    id: 'msg_007',
    role: 'user',
    timestamp: '2026-04-04T10:03:00Z',
    blocks: [
      { type: 'text', content: '好的，就按这个来，6mm 的价格调到 5.0。' },
    ],
  },

  // 8. Assistant: confirmation + action buttons
  {
    id: 'msg_008',
    role: 'assistant',
    timestamp: '2026-04-04T10:03:10Z',
    blocks: [
      {
        type: 'text',
        content:
          '已更新报价单 **QT-20260404-001**，6mm 镀锌钢丝绳单价调整为 ¥5.0/米。报价单总金额为 **¥6,220.00**。',
      },
      {
        type: 'action',
        actions: [
          { label: '查看报价单', actionId: 'view_quote', primary: true },
          { label: '继续对话', actionId: 'continue' },
        ],
      },
    ],
  },
];

export default MOCK_MESSAGES;
