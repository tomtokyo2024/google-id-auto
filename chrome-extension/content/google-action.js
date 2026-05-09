console.log('[google-action] loaded on', location.href);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'RUN_STEP_1') return false; // not mine — signal no async response

  const { google_id } = msg.payload;
  console.log('[google-action] RUN_STEP_1 received — google_id:', google_id);

  // TODO: Step ① business logic (will be async — return true keeps channel open)
  // 1. Read restaurant name from Action Center merchant detail page
  // 2. On success: chrome.runtime.sendMessage({ type: 'STEP_RESULT',
  //      payload: { restaurant_name } })
  // 3. On failure: chrome.runtime.sendMessage({ type: 'STEP_ERROR',
  //      error_reason: '谷歌后台未找到' })

  sendResponse({ ok: true }); // temporary sync ack — replace when async logic added
  return true; // keep message channel open for async sendResponse
});
