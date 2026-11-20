import { describe, expect, test, vi } from 'vitest';
import {
  detectPotentialMonospaceFormat,
  detectTemplateStyle,
  monospaceToTemplate,
  templateToMonospace,
} from './monospace-converter';

describe('detectPotentialMonospaceFormat & detectTemplateStyle', () => {
  test('returns true / monospace when source text contains no opening curly braces', () => {
    const monoSource = [
      '@title: Amazing Grace',
      '[Verse 1]',
      ' G                 C         G',
      'Amazing grace, how sweet the sound',
    ].join('\n');

    expect(detectPotentialMonospaceFormat(monoSource)).toBe(true);
    expect(detectPotentialMonospaceFormat('')).toBe(true);
    expect(detectTemplateStyle(monoSource)).toBe('monospace');
    expect(detectTemplateStyle('')).toBe('monospace');
  });

  test('returns false / embedded when source text contains inline chord syntax', () => {
    const templateSource = [
      '@title: Amazing Grace',
      '[Verse 1]',
      'A{G}mazing grace, how {C}sweet the {G}sound',
    ].join('\n');

    expect(detectPotentialMonospaceFormat(templateSource)).toBe(false);
    expect(detectPotentialMonospaceFormat('{C}')).toBe(false);
    expect(detectTemplateStyle(templateSource)).toBe('embedded');
    expect(detectTemplateStyle('{C}')).toBe('embedded');
  });
});

describe('monospaceToTemplate', () => {
  test('embeds chords starting at column 0 and spaced offsets into lyric line', () => {
    const input = [
      'G                  C         G',
      'Amazing grace, how sweet the sound',
    ].join('\n');

    expect(monospaceToTemplate(input)).toBe(
      '{G}Amazing grace, how {C}sweet the {G}sound',
    );
  });

  test('embeds chords with leading spaces at exact mid-word and word-start offsets', () => {
    const input = [
      ' G                 C         G',
      'Amazing grace, how sweet the sound',
      '             D7',
      'That saved a wretch like me',
    ].join('\n');

    expect(monospaceToTemplate(input)).toBe(
      [
        'A{G}mazing grace, how {C}sweet the {G}sound',
        'That saved a {D7}wretch like me',
      ].join('\n'),
    );
  });

  test('pads lyric line when chords extend past the end of the lyrics', () => {
    const input = [
      'E                        A',
      'I know You give all I',
    ].join('\n');

    expect(monospaceToTemplate(input)).toBe(
      '{E}I know You give all I    {A}',
    );
  });

  test('preserves @directive: metadata and [Section] headers and converts blank lines to @empty_line', () => {
    const input = [
      '@title: Amazing Grace',
      '@artist: John Newton',
      '',
      '[Verse 1]',
      ' G                 C         G',
      'Amazing grace, how sweet the sound',
      '   ',
      '[Chorus]',
      '@chord_sequence: G C G D7',
    ].join('\n');

    expect(monospaceToTemplate(input)).toBe(
      [
        '@title: Amazing Grace',
        '@artist: John Newton',
        '@empty_line',
        '[Verse 1]',
        'A{G}mazing grace, how {C}sweet the {G}sound',
        '@empty_line',
        '[Chorus]',
        '@chord_sequence: G C G D7',
      ].join('\n'),
    );
  });

  test('warns and preserves trailing unpaired line when pairable line count is odd', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const input = [
      'C       G',
      'Line one',
      'Am      F',
    ].join('\n');

    expect(monospaceToTemplate(input)).toBe(
      [
        '{C}Line one{G}',
        'Am      F',
      ].join('\n'),
    );
    expect(warnSpy).toHaveBeenCalledWith('Unexpected odd number of lines', 3);
    warnSpy.mockRestore();
  });
});

describe('templateToMonospace', () => {
  test('extracts embedded chords into a whitespace-aligned chord line above lyrics', () => {
    const input = [
      '{G}Amazing grace, how {C}sweet the {G}sound',
      'That saved a {D7}wretch like me',
    ].join('\n');

    expect(templateToMonospace(input)).toBe(
      [
        'G                  C         G',
        'Amazing grace, how sweet the sound',
        '             D7',
        'That saved a wretch like me',
      ].join('\n'),
    );
  });

  test('handles chords extending past the end of lyrics', () => {
    const input = '{E}I know You give all I    {A}';

    expect(templateToMonospace(input)).toBe(
      [
        'E                        A',
        'I know You give all I',
      ].join('\n'),
    );
  });

  test('converts @empty_line to blank lines, ignores raw blank lines, and preserves directives and section headers', () => {
    const input = [
      '@title: Amazing Grace',
      '@artist: John Newton',
      '@empty_line',
      '',
      '[Verse 1]',
      'A{G}mazing grace, how {C}sweet the {G}sound',
      '@empty_line',
      '',
      '@column_break',
      '[Chorus]',
      '@chord_sequence: G C G D7',
      '@page_break',
    ].join('\n');

    const mono = templateToMonospace(input);
    expect(mono).toBe(
      [
        '@title: Amazing Grace',
        '@artist: John Newton',
        '',
        '[Verse 1]',
        ' G                 C         G',
        'Amazing grace, how sweet the sound',
        '',
        '@column_break',
        '[Chorus]',
        '@chord_sequence: G C G D7',
        '@page_break',
      ].join('\n'),
    );

    // Round-trip back to template syntax
    expect(monospaceToTemplate(mono)).toBe(
      [
        '@title: Amazing Grace',
        '@artist: John Newton',
        '@empty_line',
        '[Verse 1]',
        'A{G}mazing grace, how {C}sweet the {G}sound',
        '@empty_line',
        '@column_break',
        '[Chorus]',
        '@chord_sequence: G C G D7',
        '@page_break',
      ].join('\n'),
    );
  });

  test('inserts empty chord line above chordless lyric lines and preserves pairing on round-trip', () => {
    const input = [
      '[Verse 1]',
      '@empty_line',
      'A{G}mazing grace, how {C}sweet the {G}sound',
      'That saved a wretch like me',
      '{G}I once was lost, but {C}now am {G}found',
    ].join('\n');

    const mono = templateToMonospace(input);
    expect(mono).toBe(
      [
        '[Verse 1]',
        '',
        ' G                 C         G',
        'Amazing grace, how sweet the sound',
        '',
        'That saved a wretch like me',
        'G                    C      G',
        'I once was lost, but now am found',
      ].join('\n'),
    );

    expect(monospaceToTemplate(mono)).toBe(input);
  });
});
