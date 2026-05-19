// Type-safe Firestore collection references for client-side code.
// API routes must use adminDb from firebase-admin.ts instead.

import { collection, type CollectionReference } from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile, UserEvent, Intervention, TaskBlock, Relationship } from '@/types';

export const userProfilesCol = () =>
  collection(db, 'userProfiles') as CollectionReference<UserProfile>;

export const eventsCol = () =>
  collection(db, 'events') as CollectionReference<UserEvent>;

export const interventionsCol = () =>
  collection(db, 'interventions') as CollectionReference<Intervention>;

export const taskBlocksCol = () =>
  collection(db, 'taskBlocks') as CollectionReference<TaskBlock>;

export const relationshipsCol = () =>
  collection(db, 'relationships') as CollectionReference<Relationship>;
