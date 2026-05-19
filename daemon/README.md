# Desktop Daemon (Phase 2)

Placeholder for the desktop agent — a lightweight background process that monitors app-switch events and active application focus time on macOS/Windows.

## Planned responsibilities

- Detect application switches via OS accessibility APIs
- Report `app_switch` events to `/api/events`
- Optionally display focus reminders as native OS notifications

## Candidate technologies

| Option                    | Notes                                               |
| ------------------------- | --------------------------------------------------- |
| Electron                  | Easiest for cross-platform, heavier bundle          |
| Tauri (Rust)              | Lightweight, macOS/Windows, requires Rust toolchain |
| Swift (macOS only)        | Native, best OS integration on Mac                  |
| AutoHotkey (Windows only) | Scripting-only, narrow scope                        |

## Getting started

> Implementation not started. See `Architecture.md` for the overall system design.
