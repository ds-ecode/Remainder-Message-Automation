/**
 * ============================================================================
 * 05_PipelineOrchestrator.gs
 * Entry-point workflows, queue builders, and batch dispatch runners.
 *
 * AVAILABLE ENTRY POINTS:
 * 1. executeDailyHybridPipeline()    - Tiered WhatsApp + SMS fallback runner
 * 2. executeNonMonthlySmsBatch()     - Friendly SMS batch for non-monthly dues
 * 3. executeTier3MultiPolicyBatch()  - Consolidated bilingual alerts for multi-policy overdue clients
 * 4. runSandboxFormatPreview()       - Safe single-message test against sandbox phone
 * 5. runConnectivityPingTest()       - Lightweight webhook connectivity check
 * ============================================================================
 */

/**
 * Evaluates all policy rows in the active tab and classifies eligible records into
 * Tier 1 (Auto-Debit Shield), Tier 2 (Active Payer), or Tier 3 (Grace/Risk Watch).
 *
 * @return {Array<Object>} Structured action queue items.
 */
function buildDailyActionQueue() {
  var sheet = Utils.getTargetSheet();
  var data = sheet.getDataRange().getValues();
  var cols = CONFIG.SPREADSHEET.COLUMNS;

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var actionQueue = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var policyNo = String(row[cols.POLICY_NO] || "").trim();
    var clientName = String(row[cols.CLIENT_NAME] || "").trim();
    var mode = String(row[cols.MODE] || "").trim().toUpperCase();
    var fupRaw = row[cols.FUP];
    var dueCount = parseInt(row[cols.DUE_COUNT], 10) || 0;
    var totalPrem = parseFloat(row[cols.TOTAL_PREM]) || 0;
    var cleanPhone = Utils.normalizePhoneNumber(row[cols.PHONE]);

    if (!policyNo || !cleanPhone) continue;

    var fupDate = Utils.parseFupDate(fupRaw);
    if (!fupDate) continue;

    var daysLeft = Math.ceil((fupDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    var isMonthly = Utils.isMonthlyPaymentMode(mode);

    if (dueCount > 1) {
      actionQueue.push({
        tier: "TIER_3",
        policyNo: policyNo,
        name: clientName,
        phone: cleanPhone,
        mode: mode,
        fupStr: String(fupRaw).trim(),
        dueCount: dueCount,
        amountDue: totalPrem * dueCount
      });
    } else if (isMonthly && dueCount === 1 && daysLeft >= 0 && daysLeft <= CONFIG.BUSINESS_RULES.AUTO_DEBIT_WINDOW_DAYS) {
      actionQueue.push({
        tier: "TIER_1",
        policyNo: policyNo,
        name: clientName,
        phone: cleanPhone,
        mode: mode,
        fupStr: String(fupRaw).trim(),
        dueCount: dueCount,
        amountDue: totalPrem
      });
    } else if (!isMonthly && dueCount === 1 && daysLeft >= 0 && daysLeft <= CONFIG.BUSINESS_RULES.ACTIVE_PAYER_WINDOW_DAYS) {
      actionQueue.push({
        tier: "TIER_2",
        policyNo: policyNo,
        name: clientName,
        phone: cleanPhone,
        mode: mode,
        fupStr: String(fupRaw).trim(),
        dueCount: dueCount,
        amountDue: totalPrem
      });
    }
  }

  Logger.log("Action queue built from tab '" + sheet.getName() + "': " + actionQueue.length + " eligible items.");
  return actionQueue;
}

/**
 * WORKFLOW 1: Executes the daily hybrid communication pipeline.
 * Routes Tier 1 & Tier 2 via WhatsApp Cloud API (with automatic SMS fallback)
 * and Tier 3 directly via SMS.
 *
 * @return {void}
 */
function executeDailyHybridPipeline() {
  var queue = buildDailyActionQueue();
  var templates = CONFIG.GATEWAYS.META_WHATSAPP.TEMPLATES;
  var stats = { whatsapp: 0, sms: 0, failed: 0 };

  Logger.log("Starting Daily Hybrid Pipeline (" + queue.length + " queued items).");

  for (var i = 0; i < queue.length; i++) {
    var item = queue[i];
    var waParams = MessageTemplates.buildWhatsAppBodyParams(item);
    var fallbackSms = MessageTemplates.buildTierFallbackSms(item.tier, item);

    if (item.tier === "TIER_1" || item.tier === "TIER_2") {
      var templateName = (item.tier === "TIER_1") ? templates.AUTO_DEBIT_SHIELD : templates.RENEWAL_REMINDER;
      var result = DispatchGateways.sendWithSmsFallback(item.phone, templateName, waParams, fallbackSms);

      if (result.success) {
        if (result.channel === "WHATSAPP") stats.whatsapp++;
        else stats.sms++;
      } else {
        stats.failed++;
      }
    } else if (item.tier === "TIER_3") {
      if (DispatchGateways.sendSmsViaMacroDroid(item.phone, fallbackSms)) {
        stats.sms++;
      } else {
        stats.failed++;
      }
    }

    Utilities.sleep(CONFIG.BUSINESS_RULES.RATE_LIMIT_MS.HYBRID_PIPELINE);
  }

  Logger.log("Daily Hybrid Pipeline complete. WhatsApp: " + stats.whatsapp + " | SMS: " + stats.sms + " | Failed: " + stats.failed);
}

/**
 * WORKFLOW 2: Dispatches single-policy friendly SMS reminders to eligible
 * non-monthly policyholders (1-2 dues) up to CONFIG.BUSINESS_RULES.BATCH_LIMIT.
 *
 * @return {void}
 */
function executeNonMonthlySmsBatch() {
  var sheet = Utils.getTargetSheet(CONFIG.SPREADSHEET.DEFAULT_TAB_NAME);
  var data = sheet.getDataRange().getValues();
  var cols = CONFIG.SPREADSHEET.COLUMNS;
  var limit = CONFIG.BUSINESS_RULES.BATCH_LIMIT;

  var sentCount = 0;
  var skippedCount = 0;

  Logger.log("Starting Non-Monthly SMS Batch on tab '" + sheet.getName() + "' (Limit: " + limit + ").");

  for (var i = 1; i < data.length && sentCount < limit; i++) {
    var row = data[i];
    var policyNo = String(row[cols.POLICY_NO] || "").trim();
    var clientName = String(row[cols.CLIENT_NAME] || "").trim();
    var mode = String(row[cols.MODE] || "").trim();
    var dueCount = parseInt(row[cols.DUE_COUNT], 10) || 0;
    var totalPrem = row[cols.TOTAL_PREM];

    if (Utils.isMonthlyPaymentMode(mode)) continue;
    if (dueCount <= 0 || dueCount > 2) continue;

    var cleanPhone = Utils.normalizePhoneNumber(row[cols.PHONE]);
    if (!cleanPhone) {
      skippedCount++;
      continue;
    }

    var smsText = MessageTemplates.buildFriendlyRenewalSms(clientName, policyNo, totalPrem);
    if (DispatchGateways.sendSmsViaMacroDroid(cleanPhone, smsText)) {
      sentCount++;
      Utilities.sleep(CONFIG.BUSINESS_RULES.RATE_LIMIT_MS.STANDARD_SMS_BATCH);
    } else {
      Logger.log("Delivery failed at sheet row " + (i + 1) + ".");
    }
  }

  Logger.log("Non-Monthly SMS Batch complete. Sent: " + sentCount + " | Skipped (invalid phone): " + skippedCount);
}

/**
 * WORKFLOW 3: Groups overdue policies (Due >= 2) by mobile number and dispatches
 * a consolidated bilingual (English + Hindi) alert to multi-policy clients (> 1 policy).
 *
 * @return {void}
 */
function executeTier3MultiPolicyBatch() {
  var sheet = Utils.getTargetSheet(CONFIG.SPREADSHEET.DEFAULT_TAB_NAME);
  var data = sheet.getDataRange().getValues();
  var cols = CONFIG.SPREADSHEET.COLUMNS;

  var clientMap = {};
  var sentCount = 0;
  var skippedSinglePolicy = 0;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var policyNo = String(row[cols.POLICY_NO] || "").trim();
    var fullName = String(row[cols.CLIENT_NAME] || "").trim();
    var fupStr = String(row[cols.FUP] || "").trim();
    var dueCount = parseInt(row[cols.DUE_COUNT], 10) || 0;
    var totalPrem = parseFloat(row[cols.TOTAL_PREM]) || 0;

    if (dueCount < 2 || !policyNo) continue;

    var cleanPhone = Utils.normalizePhoneNumber(row[cols.PHONE]);
    if (!cleanPhone) continue;

    if (!clientMap[cleanPhone]) {
      clientMap[cleanPhone] = {
        name: fullName,
        phone: cleanPhone,
        policies: []
      };
    }

    clientMap[cleanPhone].policies.push({
      policyNo: policyNo,
      fup: fupStr,
      totalPrem: totalPrem,
      dues: dueCount
    });
  }

  Logger.log("Dispatching Tier 3 Multi-Policy SMS alerts.");

  for (var phone in clientMap) {
    if (!clientMap.hasOwnProperty(phone)) continue;
    var client = clientMap[phone];

    if (client.policies.length <= 1) {
      skippedSinglePolicy++;
      continue;
    }

    var smsText = MessageTemplates.buildBilingualMultiPolicyAlert(client);
    if (DispatchGateways.sendSmsViaMacroDroid(client.phone, smsText)) {
      sentCount++;
      Utilities.sleep(CONFIG.BUSINESS_RULES.RATE_LIMIT_MS.MULTI_PART_SMS_BATCH);
    } else {
      Logger.log("Tier 3 multi-policy delivery failed for an entry.");
    }
  }

  Logger.log("Tier 3 Multi-Policy Batch complete. Dispatched: " + sentCount + " | Single-policy skipped: " + skippedSinglePolicy);
}

/**
 * SANDBOX TEST 1: Selects a sample multi-policy record from the active sheet
 * and sends a formatted bilingual message to CONFIG.SANDBOX.TEST_RECIPIENT_PHONE.
 *
 * @return {void}
 */
function runSandboxFormatPreview() {
  var sheet = Utils.getTargetSheet(CONFIG.SPREADSHEET.DEFAULT_TAB_NAME);
  var data = sheet.getDataRange().getValues();
  var cols = CONFIG.SPREADSHEET.COLUMNS;

  var clientMap = {};
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var policyNo = String(row[cols.POLICY_NO] || "").trim();
    var fullName = String(row[cols.CLIENT_NAME] || "").trim();
    var fupStr = String(row[cols.FUP] || "").trim();
    var dueCount = parseInt(row[cols.DUE_COUNT], 10) || 0;
    var totalPrem = parseFloat(row[cols.TOTAL_PREM]) || 0;

    if (dueCount <= 0 || !policyNo) continue;

    var key = fullName.toLowerCase();
    if (!clientMap[key]) {
      clientMap[key] = {
        name: fullName,
        phone: CONFIG.SANDBOX.TEST_RECIPIENT_PHONE,
        policies: []
      };
    }

    clientMap[key].policies.push({
      policyNo: policyNo,
      fup: fupStr,
      totalPrem: totalPrem,
      dues: dueCount
    });
  }

  var targetClient = null;
  for (var k in clientMap) {
    if (clientMap[k].policies.length > 1) {
      targetClient = clientMap[k];
      break;
    }
  }

  if (!targetClient) {
    for (var fallbackKey in clientMap) {
      targetClient = clientMap[fallbackKey];
      break;
    }
  }

  if (!targetClient) {
    Logger.log("Sandbox Preview aborted: No eligible records found in sheet.");
    return;
  }

  var messageText = MessageTemplates.buildBilingualMultiPolicyAlert(targetClient);
  var success = DispatchGateways.sendSmsViaMacroDroid(CONFIG.SANDBOX.TEST_RECIPIENT_PHONE, messageText);
  Logger.log("Sandbox Format Preview dispatch result: " + (success ? "SUCCESS" : "FAILED"));
}

/**
 * SANDBOX TEST 2: Fires a minimal connectivity ping to verify the MacroDroid webhook.
 *
 * @return {void}
 */
function runConnectivityPingTest() {
  var testMsg = "LIC Reminder Engine Ping: " + new Date().toLocaleTimeString();
  var success = DispatchGateways.sendSmsViaMacroDroid(CONFIG.SANDBOX.TEST_RECIPIENT_PHONE, testMsg);
  Logger.log("Connectivity ping result: " + (success ? "HTTP 200 OK" : "FAILED"));
}
