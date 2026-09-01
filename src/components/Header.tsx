import { Show } from 'solid-js';
import { extractSongArtist, extractSongTitle } from '../lib/template-processor';
import { activeTemplateId, savedTemplates } from '../lib/templates-store';
import type { PaperSizeConfig } from '../lib/paperSize';

interface HeaderProps {
  template: string;
  paperConfig?: PaperSizeConfig;
}

export default function Header(props: HeaderProps) {
  const songTitle = () => extractSongTitle(props.template);
  const songArtist = () => extractSongArtist(props.template);

  const activeSavedTemplate = () => {
    const id = activeTemplateId();
    if (!id) return null;
    return savedTemplates().find((t) => t.id === id) || null;
  };

  const isDirty = () => {
    const existing = activeSavedTemplate();
    if (existing) {
      return props.template !== existing.content;
    }
    return props.template.trim().length > 0;
  };

  return (
    <div class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2 flex items-center justify-between gap-3 shrink-0 z-20 select-none">
      {/* Song Info */}
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="text-sm">🎵</span>
        <div class="flex items-baseline gap-2 truncate">
          <h1 class="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
            {songTitle()}
          </h1>
          {songArtist() && (
            <span class="hidden sm:inline text-[11px] text-slate-500 dark:text-slate-400 truncate">
              by <strong class="font-medium text-slate-700 dark:text-slate-300">{songArtist()}</strong>
            </span>
          )}
        </div>

        {/* Template origin tag if active */}
        <Show when={activeSavedTemplate()}>
          <span class="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate max-w-[150px]" title={`Editing library template: ${activeSavedTemplate()?.name}`}>
            <span>📑</span>
            <span class="truncate">{activeSavedTemplate()?.name}</span>
          </span>
        </Show>
      </div>

      {/* Right Info Badges */}
      <div class="flex items-center gap-2 text-xs">
        {/* Unsaved indicator pill in header */}
        <Show when={isDirty()}>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-semibold border border-amber-300 dark:border-amber-800">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Unsaved</span>
          </span>
        </Show>

        {props.paperConfig && (
          <span class="hidden md:inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            📄 {props.paperConfig.preset.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}
