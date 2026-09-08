import {render} from '@solidjs/testing-library';
import {describe, expect, test} from 'vitest';
import {
  ChordGuidePages,
  EMBEDDED_CHORDS,
  extractSongArtist,
  extractSongAtLine,
  extractSongTitle,
  extractSongsMetadata,
  parseTemplatePages,
  renderPageLines,
  transformLineToJsx,
} from './index';

describe('Template Processor JSX', () => {
  test('parseChordSegments splits lyrics and chords accurately', () => {
    const line = '{E}I {Esus4}know You’ve given all I need  {A}';
    const result = render(() => EMBEDDED_CHORDS.tryIntoJsx(line));
    const expectedHTML = '<div class="line"><span class="chord">E</span>I <span class="chord">Esus4</span>know You’ve given all I need  <span class="chord">A</span></div>';
    expect(result.container.innerHTML).toEqual(expectedHTML);
  });

  test('transformLineToJsx handles title, artist, sections, inline chords, and line breaks', () => {
    const {container: titleContainer} = render(() =>
      transformLineToJsx('@title: 10,000 Reasons'),
    );
    expect(titleContainer.querySelector('.title')?.textContent).toBe('10,000 Reasons');

    const {container: artistContainer} = render(() =>
      transformLineToJsx('@artist: Matt Redman'),
    );
    expect(artistContainer.querySelector('.artist')?.textContent).toBe('Matt Redman');

    const {container: sectionContainer} = render(() => transformLineToJsx('[Chorus]'));
    expect(sectionContainer.querySelector('.section-label')?.textContent).toBe('[Chorus]');

    const {container: inlineContainer} = render(() =>
      transformLineToJsx('@chord_sequence: C G D/F# Em'),
    );
    expect(inlineContainer.querySelector('.chord.sequence')?.textContent).toBe('C G D/F# Em');

    const {container: colBreakContainer} = render(() =>
      transformLineToJsx('@column_break'),
    );
    expect(colBreakContainer.querySelector('.column-break')).not.toBeNull();

    const {container: breakContainer} = render(() =>
      transformLineToJsx('@empty_line'),
    );
    expect(breakContainer.querySelector('br')).not.toBeNull();
  });

  test('renderPageLines bounds @column_break by column count and ignores excess breaks', () => {
    const lines = [
      '[Verse 1]',
      '{C}Line 1',
      '@column_break',
      '[Verse 2]',
      '{G}Line 2',
      '@column_break',
      '[Verse 3]',
      '{Am}Line 3',
      '@column_break',
      '[Verse 4]',
      '{F}Line 4',
    ];

    // 1 column: 0 column breaks allowed (all @column_break ignored)
    const res1 = render(() => <>{renderPageLines(lines, 1)}</>);
    expect(res1.container.querySelectorAll('.column-break').length).toBe(0);

    // 2 columns: max 1 column break allowed
    const res2 = render(() => <>{renderPageLines(lines, 2)}</>);
    expect(res2.container.querySelectorAll('.column-break').length).toBe(1);

    // 3 columns: max 2 column breaks allowed
    const res3 = render(() => <>{renderPageLines(lines, 3)}</>);
    expect(res3.container.querySelectorAll('.column-break').length).toBe(2);

    // 4 columns: max 3 column breaks allowed
    const res4 = render(() => <>{renderPageLines(lines, 4)}</>);
    expect(res4.container.querySelectorAll('.column-break').length).toBe(3);
  });

  test('parseTemplatePages splits only on @page_break', () => {
    const template = `@title: Song One
[Verse 1]
@column_break
[Verse 2]
@column_break
[Verse 3]
@page_break
@title: Song Two
[Chorus]`;

    const pages = parseTemplatePages(template);
    expect(pages.length).toBe(2);
    expect(pages[0].lines).toContain('@column_break');
    expect(pages[1].lines).toContain('[Chorus]');
  });

  test('<ChordGuidePages /> renders multi-page structure and ignores excess column breaks per page', () => {
    const template = `@title: Test Song
@artist: Test Artist
[Verse 1]
{C}Line 1
@column_break
[Verse 2]
{D}Line 2
@column_break
[Verse 3]
{E}Line 3
@page_break
[Chorus]
{G}Line 4
@column_break
[Bridge]
{Am}Line 5`;

    // Render with 2 columns: only 2 pages (split on @page_break)
    const {container: container2Col} = render(() => <ChordGuidePages template={template} columns={2}/>);
    const pages2Col = container2Col.querySelectorAll('.page');
    expect(pages2Col.length).toBe(2);

    // Page 1 has 2 @column_break directives, but only 1 is rendered as .column-break (the 2nd is ignored)
    expect(pages2Col[0].querySelectorAll('.column-break').length).toBe(1);
    expect(pages2Col[0].querySelector('.title')?.textContent).toBe('Test Song');
    expect(pages2Col[0].querySelector('.artist')?.textContent).toBe('Test Artist');
    expect(pages2Col[0].querySelector('.section-label')?.textContent).toBe('[Verse 1]');

    // Page 2 has 1 @column_break directive, and 1 is rendered
    expect(pages2Col[1].querySelectorAll('.column-break').length).toBe(1);
    expect(pages2Col[1].querySelector('.section-label')?.textContent).toBe('[Chorus]');

    // Render with 1 column: all @column_break directives are ignored, still 2 pages
    const {container: container1Col} = render(() => <ChordGuidePages template={template} columns={1}/>);
    const pages1Col = container1Col.querySelectorAll('.page');
    expect(pages1Col.length).toBe(2);
    expect(pages1Col[0].querySelectorAll('.column-break').length).toBe(0);
    expect(pages1Col[1].querySelectorAll('.column-break').length).toBe(0);

    // Render with 3 columns: page 1 renders both column breaks (up to 2 allowed)
    const {container: container3Col} = render(() => <ChordGuidePages template={template} columns={3}/>);
    const pages3Col = container3Col.querySelectorAll('.page');
    expect(pages3Col.length).toBe(2);
    expect(pages3Col[0].querySelectorAll('.column-break').length).toBe(2);
    expect(pages3Col[1].querySelectorAll('.column-break').length).toBe(1);
  });

  test('extractSongTitle and extractSongArtist extract metadata correctly', () => {
    const template = `@title: Blessed Be Your Name\n@artist: Matt Redman\n[Verse 1]`;
    expect(extractSongTitle(template)).toBe('Blessed Be Your Name');
    expect(extractSongArtist(template)).toBe('Matt Redman');
  });

  test('extractSongsMetadata extracts all songs in multi-song templates', () => {
    const template = `@title: Song One
@artist: Artist One
[Verse 1]
{C}Lyrics
@page_break
@title: Song Two
@artist: Artist Two
[Verse 1]
{G}Lyrics`;
    const songs = extractSongsMetadata(template);
    expect(songs.length).toBe(2);
    expect(songs[0]).toEqual({ title: 'Song One', artist: 'Artist One' });
    expect(songs[1]).toEqual({ title: 'Song Two', artist: 'Artist Two' });
  });

  test('extractSongAtLine identifies the current song based on cursor line', () => {
    const multiSongTemplate = [
      '@title: Song One',      // Line 1
      '@artist: Artist One',   // Line 2
      '[Verse 1]',             // Line 3
      '{C}Lyrics for song 1',  // Line 4
      '',                      // Line 5
      '@page_break',           // Line 6
      '',                      // Line 7
      '@title: Song Two',      // Line 8
      '@artist: Artist Two',   // Line 9
      '[Verse 1]',             // Line 10
      '{G}Lyrics for song 2',  // Line 11
      '@page_break',           // Line 12
      '@title: Song Three',    // Line 13
      '[Chorus]',              // Line 14
    ].join('\n');

    // Cursor at Song One
    expect(extractSongAtLine(multiSongTemplate, 1)).toEqual({ title: 'Song One', artist: 'Artist One' });
    expect(extractSongAtLine(multiSongTemplate, 4)).toEqual({ title: 'Song One', artist: 'Artist One' });
    expect(extractSongAtLine(multiSongTemplate, 7)).toEqual({ title: 'Song One', artist: 'Artist One' });

    // Cursor at Song Two
    expect(extractSongAtLine(multiSongTemplate, 8)).toEqual({ title: 'Song Two', artist: 'Artist Two' });
    expect(extractSongAtLine(multiSongTemplate, 11)).toEqual({ title: 'Song Two', artist: 'Artist Two' });

    // Cursor at Song Three (no artist specified)
    expect(extractSongAtLine(multiSongTemplate, 13)).toEqual({ title: 'Song Three', artist: undefined });
    expect(extractSongAtLine(multiSongTemplate, 14)).toEqual({ title: 'Song Three', artist: undefined });

    // Edge cases: out of range line numbers or empty template
    expect(extractSongAtLine(multiSongTemplate, 999)).toEqual({ title: 'Song Three', artist: undefined });
    expect(extractSongAtLine('', 1)).toEqual({ title: 'Untitled Song', artist: undefined });
  });
});
