# DOM 元素笔记

> **这份笔记是"实战笔记"，不是设计文档。**
> selector 一律实测后再填，禁止凭猜测预填。
> 每次跑通一个步骤，立即回来补充对应节的内容。

---

## 开发约束

### 代码展示规则（对 Claude Code 的永久约束）
- 用户要求"展示代码"或"cat 文件"时，必须贴完整原文
- 禁止任何形式的省略：不允许 `...`、不允许 `{ ... }`、不允许"完整内容已写入文件"作为代偿
- 如果代码确实太长不适合全贴，必须明确说"代码较长，建议直接看文件 path/to/file"
- 不允许用"汇总说明"或"结构描述"代替代码原文
- 违反此规则等同于虚假交付

### content script 注入特性
- manifest 的 content_scripts 在页面首次完整加载时注入一次
- SPA 内的 hash 变化（例如 settings → settings#courses）不会重新注入
- 因此 takeme-search.js / takeme-products.js / takeme-config.js 三个脚本
  在打开 settings 页时全部被注入到同一个页面

### 编码约束（必须遵守）
- content 脚本顶层只做：注册 chrome.runtime.onMessage 监听器、console.log("xxx loaded")
- 顶层禁止：执行业务逻辑、操作 DOM、注册定时器、读写全局变量
- 业务逻辑全部包在 message handler 里，由 background 发激活消息后才触发
- 每次 handler 入口处先 reset 局部状态，避免上次执行残留污染

### 激活消息约定
- background → google-action.js:   { type: "RUN_STEP_1", payload: { google_id } }
- background → takeme-search.js:   { type: "RUN_STEP_2", payload: { restaurant_name } }
- background → takeme-products.js: { type: "RUN_STEP_3", payload: { platform_id } }
- background → takeme-config.js:   { type: "RUN_STEP_4", payload: { platform_id } }
- 脚本只响应自己的消息类型，其他类型一律 return（不调用 sendResponse）

---

## 步骤① — Action Center 抓餐厅名称

**页面 URL**

    https://actionscenter.google.com/inventory/merchants/{google_id}?a=2045466328

✅ 已确认：使用详情页 URL，模板锁定如上。PM 决策见 screenshot-checklist.md。

**关键元素 selector 候选**（待 DOM 验证后填）

    // 餐厅名称所在元素：待填
    // 截图确认名称在 Merchants results 表格的 Merchant name 列，具体 selector 待验证

    // 找不到结果的判断依据：待填
    // 截图显示出现文本 "We couldn't find any data that matches your criteria."

**等待信号**（待验证）

    // 待填——等待 Merchants results 区块出现，或表格首行/空状态文本出现

**易碎点**（待观察）

    // - Action Center 为 Google 产品，DOM 随时可能改版
    // - 页面有 Production/Sandbox 切换，需确认始终在 Production
    // - merchantId 为 UUID 含连字符，URL 拼接注意不要 encode 连字符

**已知坑**（跑起来踩到再回填）

    // 暂无

---

## 步骤② — TakeMe 搜索店铺

**页面 URL**

    https://admin.takeme.com/web/reservations/settings

**关键元素 selector 候选**（待 DOM 验证后填）

    // 店舗設定搜索框：待填
    // 上次 content.js 用的是 input.title-shop-select，本步需确认是否同一 selector

    // 下拉候选列表容器：待填
    // 上次用 ngb-typeahead-window button，需验证店铺搜索框是否同款组件

    // 候选项文本格式（已从截图确认）：
    // "SR10694 - 支店 京都祇園 ふぐ・うなぎ・かに料理"
    // platform_id 提取：取 " - " 前的部分 → "SR10694"

    // 当前已选店铺名读取（步骤③④安全校验用）：待填

**等待信号**（待验证）

    // 待填——等待搜索框可交互（非 disabled）
    // 待填——输入后等待下拉出现的信号；超时判定为"平台未找到"

**易碎点**（待观察）

    // - 下拉组件如为 Angular ng-select，候选出现有延迟，需实测等待时间
    // - 名称 normalize 规则（去空格、括号、标点后一致），normalize 函数待确定后填此处

**已知坑**（跑起来踩到再回填）

    // 暂无

---

## 步骤③ — 商品管理合规检查（只读）

**页面 URL**

    https://admin.takeme.com/web/reservations/settings#courses

**关键元素 selector 候选**（待 DOM 验证后填）

    // プラットフォーム 下拉框：待填
    // 截图可见下拉显示 "TakeMe Concierge"，selector 待验证

    // 検索 按钮：待填

    // 课程列表容器（判断是否有行）：待填

    // ステータス 列"表示"标签：待填
    // 截图显示为绿色 badge，class 名待验证

    // 店舗設定当前店铺名（安全校验，同步骤②）：待填

**等待信号**（待验证）

    // 待填——点検索后等待列表刷新的信号
    // 待填——区分"空列表"和"列表还在加载"的方法

**易碎点**（待观察）

    // - プラットフォーム 下拉默认值不一定是 TakeMe Concierge，每次进来都要主动选
    // - "TMC Missing" 筛选器：PM 已确认不操作，保持默认，代码中忽略此筛选器

**已知坑**（跑起来踩到再回填）

    // 暂无

---

## 步骤④ — 配置页关闭操作（写）

**页面 URL**

    https://admin.takeme.com/web/reservations/settings#inbound-setting-tab

**关键元素 selector 候选**（待 DOM 验证后填）

    // 「Googleマップに載せる」下拉框：待填
    // 截图确认该字段在 Core Settings 子标签页内
    // 已知选项值："有効" / "オプトアウト" / "無効"

    // 切换到 "オプトアウト" 的操作方式（下拉选 or 点 option）：待填

    // 滚动到页面底部：待填
    // window.scrollTo 或找到 save 按钮后 scrollIntoView

    // 保存按钮：待填

    // 成功 toast（绿色「保存しました」）：待填

    // 失败 toast（红色）：待填

    // 店舗設定当前店铺名（安全校验，同②③）：待填

**等待信号**（待验证）

    // 待填——页面加载完且 Googleマップ 下拉可读的信号
    // 待填——点保存后 toast 出现的等待逻辑（1-2秒内，超时判为失败）

**易碎点**（待观察）

    // - 「Googleマップに載せる」在 Core Settings 子标签页，
    //   进入 #inbound-setting-tab 后不一定默认停在 Core Settings，需验证
    // - 保存按钮可能在页面底部，需先滚动再点击

**已知坑**（跑起来踩到再回填）

    // 暂无
