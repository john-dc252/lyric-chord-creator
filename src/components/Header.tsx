import { extractSongTitle } from '../lib/template-processor';
import { theme, toggleTheme } from '../lib/theme';
import type { PaperSizeConfig } from '../lib/paperSize';

interface HeaderProps {
  template: string;
  paperConfig: PaperSizeConfig;
  onImportTemplate: (content: string, filename: string) => void;
  onResetToDefault?: () => void;
}

export default function Header(props: HeaderProps) {
  let fileInputRef: HTMLInputElement | undefined = undefined;

  const getCleanFileName = (ext: string) => {
    const rawTitle = extractSongTitle(props.template);
    const sanitized = rawTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${sanitized || 'song-chord-guide'}.${ext}`;
  };

  const handleExportTemplate = () => {
    const filename = getCleanFileName('lcct.txt');
    const blob = new Blob([props.template], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          props.onImportTemplate(text, file.name);
        }
      };
      reader.readAsText(file);
      target.value = ''; // Reset input
    }
  };

  return (
    <header class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm transition-colors">
      <div class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div class="flex items-center justify-between h-14">
          {/* Logo & Brand */}
          <div class="flex items-center gap-4">
            <a href="/" class="flex items-center gap-2.5 group no-underline">
              <div class="w-8 h-8 rounded-lg bg-sky-600 dark:bg-sky-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform shrink-0">
                <svg
                  class="w-5 h-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M9 18V5l11-2v13" />
                  <path d="M9 9l11-2" />
                  <circle cx="6" cy="18" r="3" fill="currentColor" />
                  <circle cx="17" cy="16" r="3" fill="currentColor" />
                </svg>
              </div>
              <div class="flex flex-col">
                <span class="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                  Lyric-Chord Creator
                </span>
                <span class="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Template Editor & Previewer
                </span>
              </div>
            </a>

            {/* Navigation links */}
            <nav class="hidden md:flex items-center gap-1 ml-4 border-l border-slate-200 dark:border-slate-700 pl-4">
              <a
                href="/"
                class="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Editor
              </a>
              <a
                href="/about"
                class="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                <span>ℹ️</span>
                <span>About</span>
              </a>
            </nav>
          </div>

          {/* Right Action Controls */}
          <div class="flex items-center gap-2">
            {/* About link on mobile */}
            <a
              href="/about"
              class="md:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
              title="About & Syntax Guide"
            >
              ℹ️
            </a>

            {/* Hidden file input for import */}
            <input
              ref={(el) => (fileInputRef = el)}
              type="file"
              accept=".txt,.scgt,.lcct.txt"
              onChange={handleFileChange}
              class="hidden"
            />

            {/* Import Button */}
            <button
              type="button"
              onClick={() => fileInputRef?.click()}
              class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              title="Import *.lcct.txt template file"
            >
              <span>📂</span>
              <span class="hidden sm:inline">Import</span>
            </button>

            {/* Export Template button */}
            <button
              type="button"
              onClick={handleExportTemplate}
              class="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
              title="Export Template File (*.lcct.txt)"
            >
              <span>💾</span>
              <span>Export</span>
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              class="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
              title={`Switch to ${theme() === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme() === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
