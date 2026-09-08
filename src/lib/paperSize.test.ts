import { describe, expect, it } from 'vitest';
import {
  convertUnit,
  DEFAULT_PAPER_SIZE,
  FONT_SIZE_PRESETS,
  formatCssDimension,
  generatePaperCss,
  getEffectiveDimensions,
  getPresetDimensions,
  MARGIN_PRESETS,
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
    expect(FONT_SIZE_PRESETS).toContain(10);
    expect(MARGIN_PRESETS.in.length).toBeGreaterThan(0);
    expect(MARGIN_PRESETS.cm.length).toBeGreaterThan(0);
  });

  it('generates paper CSS with font size, margins, and orientation', () => {
    const config: PaperSizeConfig = {
      preset: 'letter',
      orientation: 'landscape',
      width: 8.5,
      height: 11,
      unit: 'in',
      fontSize: 12,
      margin: 0.75,
    };

    const css = generatePaperCss(config);
    expect(css).toContain('size: 11in 8.5in;');
    expect(css).toContain('margin: 0.75in;');
    expect(css).toContain('padding: 0.75in;');
    expect(css).toContain('font-size: 12pt;');
  });

  it('generates paper CSS for cm units and custom margins', () => {
    const config: PaperSizeConfig = {
      preset: 'a4',
      orientation: 'portrait',
      width: 21,
      height: 29.7,
      unit: 'cm',
      fontSize: 14,
      margin: 1.5,
    };

    const css = generatePaperCss(config);
    expect(css).toContain('size: 21cm 29.7cm;');
    expect(css).toContain('margin: 1.5cm;');
    expect(css).toContain('padding: 1.5cm;');
    expect(css).toContain('font-size: 14pt;');
  });
});
