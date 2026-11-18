# 📋 Changelog

All notable changes to the **LIC Multi-Channel Policy Reminder & Dispatch Engine** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-18

### 🎉 Initial Open-Source Release

#### ✨ Added
* **Modular 5-File Architecture:** Separated configuration (`01_Config.gs`), utilities (`02_Utils.gs`), message builders (`03_MessageTemplates.gs`), HTTP gateways (`04_DispatchGateways.gs`), and workflow orchestrators (`05_PipelineOrchestrator.gs`) using IIFE namespaces.
* **Hybrid Multi-Channel Dispatch:** Integrated Meta WhatsApp Cloud API (`v18.0`) template messaging with automatic failover to local Android SMS via MacroDroid Webhook POST payloads.
* **Tiered Policy Classification Engine:**
  * `TIER_1` (**Auto-Debit Shield**): Detects monthly/ECS/NACH/SSS policies due within 0–7 days.
  * `TIER_2` (**Active Payer Pipeline**): Detects quarterly/half-yearly/yearly policies due within 0–30 days.
  * `TIER_3` (**Grace & Risk Watch**): Flags overdue policies (`Due >= 2`) and groups multi-policy portfolios by mobile number.
* **Bilingual Multi-Policy Alerts:** Added consolidated English + Hindi Unicode SMS templates with itemized policy breakdowns, earliest FUP tracking, and grand total calculations.
* **Sandbox & Testing Utilities:** Included `runSandboxFormatPreview()` and `runConnectivityPingTest()` to safely verify payload formatting and webhook health before live runs.

#### 🔒 Security
* Centralized all API credentials, webhook URLs, and test numbers into `01_Config.gs`.
* Stripped runtime PII from all `Logger.log` statements in favor of aggregate batch metrics.
