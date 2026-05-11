console.log('[google-action] loaded on', location.href);

chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (msg.type !== 'RUN_STEP_1') return false;

  const { google_id } = msg.payload;
  console.log('[google-action] RUN_STEP_1 received — google_id:', google_id);

  // reset local state
  let restaurant_name = null;

  (async () => {
    try {
      await waitForElement('merchant-detail', 10000);

      const el = document.querySelector('merchant-detail .gmat-headline-3');
      restaurant_name = el ? el.textContent.trim() : '';

      if (!restaurant_name) {
        console.warn('[google-action] name element empty or missing');
        chrome.runtime.sendMessage({ type: 'STEP_ERROR', error_reason: '谷歌后台未找到' });
        return;
      }

      console.log('[google-action] restaurant_name:', restaurant_name);
      chrome.runtime.sendMessage({ type: 'STEP_RESULT', payload: { restaurant_name } });
    } catch (err) {
      console.error('[google-action] error:', err);
      const isTimeout = err.message && err.message.startsWith('Timeout waiting for:');
      if (isTimeout) {
        chrome.runtime.sendMessage({ type: 'STEP_ERROR', error_reason: '谷歌后台未找到' });
      } else {
        chrome.runtime.sendMessage({ type: 'STEP_ERROR', error_reason: '未知错误：' + err.message });
      }
    }
  })();

  return true; // keep message channel open
});
