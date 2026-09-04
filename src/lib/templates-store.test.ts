import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveTemplate,
  deleteTemplate,
  duplicateTemplate,
  searchTemplates,
  setSavedTemplatesList,
  getSavedTemplatesList,
  extractLyricsText,
  type SavedTemplate,
} from './templates-store';

describe('templates-store', () => {
  beforeEach(() => {
    localStorage.clear();
    setSavedTemplatesList([]);
  });

  it('saves a template with unique name validation', () => {
    const res1 = saveTemplate('Song 1', '@title: Song 1\n@artist: Artist 1\n{C}Hello world');
    expect(res1.success).toBe(true);
    expect(res1.template?.name).toBe('Song 1');
    expect(res1.template?.title).toBe('Song 1');
    expect(res1.template?.artist).toBe('Artist 1');

    // Attempting to save another template with the same name (case-insensitive) should fail
    const res2 = saveTemplate('song 1', 'Different content');
    expect(res2.success).toBe(false);
    expect(res2.error).toContain('already exists');
  });

  it('updates an existing template without failing uniqueness on itself', () => {
    const res1 = saveTemplate('My Template', 'Original content');
    expect(res1.success).toBe(true);
    const id = res1.template!.id;

    const res2 = saveTemplate('My Template', 'Updated content', id);
    expect(res2.success).toBe(true);
    expect(res2.template?.content).toBe('Updated content');
  });

  it('deletes and duplicates templates', () => {
    const res = saveTemplate('Original', 'Sample lyrics');
    const id = res.template!.id;

    const dup = duplicateTemplate(id);
    expect(dup).not.toBeNull();
    expect(dup?.name).toBe('Original (Copy)');

    const deleted = deleteTemplate(id);
    expect(deleted).toBe(true);
    expect(getSavedTemplatesList().some((t) => t.id === id)).toBe(false);
    expect(getSavedTemplatesList().some((t) => t.id === dup?.id)).toBe(true);
  });

  it('searches templates by name, title, artist, and lyrics', () => {
    const tpls: SavedTemplate[] = [
      {
        id: '1',
        name: 'Acoustic Grace',
        title: 'Amazing Grace',
        artist: 'John Newton',
        content: '@title: Amazing Grace\n@artist: John Newton\n{G}How sweet the sound',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: '2',
        name: 'Hotel California Live',
        title: 'Hotel California',
        artist: 'Eagles',
        content: '@title: Hotel California\n@artist: Eagles\n{Bm}On a dark desert highway',
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    // Search by name
    expect(searchTemplates(tpls, 'Acoustic', 'name')).toHaveLength(1);
    expect(searchTemplates(tpls, 'Acoustic', 'name')[0].id).toBe('1');

    // Search by song title
    expect(searchTemplates(tpls, 'Hotel', 'title')).toHaveLength(1);
    expect(searchTemplates(tpls, 'Hotel', 'title')[0].id).toBe('2');

    // Search by artist
    expect(searchTemplates(tpls, 'Newton', 'artist')).toHaveLength(1);
    expect(searchTemplates(tpls, 'Newton', 'artist')[0].id).toBe('1');

    // Search by lyrics
    expect(searchTemplates(tpls, 'desert', 'lyrics')).toHaveLength(1);
    expect(searchTemplates(tpls, 'desert', 'lyrics')[0].id).toBe('2');

    // Search all fields
    expect(searchTemplates(tpls, 'Eagles', 'all')).toHaveLength(1);
  });

  it('extracts pure lyrics text correctly', () => {
    const raw = `@title: Song
@artist: Singer
@empty_line
[Verse 1]
{G}Hello {C}brave new {D}world!`;
    const lyrics = extractLyricsText(raw);
    expect(lyrics).toBe('Hello brave new world!');
  });
});
