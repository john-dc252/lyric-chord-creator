import { createMemo, createSignal, onSettled } from 'solid-js';
import {
  formatCssDimension,
  type PaperSizeConfig,
} from '../lib/paperSize';
import {
  ChordGuidePages,
  extractSongTitle,
} from '../lib/template-processor';
import PaperSizeSelector from './PaperSizeSelector';

interface ChordGuidePreviewProps {
  template: string;
  paperConfig: PaperSizeConfig;
  onPaperConfigChange: (config: PaperSizeConfig) => void;
}

export type ZoomLevel = 'fit' | 0.5 | 0.75 | 1.0 | 1.25 | 1.5;

export default function ChordGuidePreview(props: ChordGuidePreviewProps) {
  let previewRootRef: HTMLDivElement | undefined = undefined;
  let containerRef: HTMLDivElement | undefined = undefined;
  let sheetRef: HTMLDivElement | undefined = undefined;

  const [isFullscreen, setIsFullscreen] = createSignal(false, { name: 'preview_is_fullscreen' });
  const [zoom, setZoom] = createSignal<ZoomLevel>('fit', { name: 'preview_zoom' });
  const [scaleFactor, setScaleFactor] = createSignal<number>(1.0, { name: 'scale_factor' });
  const [sheetWidth, setSheetWidth] = createSignal<number>(816, { name: 'sheet_width' });
  const [sheetHeight, setSheetHeight] = createSignal<number>(1056, { name: 'sheet_height' });

  // Calculate dynamic scale factor when "fit" is selected or window resizes
  const updateScaling = (currentZoom: ZoomLevel) => {
    if (!containerRef || !sheetRef) return;

    const firstPage = sheetRef.querySelector('.page') as HTMLElement | null;
    const rawWidth = firstPage?.offsetWidth || sheetRef.offsetWidth || 816;
    const rawHeight = sheetRef.offsetHeight || 1056;
    if (rawWidth > 0) setSheetWidth(rawWidth);
    if (rawHeight > 0) setSheetHeight(rawHeight);

    if (typeof currentZoom === 'number') {
      setScaleFactor(currentZoom);
      return;
    }

    if (currentZoom === 'fit') {
      const padding = window.innerWidth < 640 ? 16 : 32;
      const availableWidth = containerRef.clientWidth - padding;
      if (rawWidth > 0 && availableWidth > 0) {
        const factor = Math.min(1.0, Math.max(0.15, availableWidth / rawWidth));
        setScaleFactor(Number(factor.toFixed(3)));
      }
    }
  };

  const toggleFullscreen = async () => {
    if (!previewRootRef) return;

    if (!isFullscreen()) {
      if (document.fullscreenEnabled && previewRootRef.requestFullscreen) {
        try {
          await previewRootRef.requestFullscreen();
          setIsFullscreen(true);
        } catch {
          setIsFullscreen(true);
        }
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        try {
          await document.exitFullscreen();
        } catch {}
      }
      setIsFullscreen(false);
    }
    setTimeout(() => updateScaling(zoom()), 60);
  };

  onSettled(() => {
    updateScaling(zoom());

    const resizeObserver = new ResizeObserver(() => {
      updateScaling(zoom());
    });

    if (containerRef) {
      resizeObserver.observe(containerRef);
    }
    if (sheetRef) {
      resizeObserver.observe(sheetRef);
    }

    const handleWindowResize = () => {
      updateScaling(zoom());
    };

    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement && document.fullscreenElement === previewRootRef;
      setIsFullscreen(active);
      setTimeout(() => updateScaling(zoom()), 60);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen()) {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
        setTimeout(() => updateScaling(zoom()), 60);
      }
    };

    window.addEventListener('resize', handleWindowResize);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  const paperWidthCss = createMemo(() => {
    return formatCssDimension(props.paperConfig.width, props.paperConfig.unit);
  }, { name: 'paper_width_css' });

  const paperMinHeightCss = createMemo(() => {
    return formatCssDimension(props.paperConfig.height, props.paperConfig.unit);
  }, { name: 'paper_height_css' });

  const handlePrint = () => {
    if (!sheetRef) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.title = extractSongTitle(props.template);

    const style = doc.createElement('style');
    style.textContent = `
      @page {
        size: ${paperWidthCss()} ${paperMinHeightCss()};
        margin: 0.5in;
      }
      * {
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: #fff;
        color: #000;
        font-family: "monospace", monospace, "Courier New", Courier;
        font-size: 10pt;
      }
      .page {
        width: 100%;
        min-height: 100%;
        background: #fff;
        color: #000;
        column-count: 2;
        column-fill: auto;
        column-gap: 0.2in;
        white-space: pre-wrap;
        page-break-after: always;
        break-after: page;
      }
      .column-break {
        break-after: column;
      }
      .title {
        font-weight: bold;
        text-decoration: underline;
      }
      .artist {
        font-weight: bold;
      }
      .section-label {
        line-height: 1.5rem;
        break-after: avoid;
        font-weight: bold;
      }
      .line {
        position: relative;
        line-height: 3rem;
        break-inside: avoid-page;
      }
      .chord {
        font-weight: bold;
        position: absolute;
        line-height: 1em;
        color: #000;
      }
      .chord.sequence {
        position: relative;
        transform: none;
        font-weight: bold;
      }
    `;
    doc.head.appendChild(style);

    const clonedContainer = sheetRef.cloneNode(true) as HTMLElement;
    doc.body.appendChild(clonedContainer);

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 250);
  };

  return (
    <div
      ref={(el) => (previewRootRef = el)}
      class={[
        'relative flex flex-col w-full bg-slate-200/90 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 overflow-hidden shadow-sm transition-all',
        isFullscreen()
          ? 'fixed inset-0 z-50 rounded-none h-screen w-screen'
          : 'h-full rounded-lg',
      ]}
    >
      {/* Preview Control Toolbar */}
      <div class="relative z-30 flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
        <div class="flex items-center gap-2">
          <span class="font-bold tracking-wide uppercase text-[11px] text-slate-500 dark:text-slate-400">
            Preview
          </span>
          <span class="text-slate-300 dark:text-slate-600">|</span>
          <PaperSizeSelector
            value={props.paperConfig}
            onChange={(cfg) => {
              props.onPaperConfigChange(cfg);
              setTimeout(() => updateScaling(zoom()), 50);
            }}
          />
        </div>

        <div class="flex items-center gap-2">
          {/* Zoom controls */}
          <div class="flex items-center bg-white dark:bg-slate-700 rounded-md border border-slate-300 dark:border-slate-600 px-1.5 py-0.5 shadow-sm">
            <span class="text-[10px] text-slate-500 dark:text-slate-400 mr-1.5">Zoom:</span>
            <button
              type="button"
              onClick={() => {
                setZoom('fit');
                updateScaling('fit');
              }}
              class={[
                'px-1.5 py-0.5 rounded text-[11px] transition-colors',
                zoom() === 'fit'
                  ? 'bg-sky-500 text-white font-bold'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600',
              ]}
            >
              Fit
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(0.75);
                updateScaling(0.75);
              }}
              class={[
                'px-1.5 py-0.5 rounded text-[11px] transition-colors',
                zoom() === 0.75
                  ? 'bg-sky-500 text-white font-bold'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600',
              ]}
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1.0);
                updateScaling(1.0);
              }}
              class={[
                'px-1.5 py-0.5 rounded text-[11px] transition-colors',
                zoom() === 1.0
                  ? 'bg-sky-500 text-white font-bold'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600',
              ]}
            >
              100%
            </button>
          </div>

          {/* Action buttons */}
          <button
            type="button"
            onClick={toggleFullscreen}
            class={[
              'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold border shadow-sm transition-colors',
              isFullscreen()
                ? 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600',
            ]}
            title={isFullscreen() ? 'Exit Fullscreen (Esc)' : 'Fullscreen Preview'}
            aria-label={isFullscreen() ? 'Exit Fullscreen' : 'Fullscreen Preview'}
          >
            <span>{isFullscreen() ? '🗗' : '⛶'}</span>
            <span class="hidden sm:inline">{isFullscreen() ? 'Exit' : 'Fullscreen'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            class="inline-flex items-center gap-1 rounded-md bg-white dark:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm transition-colors"
            title="Print Chord Sheet"
          >
            <span>🖨️</span>
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Preview Sheet Canvas Area - Fixed Dark/Neutral Backdrop */}
      <div
        ref={(el) => (containerRef = el)}
        class={[
          'relative flex-1 overflow-auto p-2 sm:p-4 md:p-6 bg-[#2d3238]',
          isFullscreen() ? 'flex flex-col items-center' : '',
        ]}
      >
        {/* Sizing box matching exact scaled dimensions prevents flex clipping on mobile */}
        <div
          class={[
            'shrink-0 transition-[width,height] duration-150',
            isFullscreen() ? 'mx-auto' : '',
          ]}
          style={{
            width: `${sheetWidth() * scaleFactor()}px`,
            height: `${sheetHeight() * scaleFactor()}px`,
          }}
        >
          {/* Paper Sheet Rendering - Always Light Mode */}
          <div
            class="transition-transform duration-150"
            style={{
              transform: `scale(${scaleFactor()})`,
              'transform-origin': '0 0',
              width: `${sheetWidth()}px`,
            }}
          >
            <div
              ref={(el) => (sheetRef = el)}
              id="chord-guide-paper-container"
              class="flex flex-col gap-8 text-left select-text"
            >
              <ChordGuidePages template={props.template} />
            </div>
          </div>
        </div>
      </div>

      {/* Scoped CSS styling for the paper sheet to match reference exactly */}
      <style>{`
        #chord-guide-paper-container .page {
          width: ${paperWidthCss()};
          height: ${paperMinHeightCss()};
          padding: 0.5in;
          box-sizing: border-box;
          font-family: "monospace", monospace, "Courier New", Courier;
          font-size: 10pt;
          background: #fff;
          color: #000;
          column-count: 2;
          column-fill: auto;
          column-gap: 0.2in;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          border-radius: 2px;
          white-space: pre-wrap;
          break-after: page;
        }

        #chord-guide-paper-container .column-break {
          break-after: column;
        }

        #chord-guide-paper-container .title {
          font-weight: bold;
          text-decoration: underline;
        }

        #chord-guide-paper-container .artist {
          font-weight: bold;
        }

        #chord-guide-paper-container .section-label {
          line-height: 1.5rem;
          break-after: avoid;
          font-weight: bold;
        }

        #chord-guide-paper-container .line {
          position: relative;
          line-height: 3rem;
          break-inside: avoid-page;
        }

        #chord-guide-paper-container .chord {
          font-weight: bold;
          position: absolute;
          line-height: 1em;
          color: #000;
        }

        #chord-guide-paper-container .chord.sequence {
          position: relative;
          transform: none;
          font-weight: bold;
        }

        @media print {
          @page {
            size: ${paperWidthCss()} ${paperMinHeightCss()};
            margin: 0.5in;
          }
          body * {
            visibility: hidden !important;
          }
          #chord-guide-paper-container,
          #chord-guide-paper-container * {
            visibility: visible !important;
          }
          #chord-guide-paper-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            transform: none !important;
          }
          #chord-guide-paper-container .page {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 100% !important;
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>
    </div>
  );
}
