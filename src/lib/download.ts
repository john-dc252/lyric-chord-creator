import { strToU8, zipSync } from 'fflate';

/** Same naming as the backend archive: lowercase, non-alphanumerics → `-`. */
export function templateFileBaseName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized || 'lyric-chord-template';
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Builds a zip of `.lcct.txt` files, de-duplicating names with `-2`, `-3`, …. */
export function buildTemplatesZip(templates: { name: string; content: string }[]): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  for (const t of templates) {
    const base = templateFileBaseName(t.name);
    let file = `${base}.lcct.txt`;
    for (let n = 2; file in files; n++) file = `${base}-${n}.lcct.txt`;
    files[file] = strToU8(t.content);
  }
  return zipSync(files, { level: 6 });
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
