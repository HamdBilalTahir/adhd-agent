## 🗓️ **2026-05-20**

---

### ✨ Features

---

> ### Scaffold full app structure
>
> - **What changed:** Created the complete directory structure for the ADHD agent app — auth pages, supervisee/supervisor dashboards, onboarding flow, all API routes, shared lib files, TypeScript types, UI/dashboard/onboarding components, browser extension (MV3), and daemon placeholder.
> - **Why:** Established the full project skeleton so each layer can be implemented without structural decisions later.
> - **Files:**
>   - `src/types/index.ts`
>   - ~6 files in `src/lib/`
>   - ~6 files in `src/app/api/`
>   - ~10 files in `src/app/(auth)/`, `src/app/(dashboard)/`, `src/app/onboarding/`
>   - ~7 files in `src/components/ui/`, `src/components/dashboard/`, `src/components/onboarding/`
>   - `extension/manifest.json`, `extension/background.js`, `extension/content.js`
>   - `daemon/README.md`

---

> ### Firebase Auth — replace NextAuth with Firebase Authentication
>
> - **What changed:** Removed NextAuth (`next-auth`, `@auth/firebase-adapter` uninstalled). Replaced `src/app/api/auth/[...nextauth]/route.ts` with a 404 stub. Added `adminAuth` export to `lib/firebase-admin.ts` (using `firebase-admin/auth`). Created `lib/auth.ts` with a `verifyToken(req)` helper that reads `Authorization: Bearer <token>`, calls `adminAuth.verifyIdToken()`, and returns the `uid` — ready for any API route to enforce auth. Rewrote login and signup pages as `'use client'` components: email/password via `signInWithEmailAndPassword` / `createUserWithEmailAndPassword`, Google OAuth via `signInWithPopup`, inline error display, loading states, and redirect to `/onboarding` on success.
> - **Why:** Firebase Auth is already in the stack (client SDK exports `auth`); NextAuth added a second auth layer with no benefit. Consolidating on Firebase keeps the token model consistent across client, extension, and server.
> - **Files:**
>   - `src/lib/firebase-admin.ts`
>   - `src/lib/auth.ts`
>   - `src/app/(auth)/login/page.tsx`
>   - `src/app/(auth)/signup/page.tsx`
>   - `src/app/api/auth/[...nextauth]/route.ts`
>   - `package.json` (`next-auth`, `@auth/firebase-adapter` removed)

---

> ### Events API + pattern detection
>
> - **What changed:** Rewrote `POST /api/events` to accept the extension's heartbeat payload (`userId`, `tabCount`, `activeTabTitle`, `activeTabUrl`, `timestamp`), write a `tab_switch` event to the user's events subcollection, and update the status doc (`online`, `lastSeen`, `tabCount`, `currentApp`). Replaced the old `detectDrift` (which returned a `DriftPattern`) with a simpler function returning `{ level: 0-5 }` based on `tabCount` thresholds, upgrading to level 4/5 when the last intervention is unanswered. Route fetches the last 20 events and last intervention in parallel, returns `{ intervene: false }` for level < 2, or calls intervention logic and returns `{ intervene: true, message, level }` for level ≥ 2. Added a composite Firestore index on `interventions` (`userId ASC`, `createdAt DESC`).
> - **Why:** The extension needs a single endpoint to report activity and get back an immediate intervene/no-intervene decision — this is the real-time spine of the system.
> - **Files:**
>   - `src/app/api/events/route.ts`
>   - `src/lib/patterns.ts`
>   - `src/lib/intervention.ts`
>   - `firestore.indexes.json`

---

> ### ESLint — extension source files covered, chrome global, inline suppression
>
> - **What changed:** Added a dedicated ESLint flat-config block for `extension/src/**/*.ts`. Imports `globals.browser` (provides `console`, `fetch`, `setTimeout`, etc.) and adds `chrome: "readonly"` on top — eliminating the "File ignored because no matching configuration was supplied" warning and the `no-undef` errors that came from the service-worker globals. Added `extension/dist/` to the top-level `ignores` so compiled output is never linted. Added an inline `// eslint-disable-next-line @typescript-eslint/no-unused-vars` in `content.ts` above `showOverlay` to suppress the `_level` unused-parameter error at the call site rather than relaxing the rule project-wide.
> - **Why:** The extension lives outside `src/` so the existing Next.js-oriented config didn't cover it. Service-worker globals (`fetch`, `console`) aren't in the default ESLint environment, and `chrome` is extension-specific. The `_level` parameter is kept in the signature for type alignment with `OverlayMessage` but isn't used at runtime — a targeted inline suppress is more precise than a blanket `argsIgnorePattern`.
> - **Files:**
>   - `eslint.config.mjs`
>   - `extension/src/content.ts` (inline eslint-disable comment)

---

> ### Production domain wired up — Vercel deployment URL set
>
> - **What changed:** Set the production domain `https://adhd-agent-system.vercel.app` in two places: `API_URL` constant in `extension/src/background.ts` (controls where the extension posts heartbeat and response events) and `NEXT_PUBLIC_APP_URL` in `.env` (controls the check-in link in supervisor alert emails). Rebuilt the extension dist so the new URL is baked into `extension/dist/background.js`. Created `vercel.json` with `{ "github": { "silent": true } }` to suppress Vercel's automatic PR deployment comments on GitHub.
> - **Why:** Extension was pointing to a placeholder URL; alert emails were linking to localhost. Both now point to the live deployment.
> - **Files:**
>   - `extension/src/background.ts` (`API_URL` updated)
>   - `.env` (`NEXT_PUBLIC_APP_URL` updated)
>   - `vercel.json` (new)

---

> ### Browser Extension — TypeScript rewrite, overlay UI, heartbeat polling
>
> - **What changed:** Rewrote the entire extension in TypeScript (`extension/src/`). Deleted the old JS placeholders. Set up esbuild to compile all three entry points (`background.ts`, `content.ts`, `popup.ts`) to `extension/dist/` in one command — `build:extension` and `watch:extension` scripts added to root `package.json`. Added `extension/tsconfig.json` (ES2020, DOM lib, strict, no-emit). Added `@types/chrome` and `esbuild` as dev dependencies. Updated `manifest.json` to Manifest V3 with dist paths, `notifications` permission, and an `action` popup. Added `extension/dist/` to `.gitignore`. Shared types live in `extension/src/types.ts` (`ExtensionSettings`, `EventPayload`, `ApiResponse`, `OverlayMessage`, `ResponseMessage`, `SettingsUpdatedMessage`, `ExtensionMessage`). `background.ts`: creates a `monitor` alarm (every 10 seconds), reads `userEmail`/`supervisorEmail` from `chrome.storage.local` on each tick, skips if settings missing or `pausedUntil` is in the future, queries all open tabs, posts `EventPayload` to `/api/events`, sends `SHOW_OVERLAY` to the active tab if the response has `intervene: true`. Handles `RESPONDED` — `back_on_task` sends a confirmation event; `break` sets `pausedUntil: now + 15 min` and sends a break event. `content.ts`: listens for `SHOW_OVERLAY`, injects a full-screen dark overlay with the AI-generated message and two buttons. Escape key is blocked while overlay is present. After 2 minutes with no response: plays a Web Audio API beep (no external file), adds a pulsing red border via injected keyframe CSS, and updates the heading to "Still there? Your supervisor has been notified." `popup.ts`: pre-fills saved emails on load, validates both fields with a regex before saving, writes to `chrome.storage.local`, sends `SETTINGS_UPDATED` to background, shows green Active / red Not configured status. `popup.html`: 280px fixed-width, two labeled email inputs, inline error spans, save button, status line — no external libraries.
> - **Why:** The JS placeholders were stubs with no overlay, no settings UI, and no two-way communication. The TypeScript rewrite is the full monitoring loop: heartbeat → drift detection → overlay → user response → pause or confirm.
> - **Files:**
>   - `extension/src/types.ts` (new)
>   - `extension/src/background.ts` (new, replaces `background.js`)
>   - `extension/src/content.ts` (new, replaces `content.js`)
>   - `extension/src/popup.ts` (new)
>   - `extension/popup.html` (new)
>   - `extension/tsconfig.json` (new)
>   - `extension/manifest.json`
>   - `package.json` (`build:extension`, `watch:extension` scripts; `esbuild`, `@types/chrome` added)
>   - `.gitignore` (`extension/dist/` added)

---

> ### Alert API — supervisor email notification with 30-minute dedup
>
> - **What changed:** Rewrote `POST /api/alert` as a standalone supervisor notification endpoint. Accepts `{ userId, driftLevel, currentApp, minutesOffTask }`. Deduplicates against `status.supervisorAlertedAt` — skips the alert with reason `'cooldown'` if a notification was sent within the last 30 minutes. Writes a `supervisor_alerted` event to the user's events subcollection. Updates `status/current` with `supervisorAlerted: true` and `supervisorAlertedAt`. Sends an HTML email via Resend (`alerts@kuailabs.ai`) with the user's name, current app, drift level, minutes off task, and a link to the supervisor dashboard. Supervisor email is a TODO — currently `null` and will be looked up from the Firestore relationship once supervisor accounts exist (removed `SUPERVISOR_EMAIL` from env). Updated `src/types/index.ts`: added `supervisor_alerted` to `EventType`, added `supervisorAlerted` and `supervisorAlertedAt` to `UserStatus`.
> - **Why:** Supervisors need a reliable, non-spammy out-of-band notification when a supervisee is persistently off task; the 30-minute cooldown prevents inbox flooding during a single distraction session.
> - **Files:**
>   - `src/app/api/alert/route.ts`
>   - `src/lib/notify.ts`
>   - `src/types/index.ts`
>   - `.env`, `.env_example` (`SUPERVISOR_EMAIL` removed, `RESEND_FROM_ADDRESS=alerts@kuailabs.ai`)

---

> ### Intervention API — Gemini-powered messages, escalation, supervisor alerts
>
> - **What changed:** Replaced the Anthropic SDK with LangChain (`@langchain/google-genai`) using model `gemini-3.1-pro-preview` and `GEMINI_API_KEY`. Rewrote the Claude prompt to be level-aware: each drift level (2–5) gets a distinct escalation instruction in the system prompt, and the user prompt includes tab count, active tab title, drift level, current task, and time of day. Extracted all intervention creation logic to `lib/intervention.ts` (`createIntervention`) so both `POST /api/intervene` and the events route share one path. Extracted alert-sending logic to `lib/alert.ts` (`triggerAlert`) — saves to the `alerts` collection and dispatches email/SMS via `lib/notify.ts`; called automatically when level ≥ 4. Updated `POST /api/intervene` to accept `{ userId, driftLevel, tabCount, activeTabTitle, currentTask }` and return `{ intervene: true, message, level }`. Simplified `POST /api/alert` to delegate to `lib/alert.ts`.
> - **Why:** Messages must feel human and context-aware, not generic; supervisor notification must fire automatically at high escalation without a separate caller.
> - **Files:**
>   - `src/lib/claude.ts`
>   - `src/lib/intervention.ts`
>   - `src/lib/alert.ts`
>   - `src/app/api/intervene/route.ts`
>   - `src/app/api/alert/route.ts`
>   - `src/app/api/events/route.ts`
>   - `package.json` (`@langchain/google-genai`, `@langchain/core` added)

---

> ### Firebase setup — client SDK, Admin SDK, Firestore schema, security rules
>
> - **What changed:** Wired up Firebase end-to-end: client SDK with env-var validation, Admin SDK for server-side API routes, typed collection helpers, and Firestore security rules. Updated all types to match the final Firestore schema (`UserStatus`, `UserEvent`, `UserSettings`, `Relationship`, `Intervention`, `TaskBlock`, `WithId<T>`). Migrated all API routes from client SDK to Admin SDK with correct subcollection paths. Wrote `firestore.rules` enforcing per-user data isolation with supervisor read-access via relationship check.
> - **Why:** Nothing in the app can be built without a connected, secured database — this is the foundation all other tasks depend on.
> - **Files:**
>   - `src/lib/firebase.ts`, `src/lib/firebase-admin.ts`, `src/lib/collections.ts`
>   - `src/lib/patterns.ts`, `src/lib/claude.ts`, `src/lib/invite.ts`
>   - `src/types/index.ts`
>   - `firestore.rules`, `firebase.json`, `firestore.indexes.json`
>   - `src/components/dashboard/TaskCard.tsx`, `src/components/dashboard/EventFeed.tsx`
>   - `src/app/(dashboard)/supervisee/settings/page.tsx`, `src/app/(dashboard)/supervisee/tasks/page.tsx`
>   - ~5 files in `src/app/api/`
>   - `.env`, `.env_example`

---

## 🗓️ **2026-03-12**

---

### ✨ Features

---

> ### Setup Next.js App
>
> - **What changed:** Initialized Next.js app with Tailwind, ESLint, Husky, lint-staged, and Jest.
> - **Why:** To setup the frontend application as requested.
> - **Files:**
>   - `package.json`
>   - `eslint.config.mjs`
>   - `jest.config.ts`
>   - `src/app/page.test.tsx`
