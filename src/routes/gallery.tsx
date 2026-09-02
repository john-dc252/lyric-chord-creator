import { Title } from '@solidjs/meta';
import { createSignal, createMemo, For, Show } from 'solid-js';
import {
  savedTemplates,
  searchTemplates,
  deleteTemplate,
  duplicateTemplate,
  renameTemplate,
  exportTemplateAsFile,
  loadTemplateIntoEditor,
  saveTemplate,
  resetToSeedTemplates,
  isTemplateNameUnique,
  type SavedTemplate,
  type SearchField,
} from '../lib/templates-store';
import { ChordGuidePages } from '../lib/template-processor';

const PAGE_SIZE = 10;

export default function Gallery() {
  let fileInputRef: HTMLInputElement | undefined;

  // Search input and applied query state (search triggered on button click or Enter)
  const [searchInput, setSearchInput] = createSignal('', { name: 'gallery_search_input' });
  const [searchField, setSearchField] = createSignal<SearchField>('all', { name: 'gallery_search_field' });
  const [appliedQuery, setAppliedQuery] = createSignal('', { name: 'gallery_applied_query' });
  const [appliedField, setAppliedField] = createSignal<SearchField>('all', { name: 'gallery_applied_field' });

  // Pagination state
  const [currentPage, setCurrentPage] = createSignal(1, { name: 'gallery_page' });

  // Toast notification state
  const [toastMessage, setToastMessage] = createSignal<string | null>(null, { name: 'gallery_toast' });

  // Rename modal state
  const [renamingTemplate, setRenamingTemplate] = createSignal<SavedTemplate | null>(null, {
    name: 'renaming_template',
  });
  const [renameValue, setRenameValue] = createSignal('', { name: 'rename_value' });
  const [renameError, setRenameError] = createSignal<string | null>(null, { name: 'rename_error' });

  // Delete confirmation modal state
  const [deletingTemplate, setDeletingTemplate] = createSignal<SavedTemplate | null>(null, {
    name: 'deleting_template',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Trigger search on button click
  const handleTriggerSearch = (e?: Event) => {
    e?.preventDefault();
    setAppliedQuery(searchInput().trim());
    setAppliedField(searchField());
    setCurrentPage(1); // Reset to page 1 on new search
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setAppliedQuery('');
    setCurrentPage(1);
  };

  // Filtered templates based on applied query
  const filteredTemplates = createMemo(() => {
    const list = savedTemplates();
    const query = appliedQuery();
    const field = appliedField();
    return searchTemplates(list, query, field);
  }, { name: 'filtered_templates' });

  // Pagination calculation (max 10 per page)
  const totalPages = createMemo(() => {
    const count = filteredTemplates().length;
    return Math.max(1, Math.ceil(count / PAGE_SIZE));
  }, { name: 'total_pages' });

  const paginatedTemplates = createMemo(() => {
    const list = filteredTemplates();
    const page = Math.min(currentPage(), totalPages());
    const start = (page - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, { name: 'paginated_templates' });

  // Navigation / Action handlers
  const handleOpenInEditor = (template: SavedTemplate) => {
    loadTemplateIntoEditor(template);
    showToast(`Loaded "${template.name}" into Editor.`);
    window.location.href = '#/';
  };

  const handleExport = (template: SavedTemplate) => {
    exportTemplateAsFile(template.name, template.content);
    showToast(`Exported "${template.name}".`);
  };

  const handleDuplicate = (template: SavedTemplate) => {
    const copy = duplicateTemplate(template.id);
    if (copy) {
      showToast(`Duplicated as "${copy.name}".`);
    } else {
      showToast('Failed to duplicate template.');
    }
  };

  const openRenameModal = (template: SavedTemplate) => {
    setRenamingTemplate(template);
    setRenameValue(template.name);
    setRenameError(null);
  };

  const handleSaveRename = (e?: Event) => {
    e?.preventDefault();
    const tpl = renamingTemplate();
    if (!tpl) return;

    const newName = renameValue().trim();
    if (!newName) {
      setRenameError('Template name cannot be empty.');
      return;
    }

    if (!isTemplateNameUnique(newName, tpl.id)) {
      setRenameError(`A template named "${newName}" already exists. Please choose a unique name.`);
      return;
    }

    const result = renameTemplate(tpl.id, newName);
    if (result.success) {
      showToast(`Renamed to "${newName}".`);
      setRenamingTemplate(null);
    } else {
      setRenameError(result.error || 'Failed to rename template.');
    }
  };

  const openDeleteModal = (template: SavedTemplate) => {
    setDeletingTemplate(template);
  };

  const handleConfirmDelete = () => {
    const tpl = deletingTemplate();
    if (!tpl) return;
    deleteTemplate(tpl.id);
    showToast(`Deleted "${tpl.name}".`);
    setDeletingTemplate(null);
    if (currentPage() > totalPages()) {
      setCurrentPage(totalPages());
    }
  };

  const handleImportFile = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        if (text) {
          const rawName = file.name.replace(/\.(lcct\.txt|txt)$/i, '') || 'Imported Template';
          let uniqueName = rawName;
          let counter = 2;
          while (!isTemplateNameUnique(uniqueName)) {
            uniqueName = `${rawName} (${counter})`;
            counter++;
          }
          const res = saveTemplate(uniqueName, text);
          if (res.success && res.template) {
            showToast(`Imported "${res.template.name}" successfully!`);
          } else {
            showToast(res.error || 'Failed to import template.');
          }
        }
      };
      reader.readAsText(file);
      target.value = '';
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div class="h-full flex flex-col overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-3 sm:p-5 lg:p-8">
      <Title>Template Gallery - Lyric-Chord Creator</Title>

      {/* Hidden file input for importing */}
      <input
        ref={(el) => (fileInputRef = el)}
        type="file"
        accept=".txt,.scgt,.lcct.txt"
        onChange={handleImportFile}
        class="hidden"
      />

      <div class="max-w-6xl mx-auto w-full space-y-6">
        {/* Top Page Header */}
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center text-lg shadow-xs">
                🗃️
              </div>
              <div>
                <h1 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Template Gallery
                </h1>
                <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Manage and search templates saved locally on your device
                </p>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef?.click()}
              class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition-colors"
              title="Import a .lcct.txt template file"
            >
              <span>📂</span>
              <span>Import File</span>
            </button>
            <a
              href="#/"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-colors no-underline"
              title="Create a new chord guide template"
            >
              <span>➕</span>
              <span>New Template</span>
            </a>
          </div>
        </div>

        {/* Search Bar Section with Search Button */}
        <div class="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <form onSubmit={handleTriggerSearch} class="flex flex-col sm:flex-row gap-2.5">
            {/* Search Input */}
            <div class="relative flex-1">
              <span class="absolute left-3 top-2.5 text-slate-400">
                🔍
              </span>
              <input
                type="text"
                value={searchInput()}
                onInput={(e) => setSearchInput(e.currentTarget.value)}
                placeholder="Search templates, song title, artist, or lyrics..."
                class="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
              />
              <Show when={searchInput()}>
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                  aria-label="Clear input"
                >
                  ✕
                </button>
              </Show>
            </div>

            {/* Field Scope Selector */}
            <div class="flex items-center gap-2">
              <select
                value={searchField()}
                onChange={(e) => setSearchField(e.currentTarget.value as SearchField)}
                class="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                aria-label="Search field category"
              >
                <option value="all">All Fields</option>
                <option value="name">Template Name</option>
                <option value="title">Song Title</option>
                <option value="artist">Artist</option>
                <option value="lyrics">Lyrics</option>
              </select>

              {/* Trigger Search Button */}
              <button
                type="submit"
                class="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-colors shrink-0"
              >
                <span>🔍</span>
                <span>Search</span>
              </button>
            </div>
          </form>

          {/* Active Filter Pill and Stats */}
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <div class="flex items-center gap-2">
              <span>
                Total Templates: <strong class="text-slate-700 dark:text-slate-200">{savedTemplates().length}</strong>
              </span>
              <Show when={appliedQuery()}>
                <span class="text-slate-300 dark:text-slate-700">•</span>
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-medium">
                  Matches for "{appliedQuery()}" ({filteredTemplates().length})
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    class="hover:text-rose-500 font-bold ml-1"
                    title="Clear filter"
                  >
                    ✕
                  </button>
                </span>
              </Show>
            </div>

            <Show when={filteredTemplates().length > 0}>
              <div>
                Showing {(currentPage() - 1) * PAGE_SIZE + 1}–{Math.min(currentPage() * PAGE_SIZE, filteredTemplates().length)} of {filteredTemplates().length}
              </div>
            </Show>
          </div>
        </div>

        {/* Templates Cards Grid / List (Max 10 per page) */}
        <Show
          when={paginatedTemplates().length > 0}
          fallback={
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-4 shadow-xs">
              <div class="text-4xl">📁</div>
              <div class="space-y-1">
                <h3 class="font-bold text-base text-slate-800 dark:text-slate-200">
                  {appliedQuery() ? 'No Matching Templates' : 'No Templates Saved'}
                </h3>
                <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {appliedQuery()
                    ? `No templates matched your search for "${appliedQuery()}". Try different keywords or clear the search filter.`
                    : 'Your template library is currently empty. Create a new template or restore the default sample template.'}
                </p>
              </div>
              <div class="flex items-center justify-center gap-2 pt-2">
                <Show
                  when={appliedQuery()}
                  fallback={
                    <button
                      type="button"
                      onClick={resetToSeedTemplates}
                      class="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                    >
                      Restore Default Sample Template
                    </button>
                  }
                >
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    Clear Search
                  </button>
                </Show>
              </div>
            </div>
          }
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <For each={paginatedTemplates()}>
              {(template) => {
                return (
                  <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all flex flex-col overflow-hidden group">
                    {/* Card Header */}
                    <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2">
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <span class="text-sm">🎵</span>
                          <h3
                            class="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate"
                            title={template.name}
                          >
                            {template.name}
                          </h3>
                        </div>

                        {/* Song Title & Artist Badges */}
                        <div class="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px]">
                          <span class="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-medium">
                            Title: {template.title || 'Untitled'}
                          </span>
                          <Show when={template.artist}>
                            <span class="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-medium">
                              Artist: {template.artist}
                            </span>
                          </Show>
                        </div>
                      </div>

                      <span class="text-[10px] text-slate-400 shrink-0 font-medium">
                        {formatDate(template.updatedAt || template.createdAt)}
                      </span>
                    </div>

                    {/* Rendered Output (Clean paper sheet rendering with spacious padding) */}
                    <div class="p-4 sm:p-5 bg-slate-200/70 dark:bg-slate-950/80 overflow-hidden border-b border-slate-200 dark:border-slate-800">
                      <div class="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-3 select-none">
                        Rendered Chord Sheet Preview
                      </div>
                      {/* Container for rendered pages */}
                      <div class="guide-sheet-container flex flex-col gap-4 font-mono select-text h-72 overflow-hidden p-3 sm:p-4 rounded-xl bg-slate-300/40 dark:bg-slate-900/60 shadow-inner">
                        <ChordGuidePages template={template.content} />
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div class="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                      <div class="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleExport(template)}
                          class="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Export as .lcct.txt"
                        >
                          💾
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(template)}
                          class="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Duplicate template"
                        >
                          📋
                        </button>
                        <button
                          type="button"
                          onClick={() => openRenameModal(template)}
                          class="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Rename template"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(template)}
                          class="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          title="Delete template"
                        >
                          🗑️
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenInEditor(template)}
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-colors"
                      >
                        <span>📝</span>
                        <span>Open in Editor</span>
                      </button>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>

        {/* Pagination Section (Max 10 per page) */}
        <Show when={totalPages() > 1}>
          <div class="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              disabled={currentPage() <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              ← Previous
            </button>

            <div class="flex items-center gap-1">
              <For each={Array.from({ length: totalPages() }, (_, i) => i + 1)}>
                {(pageNum) => (
                  <button
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    class={[
                      'w-8 h-8 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center',
                      currentPage() === pageNum
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800',
                    ]}
                  >
                    {pageNum}
                  </button>
                )}
              </For>
            </div>

            <button
              type="button"
              disabled={currentPage() >= totalPages()}
              onClick={() => setCurrentPage((p) => Math.min(totalPages(), p + 1))}
              class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Next →
            </button>
          </div>
        </Show>
      </div>

      {/* Rename Modal */}
      <Show when={renamingTemplate()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 class="font-bold text-sm text-slate-900 dark:text-white">
              Rename Template
            </h3>
            <form onSubmit={handleSaveRename} class="space-y-3">
              <input
                type="text"
                value={renameValue()}
                onInput={(e) => {
                  setRenameValue(e.currentTarget.value);
                  setRenameError(null);
                }}
                class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <Show when={renameError()}>
                <p class="text-xs text-rose-500">{renameError()}</p>
              </Show>
              <div class="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenamingTemplate(null)}
                  class="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg"
                >
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* Delete Confirmation Modal */}
      <Show when={deletingTemplate()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div class="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <span class="text-2xl">⚠️</span>
              <h3 class="font-bold text-sm text-slate-900 dark:text-white">
                Delete Template?
              </h3>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to delete <strong class="text-slate-900 dark:text-white">"{deletingTemplate()?.name}"</strong>? This action cannot be undone.
            </p>
            <div class="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTemplate(null)}
                class="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                class="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Toast Notification */}
      <Show when={toastMessage()}>
        <div class="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold border border-slate-700 dark:border-slate-200 animate-fade-in">
          <span>✨</span>
          <span>{toastMessage()}</span>
        </div>
      </Show>
    </div>
  );
}
