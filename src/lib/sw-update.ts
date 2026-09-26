import { createSignal } from 'solid-js';

const UPDATE_REMIND_LATER_MILLIS = 60 * 60 * 1000;

export type UpdateCheckResult = 'available' | 'current' | 'unsupported';

const [registration, setRegistration] = createSignal<ServiceWorkerRegistration | null>(null, {
  name: 'sw_registration',
});

const [isUpdatePromptOpen, setIsUpdatePromptOpen] = createSignal(false, {
  name: 'sw_update_prompt_open',
});

export { registration, setRegistration, isUpdatePromptOpen };

let remindLaterTimer: ReturnType<typeof setTimeout> | undefined;

export function showUpdatePrompt() {
  clearTimeout(remindLaterTimer);
  setIsUpdatePromptOpen(true);
}

export function remindUpdateLater() {
  setIsUpdatePromptOpen(false);
  clearTimeout(remindLaterTimer);
  remindLaterTimer = setTimeout(showUpdatePrompt, UPDATE_REMIND_LATER_MILLIS);
}

function waitForInstall(worker: ServiceWorker): Promise<void> {
  return new Promise((resolve) => {
    const handleStateChange = () => {
      if (worker.state === 'installing') return;
      worker.removeEventListener('statechange', handleStateChange);
      resolve();
    };
    worker.addEventListener('statechange', handleStateChange);
  });
}

/**
 * Asks the browser to fetch the service worker script now and opens the update
 * prompt if a new version is waiting, including one dismissed with "Later".
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const reg = registration();
  if (!reg) return 'unsupported';

  await reg.update();
  if (reg.installing) await waitForInstall(reg.installing);

  if (reg.waiting) {
    showUpdatePrompt();
    return 'available';
  }
  return 'current';
}
