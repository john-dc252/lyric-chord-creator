import {
  createCloudTemplate,
  cloudTemplates,
  deleteCloudTemplate,
  isCloudNameUnique,
  updateCloudTemplate,
  uploadToCloud,
} from './cloud-store';
import {
  activeTemplateId,
  activeTemplateLibrary,
  deleteTemplate,
  isTemplateNameUnique,
  saveTemplate,
  savedTemplates,
  setActiveTemplateId,
  type LibraryKind,
  type SaveTemplateResult,
  type SavedTemplate,
} from './templates-store';

export const LIBRARY_LABEL: Record<LibraryKind, string> = {
  local: 'Local Library',
  cloud: 'Cloud Library',
};

export function libraryTemplates(library: LibraryKind): SavedTemplate[] {
  return library === 'cloud' ? cloudTemplates() : savedTemplates();
}

export function isNameUniqueIn(library: LibraryKind, name: string, excludeId?: string): boolean {
  return library === 'cloud'
    ? isCloudNameUnique(name, excludeId)
    : isTemplateNameUnique(name, excludeId);
}

/** The template open in the editor, from whichever library it belongs to. */
export function findActiveTemplate(): SavedTemplate | null {
  const id = activeTemplateId();
  if (!id) return null;
  return libraryTemplates(activeTemplateLibrary()).find((t) => t.id === id) ?? null;
}

/** Creates or updates a template in `library` and makes it the active one. */
export async function saveToLibrary(
  library: LibraryKind,
  name: string,
  content: string,
  existingId?: string,
): Promise<SaveTemplateResult> {
  if (library === 'local') return saveTemplate(name, content, existingId);
  const result = existingId
    ? await updateCloudTemplate(existingId, name, content)
    : await createCloudTemplate(name, content);
  if (result.template) setActiveTemplateId(result.template.id, 'cloud');
  return result;
}

export interface TransferSummary {
  done: number;
  failed: { name: string; error: string }[];
}

/**
 * Copies templates to the other library; with `move`, removes each original that
 * copied successfully. The active editor template follows a moved original.
 */
export async function transferTemplates(
  templates: SavedTemplate[],
  from: LibraryKind,
  move: boolean,
): Promise<TransferSummary> {
  const failed: TransferSummary['failed'] = [];
  const copies: [SavedTemplate, SavedTemplate][] = [];

  if (from === 'local') {
    const results = await uploadToCloud(templates);
    results.forEach((r, i) => {
      if (r.template) copies.push([templates[i], r.template]);
      else failed.push({ name: templates[i].name, error: r.error ?? 'Upload failed.' });
    });
  } else {
    for (const t of templates) {
      const r = saveTemplate(t.name, t.content, undefined, {
        activate: false,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      });
      if (r.template) copies.push([t, r.template]);
      else failed.push({ name: t.name, error: r.error ?? 'Save failed.' });
    }
  }

  const to: LibraryKind = from === 'local' ? 'cloud' : 'local';
  for (const [original, copy] of copies) {
    if (!move) continue;
    const wasActive = activeTemplateId() === original.id && activeTemplateLibrary() === from;
    if (from === 'local') deleteTemplate(original.id);
    else {
      const r = await deleteCloudTemplate(original.id);
      if (!r.success) failed.push({ name: original.name, error: `Copied, but not removed: ${r.error}` });
    }
    if (wasActive) setActiveTemplateId(copy.id, to);
  }
  return { done: copies.length, failed };
}

/** Human-readable summary for toasts. */
export function describeTransfer(summary: TransferSummary, from: LibraryKind, move: boolean): string {
  const verb = move ? 'Moved' : 'Copied';
  const target = LIBRARY_LABEL[from === 'local' ? 'cloud' : 'local'];
  const base = `${verb} ${summary.done} to ${target}.`;
  if (!summary.failed.length) return base;
  const first = summary.failed[0];
  const more = summary.failed.length > 1 ? ` (+${summary.failed.length - 1} more)` : '';
  return `${base} "${first.name}": ${first.error}${more}`;
}
