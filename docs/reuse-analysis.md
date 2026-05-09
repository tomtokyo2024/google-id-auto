# 上次项目复用分析

参考项目：`/Users/tomyang/Documents/Projects/TMC-order-auto/`
本项目：`/Users/tomyang/Documents/Projects/GoogleID-auto/`

---

## 1. 上次项目整体架构

```
TMC-order-auto/
├── Code.gs                          # Apps Script：Excel导入 + doPost状态回写
├── Upload.html                      # Apps Script内嵌对话框（上传Excel用）
└── chrome-extension/
    ├── manifest.json                # MV3，host: stg-admin.takeme.com
    ├── popup.html / popup.js        # 弹窗UI：Load Orders + Start Auto-Fill
    ├── background.js                # Service Worker：队列管理 + Sheet写回
    └── content.js                   # 单文件，注入TakeMe Admin，执行表单填写
```

**数据流：**
```
Google Sheet
  ↓ (Sheets API v4 + API Key，popup.js直接读)
popup.js → background.js (START_PROCESSING)
  ↓ (chrome.tabs.sendMessage)
content.js → 执行表单填写 → (ORDER_DONE)
  ↓
background.js → Apps Script doPost → Sheet写回状态
```

---

## 2. 可直接复用或参考的文件/模块

### ✅ 直接复用（结构完全一致，改名+改配置即可）

| 文件 | 可复用内容 | 需要修改什么 |
|------|-----------|-------------|
| `manifest.json` | MV3整体结构、permissions字段 | name、host_permissions换两个新域名、content_scripts换4个文件 |
| `popup.html` | 全部CSS样式、按钮布局模板、状态栏`#status` | 按钮数量（2个阶段按钮）、列表项显示字段 |
| `background.js` | 队列骨架：`orderQueue`、`isProcessing`、`processNext()`、消息监听模式 | 消息类型名称、`updateOrderStatus()`改为`updateRowStatus()`、支持6列结构 |

### ⚠️ 参考但需重写（业务逻辑不同）

| 文件 | 可参考的模式 | 必须重写的原因 |
|------|------------|--------------|
| `popup.js` | Load按钮→fetch→渲染列表的交互模式 | 本项目无API Key读取，全部通过Apps Script中转；需要2个阶段按钮（阶段1只读/阶段2写） |
| `content.js` | `wait()`、`waitForElement()`、`waitForElementEnabled()`、`setAngularValue()`、`fillNgSelect()` 这5个工具函数 | 业务逻辑完全不同；本项目拆成4个独立content脚本，不能合并 |
| `Code.gs` | `doPost()`的SECRET_KEY校验模式、`try/catch`返回JSON格式 | 上次只有doPost写操作；本项目需要doGet读行 + doPost更新行，列结构完全不同 |

### ❌ 不复用（与本项目无关）

- `Code.gs`中Excel导入逻辑（`processExcelBlob`、`buildProductMap`等）——完全是上次业务
- `Upload.html`——本项目不需要
- `Code.gs`中`doPost`写的是N/O/P列——本项目列结构是A-F

---

## 3. 必须重写的模块

### 全部4个content脚本（业务逻辑全新）
- `content/google-action.js`：访问Action Center页面，读Merchant name
- `content/takeme-search.js`：在店舗設定搜索框输入名称，解析platform_id
- `content/takeme-products.js`：切到#courses，过滤TakeMe Concierge，判断是否有在售
- `content/takeme-config.js`：切到#inbound-setting-tab，读/写「Googleマップに載せる」

### Apps Script（Code.gs）
- `doGet`：读Sheet指定范围，返回JSON行数据
- `doPost`：根据google_id找行，更新B/C/D/E/F列

### popup.js
- 两阶段按钮逻辑（阶段1、阶段2独立触发）
- 所有Sheet读写通过Apps Script URL，不直接用Sheets API Key

---

## 4. 上次踩过的坑，本次要避免

### 坑1：Sheets API Key暴露在扩展代码里
上次`popup.js`直接使用`API_KEY = "AIzaSy..."`读取Sheet，API Key打包进Chrome扩展可被提取。
**本次对策**：popup和background一律通过Apps Script Web App URL中转，扩展里只存SECRET_KEY。

### 坑2：单一content.js注入所有页面，顺序依赖脆弱
上次一个content.js处理全部步骤，步骤间靠URL跳转+reload触发。如果页面加载慢，顺序乱。
**本次对策**：4个content脚本分别负责"在某一页该做的一件事"，表象是"拆分"，本质是**background.js作为状态机调度器**。
- background.js持有当前处理的google_id和所处阶段（步骤①②③④），根据状态决定向哪个tab注入哪个content脚本
- content脚本只负责执行单步操作，完成后向background发消息（成功/失败+数据）
- background收到消息后推进状态，驱动下一步——这才是架构的核心，"4个文件"只是这个状态机的执行单元

### 坑3：`fillNgSelect` / `setAngularValue` 复用性待验证
TakeMe后台是同一套系统，上次的`fillNgSelect` / `setAngularValue`工具函数很可能本次仍然适用。
**本次对策**：下拉selector复用性待DOM验证后决定，默认尝试复用上次的工具函数，实测不通用再重写。

### 坑4：background.js里WEB_APP_URL硬编码
上次部署后URL写死，换环境或重部署Apps Script就要改代码。
**本次对策**：URL通过`chrome.storage.local`存，popup提供一次性配置入口（或写在README里让运营粘贴）。

### 坑5：错误处理太粗，只有"エラー"状态，没有分类
上次失败全部写成"エラー"，事后无法定位原因。
**本次对策**：严格按v3契约的E列枚举（8种error_reason）写入，每种失败路径都有明确分类：
谷歌后台未找到 / 平台未找到 / 平台多个候选 / 店铺切换失败 / 当前状态为無効 / 配置页状态异常 / 保存操作失败 / 未知错误：{具体报错}

### 坑6：popup关闭后content.js回调丢失
上次popup发START_PROCESSING后关闭popup，background继续跑没问题，但状态无法反馈到popup。本次popup如果中途关闭不影响background队列。
**本次对策**：队列状态存在`chrome.storage.local`，popup重新打开可读取当前进度。（阶段2目标，阶段1先不做）

---

## 5. 本次架构与上次的关键差异

| 维度 | TMC-order-auto | 本项目 |
|------|---------------|--------|
| content脚本数量 | 1个 | 4个（按域名/步骤拆分） |
| 覆盖域名 | 1个（stg-admin.takeme.com） | 2个（actionscenter.google.com + admin.takeme.com） |
| Sheet读取方式 | popup直接调Sheets API v4 | 全部通过Apps Script Web App |
| 处理阶段 | 单阶段（读+写一次完成） | 两阶段（阶段1只读，阶段2写） |
| Apps Script端点 | 只有doPost | doGet（读行）+ doPost（写行） |
| 触发单位 | 一个订单 | 一家餐厅（google_id） |

---

## 6. 截图验证映射（见docs/screenshots/）

截图详细分析见 → `dom-notes.md`
