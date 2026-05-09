# Apps Script 部署说明

> 对象读者：PM / 运营，不需要工程背景，照步骤执行即可。

---

## 前置确认：Google Sheet 格式

打开目标 Google Sheet，确认满足以下条件：

1. 有一个 tab（工作表）名称为 `restaurants`（区分大小写）
2. 第 1 行为表头，内容如下（顺序和列字母必须一致）：

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| google_id | restaurant_name | platform_id | result | error_reason | processed_at |

> 如果 tab 名称不同，部署后需要在 Code.gs 顶部修改 `SHEET_NAME` 变量。

---

## 部署步骤

### 第 1 步：打开 Apps Script 编辑器

1. 在 Google Sheet 顶部菜单点击 **扩展程序**
2. 选择 **Apps Script**
3. 浏览器会打开 Apps Script 编辑器（script.google.com）

### 第 2 步：粘贴代码

1. 编辑器左侧文件列表里点击 `Code.gs`
2. **全选**编辑器里的现有内容（Cmd+A / Ctrl+A）并**删除**
3. 打开本项目的 `apps-script/Code.gs` 文件，**全选复制**
4. 粘贴到编辑器里

### 第 3 步：设置密钥

找到第 17 行：
```
var SECRET_KEY = 'CHANGE_ME_BEFORE_DEPLOY';
```
把 `CHANGE_ME_BEFORE_DEPLOY` 替换为你自己的密钥（任意字符串，越随机越好，建议 20 位以上）。

**记住这个密钥**，后面要填到 Chrome 插件里。

### 第 4 步：保存代码

点击编辑器顶部的**保存图标**（或 Cmd+S / Ctrl+S）。

### 第 5 步：部署为 Web 应用

1. 点击右上角蓝色按钮 **部署** → **新建部署**
2. 点击"选择类型"右边的齿轮图标 ⚙，选择 **Web 应用**
3. 填写配置：
   - **说明**：随便填，例如 `v1`
   - **执行身份**：选 **我**（确保脚本能访问你的 Sheet）
   - **访问权限**：选 **任何人**（Chrome 插件需要无需登录即可调用）
4. 点击 **部署**
5. 如果弹出权限请求，点击 **授权访问** → 选择你的 Google 账号 → 点击 **允许**

### 第 6 步：复制 Web App URL

部署成功后会显示一个 URL，格式类似：
```
https://script.google.com/macros/s/AKfycb.../exec
```
**复制这个 URL**，下一步要用。

### 第 7 步：在 Chrome 插件里配置

1. 点击浏览器右上角的 **GoogleID Auto** 插件图标
2. 点击右上角的 ⚙ 齿轮按钮打开设置面板
3. 在 **Apps Script URL** 栏粘贴刚复制的 URL
4. 在 **SECRET KEY** 栏填写第 3 步设置的密钥
5. 点击 **保存**
6. 点击 **测试连接**，看到绿色"接続OK"说明部署成功

---

## 验证连接（命令行方式）

用 curl 测试（把 URL 和密钥替换为你自己的）：

```bash
curl 'https://script.google.com/macros/s/YOUR_ID/exec?action=health&secret=YOUR_SECRET_KEY'
```

预期返回（格式化后）：
```json
{
  "ok": true,
  "version": "v3.1",
  "sheet_name": "restaurants",
  "total_rows": 51,
  "pending_phase1": 48,
  "pending_phase2": 0
}
```

如果返回 `{ "ok": false, "error": "unauthorized" }`，检查密钥是否一致。
如果返回 `{ "ok": false, "error": "Sheet tab not found: restaurants" }`，检查 tab 名称是否正确。

---

## 重新部署（代码有改动时）

每次修改 Code.gs 后，必须重新部署才能生效：

1. 点击 **部署** → **管理部署**
2. 找到当前部署，点击编辑（铅笔图标）
3. **版本** 选择 **新版本**
4. 点击 **部署**

> ⚠️ 注意：选"新版本"会生成同一个 URL 的新版本。如果选"现有版本"，旧代码不会更新。

---

## Sheet 表头模板

复制以下内容粘贴到 Sheet 第 1 行（A1 开始）：

```
google_id	restaurant_name	platform_id	result	error_reason	processed_at
```

（列之间用 Tab 分隔，粘贴后每列会自动落到 A～F）
