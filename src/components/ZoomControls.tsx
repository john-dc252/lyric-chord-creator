export type ZoomLevel = 'fit' | 0.5 | 0.75 | 1.0 | 1.25 | 1.5;

export interface ZoomControlsProps {
  zoom: ZoomLevel;
  onChange: (zoom: ZoomLevel) => void;
}

export default function ZoomControls(props: ZoomControlsProps) {
  return (
    <div class="flex items-center bg-white dark:bg-slate-700 rounded-md border border-slate-300 dark:border-slate-600 px-1.5 py-0.5 shadow-sm">
      <span class="text-[10px] text-slate-500 dark:text-slate-400 mr-1.5">Zoom:</span>
      <button
        type="button"
        onClick={() => props.onChange('fit')}
        class={[
          'px-1.5 py-0.5 rounded text-[11px] transition-colors',
          props.zoom === 'fit'
            ? 'bg-sky-500 text-white font-bold'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600',
        ]}
      >
        Fit
      </button>
      <button
        type="button"
        onClick={() => props.onChange(0.75)}
        class={[
          'px-1.5 py-0.5 rounded text-[11px] transition-colors',
          props.zoom === 0.75
            ? 'bg-sky-500 text-white font-bold'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600',
        ]}
      >
        75%
      </button>
      <button
        type="button"
        onClick={() => props.onChange(1.0)}
        class={[
          'px-1.5 py-0.5 rounded text-[11px] transition-colors',
          props.zoom === 1.0
            ? 'bg-sky-500 text-white font-bold'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600',
        ]}
      >
        100%
      </button>
    </div>
  );
}
