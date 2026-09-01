import { DEFAULT_TEMPLATE, extractSongArtist, extractSongTitle } from './template-processor';

export interface SavedTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  artist?: string;
}

const DB_NAME = 'LyricChordCreatorDB';
const DB_VERSION = 1;
const STORE_NAME = 'templates';
const LEGACY_STORAGE_KEY = 'scgt_saved_templates';

export const SEED_DEFAULT_TEMPLATE: SavedTemplate = {
  id: 'default-sample',
  name: 'Sample Song Guide',
  content: DEFAULT_TEMPLATE,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  title: extractSongTitle(DEFAULT_TEMPLATE),
  artist: extractSongArtist(DEFAULT_TEMPLATE),
};

let dbPromise: Promise<IDBDatabase> | null = null;

function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
}

export function openDatabase(): Promise<IDBDatabase> {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available in this environment.'));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by_name', 'name', { unique: true });
        store.createIndex('by_updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn('Database open blocked');
    };
  });

  return dbPromise;
}

/**
 * Retrieves all saved templates from IndexedDB.
 * Seeds with default template or migrates localStorage if empty.
 */
export async function dbGetAllTemplates(): Promise<SavedTemplate[]> {
  if (!isIndexedDBAvailable()) {
    return [SEED_DEFAULT_TEMPLATE];
  }

  try {
    const db = await openDatabase();
    const list = await new Promise<SavedTemplate[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (list.length === 0) {
      // Check legacy localStorage migration first
      let migrated: SavedTemplate[] = [];
      try {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed) && parsed.length > 0) {
            migrated = parsed;
          }
        }
      } catch (e) {
        console.error('Failed to read legacy templates:', e);
      }

      if (migrated.length > 0) {
        for (const tpl of migrated) {
          await dbPutTemplate(tpl);
        }
        try {
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {}
        return migrated;
      }

      // Seed with strictly the default template
      await dbPutTemplate(SEED_DEFAULT_TEMPLATE);
      return [SEED_DEFAULT_TEMPLATE];
    }

    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (e) {
    console.error('Failed to get templates from IndexedDB:', e);
    return [SEED_DEFAULT_TEMPLATE];
  }
}

/**
 * Saves or updates a template in IndexedDB.
 */
export async function dbPutTemplate(template: SavedTemplate): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(template);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Deletes a template by ID from IndexedDB.
 */
export async function dbDeleteTemplate(id: string): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Clears all templates in IndexedDB and re-seeds default.
 */
export async function dbResetToSeed(): Promise<SavedTemplate[]> {
  if (!isIndexedDBAvailable()) return [SEED_DEFAULT_TEMPLATE];

  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  await dbPutTemplate(SEED_DEFAULT_TEMPLATE);
  return [SEED_DEFAULT_TEMPLATE];
}
