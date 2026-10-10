import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { buildTemplatesZip, templateFileBaseName } from './download';

describe('download', () => {
  it('names files like the single-file export', () => {
    expect(templateFileBaseName('Amazing Grace (Live)!')).toBe('amazing-grace-live');
    expect(templateFileBaseName('日本語')).toBe('lyric-chord-template');
  });

  it('zips templates as .lcct.txt files with de-duplicated names', () => {
    const files = unzipSync(
      buildTemplatesZip([
        { name: 'Hymn', content: '@title: A' },
        { name: 'hymn!', content: '@title: B' },
        { name: 'Hymn', content: '@title: C' },
      ]),
    );
    expect(Object.keys(files).sort()).toEqual(['hymn-2.lcct.txt', 'hymn-3.lcct.txt', 'hymn.lcct.txt']);
    expect(strFromU8(files['hymn-2.lcct.txt'])).toBe('@title: B');
  });
});
