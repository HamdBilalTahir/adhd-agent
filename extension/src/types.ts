export interface ExtensionSettings {
  userEmail: string;
  supervisorEmail: string;
  savedAt: number;
  pausedUntil?: number;
}

export interface EventPayload {
  userEmail: string;
  supervisorEmail: string;
  tabCount: number;
  activeTabTitle: string;
  activeTabUrl: string;
  timestamp: number;
  responded?: boolean;
  response?: 'back_on_task' | 'break';
}

export interface ApiResponse {
  intervene: boolean;
  message?: string;
  level?: number;
}

export interface OverlayMessage {
  type: 'SHOW_OVERLAY';
  message: string;
  level: number;
}

export interface ResponseMessage {
  type: 'RESPONDED';
  response: 'back_on_task' | 'break';
}

export interface SettingsUpdatedMessage {
  type: 'SETTINGS_UPDATED';
}

export type ExtensionMessage =
  | OverlayMessage
  | ResponseMessage
  | SettingsUpdatedMessage;
