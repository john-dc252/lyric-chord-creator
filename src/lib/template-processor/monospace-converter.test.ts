import { describe, expect, test, vi } from 'vitest';
import {
  detectPotentialMonospaceFormat,
  monospaceToTemplate,
} from './monospace-converter';

describe('detectPotentialMonospaceFormat', () => {
  test('returns true when source text contains no opening curly braces', () => {
    const monoSource = [
      '@title: Amazing Grace',
      '[Verse 1]',
      ' G                 C         G',
      'Amazing grace, how sweet the sound',
    ].join('\n');

    expect(detectPotentialMonospaceFormat(monoSource)).toBe(true);
    expect(detectPotentialMonospaceFormat('')).toBe(true);
  });

  test('returns false when source text already contains inline chord syntax', () => {
    const templateSource = [
      '@title: Amazing Grace',
      '[Verse 1]',
      'A{G}mazing grace, how {C}sweet the {G}sound',
    ].join('\n');

    expect(detectPotentialMonospaceFormat(templateSource)).toBe(false);
    expect(detectPotentialMonospaceFormat('{C}')).toBe(false);
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
