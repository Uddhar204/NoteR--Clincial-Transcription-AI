# notER — AI Clinical Copilot for Cardiologists

<div align="center">

![notER Logo](https://img.shields.io/badge/notER-AI%20Clinical%20Copilot-red?style=for-the-badge&logo=heart&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Vapi](https://img.shields.io/badge/Vapi-Voice%20AI-purple?style=for-the-badge)
![Gemini](https://img.shields.io/badge/Gemini%203.1%20Pro-AI%20Backend-orange?style=for-the-badge&logo=google)

**A passive, real-time AI scribe that listens to doctor-patient conversations and generates structured clinical notes, SOAP documentation, and prescriptions — automatically.**

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [How It Works](#-how-it-works)
- [API Reference](#-api-reference)
- [Vapi Dashboard Setup](#-vapi-dashboard-setup)
- [Development Workflow](#-development-workflow)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Known Issues & Limitations](#-known-issues--limitations)
- [Roadmap](#-roadmap)

---

## 🏥 Overview

**notER** is an AI-powered clinical copilot designed specifically for cardiologists. It passively listens to a live doctor-patient consultation using voice AI (Vapi + Deepgram), transcribes the conversation in real-time, detects cardiology-specific medical keywords, and at the end of the session — automatically generates:

- 📋 **SOAP Notes** (Subjective / Objective / Assessment / Plan)
- 💊 **Structured Prescription** (Drug, Dosage, Frequency, Duration)
- 📝 **1–2 line consultation summary**
- 📄 **PDF export and print-ready prescription**

The doctor never touches a keyboard during the consultation. The AI silently takes notes in the background.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎙️ **Real-time Voice Transcription** | Vapi + Deepgram Nova-2 captures and transcribes the consultation live |
| 🤫 **Passive Listening Mode** | AI is completely silent — does not interrupt the consultation |
| 🧠 **AI Medical Scribe** | Google Gemini 3.1 Pro generates professional SOAP notes from raw transcript |
| 💊 **Prescription Extraction** | Automatically extracts all prescribed medications from conversation |
| 🔍 **Medical Keyword Detection** | 200+ cardiology terms detected and color-coded in real-time |
| 📋 **Patient History Memory** | Previous consultations stored in Qdrant vector DB and recalled via semantic search |
| 📄 **PDF Export** | One-click download of the full clinical report as PDF |
| 🖨️ **Print Prescription** | Print-optimized prescription layout for direct patient handout |
| 📋 **Copy to Clipboard** | Copy SOAP notes, prescription, or full report to clipboard |
| 🌐 **Localtunnel Support** | Works locally with Vapi webhook via localtunnel |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DOCTOR'S BROWSER                              │
│                                                                      │
│  ┌─────────────┐    ┌─────────────────────────────────────────────┐ │
│  │  Microphone  │───▶│         notER React Frontend                │ │
│  └─────────────┘    │  - Live transcription display               │ │
│                      │  - Keyword highlighting                     │ │
│                      │  - SOAP report view                         │ │
│                      └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────┐           ┌──────────────────────┐
│   VAPI Platform  │           │  Next.js API Routes  │
│                  │           │                      │
│  Deepgram        │───Webhook─▶  /api/vapi/webhook   │
│  Nova-2 STT      │           │           │          │
│                  │           │           ▼          │
│  Silent LLM      │           │  /api/generate-notes │
│  (no output)     │           │           │          │
└─────────────────┘           │           ▼          │
                               │  KodeKloud Gemini    │
                               │  3.1 Pro (LLM)       │
                               │           │          │
                               │           ▼          │
                               │  Qdrant Vector DB    │
                               │  (Patient Memory)    │
                               └──────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 (App Router) + TypeScript | React web application |
| **Styling** | Custom CSS (no Tailwind) | Hospital-grade UI design |
| **Voice AI** | Vapi Web SDK | Real-time microphone capture + WebSocket |
| **Transcription** | Deepgram Nova-2 | Speech-to-text with multi-language support |
| **LLM** | Google Gemini 3.1 Pro (via KodeKloud AI) | SOAP note + prescription generation |
| **Vector DB** | Qdrant (cloud) | Patient history semantic search memory |
| **PDF Export** | jsPDF + html2canvas | Clinical report PDF generation |
| **Tunnel** | localtunnel | Expose localhost to Vapi webhooks during dev |

---

## 📁 Project Structure

```
notER/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── generate-notes/
│   │   │   │   └── route.ts        # POST — LLM report generation
│   │   │   ├── vapi/
│   │   │   │   └── webhook/
│   │   │   │       └── route.ts    # POST — Vapi event handler
│   │   │   ├── memory/
│   │   │   │   └── route.ts        # GET/POST — Qdrant operations
│   │   │   └── translate/
│   │   │       └── route.ts        # POST — Bilingual support
│   │   ├── globals.css             # Design system & component styles
│   │   ├── layout.tsx              # Root layout with SEO meta tags
│   │   └── page.tsx                # Main SPA — consultation lifecycle
│   └── lib/
│       ├── llm-client.ts           # KodeKloud/Gemini API client (OpenAI SDK)
│       ├── medical-keywords.ts     # 200+ cardiology keyword regex engine
│       ├── qdrant-client.ts        # Vector DB client (store + search)
│       └── pdf-export.ts           # PDF + print utilities
├── .env                            # Environment variables
├── next.config.ts                  # Next.js config (localtunnel CORS allow)
├── test-runner.mjs                 # Automated backend test suite (16 tests)
├── test.md                         # Full 60-iteration test documentation
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **npm** v9+
- A **Vapi** account → [vapi.ai](https://vapi.ai)
- A **KodeKloud AI** API key (OpenAI-compatible)
- A **Qdrant** cloud account → [cloud.qdrant.io](https://cloud.qdrant.io) *(optional)*

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Edit your `.env` file:

```env
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key
NEXT_PRIVATE_VAPI_PRIVATE_KEY=your_vapi_private_key
KODEKLOUD_API_KEY=sk-your-kodekloud-key
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
```

### 3. Start Development Server

```bash
npm run dev
```

App runs at → **http://localhost:3000**

### 4. Start Localtunnel (for Vapi webhook)

Open a **second terminal**:

```bash
npx localtunnel --port 3000 --subdomain my-noter-app
```

Your full webhook URL: **`https://my-noter-app.loca.lt/api/vapi/webhook`**

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | ✅ Yes | From Vapi Dashboard |
| `NEXT_PRIVATE_VAPI_PRIVATE_KEY` | Optional | Vapi private key |
| `KODEKLOUD_API_KEY` | ✅ Yes | KodeKloud AI key (starts with `sk-`) |
| `QDRANT_URL` | Optional | Qdrant cluster URL |
| `QDRANT_API_KEY` | Optional | Qdrant JWT API key |

> If `QDRANT_URL` is not set, the memory feature silently skips. All other features still work.

---

## ⚙️ How It Works

### Step 1 — Consultation Starts
Doctor clicks **"Start Consultation"**. The Vapi Web SDK opens a WebSocket to Vapi's servers. Deepgram Nova-2 starts listening to the microphone.

### Step 2 — Live Transcription
As doctor and patient speak, Deepgram transcribes in real-time. Text chunks appear live on the doctor's screen. The AI model on Vapi is set to **complete silence** and never speaks.

### Step 3 — Keyword Detection
Each new transcript segment is scanned against a 200+ term cardiology regex engine. Detected terms (symptoms, drugs, tests, diagnoses) are color-coded in the **AI Analysis** panel.

### Step 4 — Consultation Ends
Doctor clicks **"End Consultation"**. Vapi stops. The full transcript is compiled and sent to `/api/generate-notes`.

### Step 5 — Report Generation
The backend sends the raw transcript to **Gemini 3.1 Pro** via KodeKloud. The model extracts SOAP notes, prescriptions, and a summary — all returned as structured JSON.

### Step 6 — Memory Storage
The consultation is stored as a vector in **Qdrant**. At the start of future consultations, semantically similar past records are retrieved and shown as "Previous History."

---

## 📡 API Reference

### `POST /api/generate-notes`
Generates a structured clinical report from a raw transcript.

**Request:**
```json
{ "transcript": "Doctor: Good morning. Patient: I have chest pain..." }
```

**Response:**
```json
{
  "soap": {
    "subjective": "Patient reports 2 weeks of exertional chest pain...",
    "objective": "BP 150/90, HR 82...",
    "assessment": "Suspected unstable angina...",
    "plan": "Start Aspirin, Atorvastatin, repeat ECG..."
  },
  "prescriptions": [
    { "drug": "Aspirin", "dosage": "150mg", "frequency": "Once daily", "duration": "Ongoing" }
  ],
  "summary": "45-year-old with exertional chest pain and hypertension."
}
```

---

### `POST /api/vapi/webhook`
Receives real-time events from Vapi.

| `message.type` | Action |
|----------------|--------|
| `assistant-request` | Returns silent assistant config |
| `transcript` | Logs transcript chunk to console |
| `end-of-call-report` | Receives full transcript + summary |
| `status-update` | Logs call status |

---

### `GET /api/memory?q={query}&limit={n}`
Searches Qdrant for similar past consultations.

### `POST /api/memory`
Stores a consultation record in Qdrant.

---

## 🎙️ Vapi Dashboard Setup

1. Log in to [dashboard.vapi.ai](https://dashboard.vapi.ai)
2. Create a new **Assistant**
3. **Model tab:**
   - Provider: `OpenAI`, Model: `gpt-4o-mini`
   - System Prompt:
     ```
     You are a completely silent observer. You must NEVER speak, NEVER respond,
     and NEVER acknowledge anything. Output an empty response and remain completely silent.
     ```
4. **Transcriber tab:**
   - Provider: `Deepgram`, Model: `Nova-2`, Language: `multi`
   - Leave **Keyterms empty**
5. **Advanced → Server URL:**
   - URL: `https://my-noter-app.loca.lt/api/vapi/webhook`
   - Header: `bypass-tunnel-reminder: true`

---

## 🧪 Testing

### Run Automated Tests (16 backend tests)

```bash
node test-runner.mjs
```

**Latest result: 16/16 PASS ✅**

Tests cover: app connectivity, generate-notes API, Vapi webhook events, memory API, and KodeKloud API direct connection.

### Full Test Documentation

See [`test.md`](./test.md) — a 60-iteration test plan covering infrastructure, all API routes, frontend UI states, and report output.

---

## 🌐 Deployment

> **Production requires HTTPS** — browsers block microphone access on plain HTTP.

### Deploy to Vercel

```bash
npx vercel
```

Set all environment variables in **Vercel Dashboard → Settings → Environment Variables**.

After deploying, update the **Vapi Server URL** from your localtunnel URL to:
```
https://your-app.vercel.app/api/vapi/webhook
```

---

## ⚠️ Known Issues & Limitations

| Issue | Status | Workaround |
|-------|--------|-----------|
| Localtunnel shows "Click to Continue" for bots | Active | Add `bypass-tunnel-reminder: true` header in Vapi |
| Localtunnel URL changes on every restart | Active | Use a paid Ngrok plan for a persistent URL |
| Vapi free tier has monthly minute limits | Active | Upgrade Vapi plan for production |
| Microphone blocked if another app is using it | Active | Close other apps using mic before starting |
| Speaker labels not automatically separated | Partial | All Vapi audio shows 🎙 badge; LLM infers context |

---

## 🗺️ Roadmap

- [x] Real-time voice transcription (Vapi + Deepgram)
- [x] SOAP note generation (Gemini 3.1 Pro)
- [x] Prescription extraction
- [x] Medical keyword highlighting (200+ terms)
- [x] PDF export and print prescription
- [x] Qdrant patient history memory
- [x] Localtunnel with bypass header support
- [x] Full 60-iteration test plan
- [ ] Speaker diarization (auto-label Doctor vs Patient)
- [ ] Multi-patient session management
- [ ] EHR integration (HL7 / FHIR export)
- [ ] Hindi / regional language transcription
- [ ] Mobile-responsive layout
- [ ] Auto-save to local storage

---

<div align="center">

Built with ❤️ for doctors who deserve to focus on patients, not paperwork.

</div>
