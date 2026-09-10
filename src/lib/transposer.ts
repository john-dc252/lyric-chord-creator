/**
 * In-house transposition utility for musical chords and templates.
 * Operates purely on text tokens using ECMAScript Iterator helpers for optimum performance.
 */

const CHROMATIC_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const CHROMATIC_FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const NOTE_TO_INDEX: Readonly<Record<string, number>> = {
  C: 0,
  'B#': 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  'E#': 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

const CHORD_REGEX = /^([A-G][#b]?)(.*?)(\/([A-G][#b]?))?$/;

/**
 * Transposes a single note by a given number of semitones.
 */
export function transposeNote(note: string, semitones: number, preferFlats?: boolean): string {
  const index = NOTE_TO_INDEX[note];
  if (index === undefined) {
    return note;
  }

  // Modulo 12 normalized to positive range [0, 11]
  const targetIndex = ((index + semitones) % 12 + 12) % 12;

  // Auto-detect flat preference from original note if not explicitly specified
  const useFlats = preferFlats ?? note.includes('b');
  return useFlats ? CHROMATIC_FLATS[targetIndex] : CHROMATIC_SHARPS[targetIndex];
}

/**
 * Transposes a single chord string (e.g. "C#m7", "Bbadd9", "D/F#") by semitones.
 */
export function transposeChord(chordStr: string, semitones: number, preferFlats?: boolean): string {
  const normalizedSemitones = ((semitones % 12) + 12) % 12;
  if (normalizedSemitones === 0) {
    return chordStr;
  }

  const trimmed = chordStr.trim();
  const match = trimmed.match(CHORD_REGEX);
  if (!match) {
    return chordStr;
  }

  const root = match[1];
  const modifier = match[2] || '';
  const bass = match[4];

  // If root was flat, default to flats for bass as well unless overridden
  const useFlats = preferFlats ?? root.includes('b');
  const transposedRoot = transposeNote(root, semitones, useFlats);
  const transposedBass = bass ? `/${transposeNote(bass, semitones, useFlats)}` : '';

  return `${transposedRoot}${modifier}${transposedBass}`;
}

const CHORD_TOKEN_REGEX = /([A-G][#b]?(?:[a-zA-Z0-9#+°ø^]*)(?:\/[A-G][#b]?)?)/g;

/**
 * Transposes all chords in a chord sequence string (e.g. "E   A   C#m   A - B").
 */
export function transposeChordSequence(sequence: string, semitones: number, preferFlats?: boolean): string {
  if (((semitones % 12) + 12) % 12 === 0) {
    return sequence;
  }

  return sequence.replace(CHORD_TOKEN_REGEX, (token) => {
    if (/^[A-G][#b]?/.test(token)) {
      return transposeChord(token, semitones, preferFlats);
    }
    return token;
  });
}

/**
 * Post-processes a complete template string by transposing embedded chords {chord}
 * and @chord_sequence directives using iterator helpers.
 */
export function transposeTemplate(template: string, semitones: number, preferFlats?: boolean): string {
  const normalizedSemitones = ((semitones % 12) + 12) % 12;
  if (normalizedSemitones === 0 || !template) {
    return template;
  }

  const lines = template.split('\n');
  const transposedLines = Iterator.from(lines)
    .map((line) => {
      // 1. Embedded chords line: e.g. "{E}I {Esus4}know You’ve given {A}"
      if (line.includes('{')) {
        return line.replace(/\{([^}]+)\}/g, (_fullMatch, chord) => {
          return `{${transposeChord(chord, semitones, preferFlats)}}`;
        });
      }

      // 2. Chord sequence directive: e.g. "@chord_sequence: E   A   C#m   A - B"
      if (line.trim().startsWith('@chord_sequence:')) {
        return line.replace(/^(\s*@chord_sequence:\s*)(.*)$/, (_, prefix, seq) => {
          return `${prefix}${transposeChordSequence(seq, semitones, preferFlats)}`;
        });
      }

      return line;
    })
    .toArray();

  return transposedLines.join('\n');
}
