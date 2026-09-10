export interface ChordTransposeControlProps {
  value: number;
  onChange: (semitones: number) => void;
}

export default function ChordTransposeControl(props: ChordTransposeControlProps) {
  const handleDecrement = () => {
    props.onChange(props.value <= -11 ? 11 : props.value - 1);
  };

  const handleIncrement = () => {
    props.onChange(props.value >= 11 ? -11 : props.value + 1);
  };

  const handleReset = () => {
    props.onChange(0);
  };

  return (
    <div class="flex items-center bg-white dark:bg-slate-700 rounded-md border border-slate-300 dark:border-slate-600 px-1.5 py-0.5 shadow-sm">
      <span class="text-[10px] text-slate-500 dark:text-slate-400 mr-1.5">Key:</span>
      <button
        type="button"
        onClick={handleDecrement}
        class="inline-flex items-center justify-center p-0.5 rounded text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
        title="Transpose down 1 semitone"
        aria-label="Transpose down 1 semitone"
      >
        <span class="i-lucide-minus w-3 h-3" aria-hidden="true" />
      </button>

      <span
        class={[
          'text-[11px] font-mono font-semibold min-w-[28px] text-center px-0.5',
          props.value !== 0
            ? 'text-sky-600 dark:text-sky-400 font-bold'
            : 'text-slate-700 dark:text-slate-200',
        ]}
        title={`Transpose offset: ${props.value > 0 ? `+${props.value}` : props.value} semitones`}
      >
        {props.value > 0 ? `+${props.value}` : props.value}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        class="inline-flex items-center justify-center p-0.5 rounded text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
        title="Transpose up 1 semitone"
        aria-label="Transpose up 1 semitone"
      >
        <span class="i-lucide-plus w-3 h-3" aria-hidden="true" />
      </button>

      <button
        type="button"
        disabled={props.value === 0}
        onClick={handleReset}
        class="ml-1 inline-flex items-center justify-center p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        title="Reset transposition"
        aria-label="Reset transposition"
      >
        <span class="i-lucide-rotate-ccw w-3 h-3" aria-hidden="true" />
      </button>
    </div>
  );
}
