# 🛡️ LIC Multi-Channel Policy Reminder & Dispatch Engine

[![Google Apps Script](https://img.shields.io/badge/Platform-Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://developers.google.com/apps-script)
[![JavaScript](https://img.shields.io/badge/Language-ES6%20JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **An enterprise-grade, zero-dependency CRM and automated communication pipeline built on Google Sheets and Google Apps Script.** Designed specifically for insurance agents and financial advisors to automate client lifecycle alerts, WhatsApp template notifications, and multi-policy SMS reminders with failover protection.

---

## 📑 Table of Contents

1. [🌟 Overview](#-overview)
2. [📂 Modular Architecture](#-modular-architecture)
3. [✨ Key Features & Tiered Logic](#-key-features--tiered-logic)
4. [📊 Spreadsheet Schema Expectations](#-spreadsheet-schema-expectations)
5. [⚙️ Installation & Setup Guide](#️-installation--setup-guide)
6. [🚀 Execution Workflows & Triggers](#-execution-workflows--triggers)
7. [🧪 Sandbox & Testing Tools](#-sandbox--testing-tools)
8. [🔒 Security & PII Compliance](#-security--pii-compliance)
9. [🤝 Contributing & License](#-contributing--license)

---

## 🌟 Overview

Managing insurance policy renewals and First Unpaid Premium (FUP) dates at scale can quickly become overwhelming. This engine reads directly from your active Google Sheet monthly tracker (`Nov_2026`, `Dec_2026`, etc.), intelligently categorizes policies into tiered urgency buckets, and dispatches multi-channel notifications through **Meta's WhatsApp Cloud API** with automated **MacroDroid SMS Fallback**, or direct bilingual SMS alerts for high-risk overdue policies.

---

## 📂 Modular Architecture

Google Apps Script shares a global runtime namespace across all `.gs` files in the same project. To maintain clean separation of concerns and open-source readability, the codebase is structured into **5 decoupled modules**:

```text
📦 lic-reminder-engine/
 ┣ 📜 01_Config.gs               # Centralized configuration constants, API endpoints & rules
 ┣ 📜 02_Utils.gs                # Phone normalization, date parsing & sheet helpers
 ┣ 📜 03_MessageTemplates.gs     # Bilingual (En+Hi) message builders & WhatsApp templates
 ┣ 📜 04_DispatchGateways.gs     # HTTP transport layers (Meta WhatsApp & MacroDroid SMS)
 ┗ 📜 05_PipelineOrchestrator.gs # Queue builders, tier classifiers & workflow runners
```

### Module Breakdown
* **`01_Config.gs`**: Holds global configurations, gateway URLs, API versions, column indices, and rate-limiting rules.
* **`02_Utils.gs`**: Handles phone number normalization (`91...`), local 10-digit conversion, FUP date parsing, and sheet resolution.
* **`03_MessageTemplates.gs`**: Pure formatting module that builds WhatsApp parameter payloads, friendly reminders, and consolidated bilingual (English + Hindi) multi-policy alerts with emojis.
* **`04_DispatchGateways.gs`**: Manages outbound HTTP requests via `UrlFetchApp` for Meta WhatsApp and MacroDroid with automatic failover handling.
* **`05_PipelineOrchestrator.gs`**: Contains the main entry points, queue classifiers (Tiers 1, 2, and 3), batch dispatch runners, and sandbox test utilities.

---

## ✨ Key Features & Tiered Logic

* 🔄 **Smart Hybrid Dispatcher**: Automatically attempts delivery via official Meta WhatsApp Cloud API templates. If WhatsApp delivery fails, it instantly falls back to your local SMS gateway.
* 🎯 **Tiered Urgency Classification**:
  * **Tier 1 (Auto-Debit Shield)**: Targets monthly/NACH/ECS policies with an upcoming FUP in `0–7 days` to verify bank balances.
  * **Tier 2 (Active Payer Pipeline)**: Targets quarterly/half-yearly/yearly policies nearing maturity (`0–30 days`).
  * **Tier 3 (Grace & Risk Watch)**: Identifies policies with $\ge 2$ unpaid dues and automatically groups multiple policies per client into a single consolidated bilingual alert.
* 🗣️ **Bilingual Multi-Policy Messaging**: Automatically combines a client's entire portfolio into a single, clean English & Hindi SMS alert with itemized dues and grand totals.
* 🛡️ **Built-in Rate Limiting**: Includes configurable millisecond buffer sleeps (`Utilities.sleep`) between dispatches to prevent gateway rate-limit blacklisting and ensure multi-part SMS delivery stability.

---

## 📊 Spreadsheet Schema Expectations

The engine expects your active Google Sheet monthly tab to contain the following column structure (mapped in `01_Config.gs`):

| Column Index | Field Name | Description | Example Value |
| :--- | :--- | :--- | :--- |
| `0` | **S.No** | Serial Number | `1`, `2` |
| `1` | **Policy Number** | Unique 9-digit LIC policy number | `123456789` |
| `2` | **Client Name** | Full name of the policyholder | `Rajesh Kumar` |
| `3` | **DOC** | Date of Commencement | `15/04/2015` |
| `4` | **Plan/Term** | Plan number and policy term | `914/21` |
| `5` | **Mode** | Premium payment mode code | `YLY`, `HLY`, `MLY`, `NACH` |
| `6` | **FUP** | First Unpaid Premium date | `04/2026` or `15/04/2026` |
| `7` | **Inst Prem** | Installment premium amount | `5000` |
| `8` | **Due** | Total unpaid due count | `1`, `2`, `3` |
| `9` | **GST** | Applicable GST amount | `225` |
| `10` | **Total Prem** | Total amount due per installment | `5225` |
| `11` | **Phone** | Customer mobile number | `+919876543210` |

---

## ⚙️ Installation & Setup Guide

### Step 1: Create a Google Apps Script Project
1. Open your Google Sheet containing your policy tracker.
2. In the top menu, click on **Extensions > Apps Script**.
3. Create 5 separate script files matching the modular architecture (`01_Config.gs` through `05_PipelineOrchestrator.gs`) and paste the respective code files into your project.

### Step 2: Configure Your Credentials (`01_Config.gs`)
Open `01_Config.gs` and update the `CONFIG` object with your production webhook URLs and API credentials:

```javascript
var CONFIG = Object.freeze({
  GATEWAYS: {
    MACRODROID_WEBHOOK_URL: "https://trigger.macrodroid.com/YOUR_UNIQUE_WEBHOOK_ID/send_lic_sms",
    META_WHATSAPP: {
      API_VERSION: "v18.0",
      PHONE_NUMBER_ID: "YOUR_META_PHONE_NUMBER_ID",
      ACCESS_TOKEN: "YOUR_META_PERMANENT_ACCESS_TOKEN",
      // ...
    }
  },
  SANDBOX: {
    TEST_RECIPIENT_PHONE: "919876543210" // Your personal test phone number
  }
});
```

---

## 🚀 Execution Workflows & Triggers

You can run workflows manually from the Apps Script editor or attach them to Google Apps Script **Time-Driven Triggers** (e.g., daily at 9:00 AM).

### Available Entry Points

1. **`executeDailyHybridPipeline()`**
   * **What it does**: Scans the active sheet, builds the queue across Tiers 1, 2, and 3, sends WhatsApp templates with automatic SMS fallback, and dispatches Tier 3 risks.
2. **`executeNonMonthlySmsBatch()`**
   * **What it does**: Dispatches polite single-policy friendly SMS reminders to non-monthly policyholders (`1–2 dues`) up to the configured batch limit (`90 messages`).
3. **`executeTier3MultiPolicyBatch()`**
   * **What it does**: Scans for clients with $\ge 2$ unpaid dues across multiple policies and sends a consolidated bilingual warning.

---

## 🧪 Sandbox & Testing Tools

Before launching live campaigns to hundreds of clients, always use the built-in sandbox functions to verify formatting and webhook connectivity:

* **`runSandboxFormatPreview()`**
  * Grabs a real multi-policy client record from your sheet, renders the full bilingual SMS payload, and dispatches it strictly to your designated `TEST_RECIPIENT_PHONE`.
* **`runConnectivityPingTest()`**
  * Fires a lightweight timestamp ping to your MacroDroid webhook to ensure your HTTP bridge is alive and responding with `HTTP 200 OK`.

---

## 🔒 Security & PII Compliance

* **Zero Hardcoded Secrets**: All phone numbers, API keys, and webhook endpoints are strictly isolated inside `01_Config.gs`.
* **Log Sanitization**: Operational `Logger.log` statements report aggregate counters (e.g., *“Pipeline complete. WhatsApp Sent: 45 | SMS: 12”*) rather than printing raw customer names, policy numbers, or phone numbers into execution logs.
* **Local Phone Normalization**: `Utils.normalizePhoneNumber()` automatically strips formatting characters, validates digit counts, and enforces standard international prefixes (`91...`).

---

## 🤝 Contributing & License

Contributions, bug reports, and feature requests are welcome! Feel free to fork this repository, open an issue, or submit a pull request.

This project is open-source under the **MIT License**.
