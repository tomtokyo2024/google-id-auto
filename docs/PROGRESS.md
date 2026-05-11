# 项目进度快照

## 截至 2026-05-11 的状态
- 脚手架阶段：✅ 完成
- 连通性测试：✅ 通过
- 业务逻辑：
  - 步骤① ✅ 完成（2026-05-11 实测）
  - 步骤② ✅ 完成（2026-05-11 实测）
  - 步骤③ ⏳ 待开始
  - 步骤④ ⏳ 待开始

## 已完成的关键文档
- docs/spec.md（v3.2 锁定）
- docs/dom-notes.md（含开发约束）
- docs/reuse-analysis.md
- docs/screenshot-checklist.md（截图齐了）

## 已完成的代码
- chrome-extension/ 全套骨架（manifest/popup/background/4 content/lib）
- apps-script/Code.gs（3 端点 + 边界检查 + try/catch）
- apps-script/README.md（运营级部署文档）

## 已部署的环境
- Apps Script Web App: 已部署（URL 和 SECRET_KEY 在 PM 手中，不入代码库）
- Chrome 插件: 已加载到 PM 的本地 Chrome（开发者模式）
- Google Sheet: tab 名 restaurants，A 列 5 个**真实生产** google_id
- ⚠️ 真实数据 → 第 5 步必须启用 DRY_RUN 开关 + 逐条人工确认机制

## 第 5 步开始前的工作清单
1. 按 ①②③④ 顺序填业务逻辑，禁止跳跃
2. 步骤① 优先（只读最安全）
3. 步骤④ 最后（写操作风险最高）
4. 每个步骤跑通后再进下一个
5. 任何 DOM 选择不确定时停下来问 PM

## 关键约束（永久有效）
- spec.md 改动必须 bump 版本号 + 走 PM 确认
- 代码展示禁止省略号 / 缩略
- 任何"和 PM 之前明确指定的不一致"的做法必须先停下问 PM
- 写操作前永远先读当前状态做幂等性检查

## 如何在新会话快速恢复上下文
新 Claude Code 会话开启后，第一句话告诉它：
"读 docs/PROGRESS.md、docs/spec.md、docs/dom-notes.md 三份文档，
然后等待 PM 指令。不要主动开始任何工作。"
