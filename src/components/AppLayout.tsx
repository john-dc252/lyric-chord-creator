import { type ParentProps } from 'solid-js';
import Sidebar from './Sidebar';
import { toggleSidebar, isSidebarCollapsed } from '../lib/sidebar-state';

export default function AppLayout(props: ParentProps) {
  return (
    <div class="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors">
      {/* Global Top Application Header Bar with Hamburger and Logo */}
      <header class="h-12 flex items-center justify-between px-3 sm:px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-50 select-none shadow-xs">
        <div class="flex items-center gap-3">
          {/* Hamburger Sidebar Toggle Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            class="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label="Toggle navigation sidebar"
            title={isSidebarCollapsed() ? 'Expand navigation' : 'Collapse navigation'}
          >
            <svg
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Logo & Application Brand */}
          <a
            href="/"
            class="flex items-center gap-2.5 no-underline group"
            title="Lyric-Chord Creator"
          >
            <div class="w-7 h-7 rounded-lg bg-sky-600 dark:bg-sky-500 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <svg
                class="w-4 h-4 text-white"
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
            <span class="font-bold text-sm text-slate-900 dark:text-white tracking-tight leading-none">
              Lyric-Chord Creator
            </span>
          </a>
        </div>
      </header>

      {/* Main Workspace Body: Sidebar on Left, Content on Right */}
      <div class="flex-1 flex min-h-0 overflow-hidden relative">
        <Sidebar />
        <main class="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
          {props.children}
        </main>
      </div>
    </div>
  );
}
