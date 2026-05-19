// Type-safe Firestore collection and document references for client-side code.
// API routes must use adminDb from firebase-admin.ts instead.

import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  User,
  UserStatus,
  UserEvent,
  UserSettings,
  Relationship,
  Intervention,
  TaskBlock,
} from '@/types';

// ── Top-level collections ─────────────────────────────────────────────────────

export const usersCol = () =>
  collection(db, 'users') as CollectionReference<User>;

export const relationshipsCol = () =>
  collection(db, 'relationships') as CollectionReference<Relationship>;

export const interventionsCol = () =>
  collection(db, 'interventions') as CollectionReference<Intervention>;

export const taskBlocksCol = () =>
  collection(db, 'taskBlocks') as CollectionReference<TaskBlock>;

// ── Per-user documents ────────────────────────────────────────────────────────

export const userDoc = (userId: string) =>
  doc(db, 'users', userId) as DocumentReference<User>;

/** /users/{uid}/status/current — real-time supervisee status */
export const statusDoc = (userId: string) =>
  doc(
    db,
    'users',
    userId,
    'status',
    'current'
  ) as DocumentReference<UserStatus>;

/** /users/{uid}/settings/preferences — agent + notification config */
export const settingsDoc = (userId: string) =>
  doc(
    db,
    'users',
    userId,
    'settings',
    'preferences'
  ) as DocumentReference<UserSettings>;

// ── Per-user subcollections ───────────────────────────────────────────────────

/** /users/{uid}/events — append-only device event log */
export const eventsCol = (userId: string) =>
  collection(db, 'users', userId, 'events') as CollectionReference<UserEvent>;
