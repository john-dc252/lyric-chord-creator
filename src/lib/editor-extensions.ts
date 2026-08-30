import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { EditorView, gutter, GutterMarker } from '@codemirror/view';
import { Extension } from '@codemirror/state';

/**
 * Custom StreamLanguage definition for Lyric-Chord template syntax
 */
export const lyricChordLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.sol()) {
      if (stream.match(/^@title:?/)) return 'meta';
      if (stream.match(/^@artist:?/)) return 'meta';
      if (stream.match(/^@column_break\b/)) return 'keyword';
      if (stream.match(/^@page_break\b/)) return 'keyword';
      if (stream.match(/^@empty_line\b/)) return 'keyword';
      if (stream.match(/^@chord_sequence:?/)) return 'meta';
      if (stream.match(/^\[[^\]]*\]/)) return 'heading';
    }
    if (stream.match(/^\{[^}]*\}/)) {
      return 'atom';
    }
    stream.next();
    return null;
  },
});

/**
 * Syntax highlighting styles for light mode
 */
export const lyricChordLightHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.meta, color: '#d97706', fontWeight: 'bold' }, // amber-600 (@title, @artist, @chord_sequence)
    { tag: t.keyword, color: '#e11d48', fontWeight: 'bold' }, // rose-600 (@page_break, @column_break, @empty_line)
    { tag: t.heading, color: '#4f46e5', fontWeight: 'bold' }, // indigo-600 ([Section Headers])
    { tag: t.atom, color: '#059669', fontWeight: 'bold' }, // emerald-600 ({Chords})
  ]),
);

/**
 * Syntax highlighting styles for dark mode
 */
export const lyricChordDarkHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.meta, color: '#fbbf24', fontWeight: 'bold' }, // amber-400
    { tag: t.keyword, color: '#fb7185', fontWeight: 'bold' }, // rose-400
    { tag: t.heading, color: '#818cf8', fontWeight: 'bold' }, // indigo-400
    { tag: t.atom, color: '#34d399', fontWeight: 'bold' }, // emerald-400
  ]),
);

/**
 * Gutter Marker class for line numbers
 */
class LineNumberMarker extends GutterMarker {
  constructor(
    readonly text: string,
    readonly isCurrent: boolean,
  ) {
    super();
  }

  toDOM() {
    const el = document.createElement('div');
    el.className = `cm-gutterElement ${
      this.isCurrent
        ? 'cm-active-line-num font-bold text-sky-600 dark:text-sky-400'
        : 'text-slate-400 dark:text-slate-600'
    }`;
    el.textContent = this.text;
    el.style.textAlign = 'right';
    el.style.paddingRight = '8px';
    el.style.fontSize = '12px';
    el.style.fontFamily = 'inherit';
    el.style.lineHeight = '22px';
    return el;
  }

  eq(other: GutterMarker) {
    return (
      other instanceof LineNumberMarker &&
      other.text === this.text &&
      other.isCurrent === this.isCurrent
    );
  }
}

/**
 * Custom line numbers gutter supporting relative line numbers (hybrid mode)
 */
export function createLineNumbersGutter(isRelative: boolean): Extension {
  return gutter({
    class: 'cm-lineNumbers select-none bg-slate-50 dark:bg-slate-950/60 border-r border-slate-200 dark:border-slate-800/80',
    lineMarker(view, line) {
      const lineNo = view.state.doc.lineAt(line.from).number;
      if (!isRelative) {
        return new LineNumberMarker(String(lineNo), false);
      }
      const currentLineNo = view.state.doc.lineAt(view.state.selection.main.head).number;
      const isCurrent = lineNo === currentLineNo;
      const text = isCurrent ? String(lineNo) : String(Math.abs(lineNo - currentLineNo));
      return new LineNumberMarker(text, isCurrent);
    },
    update(update) {
      return update.docChanged || (isRelative && update.selectionSet) || update.viewportChanged;
    },
    initialSpacer() {
      return new LineNumberMarker('999', false);
    },
  });
}

/**
 * CodeMirror 6 Theme configuration matching application aesthetics
 */
export function createEditorTheme(isDark: boolean): Extension {
  return EditorView.theme(
    {
      '&': {
        height: '100%',
        fontSize: '13px',
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        color: isDark ? '#f1f5f9' : '#0f172a',
      },
      '.cm-content': {
        padding: '12px 12px 24px 12px',
        lineHeight: '22px',
        caretColor: isDark ? '#38bdf8' : '#0284c7',
        fontFamily: 'inherit',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: isDark ? '#38bdf8' : '#0284c7',
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: isDark
          ? 'rgba(56, 189, 248, 0.3) !important'
          : 'rgba(14, 165, 233, 0.25) !important',
      },
      '.cm-activeLine': {
        backgroundColor: isDark
          ? 'rgba(30, 41, 59, 0.6)'
          : 'rgba(240, 249, 255, 0.7)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: isDark
          ? 'rgba(30, 41, 59, 0.8)'
          : 'rgba(224, 242, 254, 0.8)',
      },
      '.cm-gutters': {
        backgroundColor: isDark ? 'rgba(2, 6, 23, 0.7)' : 'rgba(248, 250, 252, 0.9)',
        color: isDark ? '#64748b' : '#94a3b8',
        borderRight: isDark ? '1px solid rgba(30, 41, 59, 0.8)' : '1px solid rgba(226, 232, 240, 0.9)',
        minWidth: '40px',
      },
      '.cm-scroller': {
        fontFamily: 'inherit',
        lineHeight: '22px',
        overflow: 'auto',
      },
      '.cm-vim-panel': {
        padding: '2px 8px',
        backgroundColor: isDark ? '#020617' : '#f8fafc',
        color: isDark ? '#94a3b8' : '#475569',
        fontSize: '11px',
        fontFamily: 'inherit',
        borderTop: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
      },
      '.cm-fat-cursor': {
        backgroundColor: isDark ? '#38bdf8 !important' : '#0284c7 !important',
        color: '#ffffff !important',
      },
      '&:not(.cm-focused) .cm-fat-cursor': {
        outline: isDark ? '1px solid #38bdf8 !important' : '1px solid #0284c7 !important',
        backgroundColor: 'transparent !important',
      },
    },
    { dark: isDark },
  );
}
