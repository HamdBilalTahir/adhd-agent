# ADHD Agent

A real-time focus monitoring system for people with ADHD. A browser extension watches tab activity every 10 seconds, detects drift, and triggers AI-generated interventions. Supervisors are notified by email when a user is persistently off task.

---

## How It Works

```
Chrome Extension (monitors tabs every 10s)
        ↓  POST /api/events
Next.js API on Vercel (drift detection)
        ↓  level ≥ 2
Gemini generates intervention message
        ↓  sent back to extension
Overlay injected into active tab
        ↓  level ≥ 4 or no response after 2 min
Supervisor alerted via email (Resend)
```

---

## Tech Stack

| Layer     | Technology                                      |
| --------- | ----------------------------------------------- |
| Framework | Next.js 16 (App Router)                         |
| Language  | TypeScript (strict)                             |
| Auth      | Firebase Authentication                         |
| Database  | Firestore                                       |
| AI        | Gemini via LangChain (`gemini-3.1-pro-preview`) |
| Email     | Resend (`alerts@kuailabs.ai`)                   |
| Extension | Chrome MV3, compiled via esbuild                |
| Hosting   | Vercel                                          |

---

## Prerequisites

- Node.js ≥ 20
- Yarn
- Firebase project (Firestore + Auth enabled)
- Resend account with verified domain
- Gemini API key

---

## Setup

```bash
git clone <repo>
cd adhd-agent
yarn install
cp .env_example .env
# Fill in all values in .env
yarn dev        # → http://localhost:3000
```

---

## Browser Extension

**Build** (compile TypeScript → `extension/dist/`):

```bash
yarn build:extension
```

**Watch mode** (auto-recompile on save):

```bash
yarn watch:extension
```

**Package** (build + zip for distribution):

```bash
yarn package:extension
# outputs: adhd-agent-extension.zip
```

**Load in Chrome:**

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `extension/` folder
4. Click the extension icon → enter your email + supervisor email → Save

**After any code change:** run `yarn build:extension`, then click the refresh icon on the extension card in `chrome://extensions`.

---

## Scripts

| Script                   | What it does                           |
| ------------------------ | -------------------------------------- |
| `yarn dev`               | Next.js dev server                     |
| `yarn build`             | Production build                       |
| `yarn start`             | Start production server                |
| `yarn typecheck`         | TypeScript type check                  |
| `yarn lint`              | ESLint                                 |
| `yarn test`              | Jest                                   |
| `yarn build:extension`   | Compile extension TypeScript → `dist/` |
| `yarn watch:extension`   | Same, with file watching               |
| `yarn package:extension` | Build + zip extension for distribution |

---

## Environment Variables

Copy `.env_example` to `.env` and fill in:

```bash
NEXT_PUBLIC_APP_URL=               # Your Vercel URL
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

RESEND_API_KEY=
RESEND_FROM_ADDRESS=               # e.g. alerts@yourdomain.com

GEMINI_API_KEY=
```

---

## Deployment

**Vercel (Next.js app):**

1. Push to GitHub
2. Import repo at [vercel.com](https://vercel.com)
3. Add all `.env` variables in Vercel → Settings → Environment Variables
4. Vercel auto-deploys on every push to `main`

**Extension (public distribution):**

- Run `yarn package:extension` → upload `adhd-agent-extension.zip` to the [Chrome Web Store](https://chrome.google.com/webstore/devconsole) ($5 one-time fee)
- Same zip works for the [Microsoft Edge Add-ons store](https://partner.microsoft.com/dashboard) (free)
