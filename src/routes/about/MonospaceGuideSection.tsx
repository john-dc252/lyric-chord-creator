import { TemplateSyntaxHighlighter } from '../../components/TemplateSyntaxHighlighter';
import { monospaceToTemplate } from '../../lib/template-processor/monospace-converter';

const MONOSPACE_SOURCE_SAMPLE = `@title: Amazing Grace
@artist: John Newton

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
        Paste a traditional two-line chord-over-lyric sheet and convert it into inline{' '}
        <code class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-xs">&#123;Chord&#125;</code>{' '}
        template syntax with one click using the{' '}
        <strong class="font-semibold text-slate-800 dark:text-slate-200">Mono to Template</strong> button in the editor
        toolbar.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div class="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
            1. Paste Monospace Text
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Paste a song where chords sit on their own space-aligned line directly above each lyric line. The{' '}
            <strong class="text-slate-800 dark:text-slate-200">Mono to Template</strong> button enables automatically
            when no <code class="font-mono">&#123;...&#125;</code> chords are present.
          </p>
        </div>

        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div class="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
            2. Pair &amp; Keep Headers
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Each chord line is paired with the lyric line immediately below it. Blank lines,{' '}
            <code class="font-mono">[Section]</code> headers, and <code class="font-mono">@key:</code> metadata lines
            are skipped during pairing and preserved as-is.
          </p>
        </div>

        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div class="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
            3. Click Mono to Template
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Chords are embedded as <code class="font-mono">&#123;Chord&#125;</code> at their exact column positions in
            the lyric line. Use{' '}
            <kbd class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]">
              Ctrl/Cmd+Z
            </kbd>{' '}
            in the editor to undo if you need to adjust line pairing first.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div class="p-4 bg-slate-50 dark:bg-slate-900 font-mono text-xs">
          <div class="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-2 select-none">
            Before — Monospace Input (Chord Line Above Lyric Line)
          </div>
          <pre class="whitespace-pre-wrap leading-relaxed select-text font-mono text-slate-800 dark:text-slate-200">
            {MONOSPACE_SOURCE_SAMPLE}
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
