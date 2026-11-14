import { useNavigate } from '@solidjs/router';
import { createSignal, For } from 'solid-js';
import { TemplateSyntaxHighlighter } from '../../components/TemplateSyntaxHighlighter';
import { ChordGuidePages } from '../../lib/template-processor';
import { setActiveTemplateId } from '../../lib/templates-store';
import { paths } from '../../router';

interface ExampleSnippet {
  title: string;
  description: string;
  code: string;
}

const EXAMPLES: ExampleSnippet[] = [
  {
    title: 'Basic Song with Artist & Columns',
    description:
      'A standard song format showing title, artist, section header, and chords positioned within lyrics.',
    code: `@title: Amazing Grace
@artist: John Newton
@empty_line

[Verse 1]
@empty_line
A{G}mazing grace, how {C}sweet the {G}sound
That saved a {D7}wretch like me
I {G}once was lost, but {C}now am {G}found
Was blind, but {D7}now I {G}see

@column_break

[Verse 2]
@empty_line
'Twas {G}grace that taught my {C}heart to {G}fear
And grace my {D7}fears relieved
How {G}precious did that {C}grace ap{G}pear
The hour I {D7}first be{G}lieved`,
  },
  {
    title: 'Chord Sequences & Section Headers',
    description: 'Using @chord_sequence for instrumental sections like Intro, Interlude, or Solo.',
    code: `@title: Hotel California
@artist: Eagles
@empty_line

[Intro]
@chord_sequence: Bm F#7 A E G D Em F#7
@empty_line

[Verse 1]
@empty_line
{Bm}On a dark desert highway, {F#7}cool wind in my hair
{A}Warm smell of colitas, {E}rising up through the air
{G}Up ahead in the distance, {D}I saw a shimmering light
{Em}My head grew heavy and my sight grew dim, {F#7}I had to stop for the night`,
  },
  {
    title: 'Multi-Page & Multiple Songs per Template',
    description:
      'Using @empty_line, @column_break, and @page_break to cleanly lay out multi-page guides or multiple songs.',
    code: `@title: I Know
@artist: Liveloud
@empty_line

[Intro x2]
@chord_sequence: E   A   C#m   A - B
@empty_line

[Verse 1]
@empty_line
{E}I {Esus4}know You’ve given all I need  {A}
I know Your blessings never {C#m}end
I know that Your love is for{A}e---{B}ver

@column_break

[Chorus x2]
@empty_line
{E}It’s You that I am living for {A}
For You Lord I will worship {C#m}more
I will raise my hands and wors{A}hip, wo{B}rship You

@page_break

@title: Mighty to Save
@artist: Hillsong Worship
@empty_line

[Intro]
@chord_sequence: D   A   F#m   E
@empty_line

[Verse 1]
@empty_line
{D}Everyone needs com{A}passion, love that's never {F#m}failing
Let {E}mercy fall on {D}me
{D}Everyone needs for{A}giveness, the kindness of a {F#m}Savior
The {E}Hope of nations`,
  },
];

interface ExamplesSectionProps {
  ref?: (el: HTMLElement) => void;
}

export function ExamplesSection(props: ExamplesSectionProps) {
  const navigate = useNavigate();
  const [copiedIndex, setCopiedIndex] = createSignal<number | null>(null, { name: 'copied_index' });

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const loadExampleIntoEditor = (code: string) => {
    try {
      setActiveTemplateId(null);
      localStorage.setItem('scgt_current_template', code);
    } catch (e) {
      console.error('Failed to store example:', e);
    }
    navigate(paths);
  };

  return (
    <section
      ref={props.ref}
      id="examples"
      class="mb-10 border-b border-slate-200 dark:border-slate-800 pb-10 scroll-mt-8"
    >
      <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <span class="i-lucide-lightbulb w-5 h-5 text-amber-500" aria-hidden="true" />
        <span>Example Templates</span>
      </h2>

      <div class="flex flex-col gap-6">
        <For each={EXAMPLES}>
          {(example, index) => (
            <div class="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              {/* Example Header */}
              <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 class="font-bold text-sm text-slate-900 dark:text-white">{example.title}</h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400">{example.description}</p>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(example.code, index())}
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
                  >
                    {copiedIndex() === index() ? (
                      <>
                        <span class="i-lucide-check w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <span class="i-lucide-copy w-3.5 h-3.5" aria-hidden="true" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => loadExampleIntoEditor(example.code)}
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-colors"
                  >
                    <span class="i-lucide-play w-3.5 h-3.5" aria-hidden="true" />
                    <span>Load in Editor</span>
                  </button>
                </div>
              </div>

              {/* Split Preview of Code vs Rendered Output */}
              <div class="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
                {/* Source Code */}
                <div class="p-4 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs overflow-hidden flex flex-col transition-colors">
                  <div class="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-2 select-none">
                    Template Source (*.lcct.txt)
                  </div>
                  <pre class="whitespace-pre-wrap leading-relaxed select-text font-mono overflow-y-auto h-72 sm:h-80 pr-2">
                    <TemplateSyntaxHighlighter code={example.code} />
                  </pre>
                </div>

                {/* Rendered Output (Clean paper sheet rendering) */}
                <div class="p-4 bg-slate-200/60 dark:bg-slate-950 overflow-hidden flex flex-col">
                  <div class="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-3 select-none">
                    Rendered Chord Sheet Preview
                  </div>
                  {/* Container for rendered pages */}
                  <div
                    class={[
                      'guide-sheet-container flex flex-col gap-4 font-mono select-text h-72 sm:h-80 rounded-xl bg-slate-300/40 dark:bg-slate-900/60 p-3 sm:p-4 shadow-inner',
                      example.code.includes('@page_break')
                        ? 'scrollable overflow-auto'
                        : 'overflow-hidden',
                    ]}
                  >
                    <ChordGuidePages template={example.code} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
    </section>
  );
}
