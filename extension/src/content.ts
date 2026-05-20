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
    'background:rgba(15,15,20,0.82);backdrop-filter:blur(4px);display:flex;' +
    'align-items:center;justify-content:center;pointer-events:all;';

  const card = document.createElement('div') as HTMLDivElement;
  card.style.cssText =
    'background:#ffffff;border-radius:20px;padding:40px 44px;max-width:520px;width:calc(100% - 48px);' +
    'text-align:center;box-shadow:0 24px 80px rgba(0,0,0,0.35);';

  const heading = document.createElement('h2') as HTMLHeadingElement;
  heading.textContent = 'Focus check-in';
  heading.style.cssText =
    'margin:0 0 6px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;' +
    'color:#6366f1;font-family:system-ui,sans-serif;';

  const msgEl = document.createElement('p') as HTMLParagraphElement;
  msgEl.textContent = message;
  msgEl.style.cssText =
    'margin:0 0 32px;font-size:20px;font-weight:500;color:#111827;line-height:1.55;' +
    'font-family:system-ui,sans-serif;';

  const btnRow = document.createElement('div') as HTMLDivElement;
  btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center;';

  const primaryBtn = document.createElement('button') as HTMLButtonElement;
  primaryBtn.textContent = "I'm back on task";
  primaryBtn.style.cssText =
    'padding:11px 22px;border:none;border-radius:10px;background:#6366f1;color:white;' +
    'font-size:14px;font-weight:600;cursor:pointer;font-family:system-ui,sans-serif;' +
    'transition:background 0.15s;';
  primaryBtn.onmouseenter = () => {
    primaryBtn.style.background = '#4f46e5';
  };
  primaryBtn.onmouseleave = () => {
    primaryBtn.style.background = '#6366f1';
  };

  const secondaryBtn = document.createElement('button') as HTMLButtonElement;
  secondaryBtn.textContent = 'Need a break';
  secondaryBtn.style.cssText =
    'padding:11px 22px;border:1.5px solid #e5e7eb;border-radius:10px;background:#f9fafb;color:#374151;' +
    'font-size:14px;font-weight:600;cursor:pointer;font-family:system-ui,sans-serif;' +
    'transition:background 0.15s;';
  secondaryBtn.onmouseenter = () => {
    secondaryBtn.style.background = '#f3f4f6';
  };
  secondaryBtn.onmouseleave = () => {
    secondaryBtn.style.background = '#f9fafb';
  };

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
      heading.textContent = 'Still there? — Your supervisor has been notified.';
    },
    2 * 60 * 1000
  );
}
