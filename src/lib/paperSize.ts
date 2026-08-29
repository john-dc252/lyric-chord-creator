/**
 * Paper size definitions and utilities for Lyric-Chord Creator
 */

export type PaperPreset = 'letter' | 'legal' | 'a4' | 'custom';
export type PaperUnit = 'in' | 'cm';

export interface PaperSizeConfig {
  preset: PaperPreset;
  width: number;
  height: number;
  unit: PaperUnit;
}

export interface PaperPresetDefinition {
  label: string;
  width: number;
  height: number;
  unit: PaperUnit;
  description: string;
}

export const PAPER_PRESETS: Record<Exclude<PaperPreset, 'custom'>, PaperPresetDefinition> = {
  letter: {
    label: 'Letter',
    width: 8.5,
    height: 11,
    unit: 'in',
    description: '8.5 × 11 inches (Standard)',
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
    description: '21 × 29.7 cm (International)',
  },
};

export const DEFAULT_PAPER_SIZE: PaperSizeConfig = {
  preset: 'letter',
  width: 8.5,
  height: 11,
  unit: 'in',
};

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
  const widthCss = formatCssDimension(config.width, config.unit);
  const heightCss = formatCssDimension(config.height, config.unit);

  return `
@media only print {
    @page {
        margin: 0.5in;
        size: ${widthCss} ${heightCss};
    }
    body {
        background: #fff !important;
    }
    .page {
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        min-height: 0 !important;
        box-shadow: none !important;
        break-after: page;
    }
}

@media only screen {
    .page {
        white-space: pre-wrap;
        padding: 0.5in;
        width: ${widthCss};
        height: ${heightCss};
        margin: 0.5in auto;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
    }
}
`;
}
