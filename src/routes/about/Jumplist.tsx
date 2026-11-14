import { createSignal, For, Show } from 'solid-js';

export type SectionId =
  | 'overview'
  | 'syntax-guide'
  | 'monospace-guide'
  | 'examples'
  | 'sheet-settings';

export interface JumpSection {
  id: SectionId;
  label: string;
  icon: string;
}

export const JUMP_SECTIONS: JumpSection[] = [
  { id: 'overview', label: 'Overview', icon: 'i-lucide-layout' },
  { id: 'syntax-guide', label: 'Template Syntax Guide', icon: 'i-lucide-code' },
  { id: 'monospace-guide', label: 'Monospace Conversion', icon: 'i-lucide-wand-sparkles' },
  { id: 'examples', label: 'Example Templates', icon: 'i-lucide-lightbulb' },
  { id: 'sheet-settings', label: 'Sheet Settings', icon: 'i-lucide-settings' },
];

interface JumplistProps {
  activeSection: SectionId;
  onSelectSection: (id: SectionId, e?: MouseEvent) => void;
}

export function Jumplist(props: JumplistProps) {
  const [isMobileJumpOpen, setIsMobileJumpOpen] = createSignal(false, {
    name: 'mobile_jump_open',
  });

  const handleSelect = (id: SectionId, e: MouseEvent) => {
    setIsMobileJumpOpen(false);
    props.onSelectSection(id, e);
  };

  return (
    <>
      {/* Left Floating Jumplist (Desktop) */}
      <aside
        aria-label="Page sections"
        class="hidden lg:block w-56 shrink-0 sticky top-6 z-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-3 shadow-sm"
      >
        <div class="px-2.5 pb-2 mb-1.5 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
          On This Page
        </div>
        <nav class="flex flex-col gap-1">
          <For each={JUMP_SECTIONS}>
            {(section) => (
              <button
                type="button"
                onClick={(e) => handleSelect(section.id, e)}
                class={[
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer',
                  props.activeSection === section.id
                    ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-200',
                ]}
              >
                <span
                  class={[
                    section.icon,
                    'w-4 h-4 shrink-0',
                    props.activeSection === section.id
                      ? 'text-sky-600 dark:text-sky-400'
                      : 'text-slate-400 dark:text-slate-500',
                  ]}
                  aria-hidden="true"
                />
                <span class="truncate">{section.label}</span>
              </button>
            )}
          </For>
        </nav>
      </aside>

      {/* Bottom-Right Collapsible Floating Jumplist (Mobile / Smaller Screens) */}
      <div class="lg:hidden fixed bottom-5 right-5 z-30 flex flex-col items-end">
        <Show when={isMobileJumpOpen()}>
          <div
            class="fixed inset-0 z-20"
            onClick={() => setIsMobileJumpOpen(false)}
          />
          <aside
            aria-label="Page sections"
            class="relative z-30 mb-2.5 w-60 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 shadow-xl menu-popover"
          >
            <div class="px-2.5 pb-2 mb-1.5 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
              On This Page
            </div>
            <nav class="flex flex-col gap-1">
              <For each={JUMP_SECTIONS}>
                {(section) => (
                  <button
                    type="button"
                    onClick={(e) => handleSelect(section.id, e)}
                    class={[
                      'flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer',
                      props.activeSection === section.id
                        ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-200',
                    ]}
                  >
                    <span
                      class={[
                        section.icon,
                        'w-4 h-4 shrink-0',
                        props.activeSection === section.id
                          ? 'text-sky-600 dark:text-sky-400'
                          : 'text-slate-400 dark:text-slate-500',
                      ]}
                      aria-hidden="true"
                    />
                    <span class="truncate">{section.label}</span>
                  </button>
                )}
              </For>
            </nav>
          </aside>
        </Show>

        <button
          type="button"
          aria-label={isMobileJumpOpen() ? 'Close section navigation' : 'Open section navigation'}
          aria-expanded={isMobileJumpOpen() ? 'true' : 'false'}
          onClick={() => setIsMobileJumpOpen(!isMobileJumpOpen())}
          class="relative z-30 inline-flex items-center justify-center w-11 h-11 rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-lg transition-colors cursor-pointer"
        >
          <span
            class={isMobileJumpOpen() ? 'i-lucide-x w-5 h-5' : 'i-lucide-list w-5 h-5'}
            aria-hidden="true"
          />
        </button>
      </div>
    </>
  );
}
