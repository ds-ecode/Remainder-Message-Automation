/**
 * ============================================================================
 * 04_DispatchGateways.gs
 * Transport layer encapsulating outbound HTTP calls to Meta WhatsApp Cloud API
 * and MacroDroid SMS Gateway with resilient fallback handling.
 * ============================================================================
 */

var DispatchGateways = (function () {
  /**
   * Sends a template message via the Meta WhatsApp Cloud API.
   *
   * @param {string} recipientPhone - 12-digit recipient phone with country code (no '+').
   * @param {string} templateName - Approved Meta WhatsApp template identifier.
   * @param {Array<Object>} templateParameters - Body parameter objects for template variables.
   * @return {boolean} True if accepted by Meta Graph API (HTTP 200), false otherwise.
   */
  function sendWhatsAppTemplate(recipientPhone, templateName, templateParameters) {
    var waConfig = CONFIG.GATEWAYS.META_WHATSAPP;
    var url = "https://graph.facebook.com/" + waConfig.API_VERSION + "/" +
              waConfig.PHONE_NUMBER_ID + "/messages";

    var payload = {
      messaging_product: "whatsapp",
      to: recipientPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: waConfig.LANGUAGE_CODE },
        components: [
          {
            type: "body",
            parameters: templateParameters
          }
        ]
      }
    };

    var options = {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + waConfig.ACCESS_TOKEN
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      var response = UrlFetchApp.fetch(url, options);
      var statusCode = response.getResponseCode();

      if (statusCode === 200) {
        return true;
      }

      var errorBody = JSON.parse(response.getContentText());
      Logger.log("WhatsApp API Error (HTTP " + statusCode + "): " + JSON.stringify(errorBody.error));
      return false;
    } catch (err) {
      Logger.log("WhatsApp API Transport Exception: " + err.toString());
      return false;
    }
  }

  /**
   * Dispatches an SMS via MacroDroid Webhook using URL-encoded form POST body
   * (preserves multi-line breaks, Hindi Unicode characters, and emojis safely).
   *
   * @param {string} recipientPhone - Normalized phone number string.
   * @param {string} messageText - Full SMS body text.
   * @return {boolean} True if MacroDroid returned HTTP 200, false otherwise.
   */
  function sendSmsViaMacroDroid(recipientPhone, messageText) {
    var localPhone = Utils.toLocalTenDigitPhone(recipientPhone);

    var options = {
      method: "post",
      contentType: "application/x-www-form-urlencoded",
      payload: {
        phone: localPhone,
        msg: messageText
      },
      muteHttpExceptions: true
    };

    try {
      var response = UrlFetchApp.fetch(CONFIG.GATEWAYS.MACRODROID_WEBHOOK_URL, options);
      var statusCode = response.getResponseCode();

      if (statusCode === 200) {
        return true;
      }

      Logger.log("MacroDroid Gateway Error (HTTP " + statusCode + "): " + response.getContentText());
      return false;
    } catch (err) {
      Logger.log("MacroDroid Transport Exception: " + err.toString());
      return false;
    }
  }

  /**
   * Attempts WhatsApp delivery first and automatically fails over to SMS if unsuccessful.
   *
   * @param {string} cleanPhone - Normalized 12-digit recipient phone number.
   * @param {string} waTemplateName - Meta WhatsApp template name.
   * @param {Array<Object>} waParams - Template body parameters.
   * @param {string} fallbackSmsText - SMS text to dispatch if WhatsApp fails.
   * @return {{ channel: string, success: boolean }} Delivery outcome metadata.
   */
  function sendWithSmsFallback(cleanPhone, waTemplateName, waParams, fallbackSmsText) {
    if (sendWhatsAppTemplate(cleanPhone, waTemplateName, waParams)) {
      return { channel: "WHATSAPP", success: true };
    }

    var smsSent = sendSmsViaMacroDroid(cleanPhone, fallbackSmsText);
    return { channel: "SMS_FALLBACK", success: smsSent };
  }

  return {
    sendWhatsAppTemplate: sendWhatsAppTemplate,
    sendSmsViaMacroDroid: sendSmsViaMacroDroid,
    sendWithSmsFallback: sendWithSmsFallback
  };
})();
