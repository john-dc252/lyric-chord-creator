import { createSignal, For, Show } from 'solid-js';
import {
  clampColumns,
  DEFAULT_PAPER_SIZE,
  FONT_SIZE_PRESETS,
  getEffectiveDimensions,
  getMaxColumns,
  getPresetDimensions,
  MARGIN_PRESETS,
  PAPER_PRESETS,
  type PaperOrientation,
  type PaperPreset,
  type PaperSizeConfig,
  type PaperUnit,
} from '../lib/paperSize';

interface PaperSizeSelectorProps {
  value: PaperSizeConfig;
  onChange: (config: PaperSizeConfig) => void;
}

export default function PaperSizeSelector(props: PaperSizeSelectorProps) {
  const [isOpen, setIsOpen] = createSignal(false, { name: 'paper_menu_open' });

  const currentOrientation = () => props.value.orientation || 'portrait';
  const currentFontSize = () => props.value.fontSize ?? 10;
  const currentMargin = () => props.value.margin ?? (props.value.unit === 'cm' ? 1.27 : 0.5);
  const currentColumns = () => clampColumns(props.value.columns, currentOrientation());

  const handleOrientationChange = (orientation: PaperOrientation) => {
    const clampedCols = clampColumns(props.value.columns ?? 2, orientation);
    if (props.value.preset === 'custom') {
      const { width, height } = getEffectiveDimensions({
        width: props.value.width,
        height: props.value.height,
        orientation,
      });
      props.onChange({
        ...props.value,
        orientation,
        width,
        height,
        columns: clampedCols,
      });
    } else {
      const { width, height, unit } = getPresetDimensions(props.value.preset, orientation);
      props.onChange({
        ...props.value,
        orientation,
        width,
        height,
        unit,
        columns: clampedCols,
      });
    }
  };

  const handlePresetSelect = (preset: PaperPreset) => {
    if (preset === 'custom') {
      props.onChange({
        ...props.value,
        preset: 'custom',
      });
    } else {
      const { width, height, unit } = getPresetDimensions(preset, currentOrientation());
      props.onChange({
        ...props.value,
        preset,
        width,
        height,
        unit,
      });
    }
  };

  const handleUnitChange = (unit: PaperUnit) => {
    let newWidth = props.value.width;
    let newHeight = props.value.height;
    let newMargin = currentMargin();

    if (unit === 'cm' && props.value.unit === 'in') {
      newWidth = Number((props.value.width * 2.54).toFixed(2));
      newHeight = Number((props.value.height * 2.54).toFixed(2));
      newMargin = Number((newMargin * 2.54).toFixed(2));
    } else if (unit === 'in' && props.value.unit === 'cm') {
      newWidth = Number((props.value.width / 2.54).toFixed(2));
      newHeight = Number((props.value.height / 2.54).toFixed(2));
      newMargin = Number((newMargin / 2.54).toFixed(2));
    }

    props.onChange({
      ...props.value,
      preset: 'custom',
      unit,
      width: newWidth,
      height: newHeight,
      margin: newMargin,
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

  const handleFontSizeChange = (size: number) => {
    if (isNaN(size) || size < 5 || size > 36) return;
    props.onChange({
      ...props.value,
      fontSize: size,
    });
  };

  const handleMarginChange = (m: number) => {
    if (isNaN(m) || m < 0 || m > 10) return;
    props.onChange({
      ...props.value,
      margin: Number(m.toFixed(2)),
    });
  };

  const handleColumnsChange = (cols: number) => {
    const clamped = clampColumns(cols, currentOrientation());
    props.onChange({
      ...props.value,
      columns: clamped,
    });
  };

  const handleResetDefaults = () => {
    props.onChange({ ...DEFAULT_PAPER_SIZE });
  };

  const getPresetLabel = () => {
    const isLandscape = currentOrientation() === 'landscape';
    const orientText = isLandscape ? 'Landscape' : 'Portrait';
    const cols = currentColumns();
    const colsText = `${cols} ${cols === 1 ? 'col' : 'cols'}`;

    let sizeLabel = '';
    if (props.value.preset === 'custom') {
      const { width, height } = getEffectiveDimensions(props.value);
      sizeLabel = `Custom (${width} × ${height} ${props.value.unit})`;
    } else {
      sizeLabel = PAPER_PRESETS[props.value.preset]?.label || 'Paper';
    }

    return `${sizeLabel} (${orientText}) • ${currentFontSize()}pt • ${colsText}`;
  };

  return (
    <div class="relative inline-block text-left text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen())}
        class="inline-flex items-center gap-1.5 rounded-md bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors cursor-pointer"
        title="Sheet Formatting & Paper Settings"
      >
        <span class="i-lucide-file-text w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
        <span>{getPresetLabel()}</span>
        <span class="i-lucide-chevron-down w-3.5 h-3.5 text-slate-400 ml-0.5 shrink-0" aria-hidden="true" />
      </button>

      <Show when={isOpen()}>
        {/* Backdrop for click outside */}
        <div class="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

        <div class="absolute left-0 mt-1.5 z-50 w-80 max-h-[85vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-black/15 dark:ring-white/15 p-3.5 flex flex-col gap-3.5">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
            <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sheet Settings
            </span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                class="text-[10px] text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                title="Reset to Letter Portrait 10pt 0.5in"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer transition-colors"
                aria-label="Close"
              >
                <span class="i-lucide-x w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* 1. Orientation Selector */}
          <div class="flex flex-col gap-1.5">
            <span class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Orientation
            </span>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOrientationChange('portrait')}
                class={[
                  'flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer',
                  currentOrientation() === 'portrait'
                    ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-400 dark:border-sky-600 shadow-xs'
                    : 'bg-white dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700',
                ]}
              >
                <span class="i-lucide-file-text w-3.5 h-3.5" aria-hidden="true" />
                <span>Portrait</span>
              </button>
              <button
                type="button"
                onClick={() => handleOrientationChange('landscape')}
                class={[
                  'flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer',
                  currentOrientation() === 'landscape'
                    ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-400 dark:border-sky-600 shadow-xs'
                    : 'bg-white dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700',
                ]}
              >
                <span class="i-lucide-file-text w-3.5 h-3.5 rotate-90" aria-hidden="true" />
                <span>Landscape</span>
              </button>
            </div>
          </div>

          {/* 2. Paper Size Presets */}
          <div class="flex flex-col gap-1.5">
            <span class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Paper Size
            </span>
            <div class="flex flex-col gap-1">
              <For each={['letter', 'legal', 'a4', 'custom'] as const}>
                {(presetKey) => {
                  const presetDef = PAPER_PRESETS[presetKey as keyof typeof PAPER_PRESETS];
                  let dimensionsDesc = '';
                  let label = 'Custom';

                  if (presetDef) {
                    label = presetDef.label;
                    const { width, height } = getPresetDimensions(presetKey as Exclude<PaperPreset, 'custom'>, currentOrientation());
                    dimensionsDesc = `${width} × ${height} ${presetDef.unit}`;
                  }

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
                        <span>{label}</span>
                      </div>
                      {dimensionsDesc && (
                        <span class="text-[10px] text-slate-400">{dimensionsDesc}</span>
                      )}
                    </button>
                  );
                }}
              </For>
            </div>
          </div>

          {/* Custom Size Controls */}
          <Show when={props.value.preset === 'custom'}>
            <div class="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Unit:
                </span>
                <div class="inline-flex rounded-md bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => handleUnitChange('in')}
                    class={[
                      'px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer',
                      props.value.unit === 'in'
                        ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
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
                        ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
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

          {/* 3. Columns Controls */}
          <div class="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Columns
              </span>
              <span class="text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400">
                {currentColumns()} {currentColumns() === 1 ? 'Column' : 'Columns'}
                <span class="text-[10px] text-slate-400 font-normal ml-1">
                  (max {getMaxColumns(currentOrientation())})
                </span>
              </span>
            </div>

            <div class="grid grid-cols-4 gap-1.5">
              <For each={[1, 2, 3, 4]}>
                {(colCount) => {
                  const maxAllowed = () => getMaxColumns(currentOrientation());
                  const isDisabled = () => colCount > maxAllowed();
                  const isSelected = () => currentColumns() === colCount;

                  return (
                    <button
                      type="button"
                      disabled={isDisabled()}
                      onClick={() => handleColumnsChange(colCount)}
                      class={[
                        'flex flex-col items-center justify-center py-1.5 px-2 rounded text-center border transition-all cursor-pointer',
                        isDisabled()
                          ? 'opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                          : isSelected()
                            ? 'bg-sky-500 text-white border-sky-500 font-bold'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600',
                      ]}
                      title={
                        isDisabled()
                          ? `Max ${maxAllowed()} columns allowed in ${currentOrientation()}`
                          : `${colCount} ${colCount === 1 ? 'column' : 'columns'}`
                      }
                    >
                      <span class="text-xs font-bold">{colCount}</span>
                      <span class="text-[9px] opacity-80">{colCount === 1 ? 'Col' : 'Cols'}</span>
                    </button>
                  );
                }}
              </For>
            </div>
          </div>

          {/* 4. Font Size Controls */}
          <div class="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Font Size
              </span>
              <span class="text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400">
                {currentFontSize()}pt
              </span>
            </div>

            <div class="flex items-center gap-1.5 flex-wrap">
              <For each={FONT_SIZE_PRESETS}>
                {(pt) => (
                  <button
                    type="button"
                    onClick={() => handleFontSizeChange(pt)}
                    class={[
                      'px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer',
                      currentFontSize() === pt
                        ? 'bg-sky-500 text-white border-sky-500 font-bold'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600',
                    ]}
                  >
                    {pt}pt
                  </button>
                )}
              </For>
            </div>

            <div class="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => handleFontSizeChange(Math.max(6, currentFontSize() - 1))}
                class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
                title="Decrease font size"
              >
                -
              </button>
              <input
                type="range"
                min="6"
                max="20"
                step="1"
                value={currentFontSize()}
                onInput={(e) => handleFontSizeChange(parseInt(e.currentTarget.value, 10))}
                class="flex-1 accent-sky-500 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => handleFontSizeChange(Math.min(24, currentFontSize() + 1))}
                class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
                title="Increase font size"
              >
                +
              </button>
            </div>
          </div>

          {/* 5. Margins Controls */}
          <div class="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Sheet Margins
              </span>
              <span class="text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400">
                {currentMargin()} {props.value.unit}
              </span>
            </div>

            <div class="grid grid-cols-3 gap-1.5">
              <For each={MARGIN_PRESETS[props.value.unit]}>
                {(opt) => (
                  <button
                    type="button"
                    onClick={() => handleMarginChange(opt.value)}
                    class={[
                      'flex flex-col items-center justify-center py-1 px-1 rounded text-center border transition-all cursor-pointer',
                      currentMargin() === opt.value
                        ? 'bg-sky-500 text-white border-sky-500 font-bold'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600',
                    ]}
                  >
                    <span class="text-[10px] leading-tight font-medium">{opt.label}</span>
                    <span class="text-[9px] opacity-80">{opt.description}</span>
                  </button>
                )}
              </For>
            </div>

            <div class="flex items-center gap-2 mt-1">
              <label class="text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                Custom ({props.value.unit}):
              </label>
              <input
                type="number"
                step={props.value.unit === 'cm' ? '0.1' : '0.05'}
                min="0.1"
                max={props.value.unit === 'cm' ? '5.0' : '2.0'}
                value={currentMargin()}
                onInput={(e) => handleMarginChange(parseFloat(e.currentTarget.value))}
                class="w-20 px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}

