import { TemplateSyntaxHighlighter } from '../../components/TemplateSyntaxHighlighter';

interface SyntaxGuideSectionProps {
  ref?: (el: HTMLElement) => void;
}

export function SyntaxGuideSection(props: SyntaxGuideSectionProps) {
  return (
    <section
      ref={props.ref}
      id="syntax-guide"
      class="mb-10 border-b border-slate-200 dark:border-slate-800 pb-10 scroll-mt-8"
    >
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
        <span class="i-lucide-code w-5 h-5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
        <span>Template Syntax Guide</span>
      </h2>
      <p class="text-sm text-slate-600 dark:text-slate-400 mb-6">
        The <code class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-xs">.lcct.txt</code>{' '}
        format is a simple, human-readable plain-text template syntax for creating clean, printable multi-column
        lyric-chord sheets.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* @title: */}
        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-sm font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
              @title: &lt;Song Title&gt;
            </span>
            <span class="text-xs text-slate-500">Metadata</span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 mb-2">
            Sets the song title. Rendered as bold, underlined text.
          </p>
          <div class="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg font-mono text-xs whitespace-pre-wrap">
            <TemplateSyntaxHighlighter code="@title: I Know" />
          </div>
        </div>

        {/* @artist: */}
        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-sm font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
              @artist: &lt;Artist Name&gt;
            </span>
            <span class="text-xs text-slate-500">Metadata</span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 mb-2">
            Sets the artist / author name. Rendered as bold text.
          </p>
          <div class="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg font-mono text-xs whitespace-pre-wrap">
            <TemplateSyntaxHighlighter code="@artist: Liveloud" />
          </div>
        </div>

        {/* [Section] */}
        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-sm font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/50">
              [&lt;Section Name&gt;]
            </span>
            <span class="text-xs text-slate-500">Structure</span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 mb-2">
            Defines a section header (e.g. <code>[Intro x2]</code>, <code>[Verse 1]</code>, <code>[Chorus]</code>).
            Rendered bold and kept with the lines below it, so it never strands at the foot of a column.
          </p>
          <div class="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg font-mono text-xs whitespace-pre-wrap">
            <TemplateSyntaxHighlighter code="[Chorus x2]" />
          </div>
        </div>

        {/* @chord_sequence: */}
        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-sm font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
              @chord_sequence: &lt;Chords...&gt;
            </span>
            <span class="text-xs text-slate-500">Chords</span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 mb-2">
            Displays chord progression in a standalone line without lyric text, perfect for instrumental intros/solos.
          </p>
          <div class="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg font-mono text-xs whitespace-pre-wrap">
            <TemplateSyntaxHighlighter code="@chord_sequence: E   A   C#m   A - B" />
          </div>
        </div>

        {/* {Chord} */}
        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/50">
              &#123;&lt;Chord&gt;&#125;
            </span>
            <span class="text-xs text-slate-500">Lyrics Chord</span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 mb-2">
            In <strong>Embedded</strong> style, places a chord directly above the following syllable. In{' '}
            <strong>Monospace</strong> style, chords sit on their own space-aligned line above the lyric line instead.
          </p>
          <div class="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg font-mono text-xs whitespace-pre-wrap">
            <TemplateSyntaxHighlighter code="{E}I {Esus4}know You’ve given all I need" />
          </div>
        </div>

        {/* @empty_line */}
        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-sm font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/50">
              @empty_line
            </span>
            <span class="text-xs text-slate-500">Spacing</span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 mb-2">
            Inserts a vertical blank line in <strong>Embedded</strong> style (where raw blank lines are ignored). Converts
            to a standard blank line in <strong>Monospace</strong> style.
          </p>
          <div class="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg font-mono text-xs whitespace-pre-wrap">
            <TemplateSyntaxHighlighter
              code={'[Verse 1]\n\n@empty_line\n\n{E}I {Esus4}know You’ve given all I need  {A}'}
            />
          </div>
        </div>

        {/* @column_break */}
        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-sm font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/50">
              @column_break
            </span>
            <span class="text-xs text-slate-500">Layout Flow</span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 mb-2">
            Forces content after this directive to continue at the top of the next column, at any column count.
          </p>
          <div class="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg font-mono text-xs whitespace-pre-wrap">
            <TemplateSyntaxHighlighter
              code={'I know that Your love is for{A}e---{B}ver\n\n@column_break\n\n[Chorus x2]'}
            />
          </div>
        </div>

        {/* @page_break */}
        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-sm font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/50">
              @page_break
            </span>
            <span class="text-xs text-slate-500">Layout Flow</span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 mb-2">
            Splits the chord guide into a new paper page, creating multi-page sheets or separate songs.
          </p>
          <div class="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg font-mono text-xs whitespace-pre-wrap">
            <TemplateSyntaxHighlighter
              code={'I will raise my hands and wors{A}hip, wo{B}rship You\n\n@page_break\n\n@title: Mighty to Save'}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
