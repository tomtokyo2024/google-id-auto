console.log('[takeme-products] loaded on', location.href);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'RUN_STEP_3') return false; // not mine — signal no async response

  const { platform_id } = msg.payload;
  console.log('[takeme-products] RUN_STEP_3 received — platform_id:', platform_id);

  // TODO: Step ③ business logic (will be async — return true keeps channel open)
  // Safety check: read current store name from 店舗設定 dropdown, confirm matches target
  //   mismatch → chrome.runtime.sendMessage({ type: 'STEP_ERROR', error_reason: '店铺切换失败' })
  //
  // 1. Select プラットフォーム = "TakeMe Concierge"
  // 2. Click 検索
  // 3. Wait for results
  // 4. At least 1 row with ステータス = "表示"
  //      → chrome.runtime.sendMessage({ type: 'STEP_RESULT', payload: { compliant: true } })
  //    Empty or all non-表示
  //      → chrome.runtime.sendMessage({ type: 'STEP_RESULT', payload: { compliant: false } })

  sendResponse({ ok: true }); // temporary sync ack — replace when async logic added
  return true; // keep message channel open for async sendResponse
});
