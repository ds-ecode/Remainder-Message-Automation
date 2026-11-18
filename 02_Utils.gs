/**
 * ============================================================================
 * 02_Utils.gs
 * Shared utility functions for phone normalization, date parsing, data
 * extraction, and PII-safe operational logging.
 * ============================================================================
 */

var Utils = (function () {
  /**
   * Normalizes a raw phone number string into pure digits with country code prefix.
   *
   * @param {string|number} rawPhone - Raw phone input from spreadsheet cell.
   * @return {string} Normalized 12-digit phone string (e.g., "919876543210") or empty string.
   */
  function normalizePhoneNumber(rawPhone) {
    if (!rawPhone) return "";
    var digits = String(rawPhone).replace(/\D/g, "");
    var prefix = CONFIG.BUSINESS_RULES.COUNTRY_CODE_PREFIX;

    if (digits.length === 10) {
      return prefix + digits;
    }
    if (digits.length === 12 && digits.indexOf(prefix) === 0) {
      return digits;
    }
    return digits.length >= 10 ? digits : "";
  }

  /**
   * Strips the leading country code to yield a 10-digit local mobile number
   * required by local SMS gateways such as MacroDroid.
   *
   * @param {string} normalizedPhone - Standardized phone number string.
   * @return {string} 10-digit local phone number.
   */
  function toLocalTenDigitPhone(normalizedPhone) {
    var prefix = CONFIG.BUSINESS_RULES.COUNTRY_CODE_PREFIX;
    if (normalizedPhone.length === 12 && normalizedPhone.indexOf(prefix) === 0) {
      return normalizedPhone.substring(prefix.length);
    }
    return normalizedPhone;
  }

  /**
   * Parses First Unpaid Premium (FUP) values from Date objects, MM/YYYY, or DD/MM/YYYY strings.
   *
   * @param {Date|string} fupVal - Raw cell value representing the FUP date.
   * @return {Date|null} Parsed Date object normalized to midnight, or null if invalid.
   */
  function parseFupDate(fupVal) {
    if (!fupVal) return null;
    if (fupVal instanceof Date) return fupVal;

    var fupStr = String(fupVal).trim();
    var parts = fupStr.split(/[\/\.-]/);

    if (parts.length === 2) {
      return new Date(parseInt(parts[1], 10), parseInt(parts[0], 10) - 1, 1);
    }
    if (parts.length === 3) {
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }

    var parsed = new Date(fupStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Extracts and title-cases a client's first name for personalized greetings.
   *
   * @param {string} fullName - Full client name from the policy ledger.
   * @return {string} Formatted first name or "Customer" fallback.
   */
  function extractFirstName(fullName) {
    var firstToken = String(fullName || "").trim().split(/\s+/)[0];
    if (!firstToken) return "Customer";
    return firstToken.charAt(0).toUpperCase() + firstToken.slice(1).toLowerCase();
  }

  /**
   * Resolves the active monthly worksheet tab (e.g., "Nov_2026") with fallback.
   *
   * @param {string} [overrideTabName] - Optional explicit tab name.
   * @return {GoogleAppsScript.Spreadsheet.Sheet} Resolved Google Sheet instance.
   */
  function getTargetSheet(overrideTabName) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (overrideTabName) {
      return ss.getSheetByName(overrideTabName) || ss.getActiveSheet();
    }

    var now = new Date();
    var months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var dynamicTabName = months[now.getMonth() + 1] + "_" + now.getFullYear();

    return ss.getSheetByName(dynamicTabName) ||
           ss.getSheetByName(CONFIG.SPREADSHEET.DEFAULT_TAB_NAME) ||
           ss.getActiveSheet();
  }

  /**
   * Checks whether a given payment mode belongs to an automated/monthly collection cycle.
   *
   * @param {string} mode - Policy payment mode code (e.g., "MLY", "NACH", "YLY").
   * @return {boolean} True if monthly/auto-debit mode.
   */
  function isMonthlyPaymentMode(mode) {
    var normalized = String(mode || "").trim().toUpperCase();
    return CONFIG.BUSINESS_RULES.MONTHLY_MODES.indexOf(normalized) !== -1;
  }

  return {
    normalizePhoneNumber: normalizePhoneNumber,
    toLocalTenDigitPhone: toLocalTenDigitPhone,
    parseFupDate: parseFupDate,
    extractFirstName: extractFirstName,
    getTargetSheet: getTargetSheet,
    isMonthlyPaymentMode: isMonthlyPaymentMode
  };
})();
