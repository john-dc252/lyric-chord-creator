import { Title } from '@solidjs/meta';
import { createEffect, createMemo, createSignal, onSettled, Show } from 'solid-js';
import ChordGuidePreview from '../components/ChordGuidePreview';
import Header from '../components/Header';
import TemplateEditor from '../components/TemplateEditor';
import { DEFAULT_PAPER_SIZE, type PaperSizeConfig } from '../lib/paperSize';
import { DEFAULT_TEMPLATE, extractSongAtLine } from '../lib/template-processor';
import { activeTemplateId, savedTemplates, createNewTemplate } from '../lib/templates-store';

type BooleanString = 'true' | 'false';

const STORAGE_KEY_TEMPLATE = 'scgt_current_template';
const STORAGE_KEY_PAPER = 'scgt_paper_config';

function getInitialTemplate(): string {
  if (typeof window !== 'undefined') {
    try {
      const savedTemplate = localStorage.getItem(STORAGE_KEY_TEMPLATE);
      if (savedTemplate !== null) {
        return savedTemplate;
      }
    } catch (e) {
      console.error('Failed to load saved state from localStorage:', e);
    }
  }
  return DEFAULT_TEMPLATE;
}

function getInitialPaperConfig(): PaperSizeConfig {
  if (typeof window !== 'undefined') {
    try {
      const savedPaper = localStorage.getItem(STORAGE_KEY_PAPER);
      if (savedPaper) {
        return JSON.parse(savedPaper);
      }
    } catch (e) {
      console.error('Failed to load saved state from localStorage:', e);
    }
  }
  return DEFAULT_PAPER_SIZE;
}

export default function Home() {
  const [template, setTemplate] = createSignal<string>(getInitialTemplate(), {
    name: 'editor_template',
  });

  const [paperConfig, setPaperConfig] = createSignal<PaperSizeConfig>(getInitialPaperConfig(), {
    name: 'app_paper_config',
  });

  const [cursorLine, setCursorLine] = createSignal(1, {
    name: 'editor_cursor_line',
  });

  // Mobile active tab: 'editor' | 'preview'
  const [activeTab, setActiveTab] = createSignal<'editor' | 'preview'>('editor', {
    name: 'mobile_active_tab',
  });

  // Toast notification state
  const [toastMessage, setToastMessage] = createSignal<string | null>(null, {
    name: 'toast_message',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Sync if template in localStorage was updated externally (e.g. from Gallery)
  onSettled(() => {
    const current = getInitialTemplate();
    if (current !== template()) {
      setTemplate(current);
    }
  });

  // Persist template changes using Solid 2.0 two-argument createEffect(compute, apply)
  createEffect(
    () => template(),
    (val) => {
      try {
        localStorage.setItem(STORAGE_KEY_TEMPLATE, val);
      } catch (e) {
        console.error('Failed to persist template:', e);
      }
    },
  );

  // Persist paper config changes
  createEffect(
    () => paperConfig(),
    (cfg) => {
      try {
        localStorage.setItem(STORAGE_KEY_PAPER, JSON.stringify(cfg));
      } catch (e) {
        console.error('Failed to persist paper config:', e);
      }
    },
  );

  const handleTemplateInput = (val: string) => {
    setTemplate(val);
  };

  const handleFileImport = (content: string, filename: string) => {
    setTemplate(content);
    showToast(`Loaded "${filename}" successfully!`);
  };

  const handleResetToDefault = () => {
    if (confirm('Reset template back to default sample? Any unsaved edits will be lost.')) {
      setTemplate(DEFAULT_TEMPLATE);
      showToast('Reset to default sample template.');
    }
  };

  const handleNewTemplate = () => {
    setTemplate('');
    createNewTemplate();
    showToast('Created new empty template.');
  };

  const activeSavedTemplate = createMemo(() => {
    const id = activeTemplateId();
    if (!id) return null;
    return savedTemplates().find((t) => t.id === id) || null;
  }, { name: 'home_active_saved_template' });

  const isDirty = createMemo(() => {
    const existing = activeSavedTemplate();
    if (existing) {
      return template() !== existing.content;
    }
    return template().trim().length > 0;
  }, { name: 'home_is_dirty' });

  const currentSong = createMemo(
    () => extractSongAtLine(template(), cursorLine()),
    { name: 'home_current_song' },
  );

  return (
    <div class="h-full flex flex-col overflow-hidden font-sans antialiased">
      <Title>
        {`${isDirty() ? '● ' : ''}${currentSong().title} - Lyric-Chord Creator`}
      </Title>

      {/* Main Top Header */}
      <Header
        template={template()}
        cursorLine={cursorLine()}
        paperConfig={paperConfig()}
      />

      {/* Mobile Tab Switcher (< lg screens) */}
      <div class="lg:hidden flex items-center justify-center p-2 bg-slate-200/80 dark:bg-slate-900/80 border-b border-slate-300 dark:border-slate-800 shrink-0">
        <div
          class="inline-flex rounded-lg bg-slate-300/80 dark:bg-slate-800 p-1 shadow-xs"
          role="tablist"
          aria-label="Workspace views"
        >
          <button
            type="button"
            id="editor-tab"
            role="tab"
            aria-selected={(activeTab() === 'editor').toString() as BooleanString}
            aria-controls="editor-panel"
            tabindex={activeTab() === 'editor' ? 0 : -1}
            onClick={() => setActiveTab('editor')}
            class={[
              'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition-all',
              activeTab() === 'editor'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
            ]}
          >
            <span>📝</span>
            <span>Editor</span>
          </button>
          <button
            type="button"
            id="preview-tab"
            role="tab"
            aria-selected={(activeTab() === 'preview').toString() as BooleanString}
            aria-controls="preview-panel"
            tabindex={activeTab() === 'preview' ? 0 : -1}
            onClick={() => setActiveTab('preview')}
            class={[
              'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition-all',
              activeTab() === 'preview'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
            ]}
          >
            <span>👁️</span>
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Workspace Area: Side-by-side on desktop (lg+), Tabbed on mobile */}
      <div class="flex-1 min-h-0 p-2 sm:p-3 lg:p-4 grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 overflow-hidden">
        {/* Editor Pane (Always visible on desktop; toggleable on mobile) */}
        <div
          id="editor-panel"
          role="tabpanel"
          aria-labelledby="editor-tab"
          tabindex={0}
          class={[
            'h-full min-h-0 focus:outline-none',
            activeTab() === 'editor' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col',
          ]}
        >
          <TemplateEditor
            value={template()}
            onInput={handleTemplateInput}
            onCursorLineChange={setCursorLine}
            onFileDrop={handleFileImport}
            onResetToDefault={handleResetToDefault}
            onNewTemplate={handleNewTemplate}
            onToast={showToast}
          />
        </div>

        {/* Preview Pane (Always visible on desktop; toggleable on mobile) */}
        <div
          id="preview-panel"
          role="tabpanel"
          aria-labelledby="preview-tab"
          tabindex={0}
          class={[
            'h-full min-h-0 focus:outline-none',
            activeTab() === 'preview' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col',
          ]}
        >
          <ChordGuidePreview
            template={template()}
            paperConfig={paperConfig()}
            onPaperConfigChange={setPaperConfig}
          />
        </div>
      </div>

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
