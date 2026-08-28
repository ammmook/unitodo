/**
 * Todolist — Google Apps Script backend (Google Sheet = database)
 * ═══════════════════════════════════════════════════════════════
 *
 * วิธีติดตั้ง
 *   1. เปิด Google Sheet ที่จะใช้เป็นฐานข้อมูล > Extensions > Apps Script
 *   2. วางไฟล์นี้ทับ Code.gs แล้วแก้ GOOGLE_CLIENT_ID ด้านล่างให้ตรงกับ
 *      OAuth Client ID (Web application) ที่สร้างไว้ใน Google Cloud Console
 *   3. เลือกฟังก์ชัน setupAutomation ในแถบด้านบนแล้วกด Run หนึ่งครั้ง แล้วกด Allow ให้ครบ
 *      (ข้ามขั้นนี้ไม่ได้ — จะขอสิทธิ์ ปรับรูปแบบชีต และติดตั้ง trigger รายวันให้ในทีเดียว)
 *   4. Deploy > New deployment > Web app
 *        Execute as     : Me
 *        Who has access : Anyone
 *   5. ก๊อป Web app URL ไปใส่ VITE_GOOGLE_SHEET_API_URL ใน .env.local ของ frontend
 *
 * แก้โค้ดนี้เมื่อไหร่ ต้อง Deploy > Manage deployments > Edit > New version > Deploy ทุกครั้ง
 * เช็คว่า deploy สำเร็จได้ด้วยการเรียก action 'ping' (ไม่ต้องใช้ token)
 *
 * ชีตจะถูกสร้างอัตโนมัติครั้งแรกที่เรียก: Users / Subjects / Works
 *
 * หมายเหตุด้าน performance
 *   - เปิดแอปครั้งหนึ่งยิงแค่ action เดียว (bootstrap) ได้ user + subjects +
 *     works + users(ถ้าเป็น admin) กลับไปพร้อมกัน
 *   - อ่านชีตด้วย getValues() ครั้งเดียวต่อชีต ไม่วนอ่านทีละเซลล์
 *   - เขียนแบบหาแถวจากคอลัมน์ id อย่างเดียว แล้ว setValues() ครั้งเดียว
 *   - ผล verify id_token ถูก cache ไว้ ไม่ต้องยิง Google ซ้ำทุก request
 *   - คอลัมน์ priority อัปเดตด้วย trigger รายวัน (อ่านครั้งเดียว เขียนครั้งเดียว)
 *     ไม่ต้องรอให้มีคนเปิดเว็บ และไม่เพิ่มภาระให้คำขอปกติ
 */

// ── ตั้งค่า ────────────────────────────────────────────────────────

/** OAuth Client ID (Web application) — ต้องตรงกับ VITE_GOOGLE_CLIENT_ID ฝั่ง frontend */
var GOOGLE_CLIENT_ID = 'PASTE_YOUR_GOOGLE_OAUTH_CLIENT_ID_HERE.apps.googleusercontent.com';

/**
 * อีเมลที่ให้เป็น admin เสมอ เช่น ['me@gmail.com']
 * ถ้าเว้นว่างไว้ ผู้ใช้คนแรกที่ล็อกอินจะได้เป็น admin อัตโนมัติ
 */
var BOOTSTRAP_ADMIN_EMAILS = [];

/** ขยับเลขนี้ทุกครั้งที่แก้ไฟล์ — เอาไว้เช็คว่า deploy เวอร์ชันใหม่แล้วจริงผ่าน action 'ping' */
var BACKEND_VERSION = 6;

/** อายุ session ที่ backend ออกให้ — ภายในช่วงนี้เปิดเว็บ/แท็บใหม่ไม่ต้องล็อกอินซ้ำ */
var SESSION_TTL_DAYS = 30;
/** ต่ออายุ session เมื่อไม่ได้ใช้มานานเกินนี้ — ไม่เขียนชีตทุกคำขอ */
var SESSION_TOUCH_AFTER_HOURS = 12;

var USERS_SHEET = 'Users';
var SESSIONS_SHEET = 'Sessions';
var SUBJECTS_SHEET = 'Subjects';
var WORKS_SHEET = 'Works';

var USERS_HEADERS = ['id', 'email', 'displayName', 'isAdmin', 'signedUpAt', 'lastSignInAt'];
var SESSIONS_HEADERS = ['token', 'email', 'createdAt', 'expiresAt', 'lastSeenAt'];
var SUBJECTS_HEADERS = ['id', 'ownerEmail', 'name', 'emoji', 'academicYear', 'semester', 'createdAt'];
// คอลัมน์ priority ถูกคำนวณและเขียนโดยระบบ ไม่ใช่ค่าที่ผู้ใช้กรอก
// อัปเดตทุกวันด้วย time-based trigger (recalculatePriorities) และทุกครั้งที่เพิ่ม/แก้งาน
var WORKS_HEADERS = ['id', 'ownerEmail', 'subjectId', 'title', 'type', 'status', 'priority', 'dueDate', 'note', 'createdAt'];

var U = { ID: 0, EMAIL: 1, DISPLAY_NAME: 2, IS_ADMIN: 3, SIGNED_UP_AT: 4, LAST_SIGN_IN_AT: 5 };
var SESSION = { TOKEN: 0, EMAIL: 1, CREATED_AT: 2, EXPIRES_AT: 3, LAST_SEEN_AT: 4 };
var S = { ID: 0, OWNER_EMAIL: 1, NAME: 2, EMOJI: 3, ACADEMIC_YEAR: 4, SEMESTER: 5, CREATED_AT: 6 };
var W = { ID: 0, OWNER_EMAIL: 1, SUBJECT_ID: 2, TITLE: 3, TYPE: 4, STATUS: 5, PRIORITY: 6, DUE_DATE: 7, NOTE: 8, CREATED_AT: 9 };

var VALID_STATUS = { notStarted: 1, inProgress: 1, completed: 1 };
var VALID_TYPE = { assignment: 1, exam: 1, presentation: 1, project: 1, other: 1 };

// ── Router ────────────────────────────────────────────────────────

function doGet(e) {
  return handle((e && e.parameter) || {});
}

function doPost(e) {
  var params = {};
  try {
    if (e && e.postData && e.postData.contents) params = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ ok: false, error: 'BAD_REQUEST', message: 'Malformed JSON body' });
  }
  return handle(params);
}

function handle(params) {
  try {
    var action = params.action;

    // เช็คว่า deploy เวอร์ชันไหนอยู่ โดยไม่ต้องมี token — ใช้ไล่ปัญหาตอนตั้งค่า
    if (action === 'ping') {
      return jsonResponse({
        ok: true,
        data: {
          version: BACKEND_VERSION,
          scopesOk: canFetchExternal(),
          dailyTriggers: countDailyPriorityTriggers()
        }
      });
    }

    // ตัวตนมาได้ 2 ทาง: session ที่เราออกให้เอง (ปกติ) หรือ Google id_token (ตอนล็อกอินครั้งแรก)
    // ไม่เชื่ออีเมลที่ client ส่งมาลอย ๆ ไม่ว่าทางไหน
    var actor = resolveActor(params);
    if (!actor) {
      return jsonResponse({ ok: false, error: 'UNAUTHENTICATED', message: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง' });
    }

    var me = upsertUser(actor, action === 'bootstrap');

    // เพิ่งล็อกอินด้วย Google สำเร็จ → ออก session ให้ แล้ว client จะทิ้ง id_token ไปเลย
    var issuedSession = null;
    if (actor.viaGoogle && action === 'bootstrap') {
      issuedSession = createSession(me.email);
    }

    if (action === 'logout') {
      revokeSession(params.sessionToken);
      return jsonResponse({ ok: true, data: { signedOut: true } });
    }

    // admin สวมบทเป็นผู้ใช้คนอื่นได้ — อ่าน/เขียนทุกอย่างในนามคนนั้น
    var actingEmail = me.email;
    var viewAs = normalizeEmail(params.viewAs);
    if (viewAs && viewAs !== me.email) {
      if (!me.isAdmin) {
        return jsonResponse({ ok: false, error: 'FORBIDDEN', message: 'ต้องเป็น admin เท่านั้น' });
      }
      actingEmail = viewAs;
    }

    switch (action) {
      case 'bootstrap':
        return jsonResponse({ ok: true, data: bootstrap(me, actingEmail, issuedSession) });
      case 'addSubject':
        return withLock(function () { return addSubject(params, actingEmail); });
      case 'deleteSubject':
        return withLock(function () { return deleteSubject(params, actingEmail); });
      case 'addWork':
      case 'restoreWork':
        return withLock(function () { return addWork(params, actingEmail); });
      case 'updateWork':
        return withLock(function () { return updateWork(params, actingEmail); });
      case 'deleteWork':
        return withLock(function () { return deleteWork(params, actingEmail); });
      case 'setAdmin':
        return withLock(function () { return setAdmin(params, me); });
      default:
        return jsonResponse({ ok: false, error: 'UNKNOWN_ACTION', message: 'ไม่รู้จัก action: ' + action });
    }
  } catch (err) {
    var message = String(err && err.message ? err.message : err);
    // สคริปต์ที่เคยอนุญาตไว้ก่อนจะมี UrlFetchApp จะเจอ error นี้ ต้อง re-authorize
    if (message.indexOf('script.external_request') !== -1) {
      return jsonResponse({
        ok: false,
        error: 'SERVER_ERROR',
        message: 'Apps Script ยังไม่ได้รับสิทธิ์ UrlFetchApp — เปิด Apps Script แล้วรันฟังก์ชัน authorizeOnce หนึ่งครั้งเพื่อกดอนุญาต จากนั้น Deploy เวอร์ชันใหม่'
      });
    }
    return jsonResponse({ ok: false, error: 'SERVER_ERROR', message: message });
  }
}

/**
 * รันฟังก์ชันนี้ "หนึ่งครั้ง" จากตัว editor ของ Apps Script (เลือกชื่อฟังก์ชันแล้วกด Run)
 * เพื่อให้ Google ขึ้นหน้าจอขออนุญาต แล้วกด Allow ให้ครบทุกสิทธิ์
 *
 * ต้องทำเมื่อเจอ error ว่าไม่ได้รับอนุญาตให้เรียกใช้ UrlFetchApp.fetch
 * เพราะการอนุญาตครั้งก่อนเกิดขึ้นตอนที่โค้ดยังไม่มี UrlFetchApp
 *
 * ทำเสร็จแล้วต้อง Deploy > Manage deployments > Edit > New version > Deploy อีกรอบ
 */
function authorizeOnce() {
  getUsersSheet();
  getSessionsSheet();
  getSubjectsSheet();
  getWorksSheet();
  countDailyPriorityTriggers();
  var reachable = canFetchExternal();
  Logger.log(reachable
    ? 'พร้อมใช้งานแล้ว — Deploy เวอร์ชันใหม่ได้เลย'
    : 'ยังเรียก UrlFetchApp ไม่ได้ ลองรันซ้ำแล้วกด Allow ให้ครบ');
  return reachable;
}

// ── Priority: คำนวณอัตโนมัติ + เขียนลงชีตเอง ──────────────────
//
// กติกา (ตรงกับ computeWorkPriority ฝั่ง frontend — แก้ที่ไหนต้องแก้อีกที่ด้วย)
//   เสร็จแล้ว                    → '' (ไม่มีความสำคัญ ดูคอลัมน์ status แทน)
//   เลยกำหนด / ครบกำหนดวันนี้     → urgent เสมอ
//   ยังไม่ได้ทำ  เหลือ 1–2 วัน    → high · 3 วัน → medium · 4 วันขึ้นไป → low
//   กำลังทำ      เหลือ 1 วัน      → high · 2–3 วัน → medium · 4 วันขึ้นไป → low

var DAILY_HANDLER = 'dailyMaintenance';
/** ชื่อ handler เดิม — ยังต้องรู้จักไว้เพื่อถอน trigger รุ่นก่อนออกให้หมด */
var LEGACY_DAILY_HANDLERS = ['recalculatePriorities'];

/** จำนวนวันจากวันนี้ถึงกำหนดส่ง — ติดลบคือเลยกำหนด */
function daysUntilDue(dueDate) {
  var due = String(dueDate || '').slice(0, 10).split('-');
  if (due.length !== 3) return 0;

  var timeZone = Session.getScriptTimeZone();
  var today = Utilities.formatDate(new Date(), timeZone, 'yyyy-MM-dd').split('-');

  // เทียบเป็นเที่ยงคืน UTC ทั้งคู่ จะได้ไม่โดน offset ของโซนเวลาทำให้เพี้ยนไปหนึ่งวัน
  var dueUtc = Date.UTC(Number(due[0]), Number(due[1]) - 1, Number(due[2]));
  var todayUtc = Date.UTC(Number(today[0]), Number(today[1]) - 1, Number(today[2]));
  return Math.round((dueUtc - todayUtc) / 86400000);
}

/** คืน '' เมื่องานเสร็จแล้ว — ไม่ต้องคำนวณความสำคัญ */
function computeWorkPriority(dueDate, status) {
  if (status === 'completed') return '';

  var days = daysUntilDue(dueDate);
  if (days <= 0) return 'urgent';

  if (status === 'inProgress') {
    if (days === 1) return 'high';
    if (days <= 3) return 'medium';
    return 'low';
  }

  if (days <= 2) return 'high';
  if (days === 3) return 'medium';
  return 'low';
}

/**
 * คำนวณ priority ใหม่ทั้งชีตแล้วเขียนกลับ — ตัวนี้คือสิ่งที่ trigger รายวันเรียก
 *
 * อ่านครั้งเดียว เขียนครั้งเดียว (เฉพาะคอลัมน์ priority) และข้ามการเขียนถ้าไม่มีอะไรเปลี่ยน
 * ปลอดภัยเมื่อรันทับกับคำขอจากเว็บ เพราะจับ lock ตัวเดียวกับฝั่งเขียน
 */
function recalculatePriorities() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log('มีงานเขียนอื่นค้างอยู่ ข้ามรอบนี้ไปก่อน');
    return 0;
  }

  try {
    var sheet = getWorksSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log('ยังไม่มีงานในชีต');
      return 0;
    }

    var rows = sheet.getRange(2, 1, lastRow - 1, WORKS_HEADERS.length).getValues();
    var column = [];
    var changed = 0;

    for (var i = 0; i < rows.length; i++) {
      var current = String(rows[i][W.PRIORITY] || '');
      var next = rows[i][W.ID]
        ? computeWorkPriority(asDateString(rows[i][W.DUE_DATE]), String(rows[i][W.STATUS]))
        : current;

      if (next !== current) changed++;
      column.push([next]);
    }

    if (changed > 0) {
      sheet.getRange(2, W.PRIORITY + 1, column.length, 1).setValues(column);
    }

    Logger.log('ตรวจ ' + rows.length + ' งาน · อัปเดต ' + changed + ' แถว');
    return changed;
  } finally {
    lock.releaseLock();
  }
}

/**
 * ติดตั้ง trigger รายวัน — ทำงานช่วงเที่ยงคืนถึงตีหนึ่งตามโซนเวลาในไฟล์ appsscript.json
 * (Asia/Bangkok) ทุกวัน ไม่ว่าจะมีคนเปิดเว็บหรือไม่
 *
 * ลบ trigger เดิมของ handler เดียวกันก่อนเสมอ รันซ้ำกี่รอบก็ไม่เกิด trigger ซ้อน
 */
function installDailyPriorityTrigger() {
  removeDailyPriorityTrigger();

  ScriptApp.newTrigger(DAILY_HANDLER)
    .timeBased()
    .atHour(0)
    .nearMinute(15)
    .everyDays(1)
    .create();

  Logger.log('ติดตั้ง trigger รายวันแล้ว — จะรัน ' + DAILY_HANDLER + ' ทุกวันช่วงเที่ยงคืน');
  return true;
}

/** งานประจำวัน: อัปเดต priority + เก็บกวาด session ที่หมดอายุ */
function dailyMaintenance() {
  var changed = recalculatePriorities();
  var removed = cleanupExpiredSessions();
  Logger.log('งานรายวันเสร็จ · priority ' + changed + ' แถว · ลบ session ' + removed + ' รายการ');
  return { priorityChanged: changed, sessionsRemoved: removed };
}

function removeDailyPriorityTrigger() {
  var handlers = [DAILY_HANDLER].concat(LEGACY_DAILY_HANDLERS);
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;

  for (var i = 0; i < triggers.length; i++) {
    if (handlers.indexOf(triggers[i].getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }
  return removed;
}

/** trigger รายวันติดตั้งไว้แล้วกี่ตัว — ใช้เช็คผ่าน action 'ping' */
function countDailyPriorityTriggers() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var count = 0;
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === DAILY_HANDLER) count++;
    }
    return count;
  } catch (err) {
    return -1;
  }
}

/**
 * ปรับหัวคอลัมน์ของชีต Works ให้ตรงกับ WORKS_HEADERS ปัจจุบัน
 *
 * ย้ายข้อมูลตาม "ชื่อหัวคอลัมน์" ไม่ใช่ตำแหน่ง จึงใช้ได้กับชีตทุกเวอร์ชันที่ผ่านมา
 * (ทั้งแบบที่มี priority อยู่แล้ว และแบบที่เคยถูกลบออกไป) · รันซ้ำได้ ไม่ทำอะไรถ้าตรงอยู่แล้ว
 */
function ensureWorksSchema() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(WORKS_SHEET);
  if (!sheet || sheet.getLastRow() === 0) {
    Logger.log('ยังไม่มีชีต Works — จะถูกสร้างด้วยรูปแบบใหม่เองตอนใช้งานครั้งแรก');
    return false;
  }

  var currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var isSame = currentHeaders.length === WORKS_HEADERS.length;
  for (var i = 0; isSame && i < WORKS_HEADERS.length; i++) {
    if (String(currentHeaders[i]).trim() !== WORKS_HEADERS[i]) isSame = false;
  }
  if (isSame) {
    Logger.log('ชีต Works เป็นรูปแบบล่าสุดอยู่แล้ว');
    return false;
  }

  // จับคู่ชื่อหัวคอลัมน์เดิม → ตำแหน่งใหม่
  var indexByName = {};
  for (var c = 0; c < currentHeaders.length; c++) {
    indexByName[String(currentHeaders[c]).trim()] = c;
  }

  var lastRow = sheet.getLastRow();
  var oldRows = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, currentHeaders.length).getValues()
    : [];

  var newRows = [];
  for (var r = 0; r < oldRows.length; r++) {
    var newRow = [];
    for (var h = 0; h < WORKS_HEADERS.length; h++) {
      var from = indexByName[WORKS_HEADERS[h]];
      newRow.push(from === undefined ? '' : oldRows[r][from]);
    }
    newRows.push(newRow);
  }

  sheet.clear();
  sheet.getRange(1, 1, 1, WORKS_HEADERS.length).setValues([WORKS_HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  if (newRows.length > 0) {
    sheet.getRange(2, 1, newRows.length, WORKS_HEADERS.length).setValues(newRows);
  }

  Logger.log('ปรับรูปแบบชีต Works แล้ว · ย้ายข้อมูล ' + newRows.length + ' แถว');
  return true;
}

/**
 * รันตัวนี้ "หนึ่งครั้ง" หลังวางโค้ดใหม่ — ทำให้ครบทุกอย่างในทีเดียว
 *   1. ขออนุญาตสิทธิ์ที่ต้องใช้
 *   2. ปรับหัวคอลัมน์ชีต Works ให้ตรงรูปแบบล่าสุด
 *   3. ติดตั้ง trigger รายวัน
 *   4. คำนวณ priority ให้ทุกงานทันที ไม่ต้องรอรอบแรกของ trigger
 */
function setupAutomation() {
  authorizeOnce();
  ensureWorksSchema();
  installDailyPriorityTrigger();
  var changed = recalculatePriorities();
  Logger.log('พร้อมใช้งาน · อัปเดต priority ไป ' + changed + ' แถว');
  return changed;
}

/** เรียกเน็ตออกไปได้ไหม — ใช้ทั้งใน authorizeOnce และ action 'ping' */
function canFetchExternal() {
  try {
    UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=probe', {
      muteHttpExceptions: true
    });
    return true;
  } catch (err) {
    return false;
  }
}

/** กันสองคนเขียนชีตชนกัน — ฝั่งอ่านไม่ต้องล็อก จะได้โหลดไว */
function withLock(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    return jsonResponse({ ok: false, error: 'BUSY', message: 'ระบบกำลังบันทึกรายการอื่น ลองใหม่อีกครั้ง' });
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ── Authentication ────────────────────────────────────────────────

/**
 * ตรวจ Google ID token กับ tokeninfo endpoint แล้ว cache ผลไว้ตามอายุ token
 * คืน { email, name } หรือ null ถ้า token ใช้ไม่ได้
 */
function verifyIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string' || idToken.length < 20) return null;

  var cache = CacheService.getScriptCache();
  var cacheKey = 'idtok:' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken)
  );

  var cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  var response = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true }
  );
  if (response.getResponseCode() !== 200) return null;

  var info;
  try {
    info = JSON.parse(response.getContentText());
  } catch (err) {
    return null;
  }

  var clientIdConfigured = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.indexOf('PASTE_YOUR') !== 0;
  if (clientIdConfigured && info.aud !== GOOGLE_CLIENT_ID) return null;
  if (!info.email) return null;
  if (String(info.email_verified) !== 'true') return null;

  var expiresInSeconds = Number(info.exp) - Math.floor(Date.now() / 1000);
  if (!(expiresInSeconds > 0)) return null;

  var identity = {
    email: normalizeEmail(info.email),
    name: String(info.name || info.given_name || '').trim()
  };

  cache.put(cacheKey, JSON.stringify(identity), Math.min(expiresInSeconds, 3600));
  return identity;
}

/**
 * หาว่าคำขอนี้เป็นของใคร
 *
 *   sessionToken — ทางปกติ ตรวจกับชีต Sessions (มี cache ช่วยไม่ให้อ่านชีตทุกครั้ง)
 *   idToken      — เฉพาะตอนล็อกอินครั้งแรก ตรวจกับ Google แล้วแลกเป็น session
 *
 * คืน { email, name, viaGoogle } หรือ null ถ้าใช้ไม่ได้
 */
function resolveActor(params) {
  var sessionEmail = resolveSession(params.sessionToken);
  if (sessionEmail) {
    return { email: sessionEmail, name: '', viaGoogle: false };
  }

  var identity = verifyIdToken(params.idToken);
  if (identity) {
    return { email: identity.email, name: identity.name, viaGoogle: true };
  }

  return null;
}

/** token สุ่มยาว เดาไม่ได้ — ใช้เป็นกุญแจของ session */
function newSessionToken() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function sessionCacheKey(token) {
  return 'sess:' + token;
}

/** ออก session ใหม่หลังยืนยันตัวตนกับ Google สำเร็จ */
function createSession(email) {
  var now = new Date();
  var expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 86400000);
  var token = newSessionToken();

  getSessionsSheet().appendRow([
    token, email, now.toISOString(), expiresAt.toISOString(), now.toISOString()
  ]);

  CacheService.getScriptCache().put(
    sessionCacheKey(token),
    email,
    Math.min(SESSION_TOUCH_AFTER_HOURS * 3600, 21600)
  );

  return { token: token, expiresAt: expiresAt.toISOString() };
}

/**
 * แปลง session token เป็นอีเมล — คืน null ถ้าไม่มี หมดอายุ หรือถูก logout ไปแล้ว
 * cache ไว้ก่อน จะได้ไม่ต้องอ่านชีต Sessions ทุกคำขอ
 */
function resolveSession(token) {
  if (!token || typeof token !== 'string' || token.length < 20) return null;

  var cache = CacheService.getScriptCache();
  var cached = cache.get(sessionCacheKey(token));
  if (cached) return cached;

  var sheet = getSessionsSheet();
  var rows = readRows(sheet);
  var nowMs = Date.now();

  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][SESSION.TOKEN]) !== token) continue;

    var expiresAtMs = Date.parse(asIsoString(rows[i][SESSION.EXPIRES_AT]));
    if (!(expiresAtMs > nowMs)) return null;

    var email = normalizeEmail(rows[i][SESSION.EMAIL]);
    if (!email) return null;

    // ต่ออายุแบบเลื่อนไปเรื่อย ๆ แต่เขียนชีตเฉพาะตอนที่ห่างจากครั้งก่อนพอสมควร
    var lastSeenMs = Date.parse(asIsoString(rows[i][SESSION.LAST_SEEN_AT])) || 0;
    if (nowMs - lastSeenMs > SESSION_TOUCH_AFTER_HOURS * 3600000) {
      var now = new Date(nowMs);
      var nextExpiry = new Date(nowMs + SESSION_TTL_DAYS * 86400000);
      sheet.getRange(i + 2, SESSION.EXPIRES_AT + 1, 1, 2)
        .setValues([[nextExpiry.toISOString(), now.toISOString()]]);
    }

    cache.put(sessionCacheKey(token), email, Math.min(SESSION_TOUCH_AFTER_HOURS * 3600, 21600));
    return email;
  }

  return null;
}

/** ออกจากระบบ — ลบทิ้งทั้งในชีตและใน cache ไม่ให้เอา token เดิมกลับมาใช้ได้อีก */
function revokeSession(token) {
  if (!token) return false;

  CacheService.getScriptCache().remove(sessionCacheKey(token));

  var sheet = getSessionsSheet();
  var rowIndex = findRowIndex(sheet, SESSION.TOKEN, token, -1, null);
  if (rowIndex === -1) return false;

  sheet.deleteRow(rowIndex);
  return true;
}

/** เก็บกวาด session ที่หมดอายุ — ถูกเรียกจาก trigger รายวัน */
function cleanupExpiredSessions() {
  var sheet = getSessionsSheet();
  var rows = readRows(sheet);
  var nowMs = Date.now();
  var removed = 0;

  // วนถอยหลังเพื่อให้เลขแถวที่ยังไม่ได้ลบไม่เลื่อน
  for (var i = rows.length - 1; i >= 0; i--) {
    if (!rows[i][SESSION.TOKEN]) continue;
    var expiresAtMs = Date.parse(asIsoString(rows[i][SESSION.EXPIRES_AT]));
    if (expiresAtMs > nowMs) continue;
    sheet.deleteRow(i + 2);
    removed++;
  }

  Logger.log('ลบ session ที่หมดอายุ ' + removed + ' รายการ');
  return removed;
}

/** หา user ในชีต ถ้ายังไม่มีก็สมัครให้เลย · touchLastSignIn = อัปเดตเวลาเข้าล่าสุด */
function upsertUser(identity, touchLastSignIn) {
  var sheet = getUsersSheet();
  var rows = readRows(sheet);
  var nowIso = new Date().toISOString();

  for (var i = 0; i < rows.length; i++) {
    if (normalizeEmail(rows[i][U.EMAIL]) !== identity.email) continue;

    var user = mapUser(rows[i]);
    if (touchLastSignIn) {
      sheet.getRange(i + 2, U.LAST_SIGN_IN_AT + 1).setValue(nowIso);
      user.lastSignInAt = nowIso;
      // ชื่อใน Google อาจเปลี่ยน — sync ให้ตรงตอน login
      if (identity.name && identity.name !== user.displayName) {
        sheet.getRange(i + 2, U.DISPLAY_NAME + 1).setValue(identity.name);
        user.displayName = identity.name;
      }
    }
    return user;
  }

  // มาด้วย session แต่หา user ไม่เจอ = แถวถูกลบไปแล้ว ไม่สร้างใหม่ให้เงียบ ๆ
  if (!identity.viaGoogle) {
    throw new Error('ไม่พบบัญชีผู้ใช้นี้แล้ว');
  }

  // ผู้ใช้ใหม่ — คนแรกของระบบ หรือคนที่อยู่ใน BOOTSTRAP_ADMIN_EMAILS ได้เป็น admin
  var bootstrapAdmins = BOOTSTRAP_ADMIN_EMAILS.map(normalizeEmail);
  var newUser = {
    id: Utilities.getUuid(),
    email: identity.email,
    displayName: identity.name || identity.email.split('@')[0],
    isAdmin: rows.length === 0 || bootstrapAdmins.indexOf(identity.email) !== -1,
    signedUpAt: nowIso,
    lastSignInAt: nowIso
  };

  sheet.appendRow([
    newUser.id, newUser.email, newUser.displayName,
    newUser.isAdmin, newUser.signedUpAt, newUser.lastSignInAt
  ]);
  return newUser;
}

// ── Bootstrap: ข้อมูลทั้งหมดในครั้งเดียว ──────────────────────────

function bootstrap(me, actingEmail, issuedSession) {
  var viewingAs = me;
  if (actingEmail !== me.email) {
    viewingAs = findUserByEmail(actingEmail) || {
      id: actingEmail,
      email: actingEmail,
      displayName: actingEmail.split('@')[0],
      isAdmin: false,
      signedUpAt: '',
      lastSignInAt: ''
    };
  }

  var payload = {
    me: me,
    viewingAs: viewingAs,
    subjects: readSubjects(actingEmail),
    works: readWorks(actingEmail),
    serverTime: new Date().toISOString()
  };

  // ตารางผู้ใช้ทั้งหมด — ส่งให้เฉพาะ admin เท่านั้น
  if (me.isAdmin) payload.users = readAllUsers();

  // มีเฉพาะตอนที่เพิ่งแลก id_token เป็น session — ครั้งต่อ ๆ ไป client ใช้ session เดิม
  if (issuedSession) {
    payload.session = issuedSession;
  }

  return payload;
}

function readAllUsers() {
  var rows = readRows(getUsersSheet());
  var users = [];
  for (var i = 0; i < rows.length; i++) {
    if (!rows[i][U.EMAIL]) continue;
    users.push(mapUser(rows[i]));
  }
  return users;
}

function findUserByEmail(email) {
  var rows = readRows(getUsersSheet());
  for (var i = 0; i < rows.length; i++) {
    if (normalizeEmail(rows[i][U.EMAIL]) === email) return mapUser(rows[i]);
  }
  return null;
}

function readSubjects(ownerEmail) {
  var rows = readRows(getSubjectsSheet());
  var subjects = [];
  for (var i = 0; i < rows.length; i++) {
    if (!rows[i][S.ID]) continue;
    if (normalizeEmail(rows[i][S.OWNER_EMAIL]) !== ownerEmail) continue;
    subjects.push({
      id: String(rows[i][S.ID]),
      name: String(rows[i][S.NAME] || ''),
      emoji: String(rows[i][S.EMOJI] || '📘'),
      academicYear: Number(rows[i][S.ACADEMIC_YEAR]) || 0,
      semester: Number(rows[i][S.SEMESTER]) || 0
    });
  }
  return subjects;
}

function readWorks(ownerEmail) {
  var rows = readRows(getWorksSheet());
  var works = [];
  for (var i = 0; i < rows.length; i++) {
    if (!rows[i][W.ID]) continue;
    if (normalizeEmail(rows[i][W.OWNER_EMAIL]) !== ownerEmail) continue;
    works.push({
      id: String(rows[i][W.ID]),
      title: String(rows[i][W.TITLE] || ''),
      subjectId: String(rows[i][W.SUBJECT_ID] || ''),
      type: pick(rows[i][W.TYPE], VALID_TYPE, 'other'),
      status: pick(rows[i][W.STATUS], VALID_STATUS, 'notStarted'),
      dueDate: asDateString(rows[i][W.DUE_DATE]),
      note: String(rows[i][W.NOTE] || ''),
      createdAt: asIsoString(rows[i][W.CREATED_AT]),
      ownerEmail: normalizeEmail(rows[i][W.OWNER_EMAIL])
    });
  }
  return works;
}

// ── Subjects ──────────────────────────────────────────────────────

function addSubject(params, ownerEmail) {
  var name = String(params.name || '').trim();
  if (!name) return jsonResponse({ ok: false, error: 'VALIDATION', message: 'ต้องมีชื่อวิชา' });

  var academicYear = Number(params.academicYear) || 0;
  var semester = Number(params.semester) || 0;

  var sheet = getSubjectsSheet();
  var rows = readRows(sheet);

  // กันชื่อวิชาซ้ำในเทอมเดียวกันของเจ้าของคนเดียวกัน
  for (var i = 0; i < rows.length; i++) {
    if (normalizeEmail(rows[i][S.OWNER_EMAIL]) !== ownerEmail) continue;
    if (Number(rows[i][S.ACADEMIC_YEAR]) !== academicYear) continue;
    if (Number(rows[i][S.SEMESTER]) !== semester) continue;
    if (String(rows[i][S.NAME] || '').trim().toLowerCase() === name.toLowerCase()) {
      return jsonResponse({
        ok: false,
        error: 'DUPLICATE',
        message: 'มีวิชา “' + name + '” ในเทอมนี้อยู่แล้ว'
      });
    }
  }

  var subject = {
    id: String(params.id || Utilities.getUuid()),
    name: name,
    emoji: String(params.emoji || '📘'),
    academicYear: academicYear,
    semester: semester
  };

  sheet.appendRow([
    subject.id, ownerEmail, subject.name, subject.emoji,
    subject.academicYear, subject.semester, new Date().toISOString()
  ]);

  return jsonResponse({ ok: true, data: subject });
}

/** ลบวิชา แล้วลบงานทั้งหมดที่ผูกกับวิชานั้นตามไปด้วย */
function deleteSubject(params, ownerEmail) {
  var sheet = getSubjectsSheet();
  var rowIndex = findRowIndex(sheet, S.ID, params.id, S.OWNER_EMAIL, ownerEmail);
  if (rowIndex === -1) return jsonResponse({ ok: false, error: 'NOT_FOUND', message: 'ไม่พบวิชานี้' });

  sheet.deleteRow(rowIndex);

  var worksSheet = getWorksSheet();
  var rows = readRows(worksSheet);
  var deletedWorkIds = [];
  // วนถอยหลังเพื่อให้เลขแถวที่ยังไม่ได้ลบไม่เลื่อน
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][W.SUBJECT_ID]) !== String(params.id)) continue;
    if (normalizeEmail(rows[i][W.OWNER_EMAIL]) !== ownerEmail) continue;
    deletedWorkIds.push(String(rows[i][W.ID]));
    worksSheet.deleteRow(i + 2);
  }

  return jsonResponse({ ok: true, data: { id: String(params.id), deletedWorkIds: deletedWorkIds } });
}

// ── Works ─────────────────────────────────────────────────────────

function addWork(params, ownerEmail) {
  var title = String(params.title || '').trim();
  var subjectId = String(params.subjectId || '');
  if (!title) return jsonResponse({ ok: false, error: 'VALIDATION', message: 'ต้องมีชื่องาน' });
  if (!subjectId) return jsonResponse({ ok: false, error: 'VALIDATION', message: 'ต้องเลือกวิชา' });

  var work = {
    id: String(params.id || Utilities.getUuid()),
    title: title,
    subjectId: subjectId,
    type: pick(params.type, VALID_TYPE, 'other'),
    status: pick(params.status, VALID_STATUS, 'notStarted'),
    dueDate: asDateString(params.dueDate),
    note: String(params.note || '').trim(),
    createdAt: params.createdAt ? asIsoString(params.createdAt) : new Date().toISOString(),
    ownerEmail: ownerEmail
  };

  // restoreWork (undo) ยิงด้วย id เดิม — ถ้ามีอยู่แล้วถือว่าสำเร็จ ไม่สร้างซ้ำ
  if (findRowIndex(getWorksSheet(), W.ID, work.id, -1, null) !== -1) {
    return jsonResponse({ ok: true, data: work });
  }

  getWorksSheet().appendRow([
    work.id, work.ownerEmail, work.subjectId, work.title, work.type,
    work.status, computeWorkPriority(work.dueDate, work.status),
    work.dueDate, work.note, work.createdAt
  ]);

  return jsonResponse({ ok: true, data: work });
}

function updateWork(params, ownerEmail) {
  var sheet = getWorksSheet();
  var rowIndex = findRowIndex(sheet, W.ID, params.id, W.OWNER_EMAIL, ownerEmail);
  if (rowIndex === -1) return jsonResponse({ ok: false, error: 'NOT_FOUND', message: 'ไม่พบงานนี้' });

  // อ่านแถวเดียว แก้เฉพาะฟิลด์ที่ส่งมา แล้วเขียนกลับครั้งเดียว
  var range = sheet.getRange(rowIndex, 1, 1, WORKS_HEADERS.length);
  var row = range.getValues()[0];

  if (params.title != null) row[W.TITLE] = String(params.title).trim();
  if (params.subjectId != null) row[W.SUBJECT_ID] = String(params.subjectId);
  if (params.type != null) row[W.TYPE] = pick(params.type, VALID_TYPE, String(row[W.TYPE]));
  if (params.status != null) row[W.STATUS] = pick(params.status, VALID_STATUS, String(row[W.STATUS]));
  if (params.dueDate != null) row[W.DUE_DATE] = asDateString(params.dueDate);
  if (params.note != null) row[W.NOTE] = String(params.note);

  // สถานะหรือกำหนดส่งเปลี่ยน = ความสำคัญเปลี่ยนตาม คำนวณใหม่ทันทีไม่ต้องรอ trigger รอบถัดไป
  row[W.PRIORITY] = computeWorkPriority(asDateString(row[W.DUE_DATE]), String(row[W.STATUS]));

  range.setValues([row]);
  return jsonResponse({ ok: true, data: { id: String(params.id) } });
}

function deleteWork(params, ownerEmail) {
  var sheet = getWorksSheet();
  var rowIndex = findRowIndex(sheet, W.ID, params.id, W.OWNER_EMAIL, ownerEmail);
  if (rowIndex === -1) return jsonResponse({ ok: false, error: 'NOT_FOUND', message: 'ไม่พบงานนี้' });

  sheet.deleteRow(rowIndex);
  return jsonResponse({ ok: true, data: { id: String(params.id) } });
}

// ── Admin ─────────────────────────────────────────────────────────

/** เลื่อน/ถอดสิทธิ์ admin — เช็คจาก me (ตัวจริง) ไม่ใช่คนที่กำลังสวมบทอยู่ */
function setAdmin(params, me) {
  if (!me.isAdmin) return jsonResponse({ ok: false, error: 'FORBIDDEN', message: 'ต้องเป็น admin เท่านั้น' });

  var targetEmail = normalizeEmail(params.email);
  var sheet = getUsersSheet();
  var rowIndex = findRowIndex(sheet, U.EMAIL, targetEmail, -1, null);
  if (rowIndex === -1) return jsonResponse({ ok: false, error: 'NOT_FOUND', message: 'ไม่พบผู้ใช้นี้' });

  var nextIsAdmin = params.isAdmin === true || String(params.isAdmin) === 'true';
  sheet.getRange(rowIndex, U.IS_ADMIN + 1).setValue(nextIsAdmin);
  return jsonResponse({ ok: true, data: { email: targetEmail, isAdmin: nextIsAdmin } });
}

// ── Sheet helpers ─────────────────────────────────────────────────

function getOrCreateSheet(name, headers, textColumns) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(name);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    // บังคับคอลัมน์วันที่เป็น plain text ไม่ให้ Sheets แปลงเป็น Date เอง
    for (var i = 0; i < textColumns.length; i++) {
      sheet.getRange(2, textColumns[i] + 1, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
    }
  } else if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getUsersSheet() {
  return getOrCreateSheet(USERS_SHEET, USERS_HEADERS, [U.SIGNED_UP_AT, U.LAST_SIGN_IN_AT]);
}

function getSessionsSheet() {
  return getOrCreateSheet(SESSIONS_SHEET, SESSIONS_HEADERS, [
    SESSION.CREATED_AT, SESSION.EXPIRES_AT, SESSION.LAST_SEEN_AT
  ]);
}

function getSubjectsSheet() {
  return getOrCreateSheet(SUBJECTS_SHEET, SUBJECTS_HEADERS, [S.CREATED_AT]);
}

function getWorksSheet() {
  return getOrCreateSheet(WORKS_SHEET, WORKS_HEADERS, [W.DUE_DATE, W.CREATED_AT]);
}

/** อ่านทุกแถวยกเว้น header ด้วย getValues() ครั้งเดียว — index 0 = แถวชีตที่ 2 */
function readRows(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  return sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
}

/**
 * หาเลขแถวจริงในชีตจาก id โดยอ่านแค่คอลัมน์ที่ต้องใช้ ไม่ดึงทั้งตาราง
 * ถ้าส่ง ownerColumn มาด้วย จะเช็คสิทธิ์เจ้าของไปในตัว — id ที่ไม่ใช่ของเราถือว่าไม่พบ
 */
function findRowIndex(sheet, idColumn, id, ownerColumn, ownerEmail) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1 || !id) return -1;

  var target = String(id);
  var ids = sheet.getRange(2, idColumn + 1, lastRow - 1, 1).getValues();
  var owners = ownerColumn >= 0
    ? sheet.getRange(2, ownerColumn + 1, lastRow - 1, 1).getValues()
    : null;

  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) !== target) continue;
    if (owners && normalizeEmail(owners[i][0]) !== ownerEmail) return -1;
    return i + 2;
  }
  return -1;
}

function mapUser(row) {
  var email = normalizeEmail(row[U.EMAIL]);
  return {
    id: String(row[U.ID]),
    email: email,
    displayName: String(row[U.DISPLAY_NAME] || '') || email.split('@')[0],
    isAdmin: row[U.IS_ADMIN] === true || String(row[U.IS_ADMIN]).toLowerCase() === 'true',
    signedUpAt: asIsoString(row[U.SIGNED_UP_AT]),
    lastSignInAt: asIsoString(row[U.LAST_SIGN_IN_AT])
  };
}

// ── Utilities ─────────────────────────────────────────────────────

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

/** คืนค่าเฉพาะที่อยู่ในชุดที่อนุญาต ไม่งั้นใช้ค่า default — กันข้อมูลเพี้ยนจากการแก้ชีตด้วยมือ */
function pick(value, allowed, fallback) {
  var text = String(value || '');
  return allowed[text] ? text : fallback;
}

/** Sheets อาจคืนค่าเป็น Date object — บีบให้เป็น 'YYYY-MM-DD' เสมอ */
function asDateString(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value || '').slice(0, 10);
}

function asIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return String(value || '');
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
