import { Title } from '@solidjs/meta';
import { useNavigate } from '@solidjs/router';
import { createSignal, For } from 'solid-js';
import { TemplateSyntaxHighlighter } from '../components/TemplateSyntaxHighlighter';
import { paths } from '../router';
import { ChordGuidePages } from '../lib/template-processor';
import { setActiveTemplateId } from '../lib/templates-store';

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
    description: 'Using @empty_line, @column_break, and @page_break to cleanly lay out multi-page guides or multiple songs.',
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

export default function About() {
  const navigate = useNavigate();
  const [copiedIndex, setCopiedIndex] = createSignal<number | null>(null, { name: 'copied_index' });

  let syntaxGuideRef: HTMLElement | undefined = undefined;

  // Scroll via the ref rather than the `#syntax-guide` fragment: under
  // hashHistory the hash is the route, so the router intercepts the anchor and
  // resolves the fragment as a path instead of scrolling.
  const scrollToSyntaxGuide = (e: MouseEvent) => {
    e.preventDefault();
    syntaxGuideRef?.scrollIntoView({ behavior: 'smooth' });
  };

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
    <div class="h-full flex flex-col overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Title>About - Lyric-Chord Creator</Title>

      <main class="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* App Description & Overview Section */}
        <section class="mb-10 border-b border-slate-200 dark:border-slate-800 pb-10">
          <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            About Lyric-Chord Creator
          </h1>
          <p class="mt-4 text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
            Turn plain-text templates into clean, printable lyric-and-chord sheets — with no reformatting when the paper size, orientation, or column count changes.
          </p>

          {/* Key Value Proposition Cards */}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col">
              <div class="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3 shrink-0">
                <span class="i-lucide-layout w-5 h-5" aria-hidden="true" />
              </div>
              <h3 class="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
                Adaptive Layout for Any Paper
              </h3>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-normal">
                Letter, A4, Legal, or custom sizes in portrait or landscape. Content reflows and balances across 1–4 columns, with font size and margins to match.
              </p>
            </div>

            <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col">
              <div class="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shrink-0">
                <span class="i-lucide-target w-5 h-5" aria-hidden="true" />
              </div>
              <h3 class="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
                Exact Lyric & Chord Alignment
              </h3>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-normal">
                Write <code class="font-mono">&#123;C&#125;</code> inline and the chord pins above that exact syllable — no spacebar guesswork, no drift between screen and print.
              </p>
            </div>

            <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:col-span-2 lg:col-span-1">
              <div class="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 shrink-0">
                <span class="i-lucide-book-open w-5 h-5" aria-hidden="true" />
              </div>
              <h3 class="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
                Multiple Songs per Template
              </h3>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-normal">
                Bundle a whole setlist in one file. <code class="font-mono">@page_break</code> and <code class="font-mono">@column_break</code> decide where each song and section lands.
              </p>
            </div>
          </div>

          <div class="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={paths()}
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-xs transition-colors no-underline"
            >
              <span class="i-lucide-arrow-left w-3.5 h-3.5" aria-hidden="true" />
              <span>Open Editor</span>
            </a>
            <a
              href="#syntax-guide"
              onClick={scrollToSyntaxGuide}
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors no-underline"
            >
              <span>View Syntax Guide</span>
              <span class="i-lucide-arrow-down w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </section>

        {/* Syntax Tokens Reference Grid */}
        <section
          ref={(el) => (syntaxGuideRef = el)}
          id="syntax-guide"
          class="mb-10 scroll-mt-20"
        >
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            Template Syntax Guide
          </h2>
          <p class="text-sm text-slate-600 dark:text-slate-400 mb-6">
            The <code class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-xs">.lcct.txt</code> format is a simple, human-readable plain-text template syntax for creating clean, printable multi-column lyric-chord sheets.
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
                Defines a section header (e.g. <code>[Intro x2]</code>, <code>[Verse 1]</code>,{' '}
                <code>[Chorus]</code>). Rendered bold and kept with the lines below it, so it never
                strands at the foot of a column.
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
                Displays chord progression in a standalone line without lyric text, perfect for
                instrumental intros/solos.
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
                Embeds a chord directly before or inside a syllable in the lyric line. The chord is
                placed directly above the text.
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
                Inserts a blank line. Plain blank lines in your source are stripped out, so this is
                the only way to add vertical space.
              </p>
              <div class="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg font-mono text-xs whitespace-pre-wrap">
                <TemplateSyntaxHighlighter code={'[Verse 1]\n\n@empty_line\n\n{E}I {Esus4}know You’ve given all I need  {A}'}/>
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
                <TemplateSyntaxHighlighter code={'I know that Your love is for{A}e---{B}ver\n\n@column_break\n\n[Chorus x2]'}/>
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
                <TemplateSyntaxHighlighter code={'I will raise my hands and wors{A}hip, wo{B}rship You\n\n@page_break\n\n@title: Mighty to Save'}/>
              </div>
            </div>
          </div>
        </section>

        {/* Examples Section */}
        <section class="mb-10">
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
                      <h3 class="font-bold text-sm text-slate-900 dark:text-white">
                        {example.title}
                      </h3>
                      <p class="text-xs text-slate-500 dark:text-slate-400">
                        {example.description}
                      </p>
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

        {/* Sheet Settings Section */}
        <section class="p-6 rounded-xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border border-sky-200 dark:border-slate-700">
          <h2 class="font-bold text-base text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
            <span class="i-lucide-settings w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            <span>Sheet Settings</span>
          </h2>
          <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-3">
            Page layout lives in the sheet settings dropdown in the editor, not in the template.
          </p>
          <ul class="flex flex-col gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 list-disc list-inside">
            <li>
              <strong>Orientation & Columns:</strong> Portrait takes 1–2 columns, landscape up to 4. Switching back to portrait clamps a wider layout down automatically.
            </li>
            <li>
              <strong>Paper Size:</strong> Letter, Legal, A4, or a custom width and height in inches or centimeters.
            </li>
            <li>
              <strong>Type & Margins:</strong> Font size from 6 to 20pt, with narrow, normal, or wide margins — or your own value.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
