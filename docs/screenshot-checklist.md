# 截图清单

## 现状（docs/screenshots/ 目录）

- 01-google-search-1.png
- 01-google-search-2.png
- 01-google-not-found.png
- 02-platform-search.png
- 03-products-has.png
- 03-products-empty.png
- 04-config-on.png
- 04-config-off.png

---

## 按步骤核对（v3 契约的 ①②③④）

### 步骤① Action Center

- [x] 详情页 merchant 名称区域（命中样例） — ✅ 已有: 01-google-search-2.png
- [x] 该 google_id 找不到时的页面（缺失样例） — ✅ 已有: 01-google-not-found.png

### 步骤② TakeMe 搜索

- [ ] 店舗設定下拉框 + 搜索后下拉候选展开 — ❌ 缺
      （02-platform-search.png 显示的是店铺已选中后的状态，不是搜索过程中的下拉）
- [ ] 搜不到任何候选时的页面 — ❌ 缺
- [ ] 多个候选出现时的页面（如可复现） — ❌ 缺

### 步骤③ 商品管理

- [x] プラットフォーム 下拉位置 + 検索按钮 — ✅ 已有: 03-products-has.png
- [x] 筛选后有商品（含 ステータス=表示） — ✅ 已有: 03-products-has.png
- [x] 筛选后空表格 — ✅ 已有: 03-products-empty.png
- [x] 当前店铺名显示位置（一致性校验用） — ✅ 已有: 02-platform-search.png / 03-products-has.png

### 步骤④ 配置页

- [x] Googleマップに載せる 字段在"有効"状态 — ✅ 已有: 04-config-on.png
- [x] 同字段在"オプトアウト"状态 — ✅ 已有: 04-config-off.png
- [ ] 同字段在"無効"状态 — ❌ 缺
- [ ] 页面底部保存按钮位置 — ❌ 缺
- [ ] 保存成功绿色提示「保存しました」— ❌ 缺

---

## 还差的截图（汇总）

| 优先级 | 步骤 | 需要的截图 | 备注 |
|--------|------|----------|------|
| 高 | ② | 店舗設定搜索框 + 下拉候选展开 | 开发写 selector 前必须有 |
| 高 | ② | 搜不到任何候选时的状态 | "平台未找到"分支判断依据 |
| 中 | ④ | 页面底部保存按钮 | 确认按钮位置和 selector |
| 中 | ④ | 保存成功绿色 toast | 确认 toast 的 class/文本 |
| 低 | ② | 多个候选出现时 | 难复现，可先跳过 |
| 低 | ④ | "無効"状态 | 不常见，可先跳过 |

---

## PM 决策记录

- **商品管理 "TMC Missing" 筛选器**：不需要操作，跳过。
  代码中只设置 プラットフォーム = TakeMe Concierge，TMC Missing 保持默认。

- **Action Center URL**：使用 B 路径（直接拼详情页 URL）。
  `https://actionscenter.google.com/inventory/merchants/{google_id}?a=2045466328`
  已确认可直接打开，名称从该页面读取。URL 模板锁定，dom-notes.md 中的警告已移除。
