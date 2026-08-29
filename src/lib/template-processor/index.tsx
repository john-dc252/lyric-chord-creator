/**
 * Template Processor for Lyric-Chord Creator
 * Ported directly from reference implementation (basis/song-chord-guide-css-sample/index.html),
 * updated to emit native SolidJS JSX components.
 */

import {createMemo, For, Show} from 'solid-js';
import type {JSX} from '@solidjs/web';
import BASE_CHORD_GUIDE_CSS from './chord-guide.css?raw';
import DEFAULT_TEMPLATE from './sample-template.lcct.txt?raw';

export {BASE_CHORD_GUIDE_CSS, DEFAULT_TEMPLATE};

export class LineParser {
  readonly regexp: RegExp;
  readonly captureName?: string;
  readonly renderJsx: (val: string) => JSX.Element;
  readonly extractValue: (input: string, parser: LineParser) => JSX.Element | null;

  constructor(
    regexp: RegExp,
    captureName?: string,
    renderJsx: (val: string) => JSX.Element = (val) => val,
    extractValue?: (input: string, parser: LineParser) => JSX.Element | null,
  ) {
    this.regexp = regexp;
    this.captureName = captureName;
    this.renderJsx = renderJsx;
    this.extractValue =
      extractValue ||
      ((input, parser) => {
        const result = parser.regexp.exec(input);
        if (!result) return null;
        if (!parser.captureName) {
          return parser.renderJsx(input);
        }
        const value = result.groups?.[parser.captureName];
        return value !== undefined ? parser.renderJsx(value) : null;
      });
  }

  tryIntoJsx(str: string): JSX.Element | null {
    return this.extractValue(str, this);
  }
}

export const EMPTY_LINE = new LineParser(/@empty_line/, undefined, () => <br/>);

export const PAGE_BREAK_TOKEN = '@page_break';
export const PAGE_BREAK = new LineParser(/@page_break/, undefined, () => null);

export const COLUMN_BREAK = new LineParser(
  /@column_break/,
  undefined,
  () => <div class="column-break"/>,
);

export const TITLE = new LineParser(
  /@title:\s*(?<title>[^\n]+)/,
  'title',
  (title) => <div class="title">{title.trim()}</div>,
);

export const ARTIST = new LineParser(
  /@artist:\s*(?<artist>[^\n]+)/,
  'artist',
  (artist) => <div class="artist">{artist.trim()}</div>,
);

export const SECTION_LABEL = new LineParser(
  /\[(?<label_str>[^\]\n]+)]/,
  'label_str',
  (label) => <div class="section-label">[{label.trim()}]</div>,
);

export const CHORD_SEQUENCE = new LineParser(
  /@chord_sequence:\s*(?<chord_sequence>[^\n]+)/,
  'chord_sequence',
  (inlineChords) => <div class="chord sequence">{inlineChords.trim()}</div>,
);

export const EMBEDDED_CHORDS = new LineParser(
  /\{(?<chord_str>[^}]+)}|(?<text>[^{]+)/g,
  '', // no-op, unused
  undefined, // no-op, unused
  (str, parser) => {
    const matchIter = function* (_str: string) {
      for (let match = parser.regexp.exec(_str); match !== null; match = parser.regexp.exec(_str)) {
        yield match;
      }
    };

    const lineContent = matchIter(str).map(match => {
      if (match.groups?.['chord_str']) {
        return <span class="chord">{match.groups?.['chord_str']}</span>;
      }

      const text = match.groups?.['text'];
      if (!text) {
        console.error('Unexpected match without chord or text from string:', str);
      }

      return text;
    }).toArray();

    return <div class="line">{lineContent}</div>;
  },
);

export const lineParsers = [
  EMPTY_LINE,
  PAGE_BREAK,
  COLUMN_BREAK,
  TITLE,
  ARTIST,
  SECTION_LABEL,
  CHORD_SEQUENCE,
  EMBEDDED_CHORDS,
];

/**
 * Transforms a single template line to its JSX representation.
 */
export function transformLineToJsx(str: string): JSX.Element {
  return (
    Iterator.from(lineParsers)
      .map((parser) => parser.tryIntoJsx(str))
      .find((el) => el != null) ?? <div class="line">{str}</div>
  );
}

/**
 * Extracts the song title from the template if present.
 */
export function extractSongTitle(template: string): string {
  const title = Iterator.from(template.split('\n'))
    .map((line) => line.trim())
    .find((line) => line.startsWith('@title:'))
    ?.replace(/^@title:\s*/, '')
    .trim();

  return title || 'Untitled Song';
}

/**
 * Extracts the song artist from the template if present.
 */
export function extractSongArtist(template: string): string | undefined {
  const artist = Iterator.from(template.split('\n'))
    .map((line) => line.trim())
    .find((line) => line.startsWith('@artist:'))
    ?.replace(/^@artist:\s*/, '')
    .trim();

  return artist || undefined;
}

export interface TemplatePageData {
  lines: string[];
}

/**
 * Splits a template into discrete page groups divided by @page_break.
 */
export function parseTemplatePages(template: string): TemplatePageData[] {
  if (!template || template.trim().length === 0) {
    return [{lines: []}];
  }

  return template.split(PAGE_BREAK_TOKEN).map((pageStr) => ({
    lines: Iterator.from(pageStr.split('\n'))
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .toArray(),
  }));
}

export interface ChordGuidePagesProps {
  template: string;
  class?: string;
}

/**
 * SolidJS JSX Component that renders lyric-chord sheet pages natively.
 */
export function ChordGuidePages(props: ChordGuidePagesProps) {
  const pages = createMemo(() => parseTemplatePages(props.template), {
    name: 'chord_guide_pages',
  });

  return (
    <For each={pages()}>
      {(page) => (
        <div class={['page', props.class]}>
          <Show
            when={page.lines.length > 0}
            fallback={
              <>
                <div class="title">Empty Chord Guide</div>
                <div class="line">Type template syntax to start...</div>
              </>
            }
          >
            <For each={page.lines}>{(line) => transformLineToJsx(line)}</For>
          </Show>
        </div>
      )}
    </For>
  );
}
