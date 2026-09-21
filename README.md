# 🌊 VarshaRaksha — Hyperlocal Flood Early Warning & Emergency Response System

> **Problem Statement (CX0404)**: *Flood Street, No Warning* — Rapid urban waterlogging detection, edge AI computer vision verification, multi-agent causality reasoning, and automated emergency dispatch.

VarshaRaksha is an AI-powered disaster management ecosystem engineered to bridge the critical 20-minute gap between cloudburst precipitation and localized street inundation.

---

## 📸 System Visual Walkthrough

### 1. Authority Command Center (Web Operations)

<table align="center" width="100%">
  <tr>
    <td align="center" width="33%">
      <img src="./image.png" alt="AI Verified Incident Feed" width="100%" style="border-radius: 8px; border: 1px solid #e2e8f0;"/>
      <br/>
      <b>🌊 1. AI-Verified Flood Feed</b>
    </td>
    <td align="center" width="33%">
      <img src="./image%20copy.png" alt="Human Intervention Required Feed" width="100%" style="border-radius: 8px; border: 1px solid #e2e8f0;"/>
      <br/>
      <b>⚠️ 2. Human Intervention Required</b>
    </td>
    <td align="center" width="33%">
      <img src="./image%20copy%202.png" alt="Quarantined Spam Feed" width="100%" style="border-radius: 8px; border: 1px solid #e2e8f0;"/>
      <br/>
      <b>🚫 3. Quarantined Spam Feed</b>
    </td>
  </tr>
</table>

#### 🔍 Authority Interface Breakdown:
1. **AI-Verified Flood Feed (`image.png`)**:
   - Analyzes up to 120 video frames using a fine-tuned MobileNet computer vision microservice.
   - Requires a sustained consecutive run of $\ge 5$ flood-positive frames with an average confidence score $\ge 0.75$ and frame threshold $\ge 0.70$.
   - Confirmed waterlogging incidents are auto-tagged with root causes (*Drain Blockage* vs. *Rainfall Overload*) and surfaced directly with rapid-unit dispatch options.
2. **Human Intervention Review Queue (`image copy.png`)**:
   - Flags low-confidence ($< 70\%$) or unconfirmed ground reports with an amber warning banner.
   - Enables dispatchers to inspect full video/photo evidence in a frame-by-frame lightbox modal and take one-click decisions (*Mark Verified*, *False Alarm*, or *Override Dispatch*).
3. **Quarantined Spam & Reputation Ledger (`image copy 2.png`)**:
   - Automatically tracks user trust scores. If a user accumulates $\ge 3$ confirmed false alarms, future submissions are quarantined to keep the live feed uncluttered.
   - For flagged users, automated Twilio SMS blasting is suppressed on SOS calls (requiring manual voice callback), with a one-click *Reset User Trust & Unban* button for authorities.

---

### 2. Citizen & Shopkeeper Mobile Application (React Native Expo)

<table align="center" width="100%">
  <tr>
    <td align="center" width="50%">
      <img src="./WhatsApp%20Image%202026-09-21%20at%2015.03.28.jpeg" alt="One-Touch Emergency SOS" width="65%" style="border-radius: 8px; border: 1px solid #e2e8f0;"/>
      <br/>
      <b>🔴 1. Shopkeeper Home & 1-Tap SOS</b>
    </td>
    <td align="center" width="50%">
      <img src="./WhatsApp%20Image%202026-09-21%20at%2015.04.10.jpeg" alt="Safe Route & Evacuation Shelters" width="65%" style="border-radius: 8px; border: 1px solid #e2e8f0;"/>
      <br/>
      <b>🏠 2. Safe Corridor Evacuation & Shelters</b>
    </td>
  </tr>
</table>

#### 📱 Mobile Interface Breakdown:
1. **Shopkeeper Home & One-Touch Emergency SOS (`WhatsApp Image ... 15.03.28.jpeg`)**:
   - Minimalist, high-contrast UI designed for high-stress crisis scenarios.
   - Features a prominent, zero-latency **One-Touch Emergency SOS Button** that captures instant GPS coordinates and alerts nearest municipal rescue units without waiting for AI validation.
   - Provides live ward status, lightning storm risk advisories, and the citizen incident report form (where AI confidence percentages are hidden from citizens to avoid panic).
2. **Safe Corridor Route & Verified Shelters (`WhatsApp Image ... 15.04.10.jpeg`)**:
   - Displays real-time safe evacuation routes that dynamically circumvent active waterlogged streets and choked culverts.
   - Guides shopkeepers and families to elevated high-ground municipal shelters equipped with power backup, clean water, and boat staging hubs.

---

## 🏗️ Technical Architecture

```text
  📱 Mobile Client (React Native Expo)
       │
       ├─► [🔴 One-Touch SOS] ──────────► POST /api/sos ────────┐ (Zero-latency dispatch)
       └─► [📸 Video/Photo Report] ────► POST /api/upload-media ─┤
                                                                 ▼
 ┌───────────────────────────────────────────────────────────────────────────────┐
 │ ⚙️ Node.js Express API Gateway & Data Store (Port 5001)                       │
 │  • Geohash Spatial Clustering (300m radius deduplication)                     │
 │  • Divergence Cause Classifier (Drain Blockage vs. Rainfall Overload)         │
 │  • User Reputation & False Alarm Quarantine Engine (3-strike threshold)       │
 │  • 8-Agent Multi-Modal Reasoning Pipeline (orchestrator.js)                   │
 │  • Server-Sent Events (SSE /api/stream) Real-time Pusher                      │
 └───────────────────────┬───────────────────────────────────────┬───────────────┘
                         │                                       │
                         ▼                                       ▼
 ┌───────────────────────────────────────────────┐ ┌─────────────────────────────┐
 │ 🧠 Python Edge AI Microservice (Port 5003)    │ │ 📢 Outbound Multichannel    │
 │  • Model: fine_tuned_flood_detection_model    │ │    Alerts                   │
 │  • Architecture: MobileNet 224x224 (PTQ)      │ │  • 📱 Twilio Emergency SMS  │
 │  • 120-Frame Dynamic Timeline Sampler         │ │  • 📞 Dispatcher Callbacks  │
 │  • 2-Condition Temporal Contiguity Engine     │ │  • 📧 Ward Email & PagerDuty│
 └───────────────────────┬───────────────────────┘ └─────────────────────────────┘
                         │
                         ▼
 ┌───────────────────────────────────────────────────────────────────────────────┐
 │ 🖥️ Authority Command Center (React Vite - Port 5173)                          │
 │  • Live GIS Map with Pulsing SOS Pins & Risk Contours                         │
 │  • Incident Queue with '⚠️ Human Review Needed' & '🚫 Quarantined Spam' Tabs   │
 │  • Video Lightbox Modal with Frame-by-Frame Diagnostic Telemetry              │
 │  • One-Click Action Suite: [Mark Verified] [False Alarm] [Override] [Dispatch]│
 └───────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+) & npm
- Python (3.10+) with TensorFlow / Keras (for CV service)
- Expo Go app on iOS / Android (for mobile testing)

### Installation & Launch

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/siyabhagat29/TwoTone-MUSA-Codex.git
   cd TwoTone-MUSA-Codex
   npm install
   ```

2. **Start Backend Gateway & Authority Dashboard**:
   ```bash
   npm run dev
   ```
   - **Authority Web Dashboard**: [http://localhost:5173](http://localhost:5173)
   - **Backend API Server**: [http://localhost:5001](http://localhost:5001)

3. **Start Mobile App (Citizen & Shopkeeper)**:
   ```bash
   npm run mobile
   # or
   cd apps/mobile && npx expo start -c
   ```

4. **Start Python Flood AI Microservice (Optional / Standalone)**:
   ```bash
   python server/src/flood_detector_service.py
   ```
   *(Runs on port `5003` with automatic fallback if not manually started)*.

---

## 🔒 Security, Trust & Multichannel Dispatch

| Channel | Trigger Condition | Recipient & Payload |
| :--- | :--- | :--- |
| **📱 Twilio SMS** | Emergency SOS or RED Zone Escalation | Verified emergency contacts receive live GPS coordinates and Google Maps directions. |
| **📞 Voice Calls** | Active trapped citizen or medical emergency | Control room dispatcher direct click-to-call integration. |
| **📧 Municipal Email** | Structural drain blockage or chronic silt hazard | Automated technical diagnostic payload sent to ward engineers. |
| **🚫 Quarantine System** | $\ge 3$ confirmed false alarms | Auto-quarantines reports and suppresses automated SMS on spam SOS pings. |

---

## 👥 Contributors & License
Built for **TwoTone Codex 2026** — Licensed under the MIT License.
