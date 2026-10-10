import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setCloudTemplates, cloudTemplates } from './cloud-store';
import { describeTransfer, transferTemplates } from './library';
import {
  activeTemplateId,
  activeTemplateLibrary,
  getSavedTemplatesList,
  saveTemplate,
  setActiveTemplateId,
  setSavedTemplatesList,
  type SavedTemplate,
} from './templates-store';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const cloudCopy = (t: { name: string; content: string }, id: string): SavedTemplate => ({
  id,
  name: t.name,
  content: t.content,
  title: 'T',
  createdAt: 1,
  updatedAt: 2,
});

describe('transferTemplates', () => {
  beforeEach(() => {
    localStorage.clear();
    setSavedTemplatesList([]);
    setCloudTemplates([]);
    setActiveTemplateId(null);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('uploads local templates, keeping originals on copy', async () => {
    const a = saveTemplate('A', 'a').template!;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const { templates } = JSON.parse(init!.body as string);
      return json(templates.map((t: SavedTemplate, i: number) => ({ template: cloudCopy(t, `c${i}`) })));
    });
    vi.stubGlobal('fetch', fetchMock);

    const summary = await transferTemplates([a], 'local', false);
    expect(summary).toEqual({ done: 1, failed: [] });
    expect(fetchMock).toHaveBeenCalledWith('/templates/batch', expect.objectContaining({ method: 'POST' }));
    expect(getSavedTemplatesList().map((t) => t.name)).toEqual(['A']);
    expect(cloudTemplates().map((t) => t.id)).toEqual(['c0']);
  });

  it('moves only templates that uploaded, and the editor follows the moved template', async () => {
    const a = saveTemplate('A', 'a').template!;
    const b = saveTemplate('B', 'b').template!;
    setActiveTemplateId(a.id, 'local');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json([{ template: cloudCopy(a, 'cloud-a') }, { status: 409, error: 'B already exists' }]),
      ),
    );

    const summary = await transferTemplates([a, b], 'local', true);
    expect(summary.done).toBe(1);
    expect(summary.failed).toEqual([{ name: 'B', error: 'B already exists' }]);
    expect(getSavedTemplatesList().map((t) => t.name)).toEqual(['B']);
    expect([activeTemplateId(), activeTemplateLibrary()]).toEqual(['cloud-a', 'cloud']);
    expect(describeTransfer(summary, 'local', true)).toBe(
      'Moved 1 to Cloud Library. "B": B already exists',
    );
  });

  it('saves cloud templates locally and deletes them on move', async () => {
    const remote = cloudCopy({ name: 'Remote', content: 'r' }, 'r1');
    setCloudTemplates([remote]);
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const summary = await transferTemplates([remote], 'cloud', true);
    expect(summary).toEqual({ done: 1, failed: [] });
    expect(fetchMock).toHaveBeenCalledWith('/templates/r1', expect.objectContaining({ method: 'DELETE' }));
    expect(cloudTemplates()).toEqual([]);
    const local = getSavedTemplatesList();
    expect(local.map((t) => [t.name, t.createdAt])).toEqual([['Remote', 1]]);
    expect(activeTemplateId()).toBeNull();
  });
});
