/**
 * Code.gs — GoogleID Auto: Restaurant Compliance
 * Apps Script Web App — Sheet read/write middleware
 * spec v3.1
 *
 * Endpoints:
 *   GET  ?action=health&secret=...            — connection check + queue stats
 *   GET  ?action=list_pending_phase1&secret=... — rows with empty D column
 *   GET  ?action=list_pending_phase2&secret=... — rows with D = "待关闭"
 *   POST (JSON body)                           — update a single row
 */

// ── Configuration ─────────────────────────────────────────────────────────────

var SECRET_KEY = 'CHANGE_ME_BEFORE_DEPLOY'; // ← Change this before deploying

var SHEET_NAME = 'restaurants'; // Change if your sheet tab has a different name

var COL = {
  google_id:       1, // A — never overwritten by doPost
  restaurant_name: 2, // B
  platform_id:     3, // C
  result:          4, // D
  error_reason:    5, // E
  processed_at:    6  // F — always auto-written by doPost
};

var HEADER_ROW = 1; // Row 1 is the header; data starts at row 2

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkSecret(secret) {
  return secret === SECRET_KEY;
}

function getSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet tab not found: ' + SHEET_NAME);
  return sheet;
}

// ── doGet — read endpoints ────────────────────────────────────────────────────

function doGet(e) {
  try {
    var params = e.parameter || {};
    var secret = params.secret || '';
    var action = params.action || '';

    console.log('doGet action:', action);

    if (!checkSecret(secret)) {
      return jsonResponse({ ok: false, error: 'unauthorized' });
    }

    var sheet   = getSheet();
    var lastRow = sheet.getLastRow();
    var dataRows = (lastRow > HEADER_ROW) ? lastRow - HEADER_ROW : 0;

    // ── health ────────────────────────────────────────────────────────────────
    if (action === 'health') {
      var pendingPhase1 = 0;
      var pendingPhase2 = 0;

      if (dataRows > 0) {
        var dValues = sheet
          .getRange(HEADER_ROW + 1, COL.result, dataRows, 1)
          .getValues();
        dValues.forEach(function(row) {
          var val = String(row[0]).trim();
          if (val === '')        pendingPhase1++;
          if (val === '待关闭') pendingPhase2++;
        });
      }

      console.log('health: total_rows=' + lastRow +
                  ' phase1=' + pendingPhase1 + ' phase2=' + pendingPhase2);

      return jsonResponse({
        ok:             true,
        version:        'v3.1',
        sheet_name:     SHEET_NAME,
        total_rows:     lastRow,
        pending_phase1: pendingPhase1,
        pending_phase2: pendingPhase2
      });
    }

    // ── list_pending_phase1 — rows where D is empty ───────────────────────────
    if (action === 'list_pending_phase1') {
      var rows = [];

      if (dataRows > 0) {
        var data = sheet
          .getRange(HEADER_ROW + 1, 1, dataRows, COL.result)
          .getValues();
        data.forEach(function(row, i) {
          if (String(row[COL.result - 1]).trim() === '') {
            rows.push({
              row_index: HEADER_ROW + 1 + i,
              google_id: String(row[COL.google_id - 1]).trim()
            });
          }
        });
      }

      console.log('list_pending_phase1: ' + rows.length + ' rows');
      return jsonResponse({ ok: true, rows: rows });
    }

    // ── list_pending_phase2 — rows where D = "待关闭" ─────────────────────────
    if (action === 'list_pending_phase2') {
      var rows = [];

      if (dataRows > 0) {
        var data = sheet
          .getRange(HEADER_ROW + 1, 1, dataRows, COL.result)
          .getValues();
        data.forEach(function(row, i) {
          if (String(row[COL.result - 1]).trim() === '待关闭') {
            rows.push({
              row_index:       HEADER_ROW + 1 + i,
              google_id:       String(row[COL.google_id - 1]).trim(),
              restaurant_name: String(row[COL.restaurant_name - 1]).trim(),
              platform_id:     String(row[COL.platform_id - 1]).trim()
            });
          }
        });
      }

      console.log('list_pending_phase2: ' + rows.length + ' rows');
      return jsonResponse({ ok: true, rows: rows });
    }

    return jsonResponse({ ok: false, error: 'unknown action: ' + action });

  } catch (err) {
    console.error('doGet error:', err.toString());
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

// ── doPost — update a single row ──────────────────────────────────────────────

function doPost(e) {
  try {
    var params    = JSON.parse(e.postData.contents);
    var secret    = params.secret    || '';
    var rowIndex  = params.row_index || 0;
    var updates   = params.updates   || {};

    console.log('doPost row_index:' + rowIndex + ' updates:' + JSON.stringify(updates));

    if (!checkSecret(secret)) {
      return jsonResponse({ ok: false, error: 'unauthorized' });
    }

    if (!rowIndex || rowIndex <= HEADER_ROW) {
      return jsonResponse({ ok: false, error: 'invalid row_index: ' + rowIndex });
    }

    var sheet   = getSheet();
    var lastRow = sheet.getLastRow();

    if (rowIndex > lastRow) {
      return jsonResponse({ ok: false, error: 'row_index out of range: ' + rowIndex });
    }

    // Write only fields present in updates — never touch A (google_id)
    var writableFields = ['restaurant_name', 'platform_id', 'result', 'error_reason'];
    writableFields.forEach(function(field) {
      if (updates[field] !== undefined) {
        sheet.getRange(rowIndex, COL[field]).setValue(updates[field]);
        console.log('  wrote ' + field + '=' + updates[field] + ' at row ' + rowIndex);
      }
    });

    // Always stamp processed_at in ISO format
    var now = new Date().toISOString();
    sheet.getRange(rowIndex, COL.processed_at).setValue(now);

    return jsonResponse({ ok: true, row_index: rowIndex, processed_at: now });

  } catch (err) {
    console.error('doPost error:', err.toString());
    return jsonResponse({ ok: false, error: err.toString() });
  }
}
