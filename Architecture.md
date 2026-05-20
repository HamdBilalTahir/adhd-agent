# ADHD Agent — System Architecture

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Browser Extension](#5-browser-extension)
6. [API Routes](#6-api-routes)
7. [Drift Detection](#7-drift-detection)
8. [Intervention Pipeline](#8-intervention-pipeline)
9. [Supervisor Alerts](#9-supervisor-alerts)
10. [Authentication](#10-authentication)
11. [Firestore Schema](#11-firestore-schema)
12. [Environment Variables](#12-environment-variables)
13. [Build & Toolchain](#13-build--toolchain)
14. [Deployment](#14-deployment)

---

## 1. System Overview

ADHD Agent is a real-time focus monitoring system. A Chrome extension watches the user's tab activity every 10 seconds and sends heartbeats to a Next.js API on Vercel. The server detects drift based on tab count and intervention history, calls Gemini to generate a context-aware message, and sends it back to the extension as an overlay. At high escalation levels, the user's supervisor is notified by email.

### Roles

| Role           | Description                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| **Supervisee** | The person being monitored. Installs the extension, configures their email. |
| **Supervisor** | Receives email alerts when the supervisee is persistently off task.         |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────┐
│           Chrome Extension                   │
│                                              │
│  background.ts — alarm every 10s            │
│    → queries all open tabs                  │
│    → POST /api/events                       │
│                                              │
│  content.ts — listens for SHOW_OVERLAY      │
│    → injects full-screen overlay            │
│    → user responds or 2-min escalation      │
│                                              │
│  popup.ts — settings UI                     │
│    → firstName, lastName, userEmail,        │
│      supervisorEmail → chrome.storage       │
│    → POST /api/signup on first save         │
└──────────────────┬──────────────────────────┘
                   │ POST /api/events
                   │ (EventPayload)
┌──────────────────▼──────────────────────────┐
│         Next.js API (Vercel)                 │
│                                              │
│  /api/events                                │
│    → getOrCreateProfile() for both emails   │
│    → links supervisorId on supervisee       │
│    → writes heartbeat to events collection  │
│    → fetches last 20 events + last          │
│      intervention in parallel               │
│    → runs detectDrift → level 0–5           │
│    → if level ≥ 2: createIntervention()     │
│    → returns { intervene, message, level }  │
│                                             │
│  /api/signup                                │
│    → creates Firebase Auth for supervisee   │
│    → creates/links supervisor account       │
│    → sends welcome + claim emails           │
│                                             │
│  /api/alert                                 │
│    → looks up supervisorId from profile     │
│    → writes to alerts collection            │
│    → sends email via Resend                 │
└──────────┬──────────────────┬───────────────┘
           │                  │
┌──────────▼──────┐  ┌────────▼────────────────┐
│   Firestore      │  │   External Services      │
│  (flat schema)   │  │                          │
│                  │  │  Gemini (LangChain)      │
│  userProfiles    │  │  → generateIntervention  │
│  events          │  │    gemini-2.0-flash       │
│  interventions   │  │                          │
│  activityLogs    │  │  Resend                  │
│  sessions        │  │  → sendEmail             │
│  alerts          │  │    (alerts@kuailabs.ai)  │
│  taskBlocks      │  └──────────────────────────┘
└──────────────────┘
```

---

## 3. Technology Stack

| Layer             | Technology              | Version            |
| ----------------- | ----------------------- | ------------------ |
| Framework         | Next.js App Router      | 16.1.6             |
| UI                | React                   | 19.2.3             |
| Language          | TypeScript              | ^5                 |
| Auth              | Firebase Authentication | ^12                |
| Database          | Firestore (Firebase)    | ^12                |
| Admin SDK         | firebase-admin          | ^13                |
| AI                | LangChain + Gemini      | `gemini-2.0-flash` |
| Email             | Resend                  | ^6                 |
| Extension bundler | esbuild                 | ^0.28              |
| Extension types   | @types/chrome           | ^0.1               |
| Styling           | Tailwind CSS            | ^4                 |
| Hosting           | Vercel                  | —                  |

---

## 4. Project Structure

```
adhd-agent/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx          # Firebase email/password + Google sign-in
│   │   │   └── signup/page.tsx         # Firebase createUser + Google
│   │   ├── (dashboard)/
│   │   │   ├── supervisee/             # Supervisee dashboard pages
│   │   │   └── supervisor/             # Supervisor dashboard pages
│   │   ├── api/
│   │   │   ├── events/route.ts         # Heartbeat endpoint — drift detection entry point
│   │   │   ├── intervene/route.ts      # Manual intervention trigger
│   │   │   └── alert/route.ts          # Supervisor email notification
│   │   └── onboarding/                 # Post-login setup flow
│   ├── lib/
│   │   ├── firebase.ts                 # Client SDK (browser)
│   │   ├── firebase-admin.ts           # Admin SDK + adminAuth (server)
│   │   ├── auth.ts                     # verifyToken() — Bearer token → uid
│   │   ├── patterns.ts                 # detectDrift() — level 0–5
│   │   ├── intervention.ts             # createIntervention() — shared logic
│   │   ├── claude.ts                   # generateIntervention() — Gemini via LangChain
│   │   ├── alert.ts                    # triggerAlert() — email/SMS dispatch
│   │   ├── notify.ts                   # sendEmail() via Resend, sendSMS() stub
│   │   ├── collections.ts              # Typed Firestore collection helpers
│   │   └── invite.ts                   # Supervisor invite code logic
│   ├── components/
│   │   ├── ui/                         # Primitive UI components
│   │   ├── dashboard/                  # TaskCard, EventFeed, etc.
│   │   └── onboarding/                 # Onboarding step components
│   └── types/
│       └── index.ts                    # All shared TypeScript types
│
├── extension/
│   ├── src/
│   │   ├── types.ts                    # Extension-specific interfaces
│   │   ├── background.ts               # Service worker — alarm, fetch, relay
│   │   ├── content.ts                  # Overlay injection + escalation
│   │   └── popup.ts                    # Settings UI logic
│   ├── dist/                           # Compiled JS (gitignored, esbuild output)
│   ├── icons/                          # Extension icons
│   ├── manifest.json                   # Chrome MV3 manifest
│   ├── popup.html                      # Settings popup UI
│   └── tsconfig.json                   # Extension-specific TS config
│
├── firestore.rules                     # Per-user data isolation + supervisor access
├── firestore.indexes.json              # Composite indexes
├── vercel.json                         # Silences GitHub PR comments
├── .env                                # Local secrets (gitignored)
└── .env_example                        # Template for new contributors
```

---

## 5. Browser Extension

The extension is a Chrome MV3 extension written in TypeScript, compiled to `extension/dist/` via esbuild.

### Files

| File            | Role                                                                                                                                                                                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `background.ts` | Service worker. Creates a `monitor` alarm (every 10s). On each tick: reads settings from `chrome.storage.local`, queries all open tabs, POSTs `EventPayload` to `/api/events`, sends `SHOW_OVERLAY` to the active tab if `intervene: true`. Handles `RESPONDED` messages — `back_on_task` confirms focus, `break` sets a 15-minute `pausedUntil` pause. |
| `content.ts`    | Injected into every page. Listens for `SHOW_OVERLAY`, injects a full-screen overlay with the AI message and two buttons. Escape key is blocked while overlay is present. After 2 minutes with no response: plays a Web Audio API beep and escalates visually with a pulsing red border.                                                                 |
| `popup.ts`      | Settings UI. Reads/writes `firstName`, `lastName`, `userEmail`, `supervisorEmail` from `chrome.storage.local`. On first save calls `POST /api/signup` to create accounts. Shows green Active / red Not configured status.                                                                                                                               |
| `types.ts`      | Shared interfaces: `ExtensionSettings`, `EventPayload`, `ApiResponse`, `OverlayMessage`, `ResponseMessage`, `SettingsUpdatedMessage`, `ExtensionMessage`.                                                                                                                                                                                               |

### Message Flow

```
background.ts ──SHOW_OVERLAY──► content.ts (overlay shown)
content.ts ────RESPONDED──────► background.ts (dismiss + POST response)
popup.ts ──────SETTINGS_UPDATED► background.ts (re-reads on next tick)
```

### Build

```bash
yarn build:extension    # compile once
yarn watch:extension    # compile on every save
yarn package:extension  # build + zip for store submission
```

---

## 6. API Routes

### `POST /api/events`

Heartbeat from the extension. Auto-creates Firebase Auth accounts for both emails if they don't exist, links `supervisorId` on the supervisee profile, writes a `heartbeat` event, runs drift detection, and returns an intervention if needed.

**Request:**

```json
{
  "userEmail": "string",
  "supervisorEmail": "string",
  "tabCount": 14,
  "activeTabTitle": "string",
  "activeTabUrl": "string",
  "timestamp": 1234567890000
}
```

**Response:**

```json
{ "intervene": false }
// or
{ "intervene": true, "message": "You've got 18 tabs open — what's the one thing...", "level": 3 }
```

---

### `POST /api/signup`

Called once from the extension popup on first save. Creates accounts, links the supervisor relationship, and sends emails.

**Request:**

```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "supervisorEmail": "string"
}
```

---

### `POST /api/alert`

Writes to `alerts` collection and sends supervisor email. Called automatically by `createIntervention()` when drift level ≥ 4.

**Request:**

```json
{
  "userId": "string",
  "message": "string",
  "level": 4
}
```

---

## 7. Drift Detection

`lib/patterns.ts` — `detectDrift(events, lastIntervention?)` returns `{ level: 0–5 }`.

| Level | Condition                                           |
| ----- | --------------------------------------------------- |
| 0     | ≤ 10 tabs                                           |
| 1     | > 10 tabs                                           |
| 2     | > 15 tabs                                           |
| 3     | > 20 tabs                                           |
| 4     | Level 3 + last intervention unanswered for < 20 min |
| 5     | Level 3 + last intervention unanswered for ≥ 20 min |

---

## 8. Intervention Pipeline

`lib/intervention.ts` — `createIntervention(input)` is the shared logic called by both `/api/events` and `/api/intervene`.

```
createIntervention()
  → generateIntervention()       (lib/claude.ts — Gemini via LangChain)
  → writes to /interventions
  → updates status/current.interventionMessage
  → if level ≥ 4: triggerAlert() (lib/alert.ts)
  → returns { id, message, level }
```

**Gemini prompt strategy:** Level-aware system prompt (each level 2–5 has distinct escalation tone). User prompt includes tab count, active tab title, drift level, current task, and time of day. Max 100 output tokens — responses must be one tight sentence.

**Intervention levels (Firestore):**

| Drift level | Stored as `InterventionLevel` |
| ----------- | ----------------------------- |
| 2           | 1 (gentle)                    |
| 3 / 4       | 2 (firm)                      |
| 5           | 3 (urgent)                    |

---

## 9. Supervisor Alerts

`lib/alert.ts` — `triggerAlert()` fires when drift level ≥ 4.

- Saves to `alerts` collection with `supervisorId` field
- Looks up supervisor email from `userProfiles where userId == supervisorId`
- Sends email via Resend from `alerts@kuailabs.ai`
- Auto-triggered by `createIntervention()` at drift level ≥ 4

---

## 10. Authentication

Firebase Authentication — email/password and Google OAuth.

| File                    | Role                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `lib/firebase.ts`       | Client SDK — `auth` instance used in browser                                                                 |
| `lib/firebase-admin.ts` | Admin SDK — `adminDb` + `adminAuth` for server routes                                                        |
| `lib/auth.ts`           | `verifyToken(req)` — reads `Authorization: Bearer <token>`, calls `adminAuth.verifyIdToken()`, returns `uid` |

Login and signup pages are `'use client'` components using `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, and `signInWithPopup` (Google). Both redirect to `/onboarding` on success.

---

## 11. Firestore Schema

All collections are **flat top-level collections** with auto-generated document IDs. `userId` is the foreign key (Firebase Auth UID) on every document. No nested subcollections.

```
/userProfiles/{docId}      → UserProfile
/events/{docId}            → UserEvent
/interventions/{docId}     → Intervention
/activityLogs/{docId}      → ActivityLog
/sessions/{docId}          → Session
/alerts/{docId}            → Alert
/taskBlocks/{docId}        → TaskBlock
```

### Composite indexes (all required for ordered queries)

| Collection      | Field 1      | Field 2          |
| --------------- | ------------ | ---------------- |
| `events`        | `userId` ASC | `createdAt` DESC |
| `interventions` | `userId` ASC | `createdAt` DESC |
| `activityLogs`  | `userId` ASC | `createdAt` DESC |
| `sessions`      | `userId` ASC | `createdAt` DESC |
| `alerts`        | `userId` ASC | `sentAt` DESC    |

### Key types

**UserProfile**

```typescript
{
  userId: string;          // Firebase Auth UID
  firstName: string;
  lastName: string;
  email: string;
  roles: ('supervisee' | 'supervisor')[];
  supervisorId?: string;   // UID of their supervisor
  superviseeIds?: string[];
  createdAt: string;
  claimed: boolean;        // false until supervisor sets a password
  notifyEmail?: boolean;
  notifySMS?: boolean;
  supervisorPhone?: string;
}
```

**UserEvent**

```typescript
{
  userId: string;
  type: 'heartbeat' |
    'intervention_triggered' |
    'session_created' |
    'session_ended' |
    'user_signup';
  source: 'extension' | 'api' | 'web';
  metadata: Record<string, unknown>; // tabCount, activeTabTitle, etc.
  createdAt: string;
}
```

**Intervention**

```typescript
{
  userId: string;
  level: 1 | 2 | 3; // mapped from drift level 2–5
  message: string;
  createdAt: string;
}
```

**Alert**

```typescript
{
  userId: string;
  supervisorId: string;
  message: string;
  level: number;
  sentAt: string;
}
```

---

## 12. Environment Variables

| Variable                    | Exposed to       | Purpose                    |
| --------------------------- | ---------------- | -------------------------- |
| `NEXT_PUBLIC_APP_URL`       | Browser + Server | Base URL for email links   |
| `NEXT_PUBLIC_FIREBASE_*`    | Browser          | Firebase client SDK config |
| `FIREBASE_ADMIN_PROJECT_ID` | Server only      | Admin SDK                  |
| `FIREBASE_CLIENT_EMAIL`     | Server only      | Admin SDK service account  |
| `FIREBASE_PRIVATE_KEY`      | Server only      | Admin SDK service account  |
| `RESEND_API_KEY`            | Server only      | Email sending              |
| `RESEND_FROM_ADDRESS`       | Server only      | Sender address             |
| `GEMINI_API_KEY`            | Server only      | Gemini API                 |

---

## 13. Build & Toolchain

### Next.js app

```bash
yarn dev          # dev server → localhost:3000
yarn build        # production build
yarn typecheck    # tsc --noEmit
yarn lint         # eslint
yarn test         # jest
```

### Extension

```bash
yarn build:extension    # esbuild → extension/dist/
yarn watch:extension    # esbuild --watch
yarn package:extension  # build + zip → adhd-agent-extension.zip
```

### Pre-commit hook

Every `git commit` runs:

1. `tsc --noEmit` — TypeScript check
2. `lint-staged` — ESLint fix + Prettier format on staged files

---

## 14. Deployment

### Next.js → Vercel

- Production URL: `https://adhd-agent-system.vercel.app`
- Auto-deploys on push to `main`
- Set all server-only env vars in Vercel → Settings → Environment Variables
- `vercel.json` silences automatic GitHub PR comments

### Extension → Chrome Web Store

1. `yarn package:extension` → generates `adhd-agent-extension.zip`
2. Upload zip to [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole)
3. One-time $5 developer fee
4. Same zip works on the [Microsoft Edge Add-ons store](https://partner.microsoft.com/dashboard) (free)

### Testing without publishing

Load unpacked in Chrome:

1. `yarn build:extension`
2. `chrome://extensions` → Developer mode → Load unpacked → select `extension/`
