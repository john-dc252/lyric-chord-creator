import { createMemo, For, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';

export interface TemplateSyntaxHighlighterProps {
  code: string;
}

interface LyricPart {
  isChord: boolean;
  text: string;
}

/**
 * Parser for syntax-highlighting individual template lines.
 * Follows the same modular architecture as LineParser in the template processor.
 */
export class SyntaxLineParser {
  readonly regexp: RegExp;
  readonly render: (line: string, match: RegExpMatchArray) => JSX.Element;

  constructor(
    regexp: RegExp,
    render: (line: string, match: RegExpMatchArray) => JSX.Element,
  ) {
    this.regexp = regexp;
    this.render = render;
  }

  tryRender(line: string): JSX.Element | null {
    const match = line.match(this.regexp);
    if (!match) return null;
    return this.render(line, match);
  }
}

function parseLyricParts(line: string): LyricPart[] {
  const parts: LyricPart[] = [];
  const regex = /\{([^}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ isChord: false, text: line.substring(lastIndex, match.index) });
    }
    parts.push({ isChord: true, text: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push({ isChord: false, text: line.substring(lastIndex) });
  }

  return parts;
}

export const SYNTAX_TITLE = new SyntaxLineParser(
  /^(@title:)(.*)$/,
  (_line, match) => (
    <>
      <span class="text-amber-600 dark:text-amber-400 font-bold">{match[1]}</span>
      <span class="text-sky-600 dark:text-sky-300 font-semibold underline">{match[2]}</span>
    </>
  ),
);

export const SYNTAX_ARTIST = new SyntaxLineParser(
  /^(@artist:)(.*)$/,
  (_line, match) => (
    <>
      <span class="text-amber-600 dark:text-amber-400 font-bold">{match[1]}</span>
      <span class="text-purple-600 dark:text-purple-300 font-semibold">{match[2]}</span>
    </>
  ),
);

export const SYNTAX_INLINE_CHORDS = new SyntaxLineParser(
  /^(@chord_sequence:)(.*)$/,
  (_line, match) => (
    <>
      <span class="text-amber-600 dark:text-amber-400 font-bold">{match[1]}</span>
      <span class="text-emerald-600 dark:text-emerald-400 font-bold">{match[2]}</span>
    </>
  ),
);

export const SYNTAX_LAYOUT_BREAKS = new SyntaxLineParser(
  /^@(page_break|column_break|empty_line|break)\b/,
  (line) => (
    <span class="text-rose-600 dark:text-rose-400 font-bold bg-rose-100 dark:bg-rose-500/15">
      {line}
    </span>
  ),
);

export const SYNTAX_SECTION_LABEL = new SyntaxLineParser(
  /^\[(.*?)\]$/,
  (line) => (
    <span class="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-100 dark:bg-indigo-500/15">
      {line}
    </span>
  ),
);

export const SYNTAX_LYRIC_LINE = new SyntaxLineParser(
  /.*/,
  (line) => {
    const parts = parseLyricParts(line);
    return (
      <For each={parts}>
        {(part) =>
          part.isChord ? (
            <>
              <span class="text-slate-400 dark:text-slate-500">&#123;</span>
              <span class="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-500/15">
                {part.text}
              </span>
              <span class="text-slate-400 dark:text-slate-500">&#125;</span>
            </>
          ) : (
            <span class="text-slate-800 dark:text-slate-200">{part.text}</span>
          )
        }
      </For>
    );
  },
);

export const syntaxLineParsers: SyntaxLineParser[] = [
  SYNTAX_TITLE,
  SYNTAX_ARTIST,
  SYNTAX_INLINE_CHORDS,
  SYNTAX_LAYOUT_BREAKS,
  SYNTAX_SECTION_LABEL,
  SYNTAX_LYRIC_LINE,
];

/**
 * Renders a single template line into styled JSX syntax elements.
 */
export function renderSyntaxLine(line: string): JSX.Element {
  return (
    Iterator.from(syntaxLineParsers)
      .map((parser) => parser.tryRender(line))
      .find((element) => element != null) ?? line
  );
}

/**
 * SolidJS JSX Component for syntax highlighting Lyric-Chord Creator Templates (*.lcct.txt).
 */
export function TemplateSyntaxHighlighter(props: TemplateSyntaxHighlighterProps) {
  const lines = createMemo(() => props.code.split('\n'), { name: 'syntax_lines' });

  return (
    <>
      <For each={lines()}>
        {(line, index) => (
          <>
            {index() > 0 ? '\n' : ''}
            {renderSyntaxLine(line)}
          </>
        )}
      </For>
      <Show when={props.code.endsWith('\n')}> </Show>
    </>
  );
}

