import ZoomControls, { type ZoomLevel } from './ZoomControls';

export interface PreviewDisplayControlsProps {
  zoom: ZoomLevel;
  onZoomChange: (zoom: ZoomLevel) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export default function PreviewDisplayControls(props: PreviewDisplayControlsProps) {
  return (
    <footer class="relative z-30 flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
      {/* Zoom Preset Stepper */}
      <ZoomControls zoom={props.zoom} onChange={props.onZoomChange} />

      {/* Viewport Fullscreen Toggle */}
      <div class="flex items-center gap-2">
        <button
          type="button"
          onClick={() => props.onToggleFullscreen()}
          class={[
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold border shadow-sm transition-colors',
            props.isFullscreen
              ? 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500'
              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600',
          ]}
          title={props.isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen Preview'}
          aria-label={props.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
        >
          {props.isFullscreen ? (
            <span class="i-lucide-minimize w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <span class="i-lucide-maximize w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span class="hidden sm:inline">{props.isFullscreen ? 'Exit' : 'Fullscreen'}</span>
        </button>
      </div>
    </footer>
  );
}
