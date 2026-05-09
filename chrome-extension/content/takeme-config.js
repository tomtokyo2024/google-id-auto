console.log('[takeme-config] loaded on', location.href);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'RUN_STEP_4') return false; // not mine — signal no async response

  const { platform_id } = msg.payload;
  console.log('[takeme-config] RUN_STEP_4 received — platform_id:', platform_id);

  // TODO: Step ④ business logic (will be async — return true keeps channel open)
  // Safety check: confirm current store matches target (same as ③)
  //   mismatch → STEP_ERROR / 店铺切换失败
  //
  // Read 「Googleマップに載せる」 current value:
  //   "オプトアウト" → STEP_RESULT { result: '已关闭（原本就关闭）' }
  //   "有効"        → switch to "オプトアウト" → scroll to bottom → click save
  //                   green toast → STEP_RESULT { result: '已关闭' }
  //                   red toast   → STEP_ERROR  { error_reason: '保存操作失败' }
  //   "無効"        → STEP_ERROR  { error_reason: '当前状态为無効' }
  //   other/unread  → STEP_ERROR  { error_reason: '配置页状态异常' }

  sendResponse({ ok: true }); // temporary sync ack — replace when async logic added
  return true; // keep message channel open for async sendResponse
});
