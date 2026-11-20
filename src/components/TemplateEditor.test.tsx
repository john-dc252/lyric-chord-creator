import { EditorView } from '@codemirror/view';
import { cleanup, fireEvent, render } from '@solidjs/testing-library';
import { createSignal, flush, untrack } from 'solid-js';
import { afterEach, describe, expect, test } from 'vitest';
import TemplateEditor from './TemplateEditor';

function getEditorView(container: HTMLElement): EditorView {
  const cmContent = container.querySelector('.cm-content') as HTMLElement | null;
  if (!cmContent) {
    throw new Error('Could not find .cm-content element');
  }
  const view = EditorView.findFromDOM(cmContent);
  if (!view) {
    throw new Error('Could not find EditorView instance from DOM');
  }
  return view;
}

describe('<TemplateEditor /> Mono to Template modes', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  test('full document conversion mode converts entire document when no text is selected', () => {
    const initialDoc = [
      '@title: Amazing Grace',
      '[Verse 1]',
      ' G                 C         G',
      'Amazing grace, how sweet the sound',
    ].join('\n');

    const [doc, setDoc] = createSignal(initialDoc);
    const { container, getByTitle } = render(() => (
      <TemplateEditor value={doc()} onInput={setDoc} templateStyle="embedded" />
    ));
    flush();

    const monoBtn = getByTitle('Convert from monospace format to template format (Win/Cmd+Shift+T)');
    expect(monoBtn).not.toBeDisabled();

    fireEvent.click(monoBtn);
    flush();

    const view = getEditorView(container);
    expect(untrack(doc)).toBe(
      [
        '@title: Amazing Grace',
        '[Verse 1]',
        'A{G}mazing grace, how {C}sweet the {G}sound',
      ].join('\n'),
    );
    expect(view.hasFocus).toBe(true);
    expect(monoBtn).toBeDisabled();
  });

  test('fragment conversion mode activates when selecting at least two lines (even partially) and converts only those lines', () => {
    const initialDoc = [
      '@title: Amazing Grace',
      '[Verse 1]',
      'A{G}mazing grace, how {C}sweet the {G}sound',
      '[Verse 2]',
      ' G                        C        G',
      'Twas grace that taught my heart to fear',
      '             D7',
      'And grace my fears relieved',
    ].join('\n');

    const [doc, setDoc] = createSignal(initialDoc);
    const { container, getByTitle } = render(() => (
      <TemplateEditor value={doc()} onInput={setDoc} templateStyle="embedded" />
    ));
    flush();

    const monoBtn = getByTitle('Convert from monospace format to template format (Win/Cmd+Shift+T)');
    // Full document has {G}, {C} in Verse 1, so full document mode disables the button
    expect(monoBtn).toBeDisabled();

    const view = getEditorView(container);
    // Select partially across lines 5 to 8 (both chord/lyric pairs of Verse 2)
    const line5 = view.state.doc.line(5);
    const line8 = view.state.doc.line(8);
    view.dispatch({
      selection: {
        anchor: line5.from + 4,
        head: line8.from + 10,
      },
    });
    flush();

    // Fragment mode detects that lines 5-8 are potential monospace format
    expect(monoBtn).not.toBeDisabled();

    fireEvent.click(monoBtn);
    flush();

    // Only lines 5-8 are converted; lines 1-4 remain untouched
    expect(untrack(doc)).toBe(
      [
        '@title: Amazing Grace',
        '[Verse 1]',
        'A{G}mazing grace, how {C}sweet the {G}sound',
        '[Verse 2]',
        'T{G}was grace that taught my {C}heart to {G}fear',
        'And grace my {D7}fears relieved',
      ].join('\n'),
    );
    // Converted lines remain selected and editor regains focus after conversion
    const sel = view.state.selection.main;
    expect(view.state.sliceDoc(sel.from, sel.to)).toBe(
      [
        'T{G}was grace that taught my {C}heart to {G}fear',
        'And grace my {D7}fears relieved',
      ].join('\n'),
    );
    expect(view.hasFocus).toBe(true);
    expect(monoBtn).toBeDisabled();
  });

  test('stays in full document mode when selection is within a single line and returns to full document mode when selection is cleared', () => {
    const initialDoc = [
      '@title: Amazing Grace',
      '[Verse 1]',
      'A{G}mazing grace, how {C}sweet the {G}sound',
      '[Verse 2]',
      ' G                        C        G',
      'Twas grace that taught my heart to fear',
    ].join('\n');

    const [doc, setDoc] = createSignal(initialDoc);
    const { container, getByTitle } = render(() => (
      <TemplateEditor value={doc()} onInput={setDoc} templateStyle="embedded" />
    ));
    flush();

    const monoBtn = getByTitle('Convert from monospace format to template format (Win/Cmd+Shift+T)');
    const view = getEditorView(container);

    // Single-line selection on line 5 (monospace chord line) should NOT activate fragment mode
    const line5 = view.state.doc.line(5);
    view.dispatch({
      selection: {
        anchor: line5.from + 1,
        head: line5.to - 1,
      },
    });
    flush();
    expect(monoBtn).toBeDisabled();

    // Selecting across lines 5 and 6 activates fragment mode
    const line6 = view.state.doc.line(6);
    view.dispatch({
      selection: {
        anchor: line5.from + 2,
        head: line6.from + 5,
      },
    });
    flush();
    expect(monoBtn).not.toBeDisabled();

    // Clearing selection returns to full document mode
    view.dispatch({
      selection: {
        anchor: line5.from,
      },
    });
    flush();
    expect(monoBtn).toBeDisabled();
  });

  test('disables button in fragment mode when selected lines already contain template chord syntax', () => {
    const initialDoc = [
      '[Verse 1]',
      'A{G}mazing grace, how {C}sweet the {G}sound',
      'That saved a {D7}wretch like me',
      '[Verse 2]',
      ' G                        C        G',
      'Twas grace that taught my heart to fear',
    ].join('\n');

    const [doc, setDoc] = createSignal(initialDoc);
    const { container, getByTitle } = render(() => (
      <TemplateEditor value={doc()} onInput={setDoc} templateStyle="embedded" />
    ));
    flush();

    const monoBtn = getByTitle('Convert from monospace format to template format (Win/Cmd+Shift+T)');
    const view = getEditorView(container);

    // Select lines 2 and 3 (which already contain {G}, {C}, {D7})
    const line2 = view.state.doc.line(2);
    const line3 = view.state.doc.line(3);
    view.dispatch({
      selection: {
        anchor: line2.from,
        head: line3.to,
      },
    });
    flush();

    expect(monoBtn).toBeDisabled();
  });

  test('triggers conversion on Meta+Shift+T only when focus is on the editor', () => {
    const initialDoc = [
      '@title: Amazing Grace',
      '[Verse 1]',
      ' G                 C         G',
      'Amazing grace, how sweet the sound',
    ].join('\n');

    const [doc, setDoc] = createSignal(initialDoc);
    const { container, getByTitle } = render(() => (
      <TemplateEditor value={doc()} onInput={setDoc} templateStyle="embedded" />
    ));
    flush();

    // Keydown outside the editor should not trigger conversion
    const saveBtn = getByTitle('Save template to library (Ctrl/Cmd+S)');
    saveBtn.focus();
    fireEvent.keyDown(saveBtn, { key: 'T', metaKey: true, shiftKey: true });
    flush();
    expect(untrack(doc)).toBe(initialDoc);

    // Keydown on the focused editor triggers conversion
    const view = getEditorView(container);
    view.focus();
    fireEvent.keyDown(view.contentDOM, { key: 'T', metaKey: true, shiftKey: true });
    flush();

    expect(untrack(doc)).toBe(
      [
        '@title: Amazing Grace',
        '[Verse 1]',
        'A{G}mazing grace, how {C}sweet the {G}sound',
      ].join('\n'),
    );
  });

  test('renders template style dropdown with Monospace and Embedded options, shows wand button only in Embedded style, and converts source when switching styles', () => {
    const initialEmbedded = [
      '@title: Amazing Grace',
      '@empty_line',
      '[Verse 1]',
      'A{G}mazing grace, how {C}sweet the {G}sound',
    ].join('\n');

    const expectedMonospace = [
      '@title: Amazing Grace',
      '',
      '[Verse 1]',
      ' G                 C         G',
      'Amazing grace, how sweet the sound',
    ].join('\n');

    const [doc, setDoc] = createSignal(initialEmbedded);
    const { getByLabelText, queryByTitle } = render(() => (
      <TemplateEditor value={doc()} onInput={setDoc} />
    ));
    flush();

    const styleSelect = getByLabelText('Template style') as HTMLSelectElement;
    const optionTexts = Array.from(styleSelect.options).map((o) => o.textContent?.trim());
    expect(optionTexts).toEqual(['Monospace', 'Embedded']);
    expect(styleSelect.value).toBe('embedded');

    const monoBtnTitle = 'Convert from monospace format to template format (Win/Cmd+Shift+T)';

    // Wand button is visible when Embedded is selected and has no text label
    const monoBtn = queryByTitle(monoBtnTitle);
    expect(monoBtn).not.toBeNull();
    expect(monoBtn?.textContent).toBe('');

    // Switch style to Monospace -> converts source to monospace and hides wand button
    fireEvent.change(styleSelect, { target: { value: 'monospace' } });
    flush();

    expect(styleSelect.value).toBe('monospace');
    expect(queryByTitle(monoBtnTitle)).toBeNull();
    expect(untrack(doc)).toBe(expectedMonospace);

    // Switch style back to Embedded -> converts source back to embedded and shows wand button
    fireEvent.change(styleSelect, { target: { value: 'embedded' } });
    flush();

    expect(styleSelect.value).toBe('embedded');
    expect(queryByTitle(monoBtnTitle)).not.toBeNull();
    expect(untrack(doc)).toBe(initialEmbedded);
  });

  test('highlights chords on chord lines in monospace mode and after @chord_sequence: with the same color scheme as embedded mode', () => {
    const initialEmbedded = [
      '@title: Amazing Grace',
      '[Intro]',
      '@chord_sequence: G C D7',
      '[Verse 1]',
      'A{G}mazing grace, how {C}sweet the {G}sound',
    ].join('\n');

    const [doc, setDoc] = createSignal(initialEmbedded);
    const { container, getByLabelText } = render(() => (
      <TemplateEditor value={doc()} onInput={setDoc} />
    ));
    flush();

    // Capture the highlight class applied to {G} in embedded mode
    const embeddedLines = container.querySelectorAll('.cm-line');
    const embeddedChordSpan = Array.from(embeddedLines[4].querySelectorAll('span')).find(
      (el) => el.textContent === '{G}',
    );
    expect(embeddedChordSpan).toBeDefined();
    const chordHighlightClass = embeddedChordSpan!.className;
    expect(chordHighlightClass.length).toBeGreaterThan(0);

    // Chords after @chord_sequence: in embedded mode use the chord highlight class
    const embeddedSeqSpans = Array.from(embeddedLines[2].querySelectorAll('span'));
    expect(embeddedSeqSpans.map((s) => s.textContent)).toEqual(['@chord_sequence:', 'G', 'C', 'D7']);
    for (const span of embeddedSeqSpans.slice(1)) {
      expect(span.className).toBe(chordHighlightClass);
    }

    // Switch to monospace mode
    const styleSelect = getByLabelText('Template style') as HTMLSelectElement;
    fireEvent.change(styleSelect, { target: { value: 'monospace' } });
    flush();

    const monoLines = container.querySelectorAll('.cm-line');
    // Chords after @chord_sequence: in monospace mode also use the chord highlight class
    const monoSeqSpans = Array.from(monoLines[2].querySelectorAll('span'));
    expect(monoSeqSpans.map((s) => s.textContent)).toEqual(['@chord_sequence:', 'G', 'C', 'D7']);
    for (const span of monoSeqSpans.slice(1)) {
      expect(span.className).toBe(chordHighlightClass);
    }

    // In monospace mode, line 5 is the chord line (" G                 C         G")
    // and line 6 is the lyric line ("Amazing grace, how sweet the sound")
    const chordSpans = Array.from(monoLines[4].querySelectorAll('span'));
    expect(chordSpans.map((s) => s.textContent)).toEqual(['G', 'C', 'G']);
    for (const span of chordSpans) {
      expect(span.className).toBe(chordHighlightClass);
    }

    // Lyric line should not highlight words as chords
    expect(monoLines[5].querySelectorAll('span').length).toBe(0);
  });

  test('automatically detects template style based on presence or absence of "{" when a template is loaded', () => {
    const monospaceDoc = [
      '@title: Amazing Grace',
      '[Verse 1]',
      ' G                 C         G',
      'Amazing grace, how sweet the sound',
    ].join('\n');

    const embeddedDoc = [
      '@title: Amazing Grace',
      '[Verse 1]',
      'A{G}mazing grace, how {C}sweet the {G}sound',
    ].join('\n');

    const [doc, setDoc] = createSignal(monospaceDoc);
    const { getByLabelText } = render(() => (
      <TemplateEditor value={doc()} onInput={setDoc} />
    ));
    flush();

    const styleSelect = getByLabelText('Template style') as HTMLSelectElement;
    // Initial load without '{' detects monospace
    expect(styleSelect.value).toBe('monospace');

    // Loading a template containing '{' detects embedded
    setDoc(embeddedDoc);
    flush();
    expect(styleSelect.value).toBe('embedded');

    // Loading a template without '{' again detects monospace
    setDoc(monospaceDoc);
    flush();
    expect(styleSelect.value).toBe('monospace');
  });
});
