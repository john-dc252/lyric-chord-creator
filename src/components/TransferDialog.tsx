import { createSignal, Show } from 'solid-js';
import type { LibraryKind } from '../lib/templates-store';
import { LIBRARY_LABEL } from '../lib/library';

interface TransferDialogProps {
  from: LibraryKind;
  count: number;
  /** Shown instead of the count when transferring a single template. */
  name?: string;
  onConfirm: (move: boolean) => Promise<void>;
  onClose: () => void;
}

/** Asks whether to keep the original (copy) or remove it (move). */
export default function TransferDialog(props: TransferDialogProps) {
  const [move, setMove] = createSignal(false, { name: 'transfer_move' });
  const [busy, setBusy] = createSignal(false, { name: 'transfer_busy' });
  const to = (): LibraryKind => (props.from === 'local' ? 'cloud' : 'local');
  const subject = () => (props.name ? `"${props.name}"` : `${props.count} templates`);

  const confirm = async () => {
    setBusy(true);
    try {
      await props.onConfirm(move());
    } finally {
      setBusy(false);
    }
  };

  const option = (value: boolean, label: string, hint: string) => (
    <label class="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer has-[:checked]:border-sky-500 has-[:checked]:bg-sky-50 dark:has-[:checked]:bg-sky-950/40">
      <input
        type="radio"
        name="transfer-mode"
        checked={move() === value}
        onChange={() => setMove(value)}
        class="mt-0.5 accent-sky-600"
      />
      <span>
        <span class="block text-xs font-semibold text-slate-800 dark:text-slate-200">{label}</span>
        <span class="block text-[11px] text-slate-500 dark:text-slate-400">{hint}</span>
      </span>
    </label>
  );

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs modal-backdrop">
      <div
        class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-title"
      >
        <h3 id="transfer-title" class="font-bold text-sm text-slate-900 dark:text-white">
          {to() === 'cloud' ? 'Upload' : 'Save'} {subject()} to {LIBRARY_LABEL[to()]}
        </h3>
        <div class="space-y-2">
          {option(false, 'Keep a copy', `Also keep it in ${LIBRARY_LABEL[props.from]}.`)}
          {option(true, 'Move', `Remove it from ${LIBRARY_LABEL[props.from]}.`)}
        </div>
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => props.onClose()}
            class="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy()}
            onClick={confirm}
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg"
          >
            <Show when={busy()}>
              <span class="i-lucide-loader-circle w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            </Show>
            {move() ? 'Move' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
