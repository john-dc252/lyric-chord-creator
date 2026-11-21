import { TemplateSyntaxHighlighter } from '../../components/TemplateSyntaxHighlighter';
import { monospaceToTemplate } from '../../lib/template-processor/monospace-converter';

const MONOSPACE_SOURCE_SAMPLE = `@title: Amazing Grace
@artist: John Newton

[Intro]
@chord_sequence: G   C   G   D7

[Verse 1]
 G                 C         G
Amazing grace, how sweet the sound
             D7
That saved a wretch like me`;

interface MonospaceGuideSectionProps {
  ref?: (el: HTMLElement) => void;
}

export function MonospaceGuideSection(props: MonospaceGuideSectionProps) {
  return (
    <section
      ref={props.ref}
      id="monospace-guide"
      class="mb-10 border-b border-slate-200 dark:border-slate-800 pb-10 scroll-mt-8"
    >
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
        <span class="i-lucide-wand-sparkles w-5 h-5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
        <span>Template Styles & Monospace Conversion</span>
      </h2>
      <p class="text-sm text-slate-600 dark:text-slate-400 mb-6">
        Edit sheets in either <strong>Embedded</strong> (<code class="font-mono text-xs">&#123;Chord&#125;</code> inline)
        or <strong>Monospace</strong> (chords spaced above lyrics) style. Behind the scenes, the sheet is always
        generated from template syntax.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div class="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
            1. Style Dropdown
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Switch between <strong>Embedded</strong> and <strong>Monospace</strong> in the editor toolbar at any time.
            Changing the style automatically converts the current document between the two formats.
          </p>
        </div>

        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div class="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
            2. Quick-Convert Wand
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            While in <strong>Embedded</strong> style, click the wand button (
            <span class="i-lucide-wand-sparkles w-3 h-3 inline-block align-text-bottom text-sky-600 dark:text-sky-400" aria-hidden="true" />
            ,{' '}
            <kbd class="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">
              Win/Cmd+Shift+T
            </kbd>
            ) to convert a pasted monospace sheet—or just a multi-line selection—into{' '}
            <code class="font-mono">&#123;Chord&#125;</code> syntax.
          </p>
        </div>

        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div class="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
            3. Blank & Chordless Lines
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            In <strong>Monospace</strong> style, blank lines separate pairs in the editor without adding rendered
            spacing (use <code class="font-mono">@empty_line</code> for that), and chordless lyric lines keep an empty
            chord line above them so pairing stays intact.
          </p>
        </div>
      </div>

      {/* Prerequisite Callout */}
      <div class="mb-6 p-4 rounded-xl border border-amber-300/80 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 text-xs text-slate-700 dark:text-slate-300">
        <div class="flex items-start gap-2.5 mb-3">
          <span
            class="i-lucide-alert-triangle w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div class="space-y-1">
            <div class="font-bold text-amber-900 dark:text-amber-300">
              Tag non-pair lines in Monospace sheets
            </div>
            <p class="leading-relaxed">
              Monospace parsing pairs every two consecutive lines unless a line is blank, a{' '}
              <code class="px-1 py-0.5 rounded bg-indigo-100/80 dark:bg-indigo-950 font-mono font-bold text-indigo-700 dark:text-indigo-300">
                [Section]
              </code>{' '}
              header, or an{' '}
              <code class="px-1 py-0.5 rounded bg-amber-100/80 dark:bg-amber-950 font-mono font-bold text-amber-800 dark:text-amber-300">
                @directive
              </code>
              . Tag standalone lines so chord/lyric pairs stay aligned:
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Titles & Artists */}
          <div class="p-3 rounded-lg border border-amber-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between gap-2">
            <div>
              <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
                <span class="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
                  @title:
                </span>
                <span class="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
                  @artist:
                </span>
              </div>
              <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                Prefix song title and artist lines instead of leaving them as plain text at the top.
              </p>
            </div>
            <div class="bg-slate-100 dark:bg-slate-950 p-2 rounded font-mono text-[11px] whitespace-pre-wrap">
              <TemplateSyntaxHighlighter code={'@title: Amazing Grace\n@artist: John Newton'} />
            </div>
          </div>

          {/* 2. Section Headings */}
          <div class="p-3 rounded-lg border border-amber-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between gap-2">
            <div>
              <div class="flex items-center gap-1.5 mb-1.5">
                <span class="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/50">
                  [&lt;Section Name&gt;]
                </span>
              </div>
              <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                Wrap bare section labels like <code class="font-mono">Verse 1</code> or{' '}
                <code class="font-mono">Chorus:</code> in square brackets.
              </p>
            </div>
            <div class="bg-slate-100 dark:bg-slate-950 p-2 rounded font-mono text-[11px] whitespace-pre-wrap">
              <TemplateSyntaxHighlighter code={'[Intro]\n[Verse 1]'} />
            </div>
          </div>

          {/* 3. Instrumental Chord Lines */}
          <div class="p-3 rounded-lg border border-amber-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between gap-2">
            <div>
              <div class="flex items-center gap-1.5 mb-1.5">
                <span class="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
                  @chord_sequence:
                </span>
              </div>
              <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                Prefix standalone chord progressions that have no lyric line underneath (intros, solos, turnarounds).
              </p>
            </div>
            <div class="bg-slate-100 dark:bg-slate-950 p-2 rounded font-mono text-[11px] whitespace-pre-wrap">
              <TemplateSyntaxHighlighter code="@chord_sequence: G   C   G   D7" />
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div class="p-4 bg-slate-50 dark:bg-slate-900 font-mono text-xs">
          <div class="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-2 select-none">
            Monospace Style (Chord Line Above Lyric Line)
          </div>
          <pre class="whitespace-pre-wrap leading-relaxed select-text font-mono text-slate-800 dark:text-slate-200">
            <TemplateSyntaxHighlighter code={MONOSPACE_SOURCE_SAMPLE} templateStyle="monospace" />
          </pre>
        </div>

        <div class="p-4 bg-white dark:bg-slate-950 font-mono text-xs">
          <div class="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-2 select-none">
            Embedded Style (Inline &#123;Chord&#125; Syntax)
          </div>
          <pre class="whitespace-pre-wrap leading-relaxed select-text font-mono">
            <TemplateSyntaxHighlighter code={monospaceToTemplate(MONOSPACE_SOURCE_SAMPLE)} />
          </pre>
        </div>
      </div>
    </section>
  );
}
