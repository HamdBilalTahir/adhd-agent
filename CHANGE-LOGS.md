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

> ### Schema migration — flat collections, extension signup with name fields
>
> - **What changed:** Full Firestore schema redesign. All collections are now flat top-level collections with auto-generated doc IDs and `userId` as a foreign key field (Firebase Auth UID). Removed nested subcollections (`users/{uid}/events`, `users/{uid}/status`, `users/{uid}/settings`). Merged `userMonitoring` into `events` (heartbeats are `type: 'heartbeat'` events). Final collections: `userProfiles`, `events`, `interventions`, `alerts`, `sessions`, `activityLogs`, `taskBlocks`, `relationships`. Updated `src/types/index.ts` — replaced `User`/`UserStatus`/`UserSettings` with `UserProfile`, `UserEvent`, `Alert`, `Session`, `ActivityLog`. Updated all files that referenced the old schema: `DashboardShell`, `page.tsx`, `onboarding/supervisor`, `supervisor/page.tsx`, `lib/collections.ts`, `lib/intervention.ts`, `lib/alert.ts`, `lib/claude.ts`, all API routes. Rewrote `firestore.rules` and `firestore.indexes.json` for the new flat structure. Extension popup now collects First Name and Last Name. On "Save & Activate" the popup calls `POST /api/signup` to create accounts for both the supervisee and supervisor, link them via `supervisorId`, and send a welcome email to the supervisee and a "claim your account" email to new supervisors. New `POST /api/signup` route handles the full account-creation flow. `API_URL` moved to `extension/src/types.ts` as a shared constant. Fixed production 400 errors on `POST /api/events` — the deployed API expected `userId` but the extension sends `userEmail`; the route now accepts email-based payloads and auto-creates/links accounts on every heartbeat.
> - **Why:** The old nested subcollection structure made cross-user queries (e.g. "show all supervisees for this supervisor") require collection group indexes and complex paths. Flat collections with `userId` as a foreign key are simpler to query, index, and reason about. The extension signup flow means anyone can onboard just from the extension without ever touching the web app.
> - **Files:**
>   - `src/types/index.ts` (full rewrite)
>   - `src/app/api/events/route.ts`
>   - `src/app/api/signup/route.ts` (new)
>   - `src/app/api/alert/route.ts`
>   - `src/app/api/settings/route.ts`
>   - `src/lib/collections.ts`
>   - `src/lib/intervention.ts`
>   - `src/lib/alert.ts`
>   - `src/lib/claude.ts`
>   - `src/components/dashboard/DashboardShell.tsx`
>   - `src/components/dashboard/EventFeed.tsx`
>   - `src/app/page.tsx`
>   - `src/app/onboarding/supervisor/page.tsx`
>   - `src/app/(dashboard)/supervisor/page.tsx`
>   - `src/app/(dashboard)/supervisee/settings/page.tsx`
>   - `extension/src/types.ts`
>   - `extension/src/background.ts`
>   - `extension/src/popup.ts`
>   - `extension/popup.html`
>   - `firestore.rules`
>   - `firestore.indexes.json`

---

> ### Auto-create accounts from extension heartbeat; supervisor claim email
>
> - **What changed:** Rewrote `POST /api/events` to accept `{ userEmail, supervisorEmail, ... }` instead of `{ userId, ... }`. On every heartbeat the route calls `getOrCreateUser()` for both emails: if a Firebase Auth account doesn't exist it creates one via `adminAuth.createUser`, writes a `/users/{uid}` Firestore doc with `{ email, roles, supervisorEmail, createdAt, claimed: false }`, and updates `supervisorEmail` on existing accounts if it changed. The supervisee's account creation is the extension form submission — no email sent. If the supervisor's account is new (they were passively referenced), a "claim your account" email is sent via Resend containing a Firebase password-reset link so they can set a password and access the dashboard. Added `supervisorEmail?: string` and `claimed?: boolean` to the `User` type. Updated Firestore index from a collection-group query on `settings` to a simple collection query on `users.supervisorEmail`, matching how the supervisor dashboard queries.
> - **Why:** Previously the extension had no way to create accounts — it required a pre-existing `userId`. Now anyone can install the extension, fill in their email and their supervisor's email, and both accounts are wired up automatically. The supervisor just receives an email and logs in to find their supervisee already there.
> - **Files:**
>   - `src/app/api/events/route.ts`
>   - `src/types/index.ts` (`supervisorEmail`, `claimed` added to `User`)
>   - `firestore.indexes.json` (collection-group `settings` index → collection `users` index)

---

> ### Supervisor dashboard — live query from Firestore instead of placeholder data
>
> - **What changed:** Replaced the hardcoded placeholder supervisee list with a real Firestore query. The page is now a client component that subscribes to `onAuthStateChanged`, then runs `onSnapshot` on `/users` where `supervisorEmail == currentUser.email`. For each matching doc it fetches the user's `/status/current` subcollection and maps `driftLevel` + `online` to the on-track / drifting / offline badge. Shows skeleton loaders while loading and an empty-state message with instructions when no supervisees exist yet. `timeAgo()` helper formats `lastSeen` as relative time.
> - **Why:** The page was showing fake data; supervisors need to see real people who have listed them as their supervisor via the extension.
> - **Files:**
>   - `src/app/(dashboard)/supervisor/page.tsx`

---

> ### Onboarding — supporter role writes to Firestore and redirects; back buttons
>
> - **What changed:** Rewrote the supervisor onboarding page (`/onboarding/supervisor`) as a client component. On mount it waits for `onAuthStateChanged`, then `setDoc`s `{ roles: ['supervisor'] }` (merge) onto the user doc and immediately redirects to `/supervisor` — no invite-code step. Added "← Back" links to both onboarding sub-pages (`/onboarding/supervisee` and `/onboarding/supervisor`) pointing back to `/onboarding`.
> - **Why:** The supporter onboarding was showing an invite-code form that blocks access to the dashboard; the invite flow is deferred. Users also had no way to go back to the role selection screen.
> - **Files:**
>   - `src/app/onboarding/supervisor/page.tsx`
>   - `src/app/onboarding/supervisee/page.tsx`

---

> ### Fix dark mode browser overrides on login page
>
> - **What changed:** Removed the Next.js boilerplate `@media (prefers-color-scheme: dark)` block from `globals.css` that was flipping `--background`/`--foreground` CSS vars — this caused body background to go near-black and all text and form controls to invert in dark-mode browsers. Replaced the whole CSS-var pattern with a single `color-scheme: light` on `body`, which tells the browser to always render native form controls (inputs, buttons, scrollbars) in light mode. Added explicit `bg-white text-gray-900 placeholder-gray-400` to the `Input` component so the input background is always white regardless of browser theme. Firebase env-var fix: removed the dynamic `process.env[key]` validation loop from `firebase.ts` — Turbopack only inlines `NEXT_PUBLIC_*` vars via literal property access, so the loop always evaluated to `undefined` and threw on every page load; the actual `firebaseConfig` object already uses literal accesses so it was always correct. Also removed the manual `.env` parser from `next.config.ts` since Next.js 16 loads `.env` natively (confirmed by the `- Environments: .env` startup log line).
> - **Why:** The dark-mode CSS-var block was boilerplate left over from `create-next-app` — the app has no dark mode. The dynamic `process.env` loop was the root cause of the "Missing required env var" crash on every cold load.
> - **Files:**
>   - `src/app/globals.css`
>   - `src/components/ui/Input.tsx`
>   - `src/lib/firebase.ts`
>   - `next.config.ts`

---

> ### Auth — Firestore session tracking, magic link login, routing persistence
>
> - **What changed:** Added three new auth capabilities. (1) **Firestore sessions**: `src/lib/session.ts` — `createSession()` generates a UUID, writes a `/sessions/{id}` doc (`userId`, `email`, `createdAt`, `lastSeenAt`, `active: true`) and stores the ID in a `adhd_session` cookie (7-day max-age). `endSession()` marks the doc `active: false` + `endedAt` timestamp instead of deleting it, then clears the cookie. Login and Google auth both call `createSession()` on success. (2) **Magic link login**: added a passwordless email section at the bottom of the login page — sends `sendSignInLinkToEmail` with `NEXT_PUBLIC_APP_URL/login` as the redirect, stores the email in `localStorage`. On page load, `useEffect` detects `isSignInWithEmailLink`, reads the saved email, calls `signInWithEmailLink`, creates the session, and redirects to `/`. (3) **Auth persistence on all routes**: moved auth gate from `src/middleware.ts` to `src/proxy.ts` using the Next.js 16 `proxy` convention (`export function proxy`). Added `src/app/not-found.tsx` — a client component that redirects all 404s to `/`, which in turn routes to the correct dashboard or login. Fixed Turbopack not loading `.env` by adding explicit `readFileSync('.env')` parsing in `next.config.ts`.
> - **Why:** Cookie-only sessions had no audit trail; Firestore sessions enable session history and future invalidation. Magic link removes the password requirement for users who prefer it. The proxy rename was required by Next.js 16 (deprecated `middleware` convention); without it auth was bypassed on every route.
> - **Files:**
>   - `src/lib/session.ts` (new)
>   - `src/app/(auth)/login/page.tsx` (magic link section added)
>   - `src/proxy.ts` (renamed from `src/middleware.ts`; `proxy` export)
>   - `src/app/not-found.tsx` (new)
>   - `next.config.ts` (explicit `.env` parsing for Turbopack)

---

> ### Extension packaging fixes — icon removed, fresh zip on every build
>
> - **What changed:** Removed `icons` and `default_icon` fields from `extension/manifest.json` — the `icons/` folder doesn't exist yet, which caused Chrome to reject the manifest with "Could not load icon" on Load unpacked. Chrome now shows the default puzzle-piece icon. Updated the `package:extension` script to `rm -f adhd-agent-extension.zip` before zipping so every run produces a guaranteed fresh zip with no stale files carried over.
> - **Why:** The missing icon blocked the extension from loading entirely. The `rm -f` guard prevents the zip from silently containing outdated files if esbuild output changes.
> - **Files:**
>   - `extension/manifest.json` (icon fields removed)
>   - `package.json` (`package:extension` script updated)

---

> ### Dashboard shell and routing — auth gate, role-aware nav, skeleton
>
> - **What changed:** Created the dashboard layout shell that wraps all pages under the `(dashboard)` route group. `src/app/(dashboard)/layout.tsx` is a thin RSC that renders `DashboardShell`. `src/components/dashboard/DashboardShell.tsx` is a `'use client'` component that: runs `onAuthStateChanged` on mount — if no Firebase user, redirects to `/login`; fetches `users/{uid}` from Firestore — if doc missing or no roles, redirects to `/onboarding`; shows a skeleton layout with `animate-pulse` while auth resolves so the screen never flashes empty. Once authenticated, renders a fixed sidebar (collapses behind a hamburger on mobile with a dark backdrop overlay), a topnav with app name, user email, and a Sign out button. Sidebar navigation is role-aware: supervisees get a "Focus" section (Home, Activity, Settings); supervisors get a "Supervise" section (My Supervisees, Alerts, Settings); users with both roles see both sections with a divider between them. Active link is highlighted in blue — home nav items use exact path match, nested items use prefix match to stay highlighted on child routes. Rewrote `src/app/page.tsx` as a client-side redirect: resolves auth + Firestore roles and routes supervisees to `/supervisee`, supervisors to `/supervisor`, and unauthenticated users to `/login`. Updated root layout metadata from the Next.js boilerplate defaults to "ADHD Agent".
> - **Why:** Without a shell, each dashboard page would need its own auth check, nav, and layout — the shell centralises all of that in one place and ensures no dashboard page is ever reachable unauthenticated.
> - **Files:**
>   - `src/components/dashboard/DashboardShell.tsx` (new)
>   - `src/app/(dashboard)/layout.tsx` (new)
>   - `src/app/page.tsx` (rewritten — role-based redirect)
>   - `src/app/layout.tsx` (metadata updated)

---

> ### README and Architecture.md — full rewrite for ADHD Agent
>
> - **What changed:** Replaced the generic Next.js boilerplate content in both files with project-specific documentation. `README.md` now covers what the app does, the full monitoring flow (extension → API → Gemini → overlay → supervisor email), tech stack table, prerequisites, setup steps, all extension commands (`build:extension`, `watch:extension`, `package:extension`), scripts reference, environment variables, and deployment instructions for both Vercel and the Chrome Web Store. `Architecture.md` is a complete rewrite with 14 sections: system overview, high-level architecture diagram showing the full data flow from extension alarm through Firestore to Resend, tech stack, project structure (actual file tree), browser extension internals and message flow, all three API routes with request/response shapes, drift detection level table (0–5), intervention pipeline (`createIntervention` → Gemini → Firestore → `triggerAlert`), supervisor alert dedup logic, Firebase Auth setup, full Firestore schema with key type definitions, environment variable reference table, build toolchain, and deployment.
> - **Why:** Both files still described a generic Next.js boilerplate — useless to anyone onboarding to or contributing to this project.
> - **Files:**
>   - `README.md`
>   - `Architecture.md`

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
