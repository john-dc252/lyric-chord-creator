/**
 * Paper size definitions and utilities for Lyric-Chord Creator
 */

export type PaperPreset = 'letter' | 'legal' | 'a4' | 'custom';
export type PaperUnit = 'in' | 'cm';
export type PaperOrientation = 'portrait' | 'landscape';

export interface PaperSizeConfig {
  preset: PaperPreset;
  orientation: PaperOrientation;
  width: number;
  height: number;
  unit: PaperUnit;
  fontSize: number; // in pt (points, e.g. 10)
  margin: number;   // in config.unit (e.g. 0.5 for 'in', 1.27 for 'cm')
}

export interface PaperPresetDefinition {
  label: string;
  width: number; // portrait width
  height: number; // portrait height
  unit: PaperUnit;
  description: string;
}

export const PAPER_PRESETS: Record<Exclude<PaperPreset, 'custom'>, PaperPresetDefinition> = {
  letter: {
    label: 'Letter',
    width: 8.5,
    height: 11,
    unit: 'in',
    description: '8.5 × 11 inches',
  },
  legal: {
    label: 'Legal',
    width: 8.5,
    height: 14,
    unit: 'in',
    description: '8.5 × 14 inches',
  },
  a4: {
    label: 'A4',
    width: 21,
    height: 29.7,
    unit: 'cm',
    description: '21 × 29.7 cm',
  },
};

export const FONT_SIZE_PRESETS = [8, 9, 10, 11, 12, 14, 16] as const;

export interface MarginPresetOption {
  label: string;
  value: number;
  unit: PaperUnit;
  description: string;
}

export const MARGIN_PRESETS: Record<PaperUnit, MarginPresetOption[]> = {
  in: [
    { label: 'Narrow', value: 0.25, unit: 'in', description: '0.25 in' },
    { label: 'Normal', value: 0.5, unit: 'in', description: '0.5 in' },
    { label: 'Wide', value: 0.75, unit: 'in', description: '0.75 in' },
  ],
  cm: [
    { label: 'Narrow', value: 0.64, unit: 'cm', description: '0.64 cm' },
    { label: 'Normal', value: 1.27, unit: 'cm', description: '1.27 cm' },
    { label: 'Wide', value: 1.91, unit: 'cm', description: '1.91 cm' },
  ],
};

export const DEFAULT_PAPER_SIZE: PaperSizeConfig = {
  preset: 'letter',
  orientation: 'portrait',
  width: 8.5,
  height: 11,
  unit: 'in',
  fontSize: 10,
  margin: 0.5,
};

/**
 * Returns effective paper width and height based on the selected orientation.
 * Landscape ensures width > height, Portrait ensures height >= width.
 */
export function getEffectiveDimensions(config: {
  width: number;
  height: number;
  orientation: PaperOrientation;
}): { width: number; height: number } {
  const minDim = Math.min(config.width, config.height);
  const maxDim = Math.max(config.width, config.height);

  if (config.orientation === 'landscape') {
    return { width: maxDim, height: minDim };
  }
  return { width: minDim, height: maxDim };
}

/**
 * Gets preset dimensions adjusted for orientation.
 */
export function getPresetDimensions(
  preset: Exclude<PaperPreset, 'custom'>,
  orientation: PaperOrientation = 'portrait',
): { width: number; height: number; unit: PaperUnit } {
  const info = PAPER_PRESETS[preset];
  const { width, height } = getEffectiveDimensions({
    width: info.width,
    height: info.height,
    orientation,
  });
  return { width, height, unit: info.unit };
}

/**
 * Converts value between inches and centimeters
 */
export function convertUnit(val: number, from: PaperUnit, to: PaperUnit): number {
  if (from === to) return val;
  if (from === 'in' && to === 'cm') {
    return Number((val * 2.54).toFixed(2));
  }
  if (from === 'cm' && to === 'in') {
    return Number((val / 2.54).toFixed(2));
  }
  return val;
}

/**
 * Formats a paper size as a CSS dimension string (e.g. "8.5in" or "21cm")
 */
export function formatCssDimension(val: number, unit: PaperUnit): string {
  return `${val}${unit}`;
}

/**
 * Generates CSS rules for a given paper size configuration
 */
export function generatePaperCss(config: PaperSizeConfig): string {
  const { width, height } = getEffectiveDimensions(config);
  const widthCss = formatCssDimension(width, config.unit);
  const heightCss = formatCssDimension(height, config.unit);
  const marginCss = formatCssDimension(config.margin ?? (config.unit === 'cm' ? 1.27 : 0.5), config.unit);
  const fontSizeCss = `${config.fontSize ?? 10}pt`;

  return `
@media only print {
    @page {
        margin: ${marginCss};
        size: ${widthCss} ${heightCss};
    }
    body {
        background: #fff !important;
        font-size: ${fontSizeCss} !important;
    }
    .page {
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        min-height: 0 !important;
        box-shadow: none !important;
        break-after: page;
        font-size: ${fontSizeCss} !important;
    }
}

@media only screen {
    .page {
        white-space: pre-wrap;
        padding: ${marginCss};
        width: ${widthCss};
        height: ${heightCss};
        margin: 0.5in auto;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
        font-size: ${fontSizeCss};
    }
}
`;
}
