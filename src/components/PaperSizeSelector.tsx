import {createSignal, For, Show} from 'solid-js';
import {
  PAPER_PRESETS,
  type PaperPreset,
  PaperPresetDefinition,
  type PaperSizeConfig,
  type PaperUnit,
} from '../lib/paperSize';

interface PaperSizeSelectorProps {
  value: PaperSizeConfig;
  onChange: (config: PaperSizeConfig) => void;
}

export default function PaperSizeSelector(props: PaperSizeSelectorProps) {
  const [isOpen, setIsOpen] = createSignal(false, { name: 'paper_menu_open' });

  const handlePresetSelect = (preset: PaperPreset) => {
    if (preset === 'custom') {
      props.onChange({
        preset: 'custom',
        width: props.value.width,
        height: props.value.height,
        unit: props.value.unit,
      });
    } else {
      const presetInfo = PAPER_PRESETS[preset];
      props.onChange({
        preset,
        width: presetInfo.width,
        height: presetInfo.height,
        unit: presetInfo.unit,
      });
      setIsOpen(false);
    }
  };

  const handleUnitChange = (unit: PaperUnit) => {
    let newWidth = props.value.width;
    let newHeight = props.value.height;

    // Convert existing values when switching unit
    if (unit === 'cm' && props.value.unit === 'in') {
      newWidth = Number((props.value.width * 2.54).toFixed(2));
      newHeight = Number((props.value.height * 2.54).toFixed(2));
    } else if (unit === 'in' && props.value.unit === 'cm') {
      newWidth = Number((props.value.width / 2.54).toFixed(2));
      newHeight = Number((props.value.height / 2.54).toFixed(2));
    }

    props.onChange({
      ...props.value,
      preset: 'custom',
      unit,
      width: newWidth,
      height: newHeight,
    });
  };

  const handleWidthChange = (w: number) => {
    if (isNaN(w) || w <= 0) return;
    props.onChange({
      ...props.value,
      preset: 'custom',
      width: w,
    });
  };

  const handleHeightChange = (h: number) => {
    if (isNaN(h) || h <= 0) return;
    props.onChange({
      ...props.value,
      preset: 'custom',
      height: h,
    });
  };

  const getPresetLabel = () => {
    if (props.value.preset === 'custom') {
      return `Custom (${props.value.width} × ${props.value.height} ${props.value.unit})`;
    }
    return PAPER_PRESETS[props.value.preset]?.label || 'Paper Size';
  };

  return (
    <div class="relative inline-block text-left text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen())}
        class="inline-flex items-center gap-1.5 rounded-md bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors cursor-pointer"
        title="Select Paper Size"
      >
        <span>📄</span>
        <span>{getPresetLabel()}</span>
        <svg
          class="h-3 w-3 text-slate-400 ml-0.5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clip-rule="evenodd"
          />
        </svg>
      </button>

      <Show when={isOpen()}>
        {/* Backdrop for click outside */}
        <div class="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

        <div class="absolute left-0 mt-1.5 z-50 w-72 rounded-lg bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-black/15 dark:ring-white/15 p-3 flex flex-col gap-3">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-1.5">
            <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Paper Size Presets
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1"
            >
              ✕
            </button>
          </div>

          <div class="flex flex-col gap-1">
            <For each={['letter', 'legal', 'a4', 'custom'] as const}>
              {(presetKey) => {
                const preset = PAPER_PRESETS[presetKey as keyof typeof PAPER_PRESETS] ?? {
                  label: 'Custom',
                } as PaperPresetDefinition;
                return (
                  <button
                    type="button"
                    onClick={() => handlePresetSelect(presetKey)}
                    class={[
                      'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left text-xs transition-colors cursor-pointer',
                      {
                        'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 font-semibold':
                          props.value.preset === presetKey,
                        'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/70':
                          props.value.preset !== presetKey,
                      },
                    ]}
                  >
                    <div class="flex items-center gap-2">
                      <span
                        class={[
                          'w-2 h-2 rounded-full shrink-0',
                          {
                            'bg-sky-600 dark:bg-sky-400': props.value.preset === presetKey,
                            'bg-transparent border border-slate-400':
                              props.value.preset !== presetKey,
                          },
                        ]}
                      />
                      <span>{preset.label}</span>
                    </div>
                    {preset.description && (
                      <span class="text-[10px] text-slate-400">{preset.description}</span>
                    )}
                  </button>
                );
              }}
            </For>
          </div>

          {/* Custom Size Controls */}
          <Show when={props.value.preset === 'custom'}>
            <div class="pt-2.5 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2.5">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Measurement Unit:
                </span>
                <div class="inline-flex rounded-md bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => handleUnitChange('in')}
                    class={[
                      'px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer',
                      props.value.unit === 'in'
                        ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white',
                    ]}
                  >
                    Inches (in)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnitChange('cm')}
                    class={[
                      'px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer',
                      props.value.unit === 'cm'
                        ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white',
                    ]}
                  >
                    Centimeters (cm)
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                    Width ({props.value.unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="100"
                    value={props.value.width}
                    onInput={(e) => handleWidthChange(parseFloat(e.currentTarget.value))}
                    class="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label class="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                    Height ({props.value.unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="100"
                    value={props.value.height}
                    onInput={(e) => handleHeightChange(parseFloat(e.currentTarget.value))}
                    class="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
