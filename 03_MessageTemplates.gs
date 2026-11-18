/**
 * ============================================================================
 * 03_MessageTemplates.gs
 * Pure message formatting and payload builder module for SMS and WhatsApp.
 * ============================================================================
 */

var MessageTemplates = (function () {
  /**
   * Builds Meta WhatsApp Cloud API body parameters for standard policy reminders.
   *
   * @param {Object} policyItem - Standardized queue item containing name, policyNo, amountDue, and fupStr.
   * @return {Array<Object>} Meta template body parameter objects.
   */
  function buildWhatsAppBodyParams(policyItem) {
    return [
      { type: "text", text: String(policyItem.name) },
      { type: "text", text: String(policyItem.policyNo) },
      { type: "text", text: String(policyItem.amountDue) },
      { type: "text", text: String(policyItem.fupStr || "Upcoming") }
    ];
  }

  /**
   * Builds a polite single-policy SMS reminder for non-monthly policyholders.
   *
   * @param {string} fullName - Client's full name.
   * @param {string} policyNo - LIC policy number.
   * @param {number|string} amount - Total premium amount due.
   * @return {string} Formatted SMS string.
   */
  function buildFriendlyRenewalSms(fullName, policyNo, amount) {
    var firstName = Utils.extractFirstName(fullName);
    return "Hello " + firstName + " ji, gentle reminder regarding your LIC Policy No. " +
           policyNo + ". Premium amount of Rs." + amount + " is due.";
  }

  /**
   * Builds fallback SMS strings when WhatsApp Cloud API delivery fails or is bypassed.
   *
   * @param {string} tierKey - Tier identifier ("TIER_1", "TIER_2", or "TIER_3").
   * @param {Object} item - Policy queue item.
   * @return {string} Formatted fallback SMS message.
   */
  function buildTierFallbackSms(tierKey, item) {
    if (tierKey === "TIER_1") {
      return "LIC Notice: Policy " + item.policyNo + " Rs." + item.amountDue +
             " auto-debit due soon. Maintain bank balance.";
    }
    if (tierKey === "TIER_2") {
      return "LIC Reminder: Policy " + item.policyNo + " Rs." + item.amountDue +
             " is due. Pay online at licindia.in";
    }
    return "LIC Risk Alert: Policy " + item.policyNo + " has " + item.dueCount +
           " unpaid dues totaling Rs." + item.amountDue + ". Contact agent to prevent lapse.";
  }

  /**
   * Constructs a consolidated bilingual (English + Hindi) overdue revival alert SMS
   * supporting both single-policy and multi-policy client portfolios.
   *
   * @param {Object} client - Client portfolio object { name, phone, policies: Array<Object> }.
   * @return {string} Formatted bilingual SMS message.
   */
  function buildBilingualMultiPolicyAlert(client) {
    var policySegments = [];
    var grandTotalAmount = 0;
    var maxDueCount = 0;
    var earliestFup = client.policies[0].fup;

    for (var i = 0; i < client.policies.length; i++) {
      var p = client.policies[i];

      if (p.dues > maxDueCount) {
        maxDueCount = p.dues;
      }

      grandTotalAmount += p.totalPrem;

      if (client.policies.length === 1) {
        policySegments.push(
          "Policy #" + p.policyNo + " (FUP: " + p.fup + ", Dues: " + p.dues + ", Amount: ₹" + p.totalPrem + ")"
        );
      } else {
        policySegments.push(
          "Policy #" + p.policyNo + " [FUP: " + p.fup + ", Dues: " + p.dues + "] -> ₹" + p.totalPrem
        );
      }
    }

    var policiesFormattedString = policySegments.join(" | ");

    var englishSection = "⚠️ LIC URGENT ALERT\n\n" +
      "Dear " + client.name + ", your " + client.policies.length + " policy(ies) [" + policiesFormattedString +
      "] have pending dues (up to " + maxDueCount + " installments) starting from " + earliestFup +
      ". Estimated Total Due: ₹" + grandTotalAmount +
      ". Revive today to protect your life coverage! 🛡️📞 Please contact for immediate revival.";

    var hindiSection = client.name + ", आपकी " + client.policies.length + " पॉलिसी (" + policiesFormattedString +
      ") के प्रीमियम (FUP: " + earliestFup + ") बकाया हैं। कुल राशि: ₹" + grandTotalAmount +
      "। अपने जीवन बीमा कवर को सुरक्षित रखने के लिए आज ही रिवाइव करें! 🤝📞 रिवाइवल के लिए संपर्क करें।";

    return englishSection + "\n\n" + hindiSection;
  }

  return {
    buildWhatsAppBodyParams: buildWhatsAppBodyParams,
    buildFriendlyRenewalSms: buildFriendlyRenewalSms,
    buildTierFallbackSms: buildTierFallbackSms,
    buildBilingualMultiPolicyAlert: buildBilingualMultiPolicyAlert
  };
})();
