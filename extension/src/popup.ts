import type { ExtensionSettings, SettingsUpdatedMessage } from './types';
import { API_URL } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

document.addEventListener('DOMContentLoaded', () => {
  const firstNameInput = document.getElementById('firstName') as HTMLInputElement;
  const lastNameInput = document.getElementById('lastName') as HTMLInputElement;
  const userInput = document.getElementById('userEmail') as HTMLInputElement;
  const supervisorInput = document.getElementById('supervisorEmail') as HTMLInputElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const statusEl = document.getElementById('status') as HTMLDivElement;

  const firstNameError = document.getElementById('firstNameError') as HTMLSpanElement;
  const lastNameError = document.getElementById('lastNameError') as HTMLSpanElement;
  const userError = document.getElementById('userEmailError') as HTMLSpanElement;
  const supervisorError = document.getElementById('supervisorEmailError') as HTMLSpanElement;

  function setStatus(active: boolean): void {
    statusEl.textContent = active ? '● Active' : '● Not configured';
    statusEl.style.color = active ? '#16a34a' : '#dc2626';
  }

  chrome.storage.local
    .get(['firstName', 'lastName', 'userEmail', 'supervisorEmail'])
    .then((result) => {
      const saved = result as Partial<ExtensionSettings>;
      if (saved.firstName) firstNameInput.value = saved.firstName;
      if (saved.lastName) lastNameInput.value = saved.lastName;
      if (saved.userEmail) userInput.value = saved.userEmail;
      if (saved.supervisorEmail) supervisorInput.value = saved.supervisorEmail;
      setStatus(!!(saved.userEmail && saved.supervisorEmail && saved.firstName));
    });

  saveBtn.addEventListener('click', async () => {
    firstNameError.textContent = '';
    lastNameError.textContent = '';
    userError.textContent = '';
    supervisorError.textContent = '';

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const userEmail = userInput.value.trim();
    const supervisorEmail = supervisorInput.value.trim();
    let valid = true;

    if (!firstName) { firstNameError.textContent = 'Required'; valid = false; }
    if (!lastName) { lastNameError.textContent = 'Required'; valid = false; }
    if (!userEmail) {
      userError.textContent = 'Required';
      valid = false;
    } else if (!EMAIL_RE.test(userEmail)) {
      userError.textContent = 'Enter a valid email';
      valid = false;
    }
    if (!supervisorEmail) {
      supervisorError.textContent = 'Required';
      valid = false;
    } else if (!EMAIL_RE.test(supervisorEmail)) {
      supervisorError.textContent = 'Enter a valid email';
      valid = false;
    }

    if (!valid) return;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Activating…';

    const settings: ExtensionSettings = {
      firstName,
      lastName,
      userEmail,
      supervisorEmail,
      savedAt: Date.now(),
    };

    await chrome.storage.local.set(settings);
    const msg: SettingsUpdatedMessage = { type: 'SETTINGS_UPDATED' };
    chrome.runtime.sendMessage(msg);

    try {
      await fetch(`${API_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email: userEmail, supervisorEmail }),
      });
    } catch {
      // Non-blocking — settings are saved locally regardless
    }

    setStatus(true);
    saveBtn.textContent = 'Saved ✓';
    saveBtn.disabled = false;
    setTimeout(() => {
      saveBtn.textContent = 'Save & Activate';
    }, 2000);
  });
});
