import { createSignal, For, Match, onSettled, Show, Switch } from 'solid-js';
import { ApiError } from '../lib/api';
import {
  currentUser,
  deleteAccount,
  downloadCloudArchive,
  fetchProviders,
  isSignedIn,
  signIn,
  signOut,
  signOutEverywhere,
  type Provider,
} from '../lib/auth';
import { cloudTemplates } from '../lib/cloud-store';

interface AccountDialogProps {
  onClose: () => void;
}

const buttonClass =
  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors';

/** Sign-in provider list, or account actions when signed in. */
export default function AccountDialog(props: AccountDialogProps) {
  const [providers, setProviders] = createSignal<Provider[] | null>(null, { name: 'providers' });
  const [error, setError] = createSignal<string | null>(null, { name: 'account_error' });
  const [busy, setBusy] = createSignal(false, { name: 'account_busy' });
  const [confirmingDelete, setConfirmingDelete] = createSignal(false, { name: 'confirm_delete' });
  const [acknowledged, setAcknowledged] = createSignal(false, { name: 'delete_acknowledged' });

  const run = async (action: () => Promise<void>, closeAfter = true) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (closeAfter) props.onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  onSettled(() => {
    if (isSignedIn()) return;
    fetchProviders()
      .then(setProviders)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Couldn’t load sign-in options.'));
  });

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div
        class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
      >
        <div class="flex items-center justify-between">
          <h2 id="account-title" class="font-bold text-sm text-slate-900 dark:text-white">
            {isSignedIn() ? (confirmingDelete() ? 'Delete account' : 'Account') : 'Sign in'}
          </h2>
          <button
            type="button"
            onClick={() => props.onClose()}
            class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <span class="i-lucide-x w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <Switch>
          <Match when={!isSignedIn()}>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Sign in to use the Cloud Library. Your Local Library stays on this device.
            </p>
            <Show
              when={providers()}
              fallback={
                <Show when={!error()}>
                  <p class="text-xs text-slate-400">Loading…</p>
                </Show>
              }
            >
              {(list) => (
                <div class="space-y-2">
                  <For each={list()}>
                    {(p) => (
                      <button
                        type="button"
                        onClick={() => signIn(p)}
                        class={[buttonClass, 'border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200']}
                      >
                        <span class="i-lucide-log-in w-4 h-4 text-slate-500" aria-hidden="true" />
                        Continue with {p.label}
                      </button>
                    )}
                  </For>
                </div>
              )}
            </Show>
          </Match>

          <Match when={confirmingDelete()}>
            <p class="text-xs text-slate-600 dark:text-slate-400">
              This deletes your account and its {cloudTemplates().length}{' '}
              {cloudTemplates().length === 1 ? 'cloud template' : 'cloud templates'}. Your Local
              Library isn’t affected. This can’t be undone.
            </p>
            <button
              type="button"
              disabled={busy()}
              onClick={() => run(downloadCloudArchive, false)}
              class={[buttonClass, 'border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 disabled:opacity-50']}
            >
              <span class="i-lucide-archive w-4 h-4 text-slate-500" aria-hidden="true" />
              Download Cloud Library (.zip)
            </button>
            <label class="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged()}
                onChange={(e) => setAcknowledged(e.currentTarget.checked)}
                class="mt-0.5 accent-rose-600"
              />
              I understand my cloud templates will be permanently deleted.
            </label>
            <div class="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                class="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!acknowledged() || busy()}
                onClick={() => run(deleteAccount)}
                class="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg"
              >
                Delete account
              </button>
            </div>
          </Match>

          <Match when={currentUser()}>
            {(user) => (
              <>
                <div class="flex items-center gap-3">
                  <Avatar size="w-10 h-10" />
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {user().name ?? user().email}
                    </div>
                    <div class="text-xs text-slate-500 dark:text-slate-400 truncate">{user().email}</div>
                  </div>
                </div>
                <div class="space-y-1">
                  <button
                    type="button"
                    disabled={busy()}
                    onClick={() => run(signOut)}
                    class={[buttonClass, 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200']}
                  >
                    <span class="i-lucide-log-out w-4 h-4 text-slate-500" aria-hidden="true" />
                    Sign out
                  </button>
                  <button
                    type="button"
                    disabled={busy()}
                    onClick={() => run(signOutEverywhere)}
                    class={[buttonClass, 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200']}
                  >
                    <span class="i-lucide-monitor-off w-4 h-4 text-slate-500" aria-hidden="true" />
                    Sign out on all devices
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    class={[buttonClass, 'hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400']}
                  >
                    <span class="i-lucide-trash-2 w-4 h-4" aria-hidden="true" />
                    Delete account…
                  </button>
                </div>
              </>
            )}
          </Match>
        </Switch>

        <Show when={error()}>
          <p class="text-xs text-rose-600 dark:text-rose-400">{error()}</p>
        </Show>
      </div>
    </div>
  );
}

/** Profile picture, or the user's initial. */
export function Avatar(props: { size: string }) {
  const initial = () => (currentUser()?.name ?? currentUser()?.email ?? '?').charAt(0).toUpperCase();
  return (
    <Show
      when={currentUser()?.picture}
      fallback={
        <span
          class={[props.size, 'shrink-0 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold']}
          aria-hidden="true"
        >
          {initial()}
        </span>
      }
    >
      {(src) => (
        <img
          src={src()}
          alt=""
          referrerpolicy="no-referrer"
          class={[props.size, 'shrink-0 rounded-full object-cover']}
        />
      )}
    </Show>
  );
}
