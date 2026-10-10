import {createSignal} from 'solid-js';
import {ApiError, apiJson, cloudEnabled} from './api';
import {isSignedIn, onSessionChange} from './auth';
import {
  activeTemplateLibrary,
  type SavedTemplate,
  type SaveTemplateResult,
  type SearchField,
  setActiveTemplateId,
} from './templates-store';

/** Cloud Library: the signed-in user's templates on the backend, cached in memory. */

export const [cloudTemplates, setCloudTemplates] = createSignal<SavedTemplate[]>([], {
  name: 'cloud_templates',
});
export const [cloudStatus, setCloudStatus] = createSignal<'idle' | 'loading' | 'ready' | 'error'>(
  'idle',
  {name: 'cloud_status'},
);

const errorMessage = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.');

const byUpdatedDesc = (a: SavedTemplate, b: SavedTemplate) => b.updatedAt - a.updatedAt;

export async function loadCloudTemplates(): Promise<void> {
  if (!isSignedIn()) {
    console.log('Not signed-in');
    return;
  }
  setCloudStatus('loading');
  try {
    const savedTemplates = await apiJson<SavedTemplate[]>('/templates');
    console.log('Loaded templates:', savedTemplates);
    setCloudTemplates(savedTemplates);
    setCloudStatus('ready');
  } catch {
    setCloudStatus('error');
  }
}

/** Server-side search (full-text for `all`, substring for specific fields). */
export async function searchCloudTemplates(
  query: string,
  field: SearchField,
): Promise<SavedTemplate[]> {
  const params = new URLSearchParams({q: query, field});
  return apiJson<SavedTemplate[]>(`/templates?${params}`);
}

export function isCloudNameUnique(name: string, excludeId?: string): boolean {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return false;
  return !cloudTemplates().some(
    (t) => t.name.trim().toLowerCase() === normalized && t.id !== excludeId,
  );
}

function upsertLocal(saved: SavedTemplate): void {
  setCloudTemplates((list) => [saved, ...list.filter((t) => t.id !== saved.id)].sort(byUpdatedDesc));
}

export async function createCloudTemplate(
  name: string,
  content: string,
  times?: { createdAt: number; updatedAt: number },
): Promise<SaveTemplateResult> {
  try {
    const saved = await apiJson<SavedTemplate>('/templates', {
      method: 'POST',
      body: JSON.stringify({name, content, ...times}),
    });
    upsertLocal(saved);
    return {success: true, template: saved};
  } catch (e) {
    return {success: false, error: errorMessage(e)};
  }
}

export async function updateCloudTemplate(
  id: string,
  name: string,
  content: string,
): Promise<SaveTemplateResult> {
  try {
    const saved = await apiJson<SavedTemplate>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify({name, content}),
    });
    upsertLocal(saved);
    return {success: true, template: saved};
  } catch (e) {
    return {success: false, error: errorMessage(e)};
  }
}

export async function deleteCloudTemplate(id: string): Promise<SaveTemplateResult> {
  try {
    await apiJson<void>(`/templates/${id}`, {method: 'DELETE'});
    setCloudTemplates((list) => list.filter((t) => t.id !== id));
    return {success: true};
  } catch (e) {
    return {success: false, error: errorMessage(e)};
  }
}

export interface BatchItemResult {
  source: { name: string; content: string };
  template?: SavedTemplate;
  error?: string;
}

const BATCH_SIZE = 100;

/** Creates templates in chunks of 100; each item succeeds or fails independently. */
export async function uploadToCloud(
  items: { name: string; content: string; createdAt: number; updatedAt: number }[],
): Promise<BatchItemResult[]> {
  const results: BatchItemResult[] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    try {
      const res = await apiJson<({ template: SavedTemplate } | { status: number; error: string })[]>(
        '/templates/batch',
        {method: 'POST', body: JSON.stringify({templates: chunk})},
      );
      res.forEach((r, j) =>
        results.push(
          'template' in r
            ? {source: chunk[j], template: r.template}
            : {source: chunk[j], error: r.error},
        ),
      );
    } catch (e) {
      chunk.forEach((source) => results.push({source, error: errorMessage(e)}));
    }
  }
  const created = results.flatMap((r) => (r.template ? [r.template] : []));
  if (created.length) setCloudTemplates((list) => [...created, ...list].sort(byUpdatedDesc));
  return results;
}

export async function duplicateCloudTemplate(id: string): Promise<SaveTemplateResult> {
  const template = cloudTemplates().find((t) => t.id === id);
  if (!template) return {success: false, error: 'Template not found.'};
  let copyName = `${template.name} (Copy)`;
  for (let n = 2; !isCloudNameUnique(copyName); n++) copyName = `${template.name} (Copy ${n})`;
  return createCloudTemplate(copyName, template.content);
}

onSessionChange((user) => {
  setCloudTemplates([]);
  setCloudStatus('idle');
  console.log('User changed to', user);
  // A cloud template stays in the editor as an unsaved draft after sign-out.
  if (activeTemplateLibrary() === 'cloud') setActiveTemplateId(null);
  if (user) void loadCloudTemplates();
});

if (typeof window !== 'undefined' && cloudEnabled && isSignedIn()) {
  void loadCloudTemplates();
}
