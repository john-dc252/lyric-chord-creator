import { createSignal, createMemo, Show, onSettled } from 'solid-js';
import { isTemplateNameUnique, saveTemplate, type SavedTemplate } from '../lib/templates-store';
import { extractSongTitle, extractSongArtist } from '../lib/template-processor';

interface SaveTemplateModalProps {
  content: string;
  existingTemplate?: SavedTemplate | null;
  onSaveSuccess: (template: SavedTemplate) => void;
  onClose: () => void;
}

export default function SaveTemplateModal(props: SaveTemplateModalProps) {
  let nameInputRef: HTMLInputElement | undefined;

  const defaultInitialName = () => {
    if (props.existingTemplate) {
      return props.existingTemplate.name;
    }
    const songTitle = extractSongTitle(props.content);
    if (songTitle && songTitle !== 'Untitled Song') {
      return songTitle;
    }
    return '';
  };

  const [name, setName] = createSignal(defaultInitialName(), { name: 'save_template_name' });
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null, { name: 'save_error' });

  const titlePreview = createMemo(() => extractSongTitle(props.content));
  const artistPreview = createMemo(() => extractSongArtist(props.content));

  const trimmedName = () => name().trim();

  const isUnique = createMemo(() => {
    if (!trimmedName()) return true;
    return isTemplateNameUnique(trimmedName(), props.existingTemplate?.id);
  });

  onSettled(() => {
    nameInputRef?.focus();
    nameInputRef?.select();
  });

  const handleSave = (e?: Event) => {
    e?.preventDefault();
    setErrorMessage(null);

    const val = trimmedName();
    if (!val) {
      setErrorMessage('Template name is required.');
      return;
    }

    if (!isUnique()) {
      setErrorMessage(`A template named "${val}" already exists. Please choose a unique name.`);
      return;
    }

    const result = saveTemplate(val, props.content, props.existingTemplate?.id);
    if (result.success && result.template) {
      props.onSaveSuccess(result.template);
      props.onClose();
    } else {
      setErrorMessage(result.error || 'Failed to save template.');
    }
  };

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div
        class="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-modal-title"
      >
        {/* Header */}
        <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center text-base">
              💾
            </div>
            <div>
              <h2 id="save-modal-title" class="font-bold text-sm text-slate-900 dark:text-white">
                {props.existingTemplate ? 'Update Saved Template' : 'Save Template to Library'}
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Templates are stored locally on your device
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} class="p-5 space-y-4">
          <div>
            <label
              for="template-name-input"
              class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Template Name <span class="text-rose-500">*</span>
            </label>
            <input
              id="template-name-input"
              ref={(el) => (nameInputRef = el)}
              type="text"
              value={name()}
              onInput={(e) => {
                setName(e.currentTarget.value);
                setErrorMessage(null);
              }}
              placeholder="e.g. Amazing Grace (Acoustic Lead)"
              class={[
                'w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all',
                !isUnique() || errorMessage()
                  ? 'border-rose-300 dark:border-rose-800 focus:ring-rose-400'
                  : 'border-slate-300 dark:border-slate-700 focus:ring-sky-500',
              ]}
            />
            <Show when={!isUnique()}>
              <p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <span>⚠️</span>
                <span>A template with this name already exists. Please choose a unique name.</span>
              </p>
            </Show>
            <Show when={errorMessage() && isUnique()}>
              <p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <span>⚠️</span>
                <span>{errorMessage()}</span>
              </p>
            </Show>
          </div>

          {/* Extracted Metadata Preview */}
          <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5">
            <div class="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
              Extracted Metadata
            </div>
            <div class="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span class="text-slate-500 dark:text-slate-400">Song Title:</span>
              <span class="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                {titlePreview() || 'Untitled'}
              </span>
            </div>
            <Show when={artistPreview()}>
              <div class="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span class="text-slate-500 dark:text-slate-400">Artist:</span>
                <span class="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                  {artistPreview()}
                </span>
              </div>
            </Show>
          </div>

          {/* Action Buttons */}
          <div class="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={props.onClose}
              class="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!trimmedName() || !isUnique()}
              class="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg shadow-sm transition-colors"
            >
              <span>💾</span>
              <span>{props.existingTemplate ? 'Save Changes' : 'Save Template'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
