// ═══════════════════════════════════════════════════════════════════════
// HANDICRAFT BAZAAR — Google Apps Script
// Inventory ID: Inventory@handicraftbazaar.in
// Admin ID:     Admin@handicraftbazaar.in
// ═══════════════════════════════════════════════════════════════════════

var SHEET_INV      = 'Inventory';
var SHEET_RTO      = 'RTO & Return';
var SHEET_KHATA    = 'Khata';
var SHEET_CO       = 'CustomOrders';
var SHEET_CARGO    = 'Cargo Complent';
var SHEET_SHIP     = 'Shiprocket Complent';
var SHEET_SELF     = 'Self Deliver';

var ALERT_EMAILS = [
  'gurjarnitin554@gmail.com',
  'hborder99@gmail.com',
];

var PROPS = PropertiesService.getScriptProperties();
var INVENTORY_EMAIL = 'inventory@handicraftbazaar.in';
var ADMIN_EMAIL     = 'admin@handicraftbazaar.in';
var TOKEN_TTL_MS    = 8 * 60 * 60 * 1000; // 8 hours

// ─── TOKEN AUTH ───────────────────────────────────────────────────────
// After OTP verified on frontend, frontend calls verifyOTP action.
// GAS verifies the OTP itself (stored in PropertiesService) and issues
// a signed session token stored server-side.

function generateToken() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var token = '';
  for (var i = 0; i < 48; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

// Store session: token -> {email, role, permissions, expires}
function createSession(email, role, permissions) {
  var token = generateToken();
  var session = { email: email, role: role, permissions: permissions || {}, expires: Date.now() + TOKEN_TTL_MS };
  PROPS.setProperty('sess_' + token, JSON.stringify(session));
  return token;
}

function getSession(token) {
  if (!token) return null;
  var raw = PROPS.getProperty('sess_' + token);
  if (!raw) return null;
  try {
    var s = JSON.parse(raw);
    if (Date.now() > s.expires) { PROPS.deleteProperty('sess_' + token); return null; }
    return s;
  } catch(e) { return null; }
}

function requireAuth(token, requiredRole) {
  var s = getSession(token);
  if (!s) return { ok: false, error: 'Unauthorized: invalid or expired session' };
  if (requiredRole === 'admin' && s.role !== 'admin') return { ok: false, error: 'Forbidden: admin access required' };
  if (requiredRole === 'admin_or_restricted' && s.role !== 'admin' && s.role !== 'restricted') return { ok: false, error: 'Forbidden' };
  if (requiredRole === 'admin_or_restricted_or_inventory' && s.role !== 'admin' && s.role !== 'restricted' && s.role !== 'inventory') return { ok: false, error: 'Forbidden' };
  return { ok: true, session: s };
}

function requireSectionPerm(session, sectionKey, permType) {
  if (session.role === 'admin') return true;
  if (session.role === 'inventory' && sectionKey === 'purchase') return true;
  var p = (session.permissions || {})[sectionKey] || {};
  return permType === 'view' ? !!(p.view || p.edit) : !!p.edit;
}

// ─── ENTRY POINT ──────────────────────────────────────────────────────
function doGet(e) {
  try {
    var p = e.parameter || {};
    var action = String(p.action || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    var token  = String(p.token || '').trim();
    var result;

    // Public actions (no auth needed)
    if      (action === 'sendOTP')    result = sendOTP(p);
    else if (action === 'verifyOTP')  result = verifyOTP(p);
    else if (action === 'checkUser')  result = checkUserEmail(p);
    // Inventory user actions
    else if (action === 'getAll') {
      var a1 = requireAuth(token, 'inventory_or_admin');
      // getAll is allowed for any logged-in user
      var s1 = getSession(token);
      if (!s1) result = { error: 'Unauthorized' };
      else result = getAllData();
    }
    else if (action === 'saveVariant')       { var a=requireAuth(token,'any'); if(!a.ok)result=a; else result=saveVariant(p); }
    else if (action === 'deleteVariant')     { var a=requireAuth(token,'any'); if(!a.ok)result=a; else result=deleteVariant(p); }
    else if (action === 'addKhata')          { var a=requireAuth(token,'any'); if(!a.ok)result=a; else result=addKhata(p); }
    // Admin + restricted actions
    else if (action === 'getAdminAll') {
      var auth = requireAuth(token, 'admin_or_restricted');
      if (!auth.ok) result = auth;
      else result = getAdminAll(auth.session);
    }
    else if (action === 'saveRTO')           { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'rto','edit'))result={error:'Forbidden'};else result=saveRTO(p); }
    else if (action === 'deleteRTO')         { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'rto','edit'))result={error:'Forbidden'};else result=deleteRTO(p); }
    else if (action === 'saveCustomOrder')   { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'custom-orders','edit'))result={error:'Forbidden'};else result=saveCustomOrder(p); }
    else if (action === 'deleteCustomOrder') { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'custom-orders','edit'))result={error:'Forbidden'};else result=deleteCustomOrder(p); }
    else if (action === 'saveCargo')         { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'cargo','edit'))result={error:'Forbidden'};else result=saveCargo(p); }
    else if (action === 'deleteCargo')       { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'cargo','edit'))result={error:'Forbidden'};else result=deleteCargo(p); }
    else if (action === 'saveShiprocket')    { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'shiprocket','edit'))result={error:'Forbidden'};else result=saveShiprocket(p); }
    else if (action === 'deleteShiprocket')  { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'shiprocket','edit'))result={error:'Forbidden'};else result=deleteShiprocket(p); }
    else if (action === 'saveSelfDeliver')   { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'self-deliver','edit'))result={error:'Forbidden'};else result=saveSelfDeliver(p); }
    else if (action === 'deleteSelfDeliver') { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'self-deliver','edit'))result={error:'Forbidden'};else result=deleteSelfDeliver(p); }
    else if (action === 'savePurchase')      { var a=requireAuth(token,'admin_or_restricted_or_inventory'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'purchase','edit'))result={error:'Forbidden'};else result=savePurchase(p); }
    else if (action === 'deletePurchase')    { var a=requireAuth(token,'admin_or_restricted_or_inventory'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'purchase','edit'))result={error:'Forbidden'};else result=deletePurchase(p); }
    // Admin-only actions
    else if (action === 'getUsers')          { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result={ users: readUsers() }; }
    else if (action === 'saveUser')          { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result=saveUser(p); }
    else if (action === 'deleteUser')        { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result=deleteUser(p); }
    else if (action === 'getSections')       { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result={ sections: readSectionsMeta() }; }
    else if (action === 'saveSection')       { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result=saveSection(p); }
    else if (action === 'deleteSection')     { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result=deleteSection(p); }
    // Dynamic section actions
    else if (action === 'readDynamic')  { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'dyn_'+(p.sectionId||''),'view'))result={error:'Forbidden'};else result=readDynamicSection(p); }
    else if (action === 'saveDynamic')  { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'dyn_'+(p.sectionId||''),'edit'))result={error:'Forbidden'};else result=saveDynamicRecord(p); }
    else if (action === 'deleteDynamic'){ var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'dyn_'+(p.sectionId||''),'edit'))result={error:'Forbidden'};else result=deleteDynamicRecord(p); }
    // Module Relations — admin manages, any logged-in user with view access on BOTH modules can read links
    else if (action === 'getRelations')      { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result={ relations: readRelations() }; }
    else if (action === 'saveRelation')      { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result=saveRelation(p); }
    else if (action === 'deleteRelation')    { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result=deleteRelation(p); }
    else if (action === 'listModules')       { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result={ modules: listAllModulesForRelations() }; }
    else if (action === 'getLinkedRecords') {
      var a=requireAuth(token,'admin_or_restricted'); if(!a.ok){result=a;}
      else {
        var srcMod=String(p.sourceModule||'');
        if(!requireSectionPerm(a.session,srcMod,'view')){result={success:false,error:'Forbidden: no view access to '+srcMod};}
        else result=getLinkedRecords(p);
      }
    }
    else                                     result = { error: 'Unknown action: ' + action };

    return jsonRes(result);
  } catch (err) {
    return jsonRes({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    var data = {};
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter || {};
    }
    var action = String(data.action || '').trim();
    var token  = String(data.token  || '').trim();
    var result;

    if      (action === 'sendOTP')    result = sendOTP(data);
    else if (action === 'verifyOTP')  result = verifyOTP(data);
    else if (action === 'checkUser')  result = checkUserEmail(data);
    else if (action === 'getAll') {
      var s1 = getSession(token); if (!s1) result = { error: 'Unauthorized' }; else result = getAllData();
    }
    else if (action === 'saveVariant')       { var a=requireAuth(token,'any'); if(!a.ok)result=a; else result=saveVariant(data); }
    else if (action === 'deleteVariant')     { var a=requireAuth(token,'any'); if(!a.ok)result=a; else result=deleteVariant(data); }
    else if (action === 'addKhata')          { var a=requireAuth(token,'any'); if(!a.ok)result=a; else result=addKhata(data); }
    else if (action === 'getAdminAll') {
      var auth = requireAuth(token, 'admin_or_restricted');
      if (!auth.ok) result = auth; else result = getAdminAll(auth.session);
    }
    else if (action === 'saveRTO')           { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'rto','edit'))result={error:'Forbidden'};else result=saveRTO(data); }
    else if (action === 'deleteRTO')         { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'rto','edit'))result={error:'Forbidden'};else result=deleteRTO(data); }
    else if (action === 'saveCustomOrder')   { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'custom-orders','edit'))result={error:'Forbidden'};else result=saveCustomOrder(data); }
    else if (action === 'deleteCustomOrder') { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'custom-orders','edit'))result={error:'Forbidden'};else result=deleteCustomOrder(data); }
    else if (action === 'saveCargo')         { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'cargo','edit'))result={error:'Forbidden'};else result=saveCargo(data); }
    else if (action === 'deleteCargo')       { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'cargo','edit'))result={error:'Forbidden'};else result=deleteCargo(data); }
    else if (action === 'saveShiprocket')    { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'shiprocket','edit'))result={error:'Forbidden'};else result=saveShiprocket(data); }
    else if (action === 'deleteShiprocket')  { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'shiprocket','edit'))result={error:'Forbidden'};else result=deleteShiprocket(data); }
    else if (action === 'saveSelfDeliver')   { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'self-deliver','edit'))result={error:'Forbidden'};else result=saveSelfDeliver(data); }
    else if (action === 'deleteSelfDeliver') { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'self-deliver','edit'))result={error:'Forbidden'};else result=deleteSelfDeliver(data); }
    else if (action === 'savePurchase')      { var a=requireAuth(token,'admin_or_restricted_or_inventory'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'purchase','edit'))result={error:'Forbidden'};else result=savePurchase(data); }
    else if (action === 'deletePurchase')    { var a=requireAuth(token,'admin_or_restricted_or_inventory'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'purchase','edit'))result={error:'Forbidden'};else result=deletePurchase(data); }
    else if (action === 'getUsers')          { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result={ users: readUsers() }; }
    else if (action === 'saveUser')          { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result=saveUser(data); }
    else if (action === 'deleteUser')        { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result=deleteUser(data); }
    else if (action === 'getSections')       { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result={ sections: readSectionsMeta() }; }
    else if (action === 'saveSection')       { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result=saveSection(data); }
    else if (action === 'deleteSection')     { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result=deleteSection(data); }
    else if (action === 'readDynamic')  { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'dyn_'+(data.sectionId||''),'view'))result={error:'Forbidden'};else result=readDynamicSection(data); }
    else if (action === 'saveDynamic')  { var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'dyn_'+(data.sectionId||''),'edit'))result={error:'Forbidden'};else result=saveDynamicRecord(data); }
    else if (action === 'deleteDynamic'){ var a=requireAuth(token,'admin_or_restricted'); if(!a.ok)result=a; else if(!requireSectionPerm(a.session,'dyn_'+(data.sectionId||''),'edit'))result={error:'Forbidden'};else result=deleteDynamicRecord(data); }
    else if (action === 'getRelations')      { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result={ relations: readRelations() }; }
    else if (action === 'saveRelation')      { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result=saveRelation(data); }
    else if (action === 'deleteRelation')    { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result=deleteRelation(data); }
    else if (action === 'listModules')       { var a=requireAuth(token,'admin'); if(!a.ok)result=a; else result={ modules: listAllModulesForRelations() }; }
    else if (action === 'getLinkedRecords') {
      var a=requireAuth(token,'admin_or_restricted'); if(!a.ok){result=a;}
      else {
        var srcMod=String(data.sourceModule||'');
        if(!requireSectionPerm(a.session,srcMod,'view')){result={success:false,error:'Forbidden: no view access to '+srcMod};}
        else result=getLinkedRecords(data);
      }
    }
    else                                     result = { error: 'Unknown action: ' + data.action };

    return jsonRes(result);
  } catch (err) {
    return jsonRes({ error: err.toString() });
  }
}

function jsonRes(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════
// OTP SYSTEM
// ═══════════════════════════════════
function sendOTP(p) {
  try {
    var otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Store OTP with email binding and expiry (10 min)
    var email = String(p.email || '').toLowerCase().trim();
    PROPS.setProperty('CURRENT_OTP', otp);
    PROPS.setProperty('OTP_EMAIL', email);
    PROPS.setProperty('OTP_TIME', String(Date.now()));

    var subject = 'Handicraft Bazaar — Login OTP';
    var body =
      'Namaste!\n\n' +
      'Your OTP to login to Handicraft Bazaar App:\n\n' +
      '  OTP: ' + otp + '\n\n' +
      'This OTP is valid for 10 minutes.\n' +
      'Do not share this with anyone.\n\n' +
      'Handicraft Bazaar';

    var htmlBody =
      '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#FDF6F0;border-radius:16px;overflow:hidden">' +
      '<div style="background:linear-gradient(135deg,#B85C2A,#8A3D18);padding:28px 24px;text-align:center">' +
      '<div style="font-size:32px;margin-bottom:6px">🏺</div>' +
      '<div style="font-family:serif;font-size:22px;font-weight:700;color:#fff">Handicraft Bazaar</div>' +
      '</div>' +
      '<div style="padding:32px 24px;text-align:center">' +
      '<div style="font-size:15px;color:#221A12;margin-bottom:20px">Your login OTP is:</div>' +
      '<div style="background:#fff;border-radius:12px;border:2px solid #E6D8C8;padding:24px;margin-bottom:20px">' +
      '<div style="font-size:48px;font-weight:700;font-family:serif;letter-spacing:12px;color:#B85C2A">' + otp + '</div>' +
      '<div style="font-size:12px;color:#9A8878;margin-top:10px">Valid for 10 minutes only</div>' +
      '</div></div></div>';

    // Always send to admin alert emails
    ALERT_EMAILS.forEach(function(ae) {
      MailApp.sendEmail({ to: ae, subject: subject, body: body, htmlBody: htmlBody });
    });
    // Also send to restricted user's own email if different
    var isAlertEmail = ALERT_EMAILS.some(function(ae){ return ae.toLowerCase() === email; });
    if (email && !isAlertEmail && email !== INVENTORY_EMAIL && email !== ADMIN_EMAIL) {
      try { MailApp.sendEmail({ to: email, subject: subject, body: body, htmlBody: htmlBody }); }
      catch(e) { Logger.log('OTP to user email failed: ' + e); }
    }

    // Return only success — NEVER return the OTP
    return { success: true };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// Server-side OTP verification — issues a session token
function verifyOTP(p) {
  try {
    var email    = String(p.email || '').toLowerCase().trim();
    var entered  = String(p.otp   || '').trim();
    var stored   = PROPS.getProperty('CURRENT_OTP')  || '';
    var otpEmail = (PROPS.getProperty('OTP_EMAIL')   || '').toLowerCase().trim();
    var otpTime  = Number(PROPS.getProperty('OTP_TIME') || 0);

    if (!entered || !stored) return { success: false, error: 'No OTP found' };
    if (Date.now() - otpTime > 10 * 60 * 1000) return { success: false, error: 'OTP expired' };
    if (email !== otpEmail) return { success: false, error: 'Email mismatch' };
    if (entered !== stored) return { success: false, error: 'Wrong OTP' };

    // Clear OTP
    PROPS.deleteProperty('CURRENT_OTP');
    PROPS.deleteProperty('OTP_EMAIL');
    PROPS.deleteProperty('OTP_TIME');

    // Determine role and permissions
    var role, permissions = {};
    if (email === ADMIN_EMAIL) {
      role = 'admin';
    } else if (email === INVENTORY_EMAIL) {
      role = 'inventory';
    } else {
      // Check restricted users sheet
      var user = findUserByEmail(email);
      if (!user) return { success: false, error: 'User not found' };
      role = 'restricted';
      permissions = user.permissions || {};
    }

    var token = createSession(email, role, permissions);
    return { success: true, token: token, role: role, permissions: permissions };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// ═══════════════════════════════════
// LOW STOCK ALERT
// ═══════════════════════════════════
function sendLowStockAlert(lowItems) {
  if (!lowItems || lowItems.length === 0) return;
  var lastSent = PROPS.getProperty('LOW_STOCK_EMAIL_SENT');
  var now = Date.now();
  if (lastSent && (now - Number(lastSent)) < 86400000) return;
  PROPS.setProperty('LOW_STOCK_EMAIL_SENT', String(now));

  var subject = 'Low Stock Alert — Handicraft Bazaar (' + lowItems.length + ' items)';
  var body = 'LOW STOCK ALERT\n\n';
  lowItems.forEach(function(item) {
    body += '- ' + item.productName + ' | ' + item.color + ' ' + item.size + ' | Stock: ' + item.stock + '\n';
  });

  ALERT_EMAILS.forEach(function(email) {
    try { MailApp.sendEmail({ to: email, subject: subject, body: body }); }
    catch(e) { Logger.log('Email error: ' + e); }
  });
}

// ═══════════════════════════════════
// CUSTOM ORDER READY ALERT
// ═══════════════════════════════════
function sendCustomOrderReadyAlerts() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = ss.getSpreadsheetTimeZone();
  var todayStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  var tomorrowStr = Utilities.formatDate(tomorrowDate, tz, 'yyyy-MM-dd');

  var orders = readCustomOrders(ss);
  var dueToday = orders.filter(function(o){ return o.status !== 'dispatched' && o.readyDate === todayStr; });
  var dueTomorrow = orders.filter(function(o){ return o.status !== 'dispatched' && o.readyDate === tomorrowStr; });

  if (!dueToday.length && !dueTomorrow.length) return;
  var lastSent = PROPS.getProperty('CO_ALERT_SENT');
  if (lastSent === todayStr) return;
  PROPS.setProperty('CO_ALERT_SENT', todayStr);

  var subject = 'Custom Order Reminder — Handicraft Bazaar';
  var body = 'CUSTOM ORDER REMINDER\n\n';
  if (dueToday.length) {
    body += 'READY TODAY:\n';
    dueToday.forEach(function(o){ body += '• ' + o.orderId + ' — ' + o.prodName + ' | ' + o.custName + ' | ' + o.custPhone + '\n'; });
  }
  if (dueTomorrow.length) {
    body += '\nDUE TOMORROW:\n';
    dueTomorrow.forEach(function(o){ body += '• ' + o.orderId + ' — ' + o.prodName + ' | ' + o.custName + '\n'; });
  }

  ALERT_EMAILS.forEach(function(email) {
    try { MailApp.sendEmail({ to: email, subject: subject, body: body }); }
    catch(e) { Logger.log('CO alert error: ' + e); }
  });
}

// Check if email is a valid user (restricted or hardcoded) — public, no auth needed
function checkUserEmail(p) {
  var email = String(p.email || '').toLowerCase().trim();
  if (email === ADMIN_EMAIL) return { found: true, role: 'admin' };
  if (email === INVENTORY_EMAIL) return { found: true, role: 'inventory' };
  var user = findUserByEmail(email);
  if (!user) return { found: false };
  return { found: true, role: 'restricted' };
}

// ═══════════════════════════════════
// GET ALL — Inventory User
// ═══════════════════════════════════
function getAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rows = readInventoryFlat(ss);

  var productMap = {}, productOrder = [];
  rows.forEach(function(row) {
    var pid = String(row.productId);
    if (!productMap[pid]) {
      productMap[pid] = { id:pid, name:row.productName, category:row.category, emoji:row.emoji, variants:[] };
      productOrder.push(pid);
    }
    productMap[pid].variants.push({
      id: String(row.variantId), color: row.color, size: row.size, sku: row.sku,
      stock: row.stock, packed: row.boxReady, price: row.price, lowThreshold: row.lowThreshold
    });
  });

  var products = productOrder.map(function(pid){ return productMap[pid]; });

  var lowItems = rows.filter(function(r){ return r.stock <= r.lowThreshold; });
  if (lowItems.length > 0) {
    try { sendLowStockAlert(lowItems); } catch(e) {}
  }
  try { sendCustomOrderReadyAlerts(); } catch(e) {}

  return {
    products: products,
    rtos: readRTOs(ss),
    activities: readKhata(ss),
    customOrders: readCustomOrders(ss)
  };
}

// ═══════════════════════════════════
// GET ADMIN ALL — Admin/Restricted User
// ═══════════════════════════════════
function getAdminAll(session) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rows = readInventoryFlat(ss);
  var isAdmin = !session || session.role === 'admin';

  var productMap = {}, productOrder = [];
  rows.forEach(function(row) {
    var pid = String(row.productId);
    if (!productMap[pid]) {
      productMap[pid] = { id:pid, name:row.productName, category:row.category, emoji:row.emoji, variants:[] };
      productOrder.push(pid);
    }
    productMap[pid].variants.push({
      id: String(row.variantId), color: row.color, size: row.size, sku: row.sku,
      stock: row.stock, packed: row.boxReady, price: row.price, lowThreshold: row.lowThreshold
    });
  });
  var products = productOrder.map(function(pid){ return productMap[pid]; });

  function allowed(key) {
    if (isAdmin) return true;
    var p = (session.permissions || {})[key] || {};
    return !!(p.view || p.edit);
  }

  var result = { products: products };
  if (allowed('rto'))           result.rtos          = readRTOs(ss);          else result.rtos          = [];
  if (allowed('custom-orders')) result.customOrders  = readCustomOrders(ss);  else result.customOrders  = [];
  if (allowed('cargo'))         result.cargo         = readCargo(ss);         else result.cargo         = [];
  if (allowed('shiprocket'))    result.shiprocket    = readShiprocket(ss);    else result.shiprocket    = [];
  if (allowed('self-deliver'))  result.selfDeliver   = readSelfDeliver(ss);   else result.selfDeliver   = [];
  if (allowed('purchase'))      result.purchase      = readPurchase(ss);      else result.purchase      = [];
  // Users and sections only for full admin
  if (isAdmin) {
    result.users    = readUsers(ss);
    result.sections = readSectionsMeta(ss);
  }
  return result;
}

// ═══════════════════════════════════
// INVENTORY SHEET
// ═══════════════════════════════════
function getInvSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_INV);
  if (!sh) sh = ss.insertSheet(SHEET_INV);
  return sh;
}

function readInventoryFlat(ss) {
  var sh = getInvSheet(ss);
  var data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i]; if (!r[0] && !r[1]) continue;
    out.push({
      _row: i+1, productId: String(r[0]||''), productName: String(r[1]||''),
      category: String(r[2]||'Other'), emoji: String(r[3]||''),
      variantId: String(r[0]||'')+'_'+String(r[4]||'')+'_'+String(r[5]||''),
      color: String(r[4]||''), size: String(r[5]||''), sku: String(r[6]||''),
      stock: Number(r[7])||0, boxReady: Number(r[8])||0, price: String(r[9]||''),
      lowThreshold: Number(r[10])||10
    });
  }
  return out;
}

function saveVariant(p) {
  var sh = getInvSheet();
  var data = sh.getDataRange().getValues();
  var pid = String(p.productId||''), color = String(p.color||''), size = String(p.size||'');
  var now = Utilities.formatDate(new Date(), SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'dd/MM/yyyy, HH:mm:ss');
  var row = [pid,p.productName||'',p.category||'',p.emoji||'',color,size,p.sku||'',Number(p.stock)||0,Number(p.boxReady)||0,p.price||'',Number(p.lowThreshold)||10,now];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0])===pid && String(data[i][4]).toLowerCase()===color.toLowerCase() && String(data[i][5]).toLowerCase()===size.toLowerCase()) {
      sh.getRange(i+1,8).setValue(Number(p.stock)||0);
      sh.getRange(i+1,9).setValue(Number(p.boxReady)||0);
      sh.getRange(i+1,12).setValue(now);
      return { success:true, action:'updated' };
    }
  }
  sh.appendRow(row);
  return { success:true, action:'created' };
}

function deleteVariant(p) {
  var sh = getInvSheet();
  var data = sh.getDataRange().getValues();
  var pid = String(p.productId||''), color = String(p.color||''), size = String(p.size||'');
  if (!color && !size) {
    var toDelete = [];
    for (var i = 1; i < data.length; i++) { if (String(data[i][0])===pid) toDelete.push(i+1); }
    for (var j = toDelete.length-1; j >= 0; j--) sh.deleteRow(toDelete[j]);
    return { success:true, deleted:toDelete.length };
  }
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0])===pid && String(data[i][4]).toLowerCase()===color.toLowerCase() && String(data[i][5]).toLowerCase()===size.toLowerCase()) {
      sh.deleteRow(i+1); return { success:true };
    }
  }
  return { success:false, error:'Row not found' };
}

// ═══════════════════════════════════
// RTO & RETURN SHEET
// ═══════════════════════════════════
function getRTOSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_RTO);
  if (!sh) {
    sh = ss.insertSheet(SHEET_RTO);
    var cols = ['id','ProductName','RTOReturnDate','DeliveredDate','CompanyName','OrderID','TrackingID','Status','SafeTClaim','Remark'];
    sh.getRange(1,1,1,cols.length).setValues([cols]).setFontWeight('bold').setBackground('#1A5FAD').setFontColor('#fff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readRTOs(ss) {
  var sh = getRTOSheet(ss);
  var data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  var out = [];
  var startRow = 1;
  if (String(data[0][0]).toLowerCase() === 'id' || String(data[0][0]).toLowerCase() === 'product name' || isNaN(Number(data[0][0])) && data[0][0] !== '') {
    startRow = 1;
  }
  for (var i = startRow; i < data.length; i++) {
    var r = data[i]; if (!r[0] && !r[1]) continue;
    out.push({
      id:           String(r[0]||i),
      productName:  String(r[1]||''),
      rtoDate:      String(r[2]||''),
      deliveredDate:String(r[3]||''),
      company:      String(r[4]||''),
      orderId:      String(r[5]||''),
      trackingId:   String(r[6]||''),
      status:       String(r[7]||''),
      safeTClaim:   String(r[8]||''),
      remark:       String(r[9]||'')
    });
  }
  return out;
}

function saveRTO(p) {
  var sh = getRTOSheet();
  var data = sh.getDataRange().getValues();
  var id = String(p.id || Date.now());
  var now = Utilities.formatDate(new Date(), SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'dd/MM/yyyy, HH:mm:ss');
  var row = [id, p.productName||'', p.rtoDate||'', p.deliveredDate||'', p.company||'', p.orderId||'', p.trackingId||'', p.status||'', p.safeTClaim||'', p.remark||''];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sh.getRange(i+1, 1, 1, row.length).setValues([row]);
      return { success:true, action:'updated' };
    }
  }
  sh.appendRow(row);
  return { success:true, action:'created' };
}

function deleteRTO(p) {
  var sh = getRTOSheet();
  var data = sh.getDataRange().getValues();
  var id = String(p.id||'');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) { sh.deleteRow(i+1); return {success:true}; }
  }
  return {success:false};
}

// ═══════════════════════════════════
// KHATA SHEET
// ═══════════════════════════════════
function getKhataSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_KHATA);
  if (!sh) {
    sh = ss.insertSheet(SHEET_KHATA);
    var cols = ['id','type','productId','productName','variantId','variantLabel','qty','user','note','timestamp','readableTime'];
    sh.getRange(1,1,1,cols.length).setValues([cols]).setFontWeight('bold').setBackground('#1E7A4A').setFontColor('#fff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readKhata(ss) {
  var sh = getKhataSheet(ss);
  var data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i]; if (!r[0]) continue;
    out.push({ id:String(r[0]), type:String(r[1]||'add'), productId:String(r[2]||''),
      productName:String(r[3]||''), variantId:String(r[4]||''), variantLabel:String(r[5]||''),
      qty:Number(r[6])||0, user:String(r[7]||'Kamal'), note:String(r[8]||''), time:Number(r[9])||Date.now() });
  }
  return out;
}

function addKhata(p) {
  var sh = getKhataSheet();
  var now = Date.now();
  var readable = Utilities.formatDate(new Date(now), SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'dd/MM/yyyy, HH:mm:ss');
  var id = String(now)+Math.floor(Math.random()*10000);
  sh.appendRow([id,p.type||'add',p.productId||'',p.productName||'',p.variantId||'',p.variantLabel||'',Number(p.qty)||0,p.user||'Kamal',p.note||'',now,readable]);
  return { success:true, id:id };
}

// ═══════════════════════════════════
// CUSTOM ORDERS SHEET
// ═══════════════════════════════════
function getCOSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_CO);
  if (!sh) {
    sh = ss.insertSheet(SHEET_CO);
    var cols = ['id','orderId','custName','custPhone','prodName','size','receivedDate','readyDate','dispatchDate','status','remark','createdAt','updatedAt'];
    sh.getRange(1,1,1,cols.length).setValues([cols]).setFontWeight('bold').setBackground('#1A5FAD').setFontColor('#fff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readCustomOrders(ss) {
  var sh = getCOSheet(ss);
  var data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i]; if (!r[0]) continue;
    out.push({
      id:String(r[0]||''), orderId:String(r[1]||''), custName:String(r[2]||''),
      custPhone:String(r[3]||''), prodName:String(r[4]||''), size:String(r[5]||''),
      receivedDate:String(r[6]||''), readyDate:String(r[7]||''), dispatchDate:String(r[8]||''),
      status:String(r[9]||'pending'), remark:String(r[10]||'')
    });
  }
  return out;
}

function saveCustomOrder(p) {
  try {
    var sh = getCOSheet();
    var data = sh.getDataRange().getValues();
    var id = String(p.id || Date.now());
    var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    var now = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy, HH:mm:ss');
    var row = [id,String(p.orderId||''),String(p.custName||''),String(p.custPhone||''),String(p.prodName||''),String(p.size||''),String(p.receivedDate||''),String(p.readyDate||''),String(p.dispatchDate||''),String(p.status||'pending'),String(p.remark||''),now,now];
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === id) { sh.getRange(i+1,1,1,row.length).setValues([row]); return {success:true,action:'updated',id:id}; }
    }
    sh.appendRow(row);
    return {success:true,action:'created',id:id};
  } catch(err) { return {success:false,error:err.toString()}; }
}

function deleteCustomOrder(p) {
  var sh = getCOSheet();
  var data = sh.getDataRange().getValues();
  var id = String(p.id||'');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) { sh.deleteRow(i+1); return {success:true}; }
  }
  return {success:false};
}

// ═══════════════════════════════════
// CARGO COMPLAINT SHEET
// Columns: AWB No, Client Name, Number, Date, Status, Remark
// ═══════════════════════════════════
function getCargoSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_CARGO);
  if (!sh) {
    sh = ss.insertSheet(SHEET_CARGO);
    var cols = ['AWB NO.','CLIENT NAME','NUMBER','DATE','STATUS','REMARK'];
    sh.getRange(1,1,1,cols.length).setValues([cols]).setFontWeight('bold').setBackground('#6B21A8').setFontColor('#fff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readCargo(ss) {
  var sh = getCargoSheet(ss);
  var data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i]; if (!r[0] && !r[1]) continue;
    var rowDate = r[3];
    if (rowDate instanceof Date) {
      rowDate = Utilities.formatDate(rowDate, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'dd/MM/yyyy');
    } else {
      rowDate = String(rowDate||'');
    }
    out.push({
      id:       'cargo_'+i,
      awbNo:    String(r[0]||''),
      client:   String(r[1]||''),
      number:   String(r[2]||''),
      date:     rowDate,
      status:   String(r[4]||''),
      remark:   String(r[5]||''),
      _row:     i+1
    });
  }
  return out;
}

function saveCargo(p) {
  try {
    var sh = getCargoSheet();
    var data = sh.getDataRange().getValues();
    var rowNum = p._row ? Number(p._row) : 0;
    var row = [String(p.awbNo||''), String(p.client||''), String(p.number||''), String(p.date||''), String(p.status||''), String(p.remark||'')];
    if (rowNum > 1 && rowNum <= data.length) {
      sh.getRange(rowNum, 1, 1, row.length).setValues([row]);
      return {success:true, action:'updated'};
    }
    sh.appendRow(row);
    return {success:true, action:'created'};
  } catch(err) { return {success:false, error:err.toString()}; }
}

function deleteCargo(p) {
  try {
    var sh = getCargoSheet();
    var rowNum = Number(p._row||0);
    if (rowNum > 1) { sh.deleteRow(rowNum); return {success:true}; }
    return {success:false, error:'Invalid row'};
  } catch(err) { return {success:false, error:err.toString()}; }
}

// ═══════════════════════════════════
// SHIPROCKET COMPLAINT SHEET
// Same columns as Cargo
// ═══════════════════════════════════
function getShipSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_SHIP);
  if (!sh) {
    sh = ss.insertSheet(SHEET_SHIP);
    var cols = ['AWB NO.','CLIENT NAME','NUMBER','DATE','STATUS','REMARK'];
    sh.getRange(1,1,1,cols.length).setValues([cols]).setFontWeight('bold').setBackground('#0EA5E9').setFontColor('#fff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readShiprocket(ss) {
  var sh = getShipSheet(ss);
  var data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i]; if (!r[0] && !r[1]) continue;
    var rowDate = r[3];
    if (rowDate instanceof Date) {
      rowDate = Utilities.formatDate(rowDate, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'dd/MM/yyyy');
    } else {
      rowDate = String(rowDate||'');
    }
    out.push({
      id:     'ship_'+i,
      awbNo:  String(r[0]||''),
      client: String(r[1]||''),
      number: String(r[2]||''),
      date:   rowDate,
      status: String(r[4]||''),
      remark: String(r[5]||''),
      _row:   i+1
    });
  }
  return out;
}

function saveShiprocket(p) {
  try {
    var sh = getShipSheet();
    var data = sh.getDataRange().getValues();
    var rowNum = p._row ? Number(p._row) : 0;
    var row = [String(p.awbNo||''), String(p.client||''), String(p.number||''), String(p.date||''), String(p.status||''), String(p.remark||'')];
    if (rowNum > 1 && rowNum <= data.length) {
      sh.getRange(rowNum, 1, 1, row.length).setValues([row]);
      return {success:true, action:'updated'};
    }
    sh.appendRow(row);
    return {success:true, action:'created'};
  } catch(err) { return {success:false, error:err.toString()}; }
}

function deleteShiprocket(p) {
  try {
    var sh = getShipSheet();
    var rowNum = Number(p._row||0);
    if (rowNum > 1) { sh.deleteRow(rowNum); return {success:true}; }
    return {success:false, error:'Invalid row'};
  } catch(err) { return {success:false, error:err.toString()}; }
}

// ═══════════════════════════════════
// SELF DELIVER SHEET
// Columns: Date, Client Name, Number, Order ID, Product Name, Deliver, Remark
// ═══════════════════════════════════
function getSelfSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_SELF);
  if (!sh) {
    sh = ss.insertSheet(SHEET_SELF);
    var cols = ['Date','Client Name','Number','Order Id','Product Name','Deliver','Remark'];
    sh.getRange(1,1,1,cols.length).setValues([cols]).setFontWeight('bold').setBackground('#D97706').setFontColor('#fff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readSelfDeliver(ss) {
  var sh = getSelfSheet(ss);
  var data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i]; if (!r[0] && !r[1]) continue;
    var rowDate = r[0];
    if (rowDate instanceof Date) {
      rowDate = Utilities.formatDate(rowDate, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'dd/MM/yyyy');
    } else {
      rowDate = String(rowDate||'');
    }
    out.push({
      id:          'self_'+i,
      date:        rowDate,
      clientName:  String(r[1]||''),
      number:      String(r[2]||''),
      orderId:     String(r[3]||''),
      productName: String(r[4]||''),
      deliver:     String(r[5]||''),
      remark:      String(r[6]||''),
      _row:        i+1
    });
  }
  return out;
}

function saveSelfDeliver(p) {
  try {
    var sh = getSelfSheet();
    var data = sh.getDataRange().getValues();
    var rowNum = p._row ? Number(p._row) : 0;
    var row = [String(p.date||''), String(p.clientName||''), String(p.number||''), String(p.orderId||''), String(p.productName||''), String(p.deliver||'Self'), String(p.remark||'')];
    if (rowNum > 1 && rowNum <= data.length) {
      sh.getRange(rowNum, 1, 1, row.length).setValues([row]);
      return {success:true, action:'updated'};
    }
    sh.appendRow(row);
    return {success:true, action:'created'};
  } catch(err) { return {success:false, error:err.toString()}; }
}

function deleteSelfDeliver(p) {
  try {
    var sh = getSelfSheet();
    var rowNum = Number(p._row||0);
    if (rowNum > 1) { sh.deleteRow(rowNum); return {success:true}; }
    return {success:false, error:'Invalid row'};
  } catch(err) { return {success:false, error:err.toString()}; }
}

// ═══════════════════════════════════
// SETUP & MENU
// ═══════════════════════════════════
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  getInvSheet(ss); getRTOSheet(ss); getKhataSheet(ss);
  getCOSheet(ss); getCargoSheet(ss); getShipSheet(ss); getSelfSheet(ss); getPurchaseSheet(ss); getUsersSheet(ss); getSectionsMetaSheet(ss); getRelationsSheet(ss);
  Logger.log('Setup complete!');
}

function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getHandlerFunction() === 'sendCustomOrderReadyAlerts') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendCustomOrderReadyAlerts').timeBased().everyDays(1).atHour(8).create();
  Logger.log('Daily trigger set for 8 AM');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Handicraft Bazaar')
    .addItem('Setup Sheets', 'setupSheets')
    .addItem('Setup Daily Trigger', 'setupDailyTrigger')
    .addItem('Test Connection', 'testScript')
    .addToUi();
}

function testScript() {
  var d = getAdminAll();
  Logger.log('Products: '+d.products.length+' | RTOs: '+d.rtos.length+' | Custom Orders: '+d.customOrders.length+' | Cargo: '+d.cargo.length+' | Shiprocket: '+d.shiprocket.length+' | Self Deliver: '+d.selfDeliver.length+' | Purchase: '+d.purchase.length);
}

// ═══════════════════════════════════════════════
// PURCHASE SHEET
// Columns: id, date, prodName, category, color,
//          size, vendorName, qty, damage, createdAt
// ═══════════════════════════════════════════════
var SHEET_PURCHASE = 'Purchase';

function getPurchaseSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_PURCHASE);
  if (!sh) {
    sh = ss.insertSheet(SHEET_PURCHASE);
    var cols = ['id','date','prodName','category','color','size','vendorName','qty','damage','createdAt'];
    sh.getRange(1,1,1,cols.length).setValues([cols])
      .setFontWeight('bold')
      .setBackground('#B8720A')
      .setFontColor('#fff')
      .setFontSize(11);
    sh.setFrozenRows(1);
    [160,120,200,120,120,120,160,80,100,170].forEach(function(w,i){
      sh.setColumnWidth(i+1,w);
    });
  }
  return sh;
}

function readPurchase(ss) {
  var sh = getPurchaseSheet(ss);
  var data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    out.push({
      id:         String(r[0]||''),
      date:       String(r[1]||''),
      prodName:   String(r[2]||''),
      category:   String(r[3]||''),
      color:      String(r[4]||''),
      size:       String(r[5]||''),
      vendorName: String(r[6]||''),
      qty:        Number(r[7])||0,
      damage:     Number(r[8])||0,
      createdAt:  String(r[9]||'')
    });
  }
  return out;
}

function savePurchase(p) {
  var sh = getPurchaseSheet();
  var data = sh.getDataRange().getValues();
  var id = String(p.id || Date.now());
  var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  var now = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy, HH:mm:ss');

  var row = [
    id,
    String(p.date       || ''),
    String(p.prodName   || ''),
    String(p.category   || ''),
    String(p.color      || ''),
    String(p.size       || ''),
    String(p.vendorName || ''),
    Number(p.qty)    || 0,
    Number(p.damage) || 0,
    now
  ];

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sh.getRange(i+1, 1, 1, row.length).setValues([row]);
      return { success: true, action: 'updated' };
    }
  }
  sh.appendRow(row);
  return { success: true, action: 'created' };
}

function deletePurchase(p) {
  var sh = getPurchaseSheet();
  var data = sh.getDataRange().getValues();
  var id = String(p.id || '');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sh.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Not found' };
}

// ═══════════════════════════════════════════════
// USERS SHEET (custom restricted admin users)
// Columns: id, email, name, permissions(JSON), createdAt
// ═══════════════════════════════════════════════
var SHEET_USERS = 'Users';

function getUsersSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_USERS);
  if (!sh) {
    sh = ss.insertSheet(SHEET_USERS);
    var cols = ['id','email','name','permissions','createdAt'];
    sh.getRange(1,1,1,cols.length).setValues([cols])
      .setFontWeight('bold')
      .setBackground('#4C1D95')
      .setFontColor('#fff')
      .setFontSize(11);
    sh.setFrozenRows(1);
    [160,220,160,320,170].forEach(function(w,i){
      sh.setColumnWidth(i+1,w);
    });
  }
  return sh;
}

function readUsers(ss) {
  var sh = getUsersSheet(ss);
  var data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    var perms = {};
    try { perms = JSON.parse(String(r[3] || '{}')); } catch(e) { perms = {}; }
    out.push({
      id:          String(r[0]||''),
      email:       String(r[1]||'').toLowerCase().trim(),
      name:        String(r[2]||''),
      permissions: perms,
      createdAt:   String(r[4]||'')
    });
  }
  return out;
}

function saveUser(p) {
  var sh = getUsersSheet();
  var data = sh.getDataRange().getValues();
  var id = String(p.id || Date.now());
  var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  var now = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy, HH:mm:ss');
  var email = String(p.email || '').toLowerCase().trim();
  var name = String(p.name || '');
  var permissions = String(p.permissions || '{}');

  if (!email) return { success: false, error: 'Email required' };

  // prevent duplicate emails (except when editing same id)
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() === email && String(data[i][0]) !== id) {
      return { success: false, error: 'A user with this email already exists' };
    }
  }

  var row = [id, email, name, permissions, now];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sh.getRange(i+1, 1, 1, row.length).setValues([row]);
      return { success: true, action: 'updated' };
    }
  }
  sh.appendRow(row);
  return { success: true, action: 'created' };
}

function deleteUser(p) {
  var sh = getUsersSheet();
  var data = sh.getDataRange().getValues();
  var id = String(p.id || '');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sh.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Not found' };
}

// Check if an email is a registered restricted user; returns user object or null
function findUserByEmail(email) {
  email = String(email || '').toLowerCase().trim();
  var users = readUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].email === email) return users[i];
  }
  return null;
}
// ═══════════════════════════════════════════════════════════
// DYNAMIC SECTIONS SYSTEM
// Meta sheet: "Sections" — stores section definitions
// Columns: id, name, sheetName, icon, columns(JSON), createdAt
// Each dynamic section gets its own sheet with columns as defined
// ═══════════════════════════════════════════════════════════
var SHEET_SECTIONS = 'Sections';

function getSectionsMetaSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_SECTIONS);
  if (!sh) {
    sh = ss.insertSheet(SHEET_SECTIONS);
    var cols = ['id','name','sheetName','icon','columns','createdAt'];
    sh.getRange(1,1,1,cols.length).setValues([cols])
      .setFontWeight('bold').setBackground('#0E3D72').setFontColor('#fff').setFontSize(11);
    sh.setFrozenRows(1);
    [140,160,160,60,400,170].forEach(function(w,i){ sh.setColumnWidth(i+1,w); });
  }
  return sh;
}

function readSectionsMeta(ss) {
  var sh = getSectionsMetaSheet(ss);
  var data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i]; if (!r[0]) continue;
    var cols = [];
    try { cols = JSON.parse(String(r[4]||'[]')); } catch(e) { cols = []; }
    out.push({ id:String(r[0]), name:String(r[1]), sheetName:String(r[2]),
               icon:String(r[3]||'📄'), columns:cols, createdAt:String(r[5]||'') });
  }
  return out;
}

function saveSection(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var metaSh = getSectionsMetaSheet(ss);
  var data = metaSh.getDataRange().getValues();
  var id = String(p.id || Date.now());
  var name = String(p.name || '').trim();
  var icon = String(p.icon || '📄').trim();
  var columnsJson = String(p.columns || '[]');
  var tz = ss.getSpreadsheetTimeZone();
  var now = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy, HH:mm:ss');

  if (!name) return { success: false, error: 'Section name required' };

  // Safe sheet name: strip special chars, max 50 chars, prefix DS_ to avoid conflicts
  var sheetName = 'DS_' + name.replace(/[^a-zA-Z0-9 _]/g,'').trim().replace(/\s+/g,'_').slice(0,47);

  // Parse columns
  var columns = [];
  try { columns = JSON.parse(columnsJson); } catch(e) { columns = []; }

  // Check if new or edit
  var isNew = true;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      // Update meta row
      metaSh.getRange(i+1,1,1,6).setValues([[id,name,sheetName,icon,columnsJson,data[i][5]]]);
      isNew = false; break;
    }
  }
  if (isNew) {
    metaSh.appendRow([id, name, sheetName, icon, columnsJson, now]);
    // Create the actual sheet with columns as headers
    var existing = ss.getSheetByName(sheetName);
    if (!existing) {
      var newSh = ss.insertSheet(sheetName);
      var headers = ['id'].concat(columns.map(function(c){return c.label;})).concat(['createdAt']);
      newSh.getRange(1,1,1,headers.length).setValues([headers])
        .setFontWeight('bold').setBackground('#1A5FAD').setFontColor('#fff').setFontSize(11);
      newSh.setFrozenRows(1);
    }
  }
  return { success: true, action: isNew?'created':'updated', id: id, sheetName: sheetName };
}

function deleteSection(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var metaSh = getSectionsMetaSheet(ss);
  var data = metaSh.getDataRange().getValues();
  var id = String(p.id || '');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      var sheetName = String(data[i][2]);
      // Delete the actual data sheet
      if (p.deleteSheet === 'true' || p.deleteSheet === true) {
        var sh = ss.getSheetByName(sheetName);
        if (sh) ss.deleteSheet(sh);
      }
      metaSh.deleteRow(i+1);
      return { success: true };
    }
  }
  return { success: false, error: 'Not found' };
}

// Read records from a dynamic section sheet
function readDynamicSection(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = String(p.sheetName || '');
  if (!sheetName) return { success:false, error:'sheetName required' };
  var sh = ss.getSheetByName(sheetName);
  if (!sh) return { success:true, records:[], headers:[] };
  var data = sh.getDataRange().getValues();
  if (data.length <= 1) return { success:true, records:[], headers: data[0]||[] };
  var headers = data[0];
  var records = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i]; if (!r[0]) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) { obj[String(headers[j])] = String(r[j]||''); }
    records.push(obj);
  }
  return { success:true, records:records, headers:headers };
}

// Save a record to a dynamic section sheet
function saveDynamicRecord(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = String(p.sheetName || '');
  if (!sheetName) return { success:false, error:'sheetName required' };
  var sh = ss.getSheetByName(sheetName);
  if (!sh) return { success:false, error:'Sheet not found: '+sheetName };
  var data = sh.getDataRange().getValues();
  var headers = data[0] || [];
  var tz = ss.getSpreadsheetTimeZone();
  var now = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy, HH:mm:ss');
  var id = String(p.id || Date.now());
  var recordJson = String(p.record || '{}');
  var record = {};
  try { record = JSON.parse(recordJson); } catch(e) { record = {}; }

  // Build row in header order
  var row = headers.map(function(h) {
    if (String(h) === 'id') return id;
    if (String(h) === 'createdAt') return now;
    return String(record[String(h)] || '');
  });

  // Update if exists
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sh.getRange(i+1, 1, 1, row.length).setValues([row]);
      return { success:true, action:'updated', id:id };
    }
  }
  sh.appendRow(row);
  return { success:true, action:'created', id:id };
}

// Delete a record from a dynamic section sheet
function deleteDynamicRecord(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = String(p.sheetName || '');
  var id = String(p.id || '');
  if (!sheetName || !id) return { success:false, error:'sheetName and id required' };
  var sh = ss.getSheetByName(sheetName);
  if (!sh) return { success:false, error:'Sheet not found' };
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) { sh.deleteRow(i+1); return { success:true }; }
  }
  return { success:false, error:'Record not found' };
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE RELATIONS SYSTEM (optional, admin-controlled, additive only)
// Does NOT modify any existing sheet, module, or workflow.
// Existing modules remain fully independent unless admin explicitly
// creates a relation involving them.
//
// Meta sheet: "Relations"
// Columns: RelationID, SourceModule, TargetModule, SourceField, TargetField, Active
//
// SourceModule/TargetModule values:
//   - "inventory", "rto", "custom-orders", "cargo", "shiprocket", "self-deliver", "purchase"
//     (existing modules — referenced by fixed key, sheet untouched)
//   - "dyn_<sectionId>" (dynamic modules — referenced by their section id)
// ═══════════════════════════════════════════════════════════════════════
var SHEET_RELATIONS = 'Relations';

function getRelationsSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_RELATIONS);
  if (!sh) {
    sh = ss.insertSheet(SHEET_RELATIONS);
    var cols = ['RelationID','SourceModule','TargetModule','SourceField','TargetField','Active'];
    sh.getRange(1,1,1,cols.length).setValues([cols])
      .setFontWeight('bold').setBackground('#4C1D95').setFontColor('#fff').setFontSize(11);
    sh.setFrozenRows(1);
    [150,170,170,150,150,80].forEach(function(w,i){ sh.setColumnWidth(i+1,w); });
  }
  return sh;
}

function readRelations(ss) {
  var sh = getRelationsSheet(ss);
  var data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i]; if (!r[0]) continue;
    out.push({
      id: String(r[0]),
      sourceModule: String(r[1]||''),
      targetModule: String(r[2]||''),
      sourceField: String(r[3]||''),
      targetField: String(r[4]||''),
      active: (r[5] === true || String(r[5]).toLowerCase() === 'true')
    });
  }
  return out;
}

function saveRelation(p) {
  var sh = getRelationsSheet();
  var data = sh.getDataRange().getValues();
  var id = String(p.id || Date.now());
  var sourceModule = String(p.sourceModule || '').trim();
  var targetModule = String(p.targetModule || '').trim();
  var sourceField  = String(p.sourceField  || '').trim();
  var targetField  = String(p.targetField  || '').trim();
  var active = (p.active === false || p.active === 'false') ? false : true;

  if (!sourceModule || !targetModule || !sourceField || !targetField) {
    return { success: false, error: 'sourceModule, targetModule, sourceField and targetField are all required' };
  }

  var row = [id, sourceModule, targetModule, sourceField, targetField, active];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sh.getRange(i+1, 1, 1, row.length).setValues([row]);
      return { success: true, action: 'updated', id: id };
    }
  }
  sh.appendRow(row);
  return { success: true, action: 'created', id: id };
}

function deleteRelation(p) {
  var sh = getRelationsSheet();
  var data = sh.getDataRange().getValues();
  var id = String(p.id || '');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) { sh.deleteRow(i+1); return { success:true }; }
  }
  return { success:false, error:'Not found' };
}

// ─── Generic module data reader (used only by relation lookups) ───────
// Reads ANY module's records (existing or dynamic) into a flat array of
// plain objects, WITHOUT touching or altering that module's own read path.
// Existing modules' own functions (readRTOs, readCustomOrders, etc.) are
// reused as-is — this is purely a read-only aggregation layer.
function readModuleRecordsGeneric(moduleKey, ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  if (moduleKey.indexOf('dyn_') === 0) {
    var sectionId = moduleKey.slice(4);
    var sections = readSectionsMeta(ss);
    var sec = sections.filter(function(s){ return String(s.id) === sectionId; })[0];
    if (!sec) return [];
    var res = readDynamicSection({ sheetName: sec.sheetName });
    return res.records || [];
  }
  switch (moduleKey) {
    case 'inventory':      return readInventoryFlat(ss);
    case 'rto':            return readRTOs(ss);
    case 'custom-orders':  return readCustomOrders(ss);
    case 'cargo':          return readCargo(ss);
    case 'shiprocket':     return readShiprocket(ss);
    case 'self-deliver':   return readSelfDeliver(ss);
    case 'purchase':       return readPurchase(ss);
    default:               return [];
  }
}

// Given a source module + record id + that record's field value, find all
// matching records in the linked target module(s). Read-only, additive.
// Returns: { relations: [{relation, targetModule, matches:[...]}, ...] }
function getLinkedRecords(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceModule = String(p.sourceModule || '').trim();
  var sourceValue  = String(p.sourceValue  || '').trim();
  if (!sourceModule) return { success:false, error:'sourceModule required' };

  var allRelations = readRelations(ss).filter(function(r){
    return r.active && (r.sourceModule === sourceModule || r.targetModule === sourceModule);
  });

  if (!allRelations.length) {
    // No relation exists for this module — normal behavior, no error.
    return { success:true, relations: [] };
  }

  var output = [];
  allRelations.forEach(function(rel){
    // Determine which side is "the other module" relative to sourceModule,
    // and which field to match on.
    var otherModule, matchFieldOnOther, matchFieldOnSource;
    if (rel.sourceModule === sourceModule) {
      otherModule = rel.targetModule;
      matchFieldOnSource = rel.sourceField;
      matchFieldOnOther  = rel.targetField;
    } else {
      otherModule = rel.sourceModule;
      matchFieldOnSource = rel.targetField;
      matchFieldOnOther  = rel.sourceField;
    }

    if (!sourceValue) {
      output.push({ relationId: rel.id, targetModule: otherModule, matchField: matchFieldOnOther, matches: [] });
      return;
    }

    var otherRecords = readModuleRecordsGeneric(otherModule, ss);
    var matches = otherRecords.filter(function(rec){
      var val = rec[matchFieldOnOther];
      return val !== undefined && String(val).trim().toLowerCase() === sourceValue.toLowerCase();
    });

    output.push({ relationId: rel.id, targetModule: otherModule, matchField: matchFieldOnOther, matches: matches });
  });

  return { success: true, relations: output };
}

// List of all module keys + display labels usable in the Relation Manager UI
// (existing modules are listed by their fixed key; dynamic modules are
// pulled from the live Sections meta sheet — nothing hardcoded beyond labels)
function listAllModulesForRelations() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var existing = [
    { key:'inventory',     label:'📦 Inventory' },
    { key:'rto',           label:'🔁 RTO & Return' },
    { key:'custom-orders', label:'📋 Custom Orders' },
    { key:'cargo',         label:'🚚 Cargo Complaint' },
    { key:'shiprocket',    label:'🚀 Shiprocket' },
    { key:'self-deliver',  label:'🏍️ Self Deliver' },
    { key:'purchase',      label:'🛒 Purchase' }
  ];
  var dynamic = readSectionsMeta(ss).map(function(s){
    return { key:'dyn_'+s.id, label:(s.icon||'📄')+' '+s.name, columns: s.columns };
  });
  return existing.concat(dynamic);
}