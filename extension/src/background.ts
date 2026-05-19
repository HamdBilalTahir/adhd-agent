import type {
  ExtensionSettings,
  EventPayload,
  ApiResponse,
  OverlayMessage,
  ExtensionMessage,
  ResponseMessage,
} from './types';

const API_URL = 'https://adhd-agent-system.vercel.app';

async function getSettings(): Promise<ExtensionSettings | null> {
  const result = await chrome.storage.local.get([
    'userEmail',
    'supervisorEmail',
    'pausedUntil',
    'savedAt',
  ]);
  if (!result['userEmail'] || !result['supervisorEmail']) return null;
  return {
    userEmail: result['userEmail'] as string,
    supervisorEmail: result['supervisorEmail'] as string,
    savedAt: result['savedAt'] as number,
    pausedUntil: result['pausedUntil'] as number | undefined,
  };
}

function isPaused(settings: ExtensionSettings): boolean {
  return !!settings.pausedUntil && settings.pausedUntil > Date.now();
}

async function sendOverlayToActiveTab(
  message: string,
  level: number
): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (tab?.id !== undefined) {
    const msg: OverlayMessage = { type: 'SHOW_OVERLAY', message, level };
    chrome.tabs.sendMessage(tab.id, msg);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('monitor', { periodInMinutes: 0.167 });
  console.log('ADHD Agent installed and monitoring');
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'monitor') return;

  const settings = await getSettings();
  if (!settings) return;
  if (isPaused(settings)) return;

  const tabs = await chrome.tabs.query({});
  const activeTab = tabs.find((t) => t.active);

  const payload: EventPayload = {
    userEmail: settings.userEmail,
    supervisorEmail: settings.supervisorEmail,
    tabCount: tabs.length,
    activeTabTitle: activeTab?.title ?? 'unknown',
    activeTabUrl: activeTab?.url ?? '',
    timestamp: Date.now(),
  };

  try {
    const res = await fetch(`${API_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as ApiResponse;
    if (data.intervene && data.message) {
      await sendOverlayToActiveTab(data.message, data.level ?? 2);
    }
  } catch (err) {
    console.error('[adhd-agent] fetch error:', err);
  }
});

async function handleResponded(msg: ResponseMessage): Promise<void> {
  const result = await chrome.storage.local.get(['userEmail']);
  const userEmail = result['userEmail'] as string;

  if (msg.response === 'break') {
    await chrome.storage.local.set({
      pausedUntil: Date.now() + 15 * 60 * 1000,
    });
  }

  try {
    await fetch(`${API_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail,
        responded: true,
        response: msg.response,
        timestamp: Date.now(),
      }),
    });
  } catch (err) {
    console.error('[adhd-agent] response post error:', err);
  }
}

chrome.runtime.onMessage.addListener((rawMsg: unknown) => {
  const msg = rawMsg as ExtensionMessage;
  if (msg.type === 'SETTINGS_UPDATED') {
    console.log('Settings updated — re-reading on next tick');
  } else if (msg.type === 'RESPONDED') {
    handleResponded(msg).catch((err) =>
      console.error('[adhd-agent] responded error:', err)
    );
  }
});
