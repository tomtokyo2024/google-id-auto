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

**关键元素 selector（2026-05-11 实测，跑通 google_id edf7ac3f-...）**

    // 餐厅名所在元素（已实测）
    selector: merchant-detail .gmat-headline-3
    // 用 textContent + trim() 读出，返回 "横浜 鉄板焼＆ステーキ 祥鳳"

    // 找不到结果的判断依据（已实测）
    // waitForElement('merchant-detail', 10000) 超时 → '谷歌后台未找到'

**等待信号**

    // 等 merchant-detail 元素出现（即 Angular 详情组件渲染完）
    waitForElement('merchant-detail', 10000)

**易碎点（已实测确认稳定）**

    // - .gmat-headline-3 是 Google Material Theme 的 H3 样式 class，跨页面通用
    // - merchant-detail 是业务语义自定义标签，比 _ngcontent 这种构建后缀稳定
    // - 未依赖任何 _ngcontent-ng-xxxxx 随构建变化的属性

**已知坑**（跑起来踩到再回填）

    // 暂无

---

## 已知坑（实战记录）

### 坑 2: Chrome 扩展刷新后必须刷新所有相关页面
- 现象: 改了 content script 代码、点了 chrome://extensions 的刷新按钮后，
  在已打开的页面里触发 sendMessage 会报 "Receiving end does not exist"
- 原因: content script 是页面加载时注入的，刷新插件后已有页面里的
  content script 仍是旧实例，新代码没生效
- 正确做法: 改代码后既要刷新插件，也要刷新（或重开）所有目标页面
- 发现时间: 2026-05-11 步骤②首次试跑

### 坑 1: 页面 Console 不能直接调 chrome.runtime
- 现象: 在 Action Center / TakeMe 页面的 DevTools Console 里执行
  chrome.runtime.sendMessage(...) 会报 "Cannot read properties of undefined"
- 原因: 页面 Console 运行在网页的 JS 上下文，不是 content script 上下文，
  chrome.* API 不可见
- 正确做法: 从 Service Worker DevTools 用 chrome.tabs.sendMessage 转发，
  示例代码见 docs/PROGRESS.md / 调试段
- 发现时间: 2026-05-11 第 5 步试跑

---

## 步骤② — TakeMe 搜索店铺（DOM 已调研，业务逻辑待实现）

**页面 URL**

    https://admin.takeme.com/web/reservations/settings
    （URL 在选店前后不变，Angular SPA 内状态切换）

**关键元素 selector（2026-05-11 实测）**

    // 店舗設定搜索框（input）
    selector: input.object-select-input.form-select
    备选: input[placeholder^="店舗番号"]  // 未选中状态
    备选: input[role="combobox"]          // 语义层

    // 父容器（用于 fillNgSelect 工具函数）
    selector: app-object-select

    // 下拉候选窗口
    selector: ngb-typeahead-window#ngb-typeahead-0
    备选: ngb-typeahead-window[role="listbox"]

    // 下拉候选项（每个店一行）
    selector: ngb-typeahead-window button
    （上次 TMC 项目用过的 selector，结构相同，可复用）

    // 候选项文本格式（已确认，含全角字符警示）
    // "SR10193 － 横浜 鉄板焼＆ステーキ 祥鳳"
    // ⚠️ 分隔符是全角破折号 U+FF0D "－"，不是 ASCII 短横线 U+002D "-"
    // ⚠️ 不能用 text.split(' - ') 拆，会拆不开
    //
    // platform_id 提取规则（推荐用正则，规避全角/半角问题）：
    //   const m = text.match(/^(SR\d+)\b/);
    //   const platform_id = m ? m[1] : null;
    //
    // 实测样例 platform_id 格式: SR10193, SR10694（SR + 数字）

**等待信号**

    // 搜索框可交互
    waitForElement('input.object-select-input', 10000)

    // 下拉是否打开（最稳的信号）
    document.querySelector('input.object-select-input').getAttribute('aria-expanded') === 'true'

    // 下拉候选出现
    waitForElement('ngb-typeahead-window button', 3000)

**当前店铺名读取（步骤③④安全校验用，2026-05-11 实测）**

    const currentLabel = document.querySelector('input.object-select-input').value;
    // 实测返回: "SR10193 － 横浜 鉄板焼＆ステーキ 祥鳳"（含全角分隔符）
    // 用上面同样的正则提取 platform_id 做一致性比对

**易碎点 / 实战注意**

    // - aria-expanded 是判断下拉打开/关闭最稳定的信号，优先用它而不是看 ngb-typeahead-window 出现
    // - placeholder 在选中店铺后会动态变成"SR... - 店铺名"
    //   ⚠️ 但 input.value 也同步带这个值（PM 2026-05-11 实测确认）
    //   ✅ 当前店铺名读取直接用 .value，不用回退到 .placeholder
    // - 组件就是 ngb-typeahead-window，上次项目 fillNgSelect 函数可复用
    // - ngb-typeahead-0 中的数字"0"是该页第几个 typeahead，理论上稳定，但保险起见用属性选择器
    // - 输入要触发 Angular 监听，单纯 .value = "xxx" 不够，必须 dispatch input/change 事件
    //   （这正是上次 setAngularValue 工具函数解决的问题，可复用）

**复用确认（2026-05-11 实测）**

    // lib/dom-utils.js 的 setAngularValue：✅ 实测可用
    //   - 调用后 input.value 正确填入
    //   - 同时触发了 Angular，下拉自动打开 (aria-expanded=true)
    //   - 用于 ngb-typeahead 的 input 字段
    //
    // lib/dom-utils.js 的 fillNgSelect：❓ 未直接调用
    //   - 本步骤改为手动 setAngularValue + click 候选 button 方式
    //   - fillNgSelect 暂时未验证，留待步骤③④需要时再说

**已知坑（2026-05-11 实测无新坑）**

    // 实测一次跑通，未踩新坑
    // 注意事项已全部固化在上文"易碎点/实战注意"段

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
