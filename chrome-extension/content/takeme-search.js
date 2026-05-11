console.log('[takeme-search] loaded on', location.href);

chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (msg.type !== 'RUN_STEP_2') return false;

  const { restaurant_name } = msg.payload;
  console.log('[takeme-search] RUN_STEP_2 received — restaurant_name:', restaurant_name);

  // reset local state
  let platform_id = null;
  let candidateText = null;

  (async () => {
    // 步骤 1: 等待搜索框可交互
    console.log('[takeme-search] 步骤 1: 等待搜索框');
    let inputEl;
    try {
      inputEl = await waitForElement('input.object-select-input', 10000);
    } catch (err) {
      chrome.runtime.sendMessage({ type: 'STEP_ERROR', error_reason: '未知错误：搜索框未出现' });
      return;
    }

    // 步骤 2: 填入餐厅名称
    console.log('[takeme-search] 步骤 2: 输入名称', restaurant_name);
    try {
      setAngularValue(inputEl, restaurant_name);
      // 诊断 log: setAngularValue 是上次 TMC 项目工具函数，本组件首次试跑要验证
      console.log('[takeme-search] 步骤 2 验证: input.value=', inputEl.value,
                  'aria-expanded=', inputEl.getAttribute('aria-expanded'));
    } catch (err) {
      chrome.runtime.sendMessage({ type: 'STEP_ERROR', error_reason: '未知错误：' + err.message });
      return;
    }

    // 步骤 3: 等待下拉打开（最多 3 秒，轮询 aria-expanded）
    console.log('[takeme-search] 步骤 3: 等待下拉打开');
    const dropdownOpened = await (async () => {
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        const el = document.querySelector('input.object-select-input');
        if (el && el.getAttribute('aria-expanded') === 'true') return true;
        await wait(200);
      }
      return false;
    })();
    if (!dropdownOpened) {
      chrome.runtime.sendMessage({ type: 'STEP_ERROR', error_reason: '平台未找到' });
      return;
    }

    // 步骤 4: 抓取所有候选项
    let buttons;
    try {
      await waitForElement('ngb-typeahead-window button', 3000);
      await wait(150);  // 让 typeahead 渲染完全部候选，避免只抓到部分
      buttons = Array.from(document.querySelectorAll('ngb-typeahead-window button'));
    } catch (err) {
      // waitForElement 超时 = 候选窗口从未出现
      buttons = [];
    }
    const candidates = buttons.map(b => b.textContent.trim()).filter(t => t.length > 0);
    console.log('[takeme-search] 步骤 4: 抓到', candidates.length, '个候选');

    // 步骤 5: 候选数量判断
    console.log('[takeme-search] 步骤 5: 候选数 =', candidates.length);
    if (candidates.length === 0) {
      chrome.runtime.sendMessage({ type: 'STEP_ERROR', error_reason: '平台未找到' });
      return;
    }
    if (candidates.length > 1) {
      chrome.runtime.sendMessage({ type: 'STEP_ERROR', error_reason: '平台多个候选' });
      return;
    }

    // 步骤 6: 解析 platform_id
    candidateText = candidates[0];
    const m = candidateText.match(/^(SR\d+)\b/);
    if (!m) {
      console.warn('[takeme-search] 候选格式异常:', candidateText);
      chrome.runtime.sendMessage({ type: 'STEP_ERROR', error_reason: '未知错误：候选格式异常，无法解析 platform_id' });
      return;
    }
    platform_id = m[1];
    console.log('[takeme-search] 步骤 6: 解析 platform_id =', platform_id);

    // 步骤 7: 点击候选项选中
    try {
      buttons[0].click();
      console.log('[takeme-search] 步骤 7: 已点击选中');
    } catch (err) {
      chrome.runtime.sendMessage({ type: 'STEP_ERROR', error_reason: '未知错误：' + err.message });
      return;
    }

    // 步骤 8: 验证选中成功（轮询 input.value，最多等 2 秒）
    let selected_platform_id = null;
    {
      const deadline = Date.now() + 2000;
      while (Date.now() < deadline) {
        const currentValue = document.querySelector('input.object-select-input').value;
        const mv = currentValue.match(/^(SR\d+)\b/);
        if (mv && mv[1] === platform_id) {
          selected_platform_id = mv[1];
          break;
        }
        await wait(100);
      }
    }
    if (selected_platform_id !== platform_id) {
      console.warn('[takeme-search] 选中验证失败 — expected:', platform_id);
      chrome.runtime.sendMessage({ type: 'STEP_ERROR', error_reason: '店铺切换失败' });
      return;
    }
    console.log('[takeme-search] 步骤 8: 验证选中 OK，selected:', selected_platform_id);

    // 步骤 9: 成功
    console.log('[takeme-search] STEP_RESULT 发送:', { platform_id });
    chrome.runtime.sendMessage({
      type: 'STEP_RESULT',
      payload: { platform_id, candidate_text: candidateText }
    });
  })();

  return true; // keep message channel open
});
