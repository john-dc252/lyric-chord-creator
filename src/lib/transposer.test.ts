import { describe, expect, it } from 'vitest';
import {
  transposeChord,
  transposeChordSequence,
  transposeNote,
  transposeTemplate,
} from './transposer';

describe('transposer module', () => {
  describe('transposeNote', () => {
    it('transposes natural notes without accidental', () => {
      expect(transposeNote('C', 2)).toBe('D');
      expect(transposeNote('C', 4)).toBe('E');
      expect(transposeNote('C', 5)).toBe('F');
      expect(transposeNote('C', 7)).toBe('G');
      expect(transposeNote('C', 9)).toBe('A');
      expect(transposeNote('C', 11)).toBe('B');
      expect(transposeNote('C', 12)).toBe('C');
      expect(transposeNote('C', -2)).toBe('A#'); // default sharp
      expect(transposeNote('C', -2, true)).toBe('Bb'); // prefer flat
    });

    it('preserves flat preference from source note when transposing', () => {
      expect(transposeNote('Bb', 2)).toBe('C');
      expect(transposeNote('Bb', -1)).toBe('A');
      expect(transposeNote('Eb', 1)).toBe('E');
      expect(transposeNote('Eb', -1)).toBe('D');
    });

    it('handles sharp notes properly', () => {
      expect(transposeNote('F#', 1)).toBe('G');
      expect(transposeNote('C#', 2)).toBe('D#');
      expect(transposeNote('G#', 5)).toBe('C#');
    });

    it('handles negative transpositions cyclically', () => {
      expect(transposeNote('A', -1)).toBe('G#');
      expect(transposeNote('A', -2)).toBe('G');
    });

    it('returns original input if note is unrecognized', () => {
      expect(transposeNote('X', 2)).toBe('X');
    });
  });

  describe('transposeChord', () => {
    it('returns same chord when semitones is 0 or multiple of 12', () => {
      expect(transposeChord('C#m7', 0)).toBe('C#m7');
      expect(transposeChord('C#m7', 12)).toBe('C#m7');
      expect(transposeChord('C#m7', -12)).toBe('C#m7');
    });

    it('transposes complex chords preserving modifiers', () => {
      expect(transposeChord('Esus4', 1)).toBe('Fsus4');
      expect(transposeChord('C#m7', 2)).toBe('D#m7');
      expect(transposeChord('F#m7b5', 1)).toBe('Gm7b5');
      expect(transposeChord('Gmaj7', 3)).toBe('A#maj7');
      expect(transposeChord('Gmaj7', 3, true)).toBe('Bbmaj7');
    });

    it('transposes slash chords properly (root and bass shifted identically)', () => {
      expect(transposeChord('D/F#', 2)).toBe('E/G#');
      expect(transposeChord('C/E', -2, true)).toBe('Bb/D');
      expect(transposeChord('A/C#', 1)).toBe('A#/D');
    });
  });

  describe('transposeChordSequence', () => {
    it('transposes multiple chords while preserving spacing and delimiters', () => {
      const input = 'E   A   C#m   A - B';
      const expected = 'F#   B   D#m   B - C#';
      expect(transposeChordSequence(input, 2)).toBe(expected);
    });

    it('does not transpose non-chord words or numbers', () => {
      const input = 'Intro x2: G - D/F# - Em - C';
      const output = transposeChordSequence(input, 2);
      expect(output).toBe('Intro x2: A - E/G# - F#m - D');
    });
  });

  describe('transposeTemplate', () => {
    it('transposes both embedded chords and chord sequences in multiline template', () => {
      const template = [
        '@title: I Know',
        '@artist: Liveloud',
        '@empty_line',
        '[Intro x2]',
        '@chord_sequence: E   A   C#m   A - B',
        '@empty_line',
        '[Verse 1]',
        '{E}I {Esus4}know You’ve given all I need  {A}',
        'I know Your blessings never {C#m}end',
        'I know that Your love is for{A}e---{B}ver',
      ].join('\n');

      const transposed = transposeTemplate(template, 2);

      expect(transposed).toContain('@chord_sequence: F#   B   D#m   B - C#');
      expect(transposed).toContain('{F#}I {F#sus4}know You’ve given all I need  {B}');
      expect(transposed).toContain('I know Your blessings never {D#m}end');
      expect(transposed).toContain('I know that Your love is for{B}e---{C#}ver');
      expect(transposed).toContain('@title: I Know');
      expect(transposed).toContain('@artist: Liveloud');
    });

    it('returns unmodified template if semitones is 0', () => {
      const template = '{E}Hello {A}World';
      expect(transposeTemplate(template, 0)).toBe(template);
    });
  });
});
