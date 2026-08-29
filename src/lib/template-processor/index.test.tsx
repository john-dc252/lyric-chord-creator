import {render} from '@solidjs/testing-library';
import {describe, expect, test} from 'vitest';
import {ChordGuidePages, EMBEDDED_CHORDS, extractSongArtist, extractSongTitle, transformLineToJsx,} from './index';

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

  test('<ChordGuidePages /> renders multi-page template structure', () => {
    const template = `@title: Test Song
@artist: Test Artist
[Verse 1]
{C}Line 1
@page_break
[Chorus]
{G}Line 2`;

    const {container} = render(() => <ChordGuidePages template={template}/>);
    const pages = container.querySelectorAll('.page');
    expect(pages.length).toBe(2);

    expect(pages[0].querySelector('.title')?.textContent).toBe('Test Song');
    expect(pages[0].querySelector('.artist')?.textContent).toBe('Test Artist');
    expect(pages[0].querySelector('.section-label')?.textContent).toBe('[Verse 1]');
    expect(pages[0].querySelector('.chord')?.textContent).toBe('C');

    expect(pages[1].querySelector('.section-label')?.textContent).toBe('[Chorus]');
    expect(pages[1].querySelector('.chord')?.textContent).toBe('G');
  });

  test('extractSongTitle and extractSongArtist extract metadata correctly', () => {
    const template = `@title: Blessed Be Your Name\n@artist: Matt Redman\n[Verse 1]`;
    expect(extractSongTitle(template)).toBe('Blessed Be Your Name');
    expect(extractSongArtist(template)).toBe('Matt Redman');
  });
});
