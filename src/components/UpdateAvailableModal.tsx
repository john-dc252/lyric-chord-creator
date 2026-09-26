import { createSignal, onSettled } from 'solid-js';

interface UpdateAvailableModalProps {
  onUpdate: () => Promise<void>;
  onLater: () => void;
}

export default function UpdateAvailableModal(props: UpdateAvailableModalProps) {
  let updateButtonRef: HTMLButtonElement | undefined;
  const [updating, setUpdating] = createSignal(false, { name: 'sw_updating' });

  onSettled(() => {
    updateButtonRef?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !updating()) props.onLater();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await props.onUpdate();
    } catch (error) {
      console.error('@Lyric-Chord Creator - Service worker update failed', error);
      setUpdating(false);
    }
  };

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !updating()) props.onLater();
      }}
    >
      <div
        class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 modal-content"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="update-modal-title"
        aria-describedby="update-modal-description"
      >
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <span class="i-lucide-refresh-cw w-4 h-4" aria-hidden="true" />
          </div>
          <h2 id="update-modal-title" class="font-bold text-sm text-slate-900 dark:text-white">
            Update Available
          </h2>
        </div>
        <p id="update-modal-description" class="text-xs text-slate-600 dark:text-slate-400">
          Updating reloads the app. Unsaved changes will be lost.
        </p>
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={updating()}
            onClick={() => props.onLater()}
            class="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            Later
          </button>
          <button
            type="button"
            ref={(el) => (updateButtonRef = el)}
            disabled={updating()}
            onClick={handleUpdate}
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg"
          >
            <span
              class={['i-lucide-refresh-cw w-3.5 h-3.5', updating() && 'animate-spin']}
              aria-hidden="true"
            />
            <span>{updating() ? 'Updating…' : 'Update Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
