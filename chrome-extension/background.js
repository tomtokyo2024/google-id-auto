console.log('[bg] service worker started');

// ── DRY_RUN safety switch ─────────────────────────────────────────────────────
// true  → 写操作全部 mock（只 console.log，不发真实指令，不写 Sheet）
// false → 真实写模式，PM 确认调试通过后才改为 false
const DRY_RUN = true;

// ── State machine states ──────────────────────────────────────────────────────

const STATE = {
  IDLE:           'IDLE',
  STEP1_GOOGLE:   'STEP1_GOOGLE',
  STEP2_SEARCH:   'STEP2_SEARCH',
  STEP3_PRODUCTS: 'STEP3_PRODUCTS',
  STEP4_CONFIG:   'STEP4_CONFIG',
  DONE:           'DONE'
};

// ── In-memory state ───────────────────────────────────────────────────────────
// Re-hydrated from chrome.storage.local on service worker restart.

let machineState  = STATE.IDLE;
let currentPhase  = 1;   // 1 = read-only (①②③), 2 = write (②③④)
let queue         = [];  // Phase 1: [{ google_id, row_index }]
                         // Phase 2: [{ google_id, restaurant_name, platform_id, row_index }]
let currentIdx    = 0;
let currentData   = {};  // Accumulates per-item: { google_id, restaurant_name, platform_id }
let WEB_APP_URL   = null;
let SECRET_KEY    = null;

// ── Startup: load persisted config and in-flight queue ────────────────────────

(async function init() {
  const stored = await chrome.storage.local.get([
    'WEB_APP_URL',
    'SECRET_KEY',
    'queue_state',
    'current_index'
  ]);

  WEB_APP_URL = stored.WEB_APP_URL || null;
  SECRET_KEY  = stored.SECRET_KEY  || null;

  if (!WEB_APP_URL || !SECRET_KEY) {
    console.warn('[bg] WEB_APP_URL or SECRET_KEY not configured — open popup > ⚙ to configure.');
  } else {
    console.log('[bg] init: WEB_APP_URL and SECRET_KEY loaded.');
  }

  // Restore queue if service worker was killed mid-run
  if (stored.queue_state && stored.queue_state.length > 0) {
    queue      = stored.queue_state;
    currentIdx = stored.current_index || 0;
    console.log('[bg] init: restored in-flight queue —', queue.length, 'items, resuming at index', currentIdx);
  }
})();

// ── Helpers ───────────────────────────────────────────────────────────────────

function transition(newState) {
  console.log('[bg] state:', machineState, '→', newState);
  machineState = newState;
}

async function persistQueue() {
  await chrome.storage.local.set({
    queue_state:   queue,
    current_index: currentIdx
  });
}

async function clearPersistedQueue() {
  await chrome.storage.local.remove(['queue_state', 'current_index']);
}

// ── Step handlers (skeletons — business logic filled in later steps) ──────────

async function handleStep1(item) {
  // TODO: find/open Action Center tab, navigate to URL, send RUN_STEP_1
  // URL template: https://actionscenter.google.com/inventory/merchants/{google_id}?a=2045466328
  console.log('[bg] handleStep1: TODO — google_id:', item.google_id);
}

async function handleStep2(restaurantName) {
  // TODO: find/open TakeMe settings tab, send RUN_STEP_2 with restaurant_name
  console.log('[bg] handleStep2: TODO — restaurant_name:', restaurantName);
}

async function handleStep3(platformId) {
  // TODO: navigate tab to #courses, send RUN_STEP_3 with platform_id
  console.log('[bg] handleStep3: TODO — platform_id:', platformId);
}

async function handleStep4(item) {
  // DRY_RUN 分支：
  //   DRY_RUN=true  → console.log 模拟"切换オプトアウト + 点保存 + 写Sheet=已关闭"，不发真实操作
  //   DRY_RUN=false → 执行真实写操作：navigate tab → send RUN_STEP_4 → await result
  if (DRY_RUN) {
    console.log('[bg] handleStep4: DRY_RUN — 模拟关闭操作 platform_id:', item.platform_id);
    // TODO: DRY_RUN 模式下模拟 STEP_RESULT { result: '已关闭' } 并推进队列
    return;
  }
  // TODO: DRY_RUN=false 时 — navigate tab to #inbound-setting-tab, send RUN_STEP_4
  console.log('[bg] handleStep4: REAL — platform_id:', item.platform_id);
}

// ── 步骤④ 执行前人工确认（骨架） ────────────────────────────────────────────────

async function confirmBeforeStep4(item) {
  // TODO: phase 2 模式下，进入 ④ 之前向 popup 发消息要求人工确认。
  // popup 弹出确认 UI（待实现）：
  //   显示：店铺名 / platform_id / 当前 Googleマップ 状态 → 即将改为 オプトアウト
  //   PM 点「确认」→ return true（继续执行 ④）
  //   PM 点「跳过」→ currentIdx++ → processNextPhase2()（跳过此条）
  //   PM 点「中止」→ transition(STATE.IDLE)（停止整个 phase 2）
  // 现阶段：仅占位，return true 默认通过，待第 5 步具体实现时填入。
  console.log('[bg] confirmBeforeStep4 占位 — 第 5 步具体实现时填', item.google_id);
  return true;
}

// ── Queue processors ──────────────────────────────────────────────────────────

async function processNextPhase1() {
  if (currentIdx >= queue.length) {
    transition(STATE.DONE);
    console.log('[bg] Phase 1 complete — all items processed');
    await clearPersistedQueue();
    return;
  }
  currentData = { google_id: queue[currentIdx].google_id };
  transition(STATE.STEP1_GOOGLE);
  await handleStep1(queue[currentIdx]);
}

async function processNextPhase2() {
  if (currentIdx >= queue.length) {
    transition(STATE.DONE);
    console.log('[bg] Phase 2 complete — all items processed');
    await clearPersistedQueue();
    return;
  }
  // Phase 2 re-verifies before writing: ② re-search → ③ re-check → ④ close if still non-compliant
  // Queue items must include restaurant_name (Sheet col B) and platform_id (Sheet col C).
  currentData = {
    google_id:       queue[currentIdx].google_id,
    restaurant_name: queue[currentIdx].restaurant_name,
    platform_id:     queue[currentIdx].platform_id
  };
  transition(STATE.STEP2_SEARCH);
  await handleStep2(currentData.restaurant_name);
}

// ── Message listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // ── popup → bg: start phase 1 (read-only: ①②③) ──────────────────────────
  if (msg.type === 'START_PHASE_1') {
    queue        = msg.queue;   // [{ google_id, row_index }]
    currentIdx   = 0;
    currentPhase = 1;
    currentData  = {};
    console.log('[bg] START_PHASE_1: queue length', queue.length);
    persistQueue();
    processNextPhase1();
    sendResponse({ ok: true });
    return true;
  }

  // ── popup → bg: start phase 2 (write: ④) ─────────────────────────────────
  if (msg.type === 'START_PHASE_2') {
    queue        = msg.queue;   // [{ google_id, restaurant_name, platform_id, row_index }]
    currentIdx   = 0;
    currentPhase = 2;
    currentData  = {};
    console.log('[bg] START_PHASE_2: queue length', queue.length);
    persistQueue();
    processNextPhase2();
    sendResponse({ ok: true });
    return true;
  }

  // ── content → bg: a step completed successfully ───────────────────────────
  if (msg.type === 'STEP_RESULT') {
    console.log('[bg] STEP_RESULT in state', machineState, 'phase', currentPhase, '— payload:', msg.payload);
    // TODO: state-machine routing (fill in when business logic is added)
    //
    // Phase 1 routing:
    //   STEP1_GOOGLE  → save restaurant_name → STEP2_SEARCH → handleStep2
    //   STEP2_SEARCH  → save platform_id     → STEP3_PRODUCTS → handleStep3
    //   STEP3_PRODUCTS:
    //     compliant=true  → if (!DRY_RUN) write D="合规无需操作" → currentIdx++ → processNextPhase1
    //                        DRY_RUN: console.log 模拟写入
    //     compliant=false → if (!DRY_RUN) write D="待关闭"      → currentIdx++ → processNextPhase1
    //                        DRY_RUN: console.log 模拟写入
    //
    // Phase 2 routing:
    //   STEP2_SEARCH  → confirm platform_id   → STEP3_PRODUCTS → handleStep3
    //   STEP3_PRODUCTS:
    //     compliant=true  → if (!DRY_RUN) write D="合规无需操作" → currentIdx++ → processNextPhase2
    //                        DRY_RUN: console.log 模拟写入
    //     compliant=false → confirmBeforeStep4(item) → if confirmed → STEP4_CONFIG → handleStep4
    //   STEP4_CONFIG  → if (!DRY_RUN) write D=result → currentIdx++ → processNextPhase2
    //                    DRY_RUN: console.log 模拟写入（已在 handleStep4 处理）
    sendResponse({ ok: true });
    return true;
  }

  // ── content → bg: a step failed ──────────────────────────────────────────
  if (msg.type === 'STEP_ERROR') {
    console.warn('[bg] STEP_ERROR in state', machineState, '— reason:', msg.error_reason);
    // TODO: write error row to Sheet via WEB_APP_URL, advance currentIdx, call processNext
    sendResponse({ ok: true });
    return true;
  }

  // ── popup → bg: query live state for UI refresh ───────────────────────────
  if (msg.type === 'GET_QUEUE_STATE') {
    sendResponse({
      machineState,
      queueLength: queue.length,
      currentIdx,
      currentData
    });
    return true;
  }
});
