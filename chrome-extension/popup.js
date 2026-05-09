console.log('[popup] loaded');

// ── Helpers ───────────────────────────────────────────────────────────────────

function setStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = type || '';
}

function renderQueue(items, labelFn) {
  const list = document.getElementById('queueList');
  list.innerHTML = '';
  if (!items || items.length === 0) {
    list.innerHTML = '<li class="empty">キューが空です</li>';
    return;
  }
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = labelFn(item);
    list.appendChild(li);
  });
}

// ── Settings panel ────────────────────────────────────────────────────────────

document.getElementById('settingsToggle').addEventListener('click', () => {
  const panel = document.getElementById('settingsPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});

// Load saved URL + SECRET_KEY into inputs on open
chrome.storage.local.get(['WEB_APP_URL', 'SECRET_KEY'], result => {
  if (result.WEB_APP_URL) document.getElementById('webAppUrl').value = result.WEB_APP_URL;
  if (result.SECRET_KEY)  document.getElementById('secretKey').value  = result.SECRET_KEY;
});

document.getElementById('saveUrlBtn').addEventListener('click', () => {
  const url    = document.getElementById('webAppUrl').value.trim();
  const secret = document.getElementById('secretKey').value.trim();
  if (!url) {
    setStatus('URL を入力してください', 'error');
    return;
  }
  if (!secret) {
    setStatus('SECRET KEY を入力してください', 'error');
    return;
  }
  chrome.storage.local.set({ WEB_APP_URL: url, SECRET_KEY: secret }, () => {
    setStatus('設定を保存しました', 'success');
    document.getElementById('settingsPanel').style.display = 'none';
  });
});

// ── Test connection ───────────────────────────────────────────────────────────

document.getElementById('testConnBtn').addEventListener('click', () => {
  chrome.storage.local.get(['WEB_APP_URL', 'SECRET_KEY'], stored => {
    const url    = stored.WEB_APP_URL;
    const secret = stored.SECRET_KEY;
    if (!url || !secret) {
      setStatus('URL と SECRET KEY を先に保存してください', 'error');
      return;
    }
    setStatus('接続テスト中…', 'running');
    fetch(`${url}?action=health&secret=${encodeURIComponent(secret)}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setStatus(
            `接続OK (${data.version}) — 阶段1待: ${data.pending_phase1}, 阶段2待: ${data.pending_phase2}`,
            'success'
          );
        } else {
          setStatus('接続エラー: ' + data.error, 'error');
        }
      })
      .catch(err => setStatus('接続失敗: ' + err.message, 'error'));
  });
});

// ── Phase 1 button ────────────────────────────────────────────────────────────

document.getElementById('phase1Btn').addEventListener('click', () => {
  setStatus('Phase 1 開始中…', 'running');
  document.getElementById('phase1Btn').disabled = true;

  // TODO: fetch pending rows from Apps Script (rows where D column is blank)
  // For now, send an empty queue as placeholder
  const queue = []; // placeholder — will be populated from Sheet in later step

  chrome.runtime.sendMessage({ type: 'START_PHASE_1', queue }, response => {
    if (chrome.runtime.lastError) {
      setStatus('background に接続できません: ' + chrome.runtime.lastError.message, 'error');
      document.getElementById('phase1Btn').disabled = false;
      return;
    }
    if (response && response.ok) {
      setStatus('Phase 1 実行中…', 'running');
      renderQueue(queue, item => item.google_id);
    } else {
      setStatus('開始エラー', 'error');
      document.getElementById('phase1Btn').disabled = false;
    }
  });
});

// ── Phase 2 button ────────────────────────────────────────────────────────────

document.getElementById('phase2Btn').addEventListener('click', () => {
  setStatus('Phase 2 開始中…', 'running');
  document.getElementById('phase2Btn').disabled = true;

  // TODO: fetch rows where D = "待关闭" from Apps Script
  const queue = []; // placeholder — will be populated from Sheet in later step

  chrome.runtime.sendMessage({ type: 'START_PHASE_2', queue }, response => {
    if (chrome.runtime.lastError) {
      setStatus('background に接続できません: ' + chrome.runtime.lastError.message, 'error');
      document.getElementById('phase2Btn').disabled = false;
      return;
    }
    if (response && response.ok) {
      setStatus('Phase 2 実行中…', 'running');
      renderQueue(queue, item => item.google_id + ' / ' + item.platform_id);
    } else {
      setStatus('開始エラー', 'error');
      document.getElementById('phase2Btn').disabled = false;
    }
  });
});

// ── On open: read queue state from storage (robust against SW cold start) ────
// Avoids sendMessage to background which fails when SW is not yet alive.
// queue_state / current_index are persisted by background.js on every transition.

chrome.storage.local.get(['queue_state', 'current_index'], stored => {
  if (!stored.queue_state || stored.queue_state.length === 0) return;
  const total = stored.queue_state.length;
  const idx   = stored.current_index || 0;
  setStatus(`前回の実行が残っています [${idx + 1}/${total}]`, 'running');
  renderQueue(stored.queue_state, item => item.google_id || JSON.stringify(item));
});
