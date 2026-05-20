import type { ExtensionSettings, SettingsUpdatedMessage } from './types';
import { API_URL } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

document.addEventListener('DOMContentLoaded', () => {
  // Auth view elements
  const authView = document.getElementById('authView') as HTMLDivElement;
  const tabSignup = document.getElementById('tabSignup') as HTMLButtonElement;
  const tabLogin = document.getElementById('tabLogin') as HTMLButtonElement;
  const signupFields = document.getElementById(
    'signupFields'
  ) as HTMLDivElement;
  const supervisorField = document.getElementById(
    'supervisorField'
  ) as HTMLDivElement;
  const firstNameInput = document.getElementById(
    'firstName'
  ) as HTMLInputElement;
  const lastNameInput = document.getElementById('lastName') as HTMLInputElement;
  const userInput = document.getElementById('userEmail') as HTMLInputElement;
  const supervisorInput = document.getElementById(
    'supervisorEmail'
  ) as HTMLInputElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const firstNameError = document.getElementById(
    'firstNameError'
  ) as HTMLSpanElement;
  const lastNameError = document.getElementById(
    'lastNameError'
  ) as HTMLSpanElement;
  const userError = document.getElementById(
    'userEmailError'
  ) as HTMLSpanElement;
  const supervisorError = document.getElementById(
    'supervisorEmailError'
  ) as HTMLSpanElement;

  // Settings view elements
  const settingsView = document.getElementById(
    'settingsView'
  ) as HTMLDivElement;
  const settingsName = document.getElementById(
    'settingsName'
  ) as HTMLDivElement;
  const settingsEmail = document.getElementById(
    'settingsEmail'
  ) as HTMLDivElement;
  const settingsSupervisor = document.getElementById(
    'settingsSupervisor'
  ) as HTMLInputElement;
  const settingsSupervisorError = document.getElementById(
    'settingsSupervisorError'
  ) as HTMLSpanElement;
  const updateBtn = document.getElementById('updateBtn') as HTMLButtonElement;
  const signOutBtn = document.getElementById('signOutBtn') as HTMLButtonElement;

  const dashboardLink = document.getElementById(
    'dashboardLink'
  ) as HTMLAnchorElement;
  dashboardLink.href = API_URL;

  let mode: 'signup' | 'login' = 'signup';

  function showSettingsView(saved: Partial<ExtensionSettings>): void {
    authView.style.display = 'none';
    settingsView.style.display = '';
    const name = [saved.firstName, saved.lastName].filter(Boolean).join(' ');
    settingsName.textContent = name || '';
    settingsEmail.textContent = saved.userEmail ?? '';
    settingsSupervisor.value = saved.supervisorEmail ?? '';
  }

  function showAuthView(): void {
    authView.style.display = '';
    settingsView.style.display = 'none';
  }

  function setAuthMode(next: 'signup' | 'login'): void {
    mode = next;
    const isSignup = next === 'signup';
    tabSignup.classList.toggle('active', isSignup);
    tabLogin.classList.toggle('active', !isSignup);
    signupFields.style.display = isSignup ? '' : 'none';
    supervisorField.style.display = isSignup ? '' : 'none';
    saveBtn.textContent = isSignup ? 'Save & Activate' : 'Activate';
  }

  tabSignup.addEventListener('click', () => setAuthMode('signup'));
  tabLogin.addEventListener('click', () => setAuthMode('login'));

  // Load saved settings on open
  chrome.storage.local
    .get(['firstName', 'lastName', 'userEmail', 'supervisorEmail'])
    .then((result) => {
      const saved = result as Partial<ExtensionSettings>;
      if (saved.userEmail && saved.supervisorEmail) {
        showSettingsView(saved);
      } else {
        showAuthView();
      }
      // Pre-fill auth fields in case user partially filled before
      if (saved.firstName) firstNameInput.value = saved.firstName;
      if (saved.lastName) lastNameInput.value = saved.lastName;
      if (saved.userEmail) userInput.value = saved.userEmail;
      if (saved.supervisorEmail) supervisorInput.value = saved.supervisorEmail;
    });

  function notifyBackground(): void {
    const msg: SettingsUpdatedMessage = { type: 'SETTINGS_UPDATED' };
    chrome.runtime.sendMessage(msg);
  }

  // ── Auth view: save / activate ──
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

    if (mode === 'signup') {
      if (!firstName) {
        firstNameError.textContent = 'Required';
        valid = false;
      }
      if (!lastName) {
        lastNameError.textContent = 'Required';
        valid = false;
      }
      if (!supervisorEmail) {
        supervisorError.textContent = 'Required';
        valid = false;
      } else if (!EMAIL_RE.test(supervisorEmail)) {
        supervisorError.textContent = 'Enter a valid email';
        valid = false;
      }
    }
    if (!userEmail) {
      userError.textContent = 'Required';
      valid = false;
    } else if (!EMAIL_RE.test(userEmail)) {
      userError.textContent = 'Enter a valid email';
      valid = false;
    }
    if (!valid) return;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Activating…';

    if (mode === 'login') {
      try {
        const res = await fetch(
          `${API_URL}/api/profile?email=${encodeURIComponent(userEmail)}`
        );
        const data = (await res.json()) as {
          supervisorEmail?: string;
          error?: string;
        };
        if (!res.ok || !data.supervisorEmail) {
          userError.textContent =
            data.error ?? 'Account not found. Sign up first.';
          saveBtn.disabled = false;
          saveBtn.textContent = 'Activate';
          return;
        }
        const settings: ExtensionSettings = {
          firstName,
          lastName,
          userEmail,
          supervisorEmail: data.supervisorEmail,
          savedAt: Date.now(),
        };
        await chrome.storage.local.set(settings);
        notifyBackground();
        showSettingsView(settings);
      } catch {
        userError.textContent = 'Could not reach server. Try again.';
        saveBtn.disabled = false;
        saveBtn.textContent = 'Activate';
      }
      return;
    }

    // Signup
    const settings: ExtensionSettings = {
      firstName,
      lastName,
      userEmail,
      supervisorEmail,
      savedAt: Date.now(),
    };
    await chrome.storage.local.set(settings);
    notifyBackground();
    try {
      await fetch(`${API_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email: userEmail,
          supervisorEmail,
        }),
      });
    } catch {
      /* non-blocking */
    }
    showSettingsView(settings);
  });

  // ── Settings view: update supervisor ──
  updateBtn.addEventListener('click', async () => {
    settingsSupervisorError.textContent = '';
    const newSupervisor = settingsSupervisor.value.trim();

    if (!newSupervisor) {
      settingsSupervisorError.textContent = 'Required';
      return;
    }
    if (!EMAIL_RE.test(newSupervisor)) {
      settingsSupervisorError.textContent = 'Enter a valid email';
      return;
    }

    updateBtn.disabled = true;
    updateBtn.textContent = 'Saving…';

    const result = await chrome.storage.local.get([
      'firstName',
      'lastName',
      'userEmail',
    ]);
    const saved = result as Partial<ExtensionSettings>;

    const settings: ExtensionSettings = {
      firstName: saved.firstName ?? '',
      lastName: saved.lastName ?? '',
      userEmail: saved.userEmail ?? '',
      supervisorEmail: newSupervisor,
      savedAt: Date.now(),
    };
    await chrome.storage.local.set(settings);
    notifyBackground();

    // Update Firestore linkage
    try {
      await fetch(`${API_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: settings.firstName,
          lastName: settings.lastName,
          email: settings.userEmail,
          supervisorEmail: newSupervisor,
        }),
      });
    } catch {
      /* non-blocking */
    }

    updateBtn.textContent = 'Saved ✓';
    updateBtn.disabled = false;
    setTimeout(() => {
      updateBtn.textContent = 'Save changes';
    }, 2000);
  });

  // ── Settings view: sign out ──
  signOutBtn.addEventListener('click', async () => {
    await chrome.storage.local.clear();
    firstNameInput.value = '';
    lastNameInput.value = '';
    userInput.value = '';
    supervisorInput.value = '';
    setAuthMode('signup');
    showAuthView();
  });
});
