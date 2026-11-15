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
        <span>Converting Monospace Chord Sheets</span>
      </h2>
      <p class="text-sm text-slate-600 dark:text-slate-400 mb-6">
        Paste a traditional two-line chord-over-lyric sheet and convert either the entire document or a selected
        multi-line fragment into inline{' '}
        <code class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-xs">&#123;Chord&#125;</code>{' '}
        template syntax using the{' '}
        <strong class="font-semibold text-slate-800 dark:text-slate-200">Mono to Template</strong> button in the editor
        toolbar (
        <kbd class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]">
          Win/Cmd+Shift+T
        </kbd>
        ).
      </p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div class="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
            1. Paste or Select Monospace Lines
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Paste a full song (when no <code class="font-mono">&#123;...&#125;</code> chords exist in the document), or
            select across <strong>two or more lines</strong> to convert only that fragment — ideal when adding a new
            section or song to an already-converted template.
          </p>
        </div>

        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div class="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
            2. Format Non-Pair Lines First
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Before converting, manually tag any line that is <strong>not</strong> part of a chord-over-lyric pair using{' '}
            <code class="font-mono">@title:</code>, <code class="font-mono">@artist:</code>,{' '}
            <code class="font-mono">@chord_sequence:</code>, or <code class="font-mono">[Section]</code> syntax so line
            pairing stays aligned.
          </p>
        </div>

        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div class="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
            3. Click Mono to Template
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Click <strong class="text-slate-800 dark:text-slate-200">Mono to Template</strong> (or press{' '}
            <kbd class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]">
              Win/Cmd+Shift+T
            </kbd>{' '}
            /{' '}
            <code class="font-mono">:totemplate</code> in Vim). Chords are embedded as{' '}
            <code class="font-mono">&#123;Chord&#125;</code> at their exact column positions. Use{' '}
            <strong class="text-slate-800 dark:text-slate-200">Undo</strong> (
            <kbd class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]">
              Ctrl/Cmd+Z
            </kbd>
            ) to revert if needed.
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
              Important: Update non-lyric/chord lines to template syntax before converting
            </div>
            <p class="leading-relaxed">
              The converter pairs every consecutive line unless it is a blank line, a{' '}
              <code class="px-1 py-0.5 rounded bg-indigo-100/80 dark:bg-indigo-950 font-mono font-bold text-indigo-700 dark:text-indigo-300">
                [Section]
              </code>{' '}
              header, or an{' '}
              <code class="px-1 py-0.5 rounded bg-amber-100/80 dark:bg-amber-950 font-mono font-bold text-amber-800 dark:text-amber-300">
                @directive:
              </code>{' '}
              line. Leaving plain-text lines unformatted will shift the pairing and merge the wrong lines together:
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
            Before — Prepared Monospace Input (Chord Line Above Lyric Line)
          </div>
          <pre class="whitespace-pre-wrap leading-relaxed select-text font-mono text-slate-800 dark:text-slate-200">
            <TemplateSyntaxHighlighter code={MONOSPACE_SOURCE_SAMPLE} />
          </pre>
        </div>

        <div class="p-4 bg-white dark:bg-slate-950 font-mono text-xs">
          <div class="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-2 select-none">
            After — Converted Template Output
          </div>
          <pre class="whitespace-pre-wrap leading-relaxed select-text font-mono">
            <TemplateSyntaxHighlighter code={monospaceToTemplate(MONOSPACE_SOURCE_SAMPLE)} />
          </pre>
        </div>
      </div>
    </section>
  );
}
