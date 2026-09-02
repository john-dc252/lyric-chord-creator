import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { EditorView, lineNumbers } from '@codemirror/view';
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
    { tag: t.meta, color: '#fbbf24', fontWeight: 'bold' }, // amber-400 (@title, @artist, @chord_sequence)
    { tag: t.keyword, color: '#fb7185', fontWeight: 'bold' }, // rose-400 (@page_break, @column_break, @empty_line)
    { tag: t.heading, color: '#818cf8', fontWeight: 'bold' }, // indigo-400 ([Section Headers])
    { tag: t.atom, color: '#34d399', fontWeight: 'bold' }, // emerald-400 ({Chords})
  ]),
);

/**
 * Custom line numbers gutter supporting relative line numbers (hybrid mode)
 */
export function createLineNumbersGutter(isRelative: boolean): Extension {
  return lineNumbers({
    formatNumber(lineNo, state) {
      if (!isRelative) return String(lineNo);
      const currentLineNo = state.doc.lineAt(state.selection.main.head).number;
      return lineNo === currentLineNo ? String(lineNo) : String(Math.abs(lineNo - currentLineNo));
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
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        backgroundColor: isDark ? '#0f172a' : '#ffffff', // slate-900 / white
        color: isDark ? '#f8fafc' : '#0f172a',
      },
      '.cm-content': {
        padding: '12px 0',
        caretColor: isDark ? '#38bdf8' : '#0284c7', // sky-400 / sky-600
        lineHeight: '1.6',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: isDark ? '#38bdf8' : '#0284c7',
        borderLeftWidth: '2px',
      },
      // Context-aware Vim Mode Cursor
      '.cm-vimCursorLayer': {
        zIndex: '5',
      },
      '.cm-vimCursorLayer .cm-fat-cursor': {
        position: 'absolute',
        backgroundColor: isDark ? 'rgba(56, 189, 248, 0.75)' : 'rgba(2, 132, 199, 0.75)',
        mixBlendMode: isDark ? 'screen' : 'multiply',
        color: isDark ? '#0f172a !important' : '#ffffff !important',
        border: 'none',
        borderRadius: '1px',
      },
      // Insert mode: emerald/green caret
      '&[data-vim-mode="insert"] .cm-cursor': {
        borderLeftColor: isDark ? '#34d399' : '#059669',
        borderLeftWidth: '2.5px',
      },
      '&[data-vim-mode="insert"] .cm-content': {
        caretColor: isDark ? '#34d399' : '#059669',
      },
      // Visual mode (focused): blue fat cursor and selection
      '&.cm-focused[data-vim-mode^="visual"] .cm-vimCursorLayer .cm-fat-cursor': {
        backgroundColor: isDark ? 'rgba(56, 189, 248, 0.85)' : 'rgba(2, 132, 199, 0.85)',
        mixBlendMode: isDark ? 'screen' : 'multiply',
        color: isDark ? '#0f172a !important' : '#ffffff !important',
      },
      '&[data-vim-mode^="visual"] .cm-selectionBackground, &[data-vim-mode^="visual"] .cm-selectionLayer .cm-selectionBackground, &[data-vim-mode^="visual"].cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
        backgroundColor: isDark ? 'rgba(14, 165, 233, 0.5) !important' : '#60a5fa !important',
      },
      '&:not(.cm-focused)[data-vim-mode^="visual"] .cm-selectionBackground, &:not(.cm-focused)[data-vim-mode^="visual"] .cm-selectionLayer .cm-selectionBackground': {
        backgroundColor: isDark ? '#1e3a5f !important' : '#93c5fd !important',
      },
      // Replace mode: crimson/rose underline cursor
      '&.cm-focused[data-vim-mode="replace"] .cm-vimCursorLayer .cm-fat-cursor': {
        backgroundColor: isDark ? 'rgba(244, 63, 94, 0.85)' : 'rgba(225, 29, 72, 0.85)',
        color: '#ffffff !important',
        borderBottom: `2px solid ${isDark ? '#f43f5e' : '#e11d48'}`,
      },
      '&[data-vim-mode="replace"] .cm-content': {
        caretColor: isDark ? '#f43f5e' : '#e11d48',
      },
      // Unfocused fat cursor in all modes (normal, visual, replace)
      '&:not(.cm-focused) .cm-fat-cursor, &:not(.cm-focused) .cm-vimCursorLayer .cm-fat-cursor, &:not(.cm-focused)[data-vim-mode] .cm-vimCursorLayer .cm-fat-cursor': {
        backgroundColor: 'transparent !important',
        outline: `1.5px solid ${isDark ? '#38bdf8' : '#0284c7'} !important`,
        color: `${isDark ? '#f8fafc' : '#0f172a'} !important`,
        mixBlendMode: 'normal !important',
      },
      // Selection highlights: Light Mode (rich blue) & Dark Mode (cyan-blue)
      '.cm-selectionBackground': {
        backgroundColor: isDark ? '#1e3a5f !important' : '#93c5fd !important',
      },
      '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: isDark ? 'rgba(14, 165, 233, 0.5) !important' : '#60a5fa !important',
      },
      '.cm-content ::selection': {
        backgroundColor: 'transparent !important',
      },
      '.cm-gutters': {
        backgroundColor: isDark ? '#0b1120' : '#f8fafc', // slate-950 / slate-50
        color: isDark ? '#475569' : '#94a3b8', // slate-600 / slate-400
        borderRight: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
        userSelect: 'none',
      },
      '.cm-activeLineGutter': {
        backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
        color: isDark ? '#38bdf8' : '#0284c7',
        fontWeight: 'bold',
      },
      '.cm-activeLine': {
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.35)' : 'rgba(241, 245, 249, 0.5)',
      },
      '.cm-matchingBracket, .cm-nonmatchingBracket': {
        backgroundColor: isDark ? '#334155' : '#cbd5e1',
        outline: `1px solid ${isDark ? '#64748b' : '#94a3b8'}`,
      },
      '.cm-line': {
        padding: '0 12px',
      },
      '.cm-scroller': {
        fontFamily: 'inherit',
        overflow: 'auto',
      },
    },
    { dark: isDark },
  );
}
