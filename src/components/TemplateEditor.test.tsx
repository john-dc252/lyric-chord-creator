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
      <TemplateEditor value={doc()} onInput={setDoc} />
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
      <TemplateEditor value={doc()} onInput={setDoc} />
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
      <TemplateEditor value={doc()} onInput={setDoc} />
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
      <TemplateEditor value={doc()} onInput={setDoc} />
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
      <TemplateEditor value={doc()} onInput={setDoc} />
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
});
