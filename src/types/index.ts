// ── Firestore collections (all flat, auto-generated doc IDs) ─────────────────
// /userProfiles/{docId}          userId (auth UID FK), firstName, lastName, email, roles, supervisorId, superviseeIds
// /events/{docId}                userId, type, source, metadata, createdAt
// /interventions/{docId}         userId, level, message, createdAt, respondedAt?, response?
// /alerts/{docId}                userId, supervisorId, channel, sentAt
// /sessions/{docId}              userId, email, active, createdAt, lastSeenAt, endedAt?
// /activityLogs/{docId}          userId?, endpoint?, type, source, payload?, result?, durationMs?, createdAt
// /taskBlocks/{docId}            userId, task, scheduledStart, scheduledEnd, completed
// /relationships/{docId}         supervisorId, superviseeId, status, createdAt
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'supervisee' | 'supervisor';

// ── /userProfiles/{docId} ─────────────────────────────────────────────────────

export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: UserRole[];
  supervisorId?: string;
  superviseeIds?: string[];
  createdAt: string;
  claimed: boolean;
  notifyEmail?: boolean;
  notifySMS?: boolean;
  supervisorPhone?: string;
}

// ── /events/{docId} ──────────────────────────────────────────────────────────

export type DriftLevel = 'none' | 'low' | 'medium' | 'high';

export type EventType =
  | 'heartbeat'
  | 'tab_switch'
  | 'app_switch'
  | 'idle'
  | 'active'
  | 'distraction_detected'
  | 'task_started'
  | 'task_completed'
  | 'focus_session_started'
  | 'focus_session_ended'
  | 'supervisor_alerted'
  | 'intervention_triggered'
  | 'session_created'
  | 'session_ended'
  | 'user_signup';

export type EventSource = 'extension' | 'daemon' | 'web' | 'server';

export interface UserEvent {
  userId: string;
  type: EventType;
  source: EventSource;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ── /interventions/{docId} ───────────────────────────────────────────────────

export type InterventionLevel = 1 | 2 | 3;

export interface Intervention {
  userId: string;
  level: InterventionLevel;
  message: string;
  createdAt: string;
  respondedAt?: string;
  response?: string;
}

// ── /alerts/{docId} ──────────────────────────────────────────────────────────

export interface Alert {
  userId: string;
  supervisorId: string;
  message: string;
  level: number;
  severity: 'medium' | 'high';
  channel: 'email' | 'sms' | 'both';
  sentAt: string;
}

// ── /sessions/{docId} ────────────────────────────────────────────────────────

export interface Session {
  userId: string;
  email: string;
  createdAt: string;
  lastSeenAt: string;
  active: boolean;
  endedAt?: string;
}

// ── /activityLogs/{docId} ────────────────────────────────────────────────────

export interface ActivityLog {
  userId?: string;
  endpoint?: string;
  type: EventType | string;
  source: EventSource;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  durationMs?: number;
  createdAt: string;
}

// ── /taskBlocks/{docId} ──────────────────────────────────────────────────────

export interface TaskBlock {
  userId: string;
  task: string;
  scheduledStart: string;
  scheduledEnd: string;
  completed: boolean;
  completedAt?: string;
}

// ── /relationships/{docId} ───────────────────────────────────────────────────

export type RelationshipStatus = 'pending' | 'active' | 'revoked';

export interface Relationship {
  supervisorId: string;
  superviseeId: string | null;
  status: RelationshipStatus;
  inviteCode: string;
  linkedAt: string | null;
  createdAt: string;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export type WithId<T> = T & { id: string };

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
