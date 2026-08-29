import { createMemo, createSignal, onSettled, Repeat, Show } from 'solid-js';
import { TemplateSyntaxHighlighter } from './TemplateSyntaxHighlighter';

interface TemplateEditorProps {
  value: string;
  onInput: (val: string) => void;
  onFileDrop?: (content: string, filename: string) => void;
}

const WORD_WRAP_KEY = 'scgt_word_wrap';

function getInitialWordWrap(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const savedWrap = localStorage.getItem(WORD_WRAP_KEY);
      if (savedWrap !== null) {
        return savedWrap === 'true';
      }
    } catch (e) {
      console.error('Failed to read word wrap preference:', e);
    }
  }
  return true;
}

export default function TemplateEditor(props: TemplateEditorProps) {
  let textareaRef: HTMLTextAreaElement | undefined = undefined;
  let lineNumbersRef: HTMLDivElement | undefined = undefined;
  let scrollContainerRef: HTMLDivElement | undefined = undefined;

  const [wordWrap, setWordWrapSignal] = createSignal(getInitialWordWrap(), { name: 'word_wrap' });
  const [isDraggingOver, setIsDraggingOver] = createSignal(false, { name: 'drag_over' });
  const [cursorInfo, setCursorInfo] = createSignal({ line: 1, col: 1 }, { name: 'cursor_info' });

  const toggleWordWrap = () => {
    const next = !wordWrap();
    setWordWrapSignal(next);
    try {
      localStorage.setItem(WORD_WRAP_KEY, String(next));
    } catch (e) {
      console.error('Failed to save word wrap preference:', e);
    }
  };

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

  const handleContainerScroll = () => {
    if (!scrollContainerRef || !lineNumbersRef) return;
    lineNumbersRef.scrollTop = scrollContainerRef.scrollTop;
  };

  const updateCursorInfo = () => {
    if (!textareaRef) return;
    const pos = textareaRef.selectionStart || 0;
    const textBefore = textareaRef.value.substring(0, pos);
    const lines = textBefore.split('\n');
    setCursorInfo({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!textareaRef) return;
      const start = textareaRef.selectionStart;
      const end = textareaRef.selectionEnd;
      const val = textareaRef.value;

      const updated = `${val.substring(0, start)}  ${val.substring(end)}`;
      props.onInput(updated);

      requestAnimationFrame(() => {
        if (textareaRef) {
          textareaRef.selectionStart = textareaRef.selectionEnd = start + 2;
          updateCursorInfo();
        }
      });
    }
  };

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
          if (props.onFileDrop) {
            props.onFileDrop(content, file.name);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  onSettled(() => {
    handleContainerScroll();
    updateCursorInfo();
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
      {/* Editor Toolbar Header */}
      <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 select-none">
        <div class="flex items-center gap-2">
          <span class="font-bold tracking-wide uppercase text-[11px] text-slate-500 dark:text-slate-400">
            Editor
          </span>
          <span class="text-slate-300 dark:text-slate-600">|</span>
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

        <div class="flex items-center gap-2.5 text-[11px]">
          <span title="Number of chords in template">
            🎵 <strong class="text-slate-800 dark:text-slate-200">{stats().chords}</strong> chords
          </span>
          <span title="Number of sections">
            🏷️ <strong class="text-slate-800 dark:text-slate-200">{stats().sections}</strong> sections
          </span>
          <span title="Number of column breaks (@column_break)">
            📑 <strong class="text-slate-800 dark:text-slate-200">{stats().columnBreaks}</strong> col breaks
          </span>
          <span title="Number of page breaks (@page_break)">
            📄 <strong class="text-slate-800 dark:text-slate-200">{stats().pageBreaks}</strong> page breaks
          </span>
        </div>
      </div>

      {/* Editor Body with Line Numbers & Highlighting */}
      <div class="relative flex-1 flex min-h-0 overflow-hidden text-xs sm:text-sm">
        {/* Line Numbers Gutter */}
        <div
          ref={(el) => (lineNumbersRef = el)}
          class="shrink-0 w-11 select-none bg-slate-50 dark:bg-slate-950/60 text-right text-slate-400 dark:text-slate-600 border-r border-slate-200 dark:border-slate-800/80 overflow-hidden editor-font py-3 pr-2"
          style={{ 'line-height': '22px' }}
        >
          <Repeat count={lineCount()}>
            {(i) => (
              <div
                class={[
                  'px-1',
                  {
                    'text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-950/50':
                      cursorInfo().line === i + 1,
                  },
                ]}
              >
                {i + 1}
              </div>
            )}
          </Repeat>
        </div>

        {/* Code Area: Single Scroll Container eliminates scrollbar width desync */}
        <div
          ref={(el) => (scrollContainerRef = el)}
          onScroll={handleContainerScroll}
          class="relative flex-1 min-w-0 h-full overflow-auto bg-white dark:bg-slate-900"
        >
          {/* Sizing Container: <pre> flows naturally, <textarea> overlays with exact matching dimensions */}
          <div class="relative min-w-full" style={{ 'min-height': '100%' }}>
            {/* Syntax Highlighted Backdrop - VISIBLE colored text */}
            <pre
              aria-hidden="true"
              class={[
                'm-0 p-3 pointer-events-none text-slate-800 dark:text-slate-200 editor-font',
                wordWrap() ? 'whitespace-pre-wrap break-words' : 'whitespace-pre',
              ]}
              style={{
                'line-height': '22px',
                'box-sizing': 'border-box',
                'min-height': '100%',
              }}
            >
              <TemplateSyntaxHighlighter code={props.value} />
            </pre>

            {/* Editable Textarea Foreground - TRANSPARENT text, VISIBLE cursor, EXACT same box */}
            <textarea
              ref={(el) => (textareaRef = el)}
              value={props.value}
              onInput={(e) => {
                props.onInput(e.currentTarget.value);
                updateCursorInfo();
              }}
              onKeyDown={handleKeyDown}
              onClick={updateCursorInfo}
              onKeyUp={updateCursorInfo}
              onSelect={updateCursorInfo}
              spellcheck={false}
              autocomplete="off"
              autocapitalize="off"
              placeholder="Type or paste your lyric-chord sheet template here..."
              class={[
                'editor-textarea absolute inset-0 w-full h-full m-0 p-3 resize-none border-none outline-none bg-transparent overflow-hidden editor-font',
                wordWrap() ? 'whitespace-pre-wrap break-words' : 'whitespace-pre',
              ]}
              style={{
                'line-height': '22px',
                'box-sizing': 'border-box',
              }}
            />
          </div>

          {/* Drag and drop overlay hint */}
          <Show when={isDraggingOver()}>
            <div class="absolute inset-0 bg-sky-500/10 dark:bg-sky-500/20 backdrop-blur-sm flex items-center justify-center pointer-events-none z-10 border-2 border-dashed border-sky-500 rounded-lg">
              <div class="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-lg text-sm font-semibold text-sky-600 dark:text-sky-400">
                📥 Drop *.lcct.txt template file here to load
              </div>
            </div>
          </Show>
        </div>
      </div>

      {/* Editor Status Bar Footer */}
      <div class="flex items-center justify-between px-3 py-1 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 select-none">
        <div class="flex items-center gap-2">
          <span>
            Ln {cursorInfo().line}, Col {cursorInfo().col}
          </span>
          <span>•</span>
          <span>{lineCount()} lines</span>
          <span>•</span>
          <span>{stats().chars} chars</span>
        </div>
        <div>
          <span>Tab = 2 spaces</span>
        </div>
      </div>

      <style>{`
        .editor-font {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
          font-size: 13px !important;
          line-height: 22px !important;
          letter-spacing: 0px !important;
          word-spacing: 0px !important;
          tab-size: 2 !important;
          font-variant-ligatures: none !important;
        }

        .editor-textarea {
          color: transparent !important;
          -webkit-text-fill-color: transparent !important;
          caret-color: #0284c7 !important;
        }

        .editor-textarea::selection {
          background-color: rgba(14, 165, 233, 0.3) !important;
          color: transparent !important;
          -webkit-text-fill-color: transparent !important;
        }

        .dark .editor-textarea {
          caret-color: #38bdf8 !important;
        }

        .dark .editor-textarea::selection {
          background-color: rgba(56, 189, 248, 0.35) !important;
        }
      `}</style>
    </div>
  );
}
