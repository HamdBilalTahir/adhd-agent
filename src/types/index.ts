// ── Firestore schema ──────────────────────────────────────────────────────────
// /users/{uid}                               → User
// /users/{uid}/status/current               → UserStatus
// /users/{uid}/events/{eventId}             → UserEvent
// /users/{uid}/settings/preferences         → UserSettings
// /relationships/{inviteCode}               → Relationship  (code is doc ID)
// /interventions/{id}                       → Intervention
// /taskBlocks/{id}                          → TaskBlock
// ─────────────────────────────────────────────────────────────────────────────

// ── /users/{uid} ─────────────────────────────────────────────────────────────

export type UserRole = 'supervisee' | 'supervisor';

export interface User {
  name: string;
  email: string;
  roles: UserRole[];
  createdAt: string;
}

// ── /users/{uid}/status/current ───────────────────────────────────────────────

export type DriftLevel = 'none' | 'low' | 'medium' | 'high';

export interface UserStatus {
  online: boolean;
  lastSeen: string;
  currentApp: string | null;
  tabCount: number;
  driftLevel: DriftLevel;
  currentTask: string | null;
  interventionMessage: string | null;
  supervisorAlerted: boolean;
  supervisorAlertedAt: string | null;
}

// ── /users/{uid}/events/{eventId} ─────────────────────────────────────────────

export type EventType =
  | 'tab_switch'
  | 'app_switch'
  | 'idle'
  | 'active'
  | 'distraction_detected'
  | 'task_started'
  | 'task_completed'
  | 'focus_session_started'
  | 'focus_session_ended'
  | 'supervisor_alerted';

export type EventSource = 'extension' | 'daemon';

export interface UserEvent {
  type: EventType;
  source: EventSource;
  metadata: Record<string, unknown>;
  timestamp: string;
}

// ── /users/{uid}/settings/preferences ────────────────────────────────────────

export type EscalationSensitivity = 'low' | 'medium' | 'high';
export type AgentTone = 'gentle' | 'neutral' | 'firm';

export interface UserSettings {
  escalationSensitivity: EscalationSensitivity;
  agentTone: AgentTone;
  focusHoursStart: string;
  focusHoursEnd: string;
  notifyEmail: boolean;
  notifySMS: boolean;
  supervisorEmail?: string;
  supervisorPhone?: string;
}

// ── /relationships/{inviteCode} ───────────────────────────────────────────────
// Document ID is the invite code itself for O(1) lookup on redemption.

export type RelationshipStatus = 'pending' | 'active' | 'revoked';

export interface Relationship {
  supervisorId: string;
  superviseeId: string | null; // null until code is redeemed
  status: RelationshipStatus;
  inviteCode: string;
  linkedAt: string | null; // null until active
  createdAt: string;
}

// ── /interventions/{id} ───────────────────────────────────────────────────────

export type InterventionLevel = 1 | 2 | 3;

export interface Intervention {
  userId: string;
  level: InterventionLevel;
  message: string;
  createdAt: string;
  respondedAt?: string;
  response?: string;
}

// ── /taskBlocks/{id} ─────────────────────────────────────────────────────────

export interface TaskBlock {
  userId: string;
  task: string;
  scheduledStart: string;
  scheduledEnd: string;
  completed: boolean;
  completedAt?: string;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/** Adds the Firestore document ID to any stored type when fetched client-side. */
export type WithId<T> = T & { id: string };

// ── Internal / computed types (not stored directly in Firestore) ───────────────

export type DriftPatternType =
  | 'distraction_streak'
  | 'idle_too_long'
  | 'off_task'
  | 'hyperfocus';

export interface DriftPattern {
  userId: string;
  detectedAt: string;
  type: DriftPatternType;
  severity: DriftLevel;
  durationMinutes: number;
  relatedEventIds: string[];
}
