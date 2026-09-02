import { createEffect, createMemo, createSignal, onCleanup, onSettled, Show, untrack } from 'solid-js';
import { EditorState, Compartment, Extension } from '@codemirror/state';
import {
  EditorView,
  keymap,
  highlightActiveLine,
  highlightActiveLineGutter,
  dropCursor,
  drawSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import { vim, getCM, Vim } from '@replit/codemirror-vim';

import { theme } from '../lib/theme';
import {
  lyricChordLanguage,
  lyricChordLightHighlight,
  lyricChordDarkHighlight,
  createLineNumbersGutter,
  createEditorTheme,
} from '../lib/editor-extensions';
import {
  activeTemplateId,
  savedTemplates,
  saveTemplate,
  exportTemplateAsFile,
  type SavedTemplate,
} from '../lib/templates-store';
import SaveTemplateModal from './SaveTemplateModal';

interface TemplateEditorProps {
  value: string;
  onInput: (val: string) => void;
  onFileDrop?: (content: string, filename: string) => void;
  onResetToDefault?: () => void;
  onNewTemplate?: () => void;
  onToast?: (message: string) => void;
}

type VimEditorMode = 'NORMAL' | 'INSERT' | 'VISUAL' | 'VISUAL LINE' | 'VISUAL BLOCK' | 'REPLACE';

const WORD_WRAP_KEY = 'scgt_word_wrap';
const VIM_MODE_KEY = 'scgt_vim_mode';
const RELATIVE_LINE_NUMBERS_KEY = 'scgt_relative_line_numbers';

function getInitialWordWrap(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(WORD_WRAP_KEY);
      if (saved !== null) return saved === 'true';
    } catch (e) {
      console.error('Failed to read word wrap preference:', e);
    }
  }
  return true;
}

function getInitialVimMode(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(VIM_MODE_KEY);
      if (saved !== null) return saved === 'true';
    } catch (e) {
      console.error('Failed to read vim mode preference:', e);
    }
  }
  return false;
}

function getInitialRelativeLineNumbers(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(RELATIVE_LINE_NUMBERS_KEY);
      if (saved !== null) return saved === 'true';
    } catch (e) {
      console.error('Failed to read relative line numbers preference:', e);
    }
  }
  return false;
}

export default function TemplateEditor(props: TemplateEditorProps) {
  let editorContainerRef: HTMLDivElement | undefined = undefined;
  let view: EditorView | undefined = undefined;
  let fileInputRef: HTMLInputElement | undefined = undefined;

  const [wordWrap, setWordWrapSignal] = createSignal(getInitialWordWrap(), { name: 'word_wrap' });
  const [vimMode, setVimModeSignal] = createSignal(getInitialVimMode(), { name: 'vim_mode' });
  const [relativeLineNumbers, setRelativeLineNumbersSignal] = createSignal(
    getInitialRelativeLineNumbers(),
    { name: 'relative_line_numbers' },
  );

  const [vimModeName, setVimModeName] = createSignal<'NORMAL' | 'INSERT' | 'VISUAL' | 'VISUAL LINE' | 'VISUAL BLOCK' | 'REPLACE'>('NORMAL', {
    name: 'vim_mode_name',
  });
  const [isDraggingOver, setIsDraggingOver] = createSignal(false, { name: 'drag_over' });
  const [cursorInfo, setCursorInfo] = createSignal({ line: 1, col: 1 }, { name: 'cursor_info' });

  // Menu and Save Modal states
  const [isFileMenuOpen, setIsFileMenuOpen] = createSignal(false, { name: 'file_menu_open' });
  const [isSaveModalOpen, setIsSaveModalOpen] = createSignal(false, { name: 'save_modal_open' });
  const [saveAsMode, setSaveAsMode] = createSignal(false, { name: 'save_as_mode' });

  // Active saved template object if currently linked
  const activeSavedTemplate = createMemo(() => {
    const id = activeTemplateId();
    if (!id) return null;
    return savedTemplates().find((t) => t.id === id) || null;
  }, { name: 'active_saved_template' });

  // Detects if current content has unsaved modifications
  const isDirty = createMemo(() => {
    const existing = activeSavedTemplate();
    if (existing) {
      return props.value !== existing.content;
    }
    return props.value.trim().length > 0;
  }, { name: 'editor_is_dirty' });

  // CodeMirror Extension Compartments for fine-grained dynamic updates
  const vimCompartment = new Compartment();
  const lineNumbersCompartment = new Compartment();
  const wordWrapCompartment = new Compartment();
  const themeCompartment = new Compartment();
  const highlightCompartment = new Compartment();

  const toggleWordWrap = () => {
    const next = !wordWrap();
    setWordWrapSignal(next);
    try {
      localStorage.setItem(WORD_WRAP_KEY, String(next));
    } catch (e) {
      console.error('Failed to save word wrap preference:', e);
    }
  };

  const toggleVimMode = () => {
    const next = !vimMode();
    setVimModeSignal(next);
    try {
      localStorage.setItem(VIM_MODE_KEY, String(next));
    } catch (e) {
      console.error('Failed to save vim mode preference:', e);
    }
  };

  const toggleRelativeLineNumbers = () => {
    const next = !relativeLineNumbers();
    setRelativeLineNumbersSignal(next);
    try {
      localStorage.setItem(RELATIVE_LINE_NUMBERS_KEY, String(next));
    } catch (e) {
      console.error('Failed to save relative line numbers preference:', e);
    }
  };

  // Quick Save handler
  const handleQuickSave = () => {
    setIsFileMenuOpen(false);
    const existing = activeSavedTemplate();
    if (existing) {
      const res = saveTemplate(existing.name, props.value, existing.id);
      if (res.success) {
        props.onToast?.(`Saved "${existing.name}" successfully!`);
      } else {
        props.onToast?.(res.error || 'Failed to save.');
      }
    } else {
      setSaveAsMode(false);
      setIsSaveModalOpen(true);
    }
  };

  const handleSaveAs = () => {
    setIsFileMenuOpen(false);
    setSaveAsMode(true);
    setIsSaveModalOpen(true);
  };

  const handleExport = () => {
    setIsFileMenuOpen(false);
    const existing = activeSavedTemplate();
    const filename = existing?.name || 'song-chord-guide';
    exportTemplateAsFile(filename, props.value);
    props.onToast?.(`Exported "${filename}.lcct.txt"!`);
  };

  const handleImportClick = () => {
    setIsFileMenuOpen(false);
    fileInputRef?.click();
  };

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          props.onInput(text);
          if (view) {
            view.dispatch({
              changes: { from: 0, to: view.state.doc.length, insert: text },
            });
          }
          if (props.onFileDrop) {
            props.onFileDrop(text, file.name);
          }
          props.onToast?.(`Imported "${file.name}" successfully!`);
        }
      };
      reader.readAsText(file);
      target.value = '';
    }
  };

  // Register custom Vim Ex commands
  Vim.defineEx('write', 'w', () => {
    handleQuickSave();
  });
  Vim.defineEx('update', 'up', () => {
    handleQuickSave();
  });
  Vim.defineEx('rnu', 'rnu', () => {
    setRelativeLineNumbersSignal(true);
    try {
      localStorage.setItem(RELATIVE_LINE_NUMBERS_KEY, 'true');
    } catch {}
  });
  Vim.defineEx('nornu', 'nornu', () => {
    setRelativeLineNumbersSignal(false);
    try {
      localStorage.setItem(RELATIVE_LINE_NUMBERS_KEY, 'false');
    } catch {}
  });
  Vim.defineEx('relativenumber', 'relativenumber', () => {
    setRelativeLineNumbersSignal(true);
    try {
      localStorage.setItem(RELATIVE_LINE_NUMBERS_KEY, 'true');
    } catch {}
  });
  Vim.defineEx('norelativenumber', 'norelativenumber', () => {
    setRelativeLineNumbersSignal(false);
    try {
      localStorage.setItem(RELATIVE_LINE_NUMBERS_KEY, 'false');
    } catch {}
  });

  const lineCount = createMemo(() => {
    return props.value.split('\n').length;
  }, { name: 'line_count' });

  const stats = createMemo(() => {
    const text = props.value;
    const chords = (text.match(/\{[^}]+\}/g) || []).length;
    const sections = (text.match(/^\[.*?\]/gm) || []).length;
    const columnBreaks = (text.match(/@column_break\b/g) || []).length;
    const pageBreaks = (text.match(/@page_break\b/g) || []).length;
    return { chords, sections, columnBreaks, pageBreaks, chars: text.length };
  }, { name: 'editor_stats' });

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer?.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          props.onInput(content);
          if (view) {
            view.dispatch({
              changes: { from: 0, to: view.state.doc.length, insert: content },
            });
          }
          if (props.onFileDrop) {
            props.onFileDrop(content, file.name);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  onSettled(() => {
    if (!editorContainerRef) return;

    const isDark = theme() === 'dark';

    const getVimExtension = (enabled: boolean): Extension => {
      return enabled ? [vim()] : [];
    };

    const getWordWrapExtension = (enabled: boolean): Extension => {
      return enabled ? [EditorView.lineWrapping] : [];
    };

    const startState = EditorState.create({
      doc: props.value,
      extensions: [
        vimCompartment.of(getVimExtension(vimMode())),
        lineNumbersCompartment.of(createLineNumbersGutter(relativeLineNumbers())),
        wordWrapCompartment.of(getWordWrapExtension(wordWrap())),
        themeCompartment.of(createEditorTheme(isDark)),
        highlightCompartment.of(isDark ? lyricChordDarkHighlight : lyricChordLightHighlight),
        lyricChordLanguage,
        bracketMatching(),
        drawSelection(),
        dropCursor(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        keymap.of([
          {
            key: 'Mod-s',
            run: () => {
              handleQuickSave();
              return true;
            },
          },
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const currentDoc = update.state.doc.toString();
            untrack(() => props.onInput(currentDoc));
          }
          if (update.selectionSet || update.docChanged) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            setCursorInfo({
              line: line.number,
              col: pos - line.from + 1,
            });
          }
        }),
      ],
    });

    view = new EditorView({
      state: startState,
      parent: editorContainerRef,
    });

    const applyVimMode = (mode: string, subMode?: string) => {
      let modeName: VimEditorMode = 'NORMAL';
      let attrMode = 'normal';
      switch (mode) {
        case 'normal':
          modeName = 'NORMAL';
          attrMode = 'normal';
          break;
        case 'insert':
          modeName = 'INSERT';
          attrMode = 'insert';
          break;
        case 'visual':
          if (subMode === 'linewise') {
            modeName = 'VISUAL LINE';
            attrMode = 'visual-line';
          } else if (subMode === 'blockwise') {
            modeName = 'VISUAL BLOCK';
            attrMode = 'visual-block';
          } else {
            modeName = 'VISUAL';
            attrMode = 'visual';
          }
          break;
        case 'replace':
          modeName = 'REPLACE';
          attrMode = 'replace';
          break;
      }
      setVimModeName(modeName);
      if (view) {
        view.dom.setAttribute('data-vim-mode', attrMode);
      }
    };

    // Attach Vim mode listener if available
    const cm = getCM(view);
    if (cm) {
      if (vimMode()) {
        applyVimMode('normal');
      }
      cm.on('vim-mode-change', (data: { mode: string; subMode?: string }) => {
        applyVimMode(data.mode, data.subMode);
      });
    }
  });

  // Keep editor content in sync if changed externally
  createEffect(
    () => props.value,
    (val) => {
      if (view && view.state.doc.toString() !== val) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: val },
        });
      }
    },
  );

  // Reconfigure Vim mode dynamically
  createEffect(
    () => vimMode(),
    (enabled) => {
      if (view) {
        view.dispatch({
          effects: vimCompartment.reconfigure(enabled ? [vim()] : []),
        });
        if (enabled) {
          view.dom.setAttribute('data-vim-mode', 'normal');
          setVimModeName('NORMAL');
          const cm = getCM(view);
          if (cm) {
            cm.on('vim-mode-change', (data: { mode: string; subMode?: string }) => {
              let modeName: 'NORMAL' | 'INSERT' | 'VISUAL' | 'VISUAL LINE' | 'VISUAL BLOCK' | 'REPLACE' = 'NORMAL';
              let attrMode = 'normal';
              if (data.mode === 'normal') {
                modeName = 'NORMAL';
                attrMode = 'normal';
              } else if (data.mode === 'insert') {
                modeName = 'INSERT';
                attrMode = 'insert';
              } else if (data.mode === 'visual') {
                if (data.subMode === 'linewise') {
                  modeName = 'VISUAL LINE';
                  attrMode = 'visual-line';
                } else if (data.subMode === 'blockwise') {
                  modeName = 'VISUAL BLOCK';
                  attrMode = 'visual-block';
                } else {
                  modeName = 'VISUAL';
                  attrMode = 'visual';
                }
              } else if (data.mode === 'replace') {
                modeName = 'REPLACE';
                attrMode = 'replace';
              }
              setVimModeName(modeName);
              if (view) {
                view.dom.setAttribute('data-vim-mode', attrMode);
              }
            });
          }
        } else {
          view.dom.removeAttribute('data-vim-mode');
        }
      }
    },
  );

  // Reconfigure Relative Line Numbers dynamically
  createEffect(
    () => relativeLineNumbers(),
    (isRel) => {
      if (view) {
        view.dispatch({
          effects: lineNumbersCompartment.reconfigure(createLineNumbersGutter(isRel)),
        });
      }
    },
  );

  // Reconfigure Word Wrap dynamically
  createEffect(
    () => wordWrap(),
    (wrap) => {
      if (view) {
        view.dispatch({
          effects: wordWrapCompartment.reconfigure(wrap ? [EditorView.lineWrapping] : []),
        });
      }
    },
  );

  // Reconfigure Light/Dark Theme dynamically
  createEffect(
    () => theme(),
    (currTheme) => {
      const isDark = currTheme === 'dark';
      if (view) {
        view.dispatch({
          effects: [
            themeCompartment.reconfigure(createEditorTheme(isDark)),
            highlightCompartment.reconfigure(
              isDark ? lyricChordDarkHighlight : lyricChordLightHighlight,
            ),
          ],
        });
      }
    },
  );

  onCleanup(() => {
    if (view) {
      view.destroy();
    }
  });

  return (
    <div
      class={[
        'relative flex flex-col h-full w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm transition-colors',
        { 'ring-2 ring-sky-500 bg-sky-50/20': isDraggingOver() },
      ]}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Input for Import */}
      <input
        ref={(el) => (fileInputRef = el)}
        type="file"
        accept=".txt,.scgt,.lcct.txt"
        onChange={handleFileChange}
        class="hidden"
      />

      {/* Editor Toolbar Header */}
      <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 select-none">
        <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* File Menu Dropdown */}
          <div class="relative">
            <button
              type="button"
              onClick={() => setIsFileMenuOpen(!isFileMenuOpen())}
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition-colors"
            >
              <span>📁</span>
              <span>File</span>
              <span class="text-[10px] text-slate-400">▼</span>
            </button>

            {/* Dropdown Menu Popup */}
            <Show when={isFileMenuOpen()}>
              <>
                <div
                  class="fixed inset-0 z-20"
                  onClick={() => setIsFileMenuOpen(false)}
                />
                <div class="absolute left-0 top-full mt-1 w-56 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 z-30 menu-popover text-xs">
                  {/* New Empty Template */}
                  <Show when={props.onNewTemplate}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFileMenuOpen(false);
                        props.onNewTemplate?.();
                      }}
                      class="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium"
                    >
                      <span>➕</span>
                      <div class="flex-1">
                        <div>New Template</div>
                        <div class="text-[10px] text-slate-400">Start with empty editor</div>
                      </div>
                    </button>
                    <div class="my-1 border-t border-slate-200 dark:border-slate-700" />
                  </Show>

                  {/* Save to Library / Update */}
                  <button
                    type="button"
                    onClick={handleQuickSave}
                    class="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium"
                  >
                    <span>💾</span>
                    <div class="flex-1">
                      <div>{activeSavedTemplate() ? 'Save Changes' : 'Save to Library'}</div>
                      <div class="text-[10px] text-slate-400">
                        {activeSavedTemplate() ? `Update "${activeSavedTemplate()?.name}"` : 'Save as unique template'}
                      </div>
                    </div>
                  </button>

                  {/* Save As New */}
                  <button
                    type="button"
                    onClick={handleSaveAs}
                    class="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium"
                  >
                    <span>📑</span>
                    <div class="flex-1">
                      <div>Save As New Template...</div>
                      <div class="text-[10px] text-slate-400">Save with a new unique name</div>
                    </div>
                  </button>

                  <div class="my-1 border-t border-slate-200 dark:border-slate-700" />

                  {/* Import from File */}
                  <button
                    type="button"
                    onClick={handleImportClick}
                    class="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium"
                  >
                    <span>📂</span>
                    <div class="flex-1">
                      <div>Import from File (*.lcct.txt)</div>
                      <div class="text-[10px] text-slate-400">Load template file from device</div>
                    </div>
                  </button>

                  {/* Export as File */}
                  <button
                    type="button"
                    onClick={handleExport}
                    class="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium"
                  >
                    <span>💾</span>
                    <div class="flex-1">
                      <div>Export as File (*.lcct.txt)</div>
                      <div class="text-[10px] text-slate-400">Download current sheet template</div>
                    </div>
                  </button>

                  <Show when={props.onResetToDefault}>
                    <div class="my-1 border-t border-slate-200 dark:border-slate-700" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsFileMenuOpen(false);
                        props.onResetToDefault?.();
                      }}
                      class="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 font-medium"
                    >
                      <span>🔄</span>
                      <div class="flex-1">
                        <div>Reset to Default Sample</div>
                        <div class="text-[10px] text-slate-400">Discard unsaved edits</div>
                      </div>
                    </button>
                  </Show>
                </div>
              </>
            </Show>
          </div>

          {/* Quick Save Button */}
          <button
            type="button"
            onClick={handleQuickSave}
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-colors"
            title={
              activeSavedTemplate()
                ? `Save changes to "${activeSavedTemplate()?.name}" (Ctrl/Cmd+S)`
                : 'Save template to library (Ctrl/Cmd+S)'
            }
          >
            <span>💾</span>
            <span>Save</span>
          </button>

          {/* Active Template & Unsaved Changes Status Badge */}
          <div
            class={[
              'flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium border transition-all select-none max-w-[200px]',
              isDirty()
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/80 shadow-2xs'
                : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
            ]}
            title={
              isDirty()
                ? activeSavedTemplate()
                  ? `Unsaved changes in "${activeSavedTemplate()?.name}". Click Save or press Ctrl/Cmd+S to update.`
                  : 'Unsaved new draft. Click Save or press Ctrl/Cmd+S to store in your library.'
                : activeSavedTemplate()
                  ? `All changes saved to "${activeSavedTemplate()?.name}".`
                  : 'No unsaved changes.'
            }
          >
            <Show
              when={isDirty()}
              fallback={<span class="text-emerald-500 dark:text-emerald-400 font-bold text-xs">✓</span>}
            >
              <span class="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse shrink-0" />
            </Show>
            <span class="truncate">
              {activeSavedTemplate() ? activeSavedTemplate()?.name : 'Draft'}
            </span>
            <Show when={isDirty()}>
              <span class="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                (unsaved)
              </span>
            </Show>
          </div>

          <span class="text-slate-300 dark:text-slate-600">|</span>

          {/* Vim Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleVimMode}
            class={[
              'px-2 py-0.5 rounded text-[11px] font-semibold transition-colors border flex items-center gap-1',
              vimMode()
                ? 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50',
            ]}
            title="Toggle Vim Modal Editing Mode"
          >
            <span>Vim:</span>
            <strong>{vimMode() ? 'ON' : 'OFF'}</strong>
          </button>

          {/* Relative Line Numbers Toggle Button */}
          <button
            type="button"
            onClick={toggleRelativeLineNumbers}
            class={[
              'px-2 py-0.5 rounded text-[11px] font-semibold transition-colors border flex items-center gap-1',
              relativeLineNumbers()
                ? 'bg-indigo-100 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50',
            ]}
            title="Toggle Relative Line Numbers (relativenumber)"
          >
            <span>Rel Nums:</span>
            <strong>{relativeLineNumbers() ? 'ON' : 'OFF'}</strong>
          </button>

          {/* Word Wrap Toggle Button */}
          <button
            type="button"
            onClick={toggleWordWrap}
            class={[
              'px-2 py-0.5 rounded text-[11px] font-semibold transition-colors border',
              wordWrap()
                ? 'bg-sky-100 dark:bg-sky-950/70 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50',
            ]}
            title="Toggle Soft Word Wrapping"
          >
            Wrap: {wordWrap() ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Template Stats */}
        <div class="flex items-center gap-2.5 text-[11px]">
          <span title="Number of chords in template">
            🎵 <strong class="text-slate-800 dark:text-slate-200">{stats().chords}</strong> chords
          </span>
          <span title="Number of sections">
            🏷️ <strong class="text-slate-800 dark:text-slate-200">{stats().sections}</strong> sections
          </span>
          <span title="Number of column breaks (@column_break)" class="hidden sm:inline">
            📑 <strong class="text-slate-800 dark:text-slate-200">{stats().columnBreaks}</strong> col breaks
          </span>
          <span title="Number of page breaks (@page_break)" class="hidden sm:inline">
            📄 <strong class="text-slate-800 dark:text-slate-200">{stats().pageBreaks}</strong> page breaks
          </span>
        </div>
      </div>

      {/* Editor Body Canvas */}
      <div class="relative flex-1 min-h-0 overflow-hidden bg-white dark:bg-slate-900">
        <div ref={(el) => (editorContainerRef = el)} class="h-full w-full overflow-hidden" />

        {/* Drag and drop overlay hint */}
        <Show when={isDraggingOver()}>
          <div class="absolute inset-0 bg-sky-500/10 dark:bg-sky-500/20 backdrop-blur-sm flex items-center justify-center pointer-events-none z-10 border-2 border-dashed border-sky-500 rounded-lg">
            <div class="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-lg text-sm font-semibold text-sky-600 dark:text-sky-400">
              📥 Drop *.lcct.txt template file here to load
            </div>
          </div>
        </Show>
      </div>

      {/* Editor Status Bar Footer */}
      <div class="flex items-center justify-between px-3 py-1 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 select-none">
        <div class="flex items-center gap-2">
          {/* Vim Mode Badge when Vim is Active */}
          <Show when={vimMode()}>
            <span
              class={[
                'px-1.5 py-0.2 rounded font-bold uppercase tracking-wider text-[10px] shadow-xs',
                vimModeName() === 'NORMAL'
                  ? 'bg-sky-500 text-white dark:bg-sky-600'
                  : vimModeName() === 'INSERT'
                    ? 'bg-emerald-500 text-white dark:bg-emerald-600'
                    : vimModeName() === 'REPLACE'
                      ? 'bg-rose-500 text-white dark:bg-rose-600'
                      : 'bg-purple-500 text-white dark:bg-purple-600',
              ]}
            >
              -- {vimModeName()} --
            </span>
            <span>•</span>
          </Show>

          <span>
            Ln {cursorInfo().line}, Col {cursorInfo().col}
          </span>
          <span>•</span>
          <span>{lineCount()} lines</span>
          <span>•</span>
          <span>{stats().chars} chars</span>
        </div>

        <div class="flex items-center gap-2">
          <Show when={relativeLineNumbers()}>
            <span class="text-indigo-600 dark:text-indigo-400 font-medium">RelNum</span>
            <span>•</span>
          </Show>
          <span>Tab = 2 spaces</span>
        </div>
      </div>

      {/* Save Template Modal */}
      <Show when={isSaveModalOpen()}>
        <SaveTemplateModal
          content={props.value}
          existingTemplate={saveAsMode() ? null : activeSavedTemplate()}
          onSaveSuccess={(saved) => {
            props.onToast?.(`Template "${saved.name}" saved to library!`);
            setIsSaveModalOpen(false);
          }}
          onClose={() => setIsSaveModalOpen(false)}
        />
      </Show>
    </div>
  );
}
