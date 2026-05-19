import type { ExtensionSettings, SettingsUpdatedMessage } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

document.addEventListener('DOMContentLoaded', () => {
  const userInput = document.getElementById('userEmail') as HTMLInputElement;
  const supervisorInput = document.getElementById(
    'supervisorEmail'
  ) as HTMLInputElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const statusEl = document.getElementById('status') as HTMLDivElement;
  const userError = document.getElementById(
    'userEmailError'
  ) as HTMLSpanElement;
  const supervisorError = document.getElementById(
    'supervisorEmailError'
  ) as HTMLSpanElement;

  function setStatus(active: boolean): void {
    statusEl.textContent = active ? '● Active' : '● Not configured';
    statusEl.style.color = active ? '#16a34a' : '#dc2626';
  }

  chrome.storage.local.get(['userEmail', 'supervisorEmail']).then((result) => {
    const saved = result as Partial<ExtensionSettings>;
    if (saved.userEmail) userInput.value = saved.userEmail;
    if (saved.supervisorEmail) supervisorInput.value = saved.supervisorEmail;
    setStatus(!!(saved.userEmail && saved.supervisorEmail));
  });

  saveBtn.addEventListener('click', () => {
    userError.textContent = '';
    supervisorError.textContent = '';

    const userEmail = userInput.value.trim();
    const supervisorEmail = supervisorInput.value.trim();
    let valid = true;

    if (!userEmail) {
      userError.textContent = 'This field is required';
      valid = false;
    } else if (!EMAIL_RE.test(userEmail)) {
      userError.textContent = 'Enter a valid email address';
      valid = false;
    }

    if (!supervisorEmail) {
      supervisorError.textContent = 'This field is required';
      valid = false;
    } else if (!EMAIL_RE.test(supervisorEmail)) {
      supervisorError.textContent = 'Enter a valid email address';
      valid = false;
    }

    if (!valid) return;

    const settings: ExtensionSettings = {
      userEmail,
      supervisorEmail,
      savedAt: Date.now(),
    };
    chrome.storage.local.set(settings).then(() => {
      const msg: SettingsUpdatedMessage = { type: 'SETTINGS_UPDATED' };
      chrome.runtime.sendMessage(msg);
      setStatus(true);
      saveBtn.textContent = 'Saved ✓';
      setTimeout(() => {
        saveBtn.textContent = 'Save';
      }, 2000);
    });
  });
});
