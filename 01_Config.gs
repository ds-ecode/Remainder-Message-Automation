/**
 * ============================================================================
 * 01_Config.gs
 * Centralized configuration and environment constants for the LIC Reminder
 * & Multi-Channel Dispatch Engine.
 *
 * SETUP INSTRUCTIONS:
 * Replace all placeholder strings below with your production credentials
 * (or bind them via PropertiesService.getScriptProperties() for added security).
 * ============================================================================
 */

var CONFIG = Object.freeze({
  GATEWAYS: {
    MACRODROID_WEBHOOK_URL: "YOUR_MACRODROID_WEBHOOK_URL",
    META_WHATSAPP: {
      API_VERSION: "v18.0",
      PHONE_NUMBER_ID: "YOUR_META_PHONE_NUMBER_ID",
      ACCESS_TOKEN: "YOUR_META_PERMANENT_ACCESS_TOKEN",
      LANGUAGE_CODE: "en",
      TEMPLATES: {
        AUTO_DEBIT_SHIELD: "lic_autodebit_shield",
        RENEWAL_REMINDER: "lic_renewal_reminder"
      }
    }
  },

  SPREADSHEET: {
    DEFAULT_TAB_NAME: "Nov_2026",
    COLUMNS: {
      S_NO: 0,
      POLICY_NO: 1,
      CLIENT_NAME: 2,
      DOC: 3,
      PLAN_TERM: 4,
      MODE: 5,
      FUP: 6,
      INST_PREM: 7,
      DUE_COUNT: 8,
      GST: 9,
      TOTAL_PREM: 10,
      PHONE: 11
    }
  },

  BUSINESS_RULES: {
    COUNTRY_CODE_PREFIX: "91",
    MONTHLY_MODES: ["MLY", "SSS", "ECS", "NACH"],
    BATCH_LIMIT: 90,
    AUTO_DEBIT_WINDOW_DAYS: 7,
    ACTIVE_PAYER_WINDOW_DAYS: 30,
    RATE_LIMIT_MS: {
      HYBRID_PIPELINE: 1000,
      STANDARD_SMS_BATCH: 2500,
      MULTI_PART_SMS_BATCH: 3500
    }
  },

  SANDBOX: {
    TEST_RECIPIENT_PHONE: "910000000000"
  }
});
