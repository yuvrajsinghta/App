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

// ─── ENTRY POINT ──────────────────────────────────────────────────────
function doGet(e) {
  try {
    var p = e.parameter || {};
    var action = String(p.action || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    var result;

    if      (action === 'sendOTP')              result = sendOTP(p);
    else if (action === 'getAll')               result = getAllData();
    else if (action === 'getAdminAll')          result = getAdminAll();
    else if (action === 'saveVariant')          result = saveVariant(p);
    else if (action === 'deleteVariant')        result = deleteVariant(p);
    else if (action === 'saveRTO')              result = saveRTO(p);
    else if (action === 'deleteRTO')            result = deleteRTO(p);
    else if (action === 'addKhata')             result = addKhata(p);
    else if (action === 'saveCustomOrder')      result = saveCustomOrder(p);
    else if (action === 'deleteCustomOrder')    result = deleteCustomOrder(p);
    else if (action === 'saveCargo')            result = saveCargo(p);
    else if (action === 'deleteCargo')          result = deleteCargo(p);
    else if (action === 'saveShiprocket')       result = saveShiprocket(p);
    else if (action === 'deleteShiprocket')     result = deleteShiprocket(p);
    else if (action === 'saveSelfDeliver')      result = saveSelfDeliver(p);
    else if (action === 'deleteSelfDeliver')    result = deleteSelfDeliver(p);
    else if (action === 'savePurchase')         result = savePurchase(p);
    else if (action === 'deletePurchase')       result = deletePurchase(p);
    else if (action === 'getUsers')             result = { users: readUsers() };
    else if (action === 'saveUser')             result = saveUser(p);
    else if (action === 'deleteUser')           result = deleteUser(p);
    else if (action === 'checkUser')            result = checkUserEmail(p);
    else                                        result = { error: 'Unknown action: ' + action };

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
    var result;

    if      (action === 'sendOTP')              result = sendOTP(data);
    else if (action === 'getAll')               result = getAllData();
    else if (action === 'getAdminAll')          result = getAdminAll();
    else if (action === 'saveVariant')          result = saveVariant(data);
    else if (action === 'deleteVariant')        result = deleteVariant(data);
    else if (action === 'saveRTO')              result = saveRTO(data);
    else if (action === 'deleteRTO')            result = deleteRTO(data);
    else if (action === 'addKhata')             result = addKhata(data);
    else if (action === 'saveCustomOrder')      result = saveCustomOrder(data);
    else if (action === 'deleteCustomOrder')    result = deleteCustomOrder(data);
    else if (action === 'saveCargo')            result = saveCargo(data);
    else if (action === 'deleteCargo')          result = deleteCargo(data);
    else if (action === 'saveShiprocket')       result = saveShiprocket(data);
    else if (action === 'deleteShiprocket')     result = deleteShiprocket(data);
    else if (action === 'saveSelfDeliver')      result = saveSelfDeliver(data);
    else if (action === 'deleteSelfDeliver')    result = deleteSelfDeliver(data);
    else if (action === 'savePurchase')         result = savePurchase(data);
    else if (action === 'deletePurchase')       result = deletePurchase(data);
    else if (action === 'getUsers')             result = { users: readUsers() };
    else if (action === 'saveUser')             result = saveUser(data);
    else if (action === 'deleteUser')           result = deleteUser(data);
    else if (action === 'checkUser')            result = checkUserEmail(data);
    else                                        result = { error: 'Unknown action: ' + action };

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
    PROPS.setProperty('CURRENT_OTP', otp);
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
    ALERT_EMAILS.forEach(function(email) {
      MailApp.sendEmail({ to: email, subject: subject, body: body, htmlBody: htmlBody });
    });

    // If a restricted user is logging in, also send OTP to their own email
    var loginEmail = String(p.email || '').toLowerCase().trim();
    var isAlertEmail = ALERT_EMAILS.some(function(ae){ return ae.toLowerCase()===loginEmail; });
    if (loginEmail && !isAlertEmail) {
      try {
        MailApp.sendEmail({ to: loginEmail, subject: subject, body: body, htmlBody: htmlBody });
      } catch(e) { Logger.log('OTP to user email failed: '+e); }
    }

    return { success: true, otp: otp };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// Check if email is a valid restricted user; returns user data + permissions
function checkUserEmail(p) {
  var email = String(p.email || '').toLowerCase().trim();
  var user = findUserByEmail(email);
  if (!user) return { found: false };
  return { found: true, id: user.id, name: user.name, email: user.email, permissions: user.permissions };
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
// GET ADMIN ALL — Admin User
// ═══════════════════════════════════
function getAdminAll() {
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

  return {
    products: products,
    rtos: readRTOs(ss),
    customOrders: readCustomOrders(ss),
    cargo: readCargo(ss),
    shiprocket: readShiprocket(ss),
    selfDeliver: readSelfDeliver(ss),
    purchase: readPurchase(ss),
    users: readUsers(ss)
  };
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
  getCOSheet(ss); getCargoSheet(ss); getShipSheet(ss); getSelfSheet(ss); getPurchaseSheet(ss); getUsersSheet(ss);
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