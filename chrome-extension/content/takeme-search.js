console.log('[takeme-search] loaded on', location.href);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'RUN_STEP_2') return false; // not mine — signal no async response

  const { restaurant_name } = msg.payload;
  console.log('[takeme-search] RUN_STEP_2 received — restaurant_name:', restaurant_name);

  // TODO: Step ② business logic (will be async — return true keeps channel open)
  // 1. Type restaurant_name into 店舗設定 search box
  // 2. Wait for dropdown candidates
  // 3. 0 candidates → chrome.runtime.sendMessage({ type: 'STEP_ERROR', error_reason: '平台未找到' })
  //    1 candidate  → parse platform_id, press Enter to select
  //                   chrome.runtime.sendMessage({ type: 'STEP_RESULT',
  //                     payload: { platform_id } })
  //    multiple     → chrome.runtime.sendMessage({ type: 'STEP_ERROR', error_reason: '平台多个候选' })

  sendResponse({ ok: true }); // temporary sync ack — replace when async logic added
  return true; // keep message channel open for async sendResponse
});
