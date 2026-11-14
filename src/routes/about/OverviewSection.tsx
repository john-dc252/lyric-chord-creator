import { createSignal, Show } from 'solid-js';
import { checkForUpdate, type UpdateCheckResult } from '../../lib/sw-update';
import { paths } from '../../router';
import type { SectionId } from './Jumplist';

type UpdateCheckStatus = 'idle' | 'checking' | 'error' | UpdateCheckResult;

interface OverviewSectionProps {
  ref?: (el: HTMLElement) => void;
  onSelectSection: (id: SectionId, e?: MouseEvent) => void;
}

export function OverviewSection(props: OverviewSectionProps) {
  const [updateCheck, setUpdateCheck] = createSignal<UpdateCheckStatus>('idle', {
    name: 'update_check_status',
  });

  const handleCheckForUpdate = async () => {
    setUpdateCheck('checking');
    try {
      setUpdateCheck(await checkForUpdate());
    } catch (e) {
      console.error('@Lyric-Chord Creator - Update check failed', e);
      setUpdateCheck('error');
    }
  };

  const updateCheckMessage = () => {
    switch (updateCheck()) {
      case 'current':
        return 'Up to date.';
      case 'unsupported':
        return 'Update checks unavailable.';
      case 'error':
        return "Couldn't check. Are you online?";
      default:
        return null;
    }
  };

  return (
    <section
      ref={props.ref}
      id="overview"
      class="mb-10 border-b border-slate-200 dark:border-slate-800 pb-10 scroll-mt-8"
    >
      <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        About Lyric-Chord Creator
      </h1>

      <div class="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
        <span class="font-semibold text-slate-700 dark:text-slate-300">
          v{import.meta.env.APP_VERSION}
        </span>
        <button
          type="button"
          onClick={handleCheckForUpdate}
          disabled={updateCheck() === 'checking'}
          class="inline-flex items-center gap-1.5 px-2.5 py-1 font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span
            class={[
              'i-lucide-refresh-cw w-3.5 h-3.5',
              updateCheck() === 'checking' && 'animate-spin',
            ]}
            aria-hidden="true"
          />
          <span>{updateCheck() === 'checking' ? 'Checking…' : 'Check for Updates'}</span>
        </button>
        <Show when={updateCheckMessage()}>
          {(message) => <span role="status">{message()}</span>}
        </Show>
      </div>

      <p class="mt-4 text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
        Turn plain-text templates into clean, printable lyric-and-chord sheets — with no reformatting when the paper
        size, orientation, or column count changes.
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
            Letter, A4, Legal, or custom sizes in portrait or landscape. Content reflows and balances across 1–4
            columns, with font size and margins to match.
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
            Write <code class="font-mono">&#123;C&#125;</code> inline and the chord pins above that exact syllable —
            no spacebar guesswork, no drift between screen and print.
          </p>
        </div>

        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col">
          <div class="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 shrink-0">
            <span class="i-lucide-music w-5 h-5" aria-hidden="true" />
          </div>
          <h3 class="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
            On-the-Fly Transposition
          </h3>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-normal">
            Shift keys (±11 semitones) in the preview and printout without altering your source template.
          </p>
        </div>

        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col">
          <div class="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 shrink-0">
            <span class="i-lucide-book-open w-5 h-5" aria-hidden="true" />
          </div>
          <h3 class="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
            Multiple Songs per Template
          </h3>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-normal">
            Bundle a whole setlist in one file. <code class="font-mono">@page_break</code> and{' '}
            <code class="font-mono">@column_break</code> decide where each song and section lands.
          </p>
        </div>

        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col">
          <div class="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3 shrink-0">
            <span class="i-lucide-wand-sparkles w-5 h-5" aria-hidden="true" />
          </div>
          <h3 class="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
            Monospace Sheet Conversion
          </h3>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-normal">
            Paste traditional two-line chord-over-lyric sheets and convert them into inline{' '}
            <code class="font-mono">&#123;Chord&#125;</code> templates with a single click.
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
          onClick={(e) => props.onSelectSection('syntax-guide', e)}
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors no-underline"
        >
          <span>View Syntax Guide</span>
          <span class="i-lucide-arrow-down w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
