# 🤖 MacroDroid Setup Guide: From Zero to Production SMS Gateway

[![MacroDroid](https://img.shields.io/badge/App-MacroDroid-FF6F00?style=for-the-badge&logo=android&logoColor=white)](https://www.macrodroid.com/)
[![Google Apps Script](https://img.shields.io/badge/Integration-Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://developers.google.com/apps-script)

> **Step-by-step guide to configuring MacroDroid on an Android device to act as an automated, local SMS gateway.** This enables your Google Apps Script CRM to trigger real SMS messages through your phone via HTTP webhook triggers.

---

## 📑 Table of Contents

1. [🌟 Overview & How It Works](#-overview--how-it-works)
2. [📋 Prerequisites](#-prerequisites)
3. [⚙️ Step 1: Install MacroDroid & Enable Permissions](#️-step-1-install-macrodroid--enable-permissions)
4. [🌐 Step 2: Set Up MacroDroid Webhook (Trigger)](#-step-2-set-up-macrodroid-webhook-trigger)
5. [📱 Step 3: Configure SMS Sending (Action)](#-step-3-configure-sms-sending-action)
6. [🛑 Step 4: Configure Constraints (Safety & Reliability)](#-step-4-configure-constraints-safety--reliability)
7. [🧪 Step 5: Test the Integration](#-step-5-test-the-integration)
8. [🔋 Step 6: Battery Optimization Exemption (Crucial)](#-step-6-battery-optimization-exemption-crucial)

---

## 🌟 Overview & How It Works

MacroDroid allows your Android phone to listen for incoming web requests from Google Apps Script. When Google Sheets runs your reminder pipeline, it sends an HTTP `POST` request containing a phone number and message text to your MacroDroid Webhook URL. MacroDroid catches this request and instantly instructs your phone's SIM card to dispatch the SMS.

```text
[Google Apps Script] ──(HTTP POST)──> [MacroDroid Webhook URL] ──> [Android Phone SIM] ──> [Client SMS]
```

---

## 📋 Prerequisites

- An Android smartphone with an active SIM card and SMS plan.
- The **MacroDroid** app installed from the Google Play Store (Free or Pro version).
- Your Google Apps Script project deployed and ready.

---

## ⚙️ Step 1: Install MacroDroid & Enable Permissions

1. Download and install **MacroDroid - Device Automation** from the Google Play Store.
2. Open the app and grant all necessary system permissions when prompted:
   - **SMS Permissions:** Required to send and read text messages.
   - **Storage / Notifications:** Recommended for background execution logging.

---

## 🌐 Step 2: Set Up MacroDroid Webhook (Trigger)

The webhook acts as your private API endpoint that Google Apps Script calls.

1. Open MacroDroid and tap on **Add Macro** (or go to the **Macros** tab and tap the `+` icon).
2. **Configure Triggers:**
   - Tap on **Triggers** > **Connectivity** > **Webhook**.
   - Select **Webhook (Receive)**.
   - MacroDroid will generate a unique Webhook URL looking similar to:
     ```text
     https://trigger.macrodroid.com/YOUR_UNIQUE_ID/send_lic_sms
     ```
   - Copy this URL and paste it directly into your `01_Config.gs` file under `CONFIG.GATEWAYS.MACRODROID_WEBHOOK_URL`.
3. **Configure Variables:**
   - MacroDroid webhooks automatically extract URL query parameters or `POST` body keys. We will pass two variables:
     - `phone` (The recipient's 10-digit mobile number)
     - `msg` (The body text of the SMS)

---

## 📱 Step 3: Configure SMS Sending (Action)

Now, tell MacroDroid what to do when the webhook receives a ping.

1. In the same macro creation screen, tap on **Actions**.
2. Navigate to **Phone** > **Send SMS**.
3. Choose **Select Contact** or tap the `...` (**Magic Text**) button to dynamically assign the incoming webhook variable.
4. Set the **phone number** field to use the webhook parameter:
   - Select **Magic Text** > **Webhook Variables** > choose `phone` (or enter `[v:phone]`).
5. Set the **message body** field:
   - Select **Magic Text** > **Webhook Variables** > choose `msg` (or enter `[v:msg]`).
6. Tap **OK** to save the action.

---

## 🛑 Step 4: Configure Constraints (Safety & Reliability)

Constraints ensure your macro only runs under safe conditions *(optional, but recommended for production)*.

1. Tap on **Constraints** *(optional)*.
2. You can add a **Battery Level** constraint (e.g., do not send SMS if battery is below 10%) or leave it empty for 24/7 availability.
3. Give your macro a clear name (e.g., `LIC_SMS_Gateway_Receiver`) and tap the **Save (Checkmark)** icon in the bottom right corner.

---

## 🧪 Step 5: Test the Integration

Before running large batches from your Google Sheet, verify that your phone successfully receives webhooks and sends texts:

1. Open your Google Apps Script editor.
2. Run the sandbox test function `runConnectivityPingTest()` located in `05_PipelineOrchestrator.gs`.
3. Check your Apps Script execution logs to confirm an `HTTP 200 OK` response.
4. Verify that your test phone (`TEST_RECIPIENT_PHONE`) receives the ping text message.

---

## 🔋 Step 6: Battery Optimization Exemption (Crucial)

Android's aggressive power-saving features often kill background apps like MacroDroid, which will cause your webhook to stop responding when your screen is off. You must exempt MacroDroid from battery optimization:

1. Open your Android phone's system **Settings**.
2. Go to **Apps** > **MacroDroid**.
3. Tap on **Battery** or **Battery Optimization**.
4. Change the setting from *Optimized / Restricted* to **Unrestricted / Don't optimize**.

> **Note for specific manufacturers (Xiaomi, Realme, Vivo, Samsung):** Also enable **Autostart** for MacroDroid in your system settings and **lock the app** in your recent apps multitasking screen.

---

## 🎉 Setup Complete!

Your Android device is now configured as a production-ready SMS gateway. Whenever your Google Sheet triggers the daily pipeline, MacroDroid will seamlessly relay your customized single-policy and bilingual multi-policy alerts straight to your clients.
