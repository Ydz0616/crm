# Ask Ola Demo — 复制粘贴脚本

每条 case 之前先在 Ask Ola 点 **新对话**。

---

## Case 1 · 老客户 + 老产品 + USD

**粘贴 1：**
```
Hi, this is Lukas from Hamburg Welding Supplies. We need 80 pcs of A-1473 and 30 pcs of A-1492. Please quote in USD, FOB Shanghai.
```

**粘贴 2（Ola 问单价后）：**
```
A-1473 报 6.5，A-1492 报 8.2
```

**粘贴 3（Ola 问运费/折扣后）：**
```
没有，直接生成
```

---

## Case 2 · 新客户 + 新产品 outlier + CNY + CIF

**粘贴 1：**
```
这是越南安南刚转过来的一份新客户询盘，请帮我处理一下：

客户：Bangkok Steel Cutting Co Ltd（曼谷新客户，第一次合作）
联系人：Somchai Wattana，邮箱 somchai@bksteel.co.th，电话 +66 2 234 5678

我们最近接了一个港口设备维保项目，需要采购以下零件，麻烦报个 CIF 曼谷的人民币价：

1. A-1517 截止阀 × 12 件
2. A-1518 左旋截止阀 × 12 件
3. 72701632 引线护套总成 × 4 件
4. 0346588 24V 电磁阀 × 8 件
5. PHM-260 等离子电源主板（型号 BS-PWR-260）× 2 件

急用，本周内能给报价吗？
```

**粘贴 2（Ola 问客户/产品/汇率/单价后）：**
```
客户建一下，地址 88 Sathorn Road, Bangkok 10120, Thailand。
PHM-260 本次先跳过，本次报价不含。
汇率 7.25。
A-1517 报 42，A-1518 报 42，72701632 报 9800，0346588 报 2400。
```

**粘贴 3（Ola 问运费/折扣后）：**
```
没有，直接生成
```

---

## Case 3 · WhatsApp 短信风格 + 重订单

**粘贴 1：**
```
王哥 老客户 Taiyo 又来了 加急要 200 个 G2012Y 喷嘴 还是上次那个 CNY 报价 汇率 7.25 谢谢
```

**粘贴 2（Ola 问单价后）：**
```
18 一个
```

**粘贴 3（Ola 问运费/折扣后）：**
```
没有
```

---

## Case 4 · 正式英文邮件 + 付款条款

**粘贴 1：**
```
Forwarding the inquiry from our German distributor:

From: procurement@hh-welding.de
Subject: RFQ — Q2 stock replenishment

Dear Sales Team,

Please prepare a formal quotation for the following items, EXW factory, USD pricing. Payment terms: T/T 30% deposit on order confirmation, 70% before shipment.

- A-1512 Flashback Arrestor G1/4"  ×  25
- A-1517 Shut-off valve G3/8" cutting oxygen  ×  40
- A-1519 Shut-off valve G1/4" heating oxygen  ×  40
- 77005116 GRV91UA flashback arrestor  ×  15
- 220163 Quick-disconnect HPR130/260  ×  10

Best regards,
Lukas Schäfer
```

**粘贴 2（Ola 问单价后）：**
```
A-1512 报 14，A-1517 报 6.2，A-1519 报 6.2，77005116 报 48，220163 报 32
```

**粘贴 3（Ola 问运费/折扣后）：**
```
没有
```

---

## Case 5 · 大单 + 整单折扣 + CNY

**粘贴 1：**
```
Istanbul Metal Kesim 的 Mehmet 来询价，他们这次要的量比较大：

- 71611560 ALFA-PMYE 割炬 × 6
- 72243817 OL200 驱动单元 × 4
- 77002984 气缸 × 10
- A-1473 × 200
- A-1492 × 100

走 CIF Istanbul，CNY，汇率 7.25
```

**粘贴 2（Ola 问单价后）：**
```
71611560 报 19500，72243817 报 22000，77002984 报 6800，A-1473 报 48，A-1492 报 60
```

**粘贴 3（Ola 问运费/折扣后）：**
```
整单折扣 24520 元
```

---

## Case 6 · 全 outlier 产品 + 销售决定一次建多个

**粘贴 1：**
```
Pemex 的 José Hernández 紧急询盘，墨西哥湾平台维修要的：

- 高压氧气调压器 OXR-MAX-300，型号 OXY-300HP × 6
- 不锈钢防爆电磁阀 SS-EX-220V，型号 SSEX-22 × 4
- 工业级耐火编织套管 25mm × 50 米

CIF Veracruz，USD
```

**粘贴 2（Ola 告知 3 个产品都不在系统里之后）：**
```
OXR-MAX-300 和 SSEX-22 你帮我建到产品库。耐火套管这个本次先跳过。

OXR-MAX-300：serialNumberLong OXY-300HP，中文 高压氧气调压器 300bar，英文 High Pressure Oxygen Regulator 300bar，重量 2.5，VAT 1.13，ETR 0.13，单位 PC / 件

SSEX-22：serialNumberLong SSEX-22，中文 不锈钢防爆电磁阀 220V，英文 Stainless Steel Explosion-Proof Solenoid Valve 220V，重量 1.2，VAT 1.13，ETR 0.13，单位 PC / 件
```

**粘贴 3（Ola 念回字段确认后）：**
```
确认，两个都建
```

**粘贴 4（Ola 问单价后）：**
```
OXR-MAX-300 报 850，SSEX-22 报 320
```

**粘贴 5（Ola 问运费/折扣后）：**
```
没有
```
