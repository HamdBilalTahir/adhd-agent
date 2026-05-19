import type { ExtensionMessage, ResponseMessage } from './types';

chrome.runtime.onMessage.addListener((rawMsg: unknown) => {
  const msg = rawMsg as ExtensionMessage;
  if (msg.type !== 'SHOW_OVERLAY') return;
  showOverlay(msg.message, msg.level);
});

function playAlarmSound(): void {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.8);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function showOverlay(message: string, _level: number): void {
  document.getElementById('adhd-overlay')?.remove();

  let escalationTimer: ReturnType<typeof setTimeout> | null = null;

  const overlay = document.createElement('div') as HTMLDivElement;
  overlay.id = 'adhd-overlay';
  overlay.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;' +
    'background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;pointer-events:all;';

  const card = document.createElement('div') as HTMLDivElement;
  card.style.cssText =
    'background:white;border-radius:16px;padding:40px;max-width:480px;width:100%;text-align:center;';

  const heading = document.createElement('h2') as HTMLHeadingElement;
  heading.textContent = 'Hey. You still there?';
  heading.style.cssText =
    'margin:0 0 16px;font-size:24px;font-weight:700;color:#111;font-family:system-ui,sans-serif;';

  const msgEl = document.createElement('p') as HTMLParagraphElement;
  msgEl.textContent = message;
  msgEl.style.cssText =
    'margin:0 0 32px;font-size:16px;color:#444;line-height:1.5;font-family:system-ui,sans-serif;';

  const btnRow = document.createElement('div') as HTMLDivElement;
  btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;';

  const primaryBtn = document.createElement('button') as HTMLButtonElement;
  primaryBtn.textContent = "I'm back on task";
  primaryBtn.style.cssText =
    'padding:12px 24px;border:none;border-radius:8px;background:#2563eb;color:white;' +
    'font-size:15px;font-weight:600;cursor:pointer;font-family:system-ui,sans-serif;';

  const secondaryBtn = document.createElement('button') as HTMLButtonElement;
  secondaryBtn.textContent = 'Need a break';
  secondaryBtn.style.cssText =
    'padding:12px 24px;border:2px solid #d1d5db;border-radius:8px;background:white;color:#374151;' +
    'font-size:15px;font-weight:600;cursor:pointer;font-family:system-ui,sans-serif;';

  function blockEscape(e: KeyboardEvent): void {
    if (e.key === 'Escape') e.preventDefault();
  }

  function dismiss(response: 'back_on_task' | 'break'): void {
    if (escalationTimer !== null) clearTimeout(escalationTimer);
    document.removeEventListener('keydown', blockEscape);
    overlay.remove();
    const resp: ResponseMessage = { type: 'RESPONDED', response };
    chrome.runtime.sendMessage(resp);
  }

  primaryBtn.addEventListener('click', () => dismiss('back_on_task'));
  secondaryBtn.addEventListener('click', () => dismiss('break'));
  document.addEventListener('keydown', blockEscape);

  btnRow.append(primaryBtn, secondaryBtn);
  card.append(heading, msgEl, btnRow);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  escalationTimer = setTimeout(
    () => {
      if (!document.getElementById('adhd-overlay')) return;
      playAlarmSound();
      const styleEl = document.createElement('style') as HTMLStyleElement;
      styleEl.textContent =
        '@keyframes adhd-pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.7)}50%{box-shadow:0 0 0 16px rgba(239,68,68,0)}}';
      document.head.appendChild(styleEl);
      card.style.animation = 'adhd-pulse 1s ease infinite';
      card.style.border = '3px solid rgb(239,68,68)';
      heading.textContent = 'Still there? Your supervisor has been notified.';
    },
    2 * 60 * 1000
  );
}
