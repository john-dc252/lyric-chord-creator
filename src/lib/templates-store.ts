import { createSignal } from 'solid-js';
import { extractSongArtist, extractSongTitle, extractSongsMetadata } from './template-processor';
import {
  dbGetAllTemplates,
  dbPutTemplate,
  dbDeleteTemplate,
  dbResetToSeed,
  type SavedTemplate,
  SEED_DEFAULT_TEMPLATE,
} from './db';

export type { SavedTemplate };

export type SearchField = 'all' | 'name' | 'title' | 'artist' | 'lyrics';

const STORAGE_KEY_ACTIVE_ID = 'scgt_active_template_id';
const STORAGE_KEY_TEMPLATE_CONTENT = 'scgt_current_template';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

let currentTemplatesList: SavedTemplate[] = [SEED_DEFAULT_TEMPLATE];

// Global reactive signals
export const [savedTemplates, setSavedTemplates] = createSignal<SavedTemplate[]>(
  currentTemplatesList,
  { name: 'saved_templates_signal' },
);

export const [activeTemplateId, setActiveTemplateIdSignal] = createSignal<string | null>(
  null,
  { name: 'active_template_id_signal' },
);

// Asynchronously load and initialize from IndexedDB on startup
if (typeof window !== 'undefined') {
  try {
    const savedActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    if (savedActiveId) {
      setActiveTemplateIdSignal(savedActiveId);
    }
  } catch {}

  dbGetAllTemplates()
    .then((templates) => {
      if (templates && templates.length > 0) {
        currentTemplatesList = templates;
        setSavedTemplates([...templates]);
      }
    })
    .catch((err) => {
      console.error('Error loading templates from IndexedDB:', err);
    });
}

function updateState(templates: SavedTemplate[]): void {
  currentTemplatesList = templates;
  setSavedTemplates([...templates]);
}

export function setSavedTemplatesList(templates: SavedTemplate[]): void {
  updateState(templates);
  if (typeof window !== 'undefined') {
    for (const tpl of templates) {
      dbPutTemplate(tpl).catch((e) => console.error('Failed to save to IndexedDB:', e));
    }
  }
}

export function getSavedTemplatesList(): SavedTemplate[] {
  return currentTemplatesList;
}

export function setActiveTemplateId(id: string | null): void {
  setActiveTemplateIdSignal(id);
  if (typeof window !== 'undefined') {
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
      }
    } catch (e) {
      console.error('Failed to update active template ID:', e);
    }
  }
}

/**
 * Checks if a template name is unique (case-insensitive).
 */
export function isTemplateNameUnique(name: string, excludeId?: string): boolean {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return false;
  return !currentTemplatesList.some(
    (t) => t.name.trim().toLowerCase() === normalized && t.id !== excludeId,
  );
}

export interface SaveTemplateResult {
  success: boolean;
  template?: SavedTemplate;
  error?: string;
}

/**
 * Saves a new template or updates an existing one in IndexedDB with unique name validation.
 */
export function saveTemplate(
  name: string,
  content: string,
  existingId?: string,
): SaveTemplateResult {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: 'Template name cannot be empty.' };
  }

  if (!isTemplateNameUnique(trimmedName, existingId)) {
    return {
      success: false,
      error: `A template named "${trimmedName}" already exists. Please choose a unique name.`,
    };
  }

  const now = Date.now();
  const title = extractSongTitle(content);
  const artist = extractSongArtist(content);

  const currentList = currentTemplatesList;
  let updatedList: SavedTemplate[];
  let savedItem: SavedTemplate;

  if (existingId) {
    const existingIndex = currentList.findIndex((t) => t.id === existingId);
    if (existingIndex >= 0) {
      savedItem = {
        ...currentList[existingIndex],
        name: trimmedName,
        content,
        title,
        artist,
        updatedAt: now,
      };
      updatedList = [
        ...currentList.slice(0, existingIndex),
        savedItem,
        ...currentList.slice(existingIndex + 1),
      ];
    } else {
      savedItem = {
        id: existingId,
        name: trimmedName,
        content,
        title,
        artist,
        createdAt: now,
        updatedAt: now,
      };
      updatedList = [savedItem, ...currentList];
    }
  } else {
    savedItem = {
      id: generateId(),
      name: trimmedName,
      content,
      title,
      artist,
      createdAt: now,
      updatedAt: now,
    };
    updatedList = [savedItem, ...currentList];
  }

  updateState(updatedList);
  setActiveTemplateId(savedItem.id);

  // Persist to IndexedDB
  dbPutTemplate(savedItem).catch((e) => console.error('Failed to put template to IndexedDB:', e));

  return { success: true, template: savedItem };
}

/**
 * Deletes a template by ID from IndexedDB.
 */
export function deleteTemplate(id: string): boolean {
  const currentList = currentTemplatesList;
  const filtered = currentList.filter((t) => t.id !== id);
  if (filtered.length !== currentList.length) {
    updateState(filtered);
    if (activeTemplateId() === id) {
      setActiveTemplateId(null);
    }
    dbDeleteTemplate(id).catch((e) => console.error('Failed to delete template from IndexedDB:', e));
    return true;
  }
  return false;
}

/**
 * Duplicates a template with an automatically generated unique copy name.
 */
export function duplicateTemplate(id: string): SavedTemplate | null {
  const template = currentTemplatesList.find((t) => t.id === id);
  if (!template) return null;

  let copyName = `${template.name} (Copy)`;
  let counter = 2;
  while (!isTemplateNameUnique(copyName)) {
    copyName = `${template.name} (Copy ${counter})`;
    counter++;
  }

  const result = saveTemplate(copyName, template.content);
  return result.success && result.template ? result.template : null;
}

/**
 * Renames a template ensuring the new name is unique.
 */
export function renameTemplate(id: string, newName: string): SaveTemplateResult {
  const template = currentTemplatesList.find((t) => t.id === id);
  if (!template) {
    return { success: false, error: 'Template not found.' };
  }
  return saveTemplate(newName, template.content, id);
}

/**
 * Extracts pure lyric words from a template by removing chord bracketings and directives.
 */
export function extractLyricsText(content: string): string {
  return content
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith('@') && !trimmed.startsWith('[');
    })
    .join(' ')
    .replace(/\{[^}]*\}/g, '') // remove chords
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Performs search across saved templates based on specified field.
 */
export function searchTemplates(
  templates: SavedTemplate[],
  query: string,
  field: SearchField = 'all',
): SavedTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) return templates;

  return templates.filter((template) => {
    const songs = extractSongsMetadata(template.content);
    const titles = songs.map((s) => s.title.toLowerCase());
    const artists = songs.map((s) => (s.artist || '').toLowerCase());

    const nameMatch = template.name.toLowerCase().includes(q);
    const titleMatch =
      template.title.toLowerCase().includes(q) || titles.some((t) => t.includes(q));
    const artistMatch =
      (template.artist || '').toLowerCase().includes(q) ||
      artists.some((a) => a.includes(q));
    const lyricsMatch =
      extractLyricsText(template.content).toLowerCase().includes(q) ||
      template.content.toLowerCase().includes(q);

    switch (field) {
      case 'name':
        return nameMatch;
      case 'title':
        return titleMatch;
      case 'artist':
        return artistMatch;
      case 'lyrics':
        return lyricsMatch;
      case 'all':
      default:
        return nameMatch || titleMatch || artistMatch || lyricsMatch;
    }
  });
}

/**
 * Exports template as a downloadable .lcct.txt file.
 */
export function exportTemplateAsFile(name: string, content: string): void {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const filename = `${sanitized || 'lyric-chord-template'}.lcct.txt`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Loads a saved template into the active editor state.
 */
export function loadTemplateIntoEditor(template: SavedTemplate): void {
  setActiveTemplateId(template.id);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_TEMPLATE_CONTENT, template.content);
    } catch (e) {
      console.error('Failed to set current template:', e);
    }
  }
}

/**
 * Clears the active template selection and resets the editor content to empty.
 */
export function createNewTemplate(): void {
  setActiveTemplateId(null);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_TEMPLATE_CONTENT, '');
    } catch (e) {
      console.error('Failed to reset current template:', e);
    }
  }
}

/**
 * Restores the initial default sample template in IndexedDB.
 */
export function resetToSeedTemplates(): void {
  updateState([SEED_DEFAULT_TEMPLATE]);
  if (typeof window !== 'undefined') {
    dbResetToSeed().catch((e) => console.error('Failed to reset IndexedDB seed:', e));
  }
}
