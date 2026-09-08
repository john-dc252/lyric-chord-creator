import { describe, expect, it } from 'vitest';
import {
  clampColumns,
  convertUnit,
  DEFAULT_PAPER_SIZE,
  FONT_SIZE_PRESETS,
  formatCssDimension,
  generatePaperCss,
  getEffectiveDimensions,
  getMaxColumns,
  getPresetDimensions,
  LANDSCAPE_MAX_COLUMNS,
  MARGIN_PRESETS,
  MIN_COLUMNS,
  PORTRAIT_MAX_COLUMNS,
  type PaperSizeConfig,
} from './paperSize';

describe('paperSize utilities', () => {
  it('converts units correctly between in and cm', () => {
    expect(convertUnit(1, 'in', 'cm')).toBe(2.54);
    expect(convertUnit(2.54, 'cm', 'in')).toBe(1);
    expect(convertUnit(8.5, 'in', 'in')).toBe(8.5);
  });

  it('formats CSS dimensions', () => {
    expect(formatCssDimension(8.5, 'in')).toBe('8.5in');
    expect(formatCssDimension(21, 'cm')).toBe('21cm');
  });

  it('calculates effective dimensions based on orientation', () => {
    // Portrait: height >= width
    const portraitDim = getEffectiveDimensions({
      width: 8.5,
      height: 11,
      orientation: 'portrait',
    });
    expect(portraitDim.width).toBe(8.5);
    expect(portraitDim.height).toBe(11);

    // Landscape: width > height
    const landscapeDim = getEffectiveDimensions({
      width: 8.5,
      height: 11,
      orientation: 'landscape',
    });
    expect(landscapeDim.width).toBe(11);
    expect(landscapeDim.height).toBe(8.5);
    expect(landscapeDim.width).toBeGreaterThan(landscapeDim.height);

    // Custom dimensions: landscape always guarantees width > height
    const customLandscape = getEffectiveDimensions({
      width: 6,
      height: 9,
      orientation: 'landscape',
    });
    expect(customLandscape.width).toBe(9);
    expect(customLandscape.height).toBe(6);
    expect(customLandscape.width).toBeGreaterThan(customLandscape.height);

    const customPortrait = getEffectiveDimensions({
      width: 9,
      height: 6,
      orientation: 'portrait',
    });
    expect(customPortrait.width).toBe(6);
    expect(customPortrait.height).toBe(9);
  });

  it('gets preset dimensions adjusted for orientation', () => {
    const letterPortrait = getPresetDimensions('letter', 'portrait');
    expect(letterPortrait).toEqual({ width: 8.5, height: 11, unit: 'in' });

    const letterLandscape = getPresetDimensions('letter', 'landscape');
    expect(letterLandscape).toEqual({ width: 11, height: 8.5, unit: 'in' });
    expect(letterLandscape.width).toBeGreaterThan(letterLandscape.height);

    const a4Landscape = getPresetDimensions('a4', 'landscape');
    expect(a4Landscape).toEqual({ width: 29.7, height: 21, unit: 'cm' });
    expect(a4Landscape.width).toBeGreaterThan(a4Landscape.height);
  });

  it('has valid default config and presets', () => {
    expect(DEFAULT_PAPER_SIZE.orientation).toBe('portrait');
    expect(DEFAULT_PAPER_SIZE.fontSize).toBe(10);
    expect(DEFAULT_PAPER_SIZE.margin).toBe(0.5);
    expect(DEFAULT_PAPER_SIZE.columns).toBe(2);
    expect(FONT_SIZE_PRESETS).toContain(10);
    expect(MARGIN_PRESETS.in.length).toBeGreaterThan(0);
    expect(MARGIN_PRESETS.cm.length).toBeGreaterThan(0);
  });

  it('correctly reports min and max columns for portrait and landscape', () => {
    expect(MIN_COLUMNS).toBe(1);
    expect(PORTRAIT_MAX_COLUMNS).toBe(2);
    expect(LANDSCAPE_MAX_COLUMNS).toBe(4);
    expect(getMaxColumns('portrait')).toBe(2);
    expect(getMaxColumns('landscape')).toBe(4);
  });

  it('clamps column count correctly for portrait (min 1, max 2)', () => {
    expect(clampColumns(1, 'portrait')).toBe(1);
    expect(clampColumns(2, 'portrait')).toBe(2);
    expect(clampColumns(3, 'portrait')).toBe(2);
    expect(clampColumns(4, 'portrait')).toBe(2);
    expect(clampColumns(0, 'portrait')).toBe(1);
    expect(clampColumns(-1, 'portrait')).toBe(1);
    expect(clampColumns(undefined, 'portrait')).toBe(2);
  });

  it('clamps column count correctly for landscape (min 1, max 4)', () => {
    expect(clampColumns(1, 'landscape')).toBe(1);
    expect(clampColumns(2, 'landscape')).toBe(2);
    expect(clampColumns(3, 'landscape')).toBe(3);
    expect(clampColumns(4, 'landscape')).toBe(4);
    expect(clampColumns(5, 'landscape')).toBe(4);
    expect(clampColumns(0, 'landscape')).toBe(1);
    expect(clampColumns(-2, 'landscape')).toBe(1);
    expect(clampColumns(undefined, 'landscape')).toBe(2);
  });

  it('generates paper CSS with font size, margins, orientation, and columns', () => {
    const config: PaperSizeConfig = {
      preset: 'letter',
      orientation: 'landscape',
      width: 8.5,
      height: 11,
      unit: 'in',
      fontSize: 12,
      margin: 0.75,
      columns: 3,
    };

    const css = generatePaperCss(config);
    expect(css).toContain('size: 11in 8.5in;');
    expect(css).toContain('margin: 0.75in;');
    expect(css).toContain('padding: 0.75in;');
    expect(css).toContain('font-size: 12pt;');
    expect(css).toContain('column-count: 3;');
    expect(css).toContain('column-count: 3 !important;');
  });

  it('generates paper CSS for cm units, custom margins, and clamped columns', () => {
    const config: PaperSizeConfig = {
      preset: 'a4',
      orientation: 'portrait',
      width: 21,
      height: 29.7,
      unit: 'cm',
      fontSize: 14,
      margin: 1.5,
      columns: 4, // Exceeds portrait max (2), should be clamped to 2
    };

    const css = generatePaperCss(config);
    expect(css).toContain('size: 21cm 29.7cm;');
    expect(css).toContain('margin: 1.5cm;');
    expect(css).toContain('padding: 1.5cm;');
    expect(css).toContain('font-size: 14pt;');
    expect(css).toContain('column-count: 2;');
  });

  it('generates paper CSS with 1 column when set to 1', () => {
    const config: PaperSizeConfig = {
      preset: 'letter',
      orientation: 'portrait',
      width: 8.5,
      height: 11,
      unit: 'in',
      fontSize: 10,
      margin: 0.5,
      columns: 1,
    };

    const css = generatePaperCss(config);
    expect(css).toContain('column-count: 1;');
    expect(css).toContain('column-count: 1 !important;');
  });
});
