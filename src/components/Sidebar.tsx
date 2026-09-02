import { Show, For } from 'solid-js';
import { useLocation } from '@solidjs/router';
import { savedTemplates } from '../lib/templates-store';
import { theme, toggleTheme } from '../lib/theme';
import {
  isSidebarCollapsed,
  isMobileSidebarOpen,
  closeMobileSidebar,
} from '../lib/sidebar-state';

export default function Sidebar() {
  const location = useLocation();

  const isCurrentRoute = (path: string) => {
    const current = location.pathname;
    if (path === '/') {
      return (
        current === '/' ||
        current === '' ||
        current === '/apps/lyric-chord-creator/' ||
        current === '/apps/lyric-chord-creator'
      );
    }
    return current.includes(path);
  };

  const navItems = [
    {
      label: 'Editor',
      path: '/',
      icon: (
        <svg
          class="w-5 h-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
    },
    {
      label: 'Local Library',
      path: '/gallery',
      icon: (
        <svg
          class="w-5 h-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <path d="M9 7h6" />
          <path d="M9 11h6" />
        </svg>
      ),
      badge: () => savedTemplates().length,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <Show when={isMobileSidebarOpen()}>
        <div
          class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      </Show>

      {/* Sidebar Container */}
      <aside
        class={[
          'fixed lg:static top-12 bottom-0 left-0 z-40 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-[width,transform] duration-200 ease-in-out select-none shadow-lg lg:shadow-none overflow-hidden',
          // Mobile open vs closed
          isMobileSidebarOpen() ? 'translate-x-0 w-60' : '-translate-x-full lg:translate-x-0',
          // Desktop collapsed vs expanded (w-16 vs w-60)
          isSidebarCollapsed() && !isMobileSidebarOpen() ? 'lg:w-16' : 'lg:w-60',
        ]}
      >
        {/* Main Navigation List - items always anchored to left */}
        <nav class="flex-1 px-2.5 py-3 space-y-1.5 overflow-y-auto overflow-x-hidden">
          <For each={navItems}>
            {(item) => {
              const active = () => isCurrentRoute(item.path);
              return (
                <a
                  href={item.path}
                  onClick={closeMobileSidebar}
                  class={[
                    'group relative flex items-center justify-start w-full px-2.5 py-2.5 rounded-lg text-xs font-semibold transition-colors duration-150 no-underline overflow-hidden',
                    active()
                      ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200',
                  ]}
                  title={isSidebarCollapsed() && !isMobileSidebarOpen() ? item.label : undefined}
                >
                  {/* Left active indicator pill */}
                  <Show when={active()}>
                    <span class="absolute left-0 top-1.5 bottom-1.5 w-1 bg-sky-600 dark:bg-sky-500 rounded-r-full" />
                  </Show>

                  {/* Left-anchored Icon */}
                  <div
                    class={[
                      'w-5 h-5 shrink-0 flex items-center justify-center transition-colors',
                      active()
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200',
                    ]}
                  >
                    {item.icon}
                  </div>

                  {/* Text & Badge (Smooth fade/hide without shifting icon) */}
                  <div
                    class={[
                      'ml-3 flex-1 flex items-center justify-between whitespace-nowrap overflow-hidden transition-opacity duration-150',
                      isSidebarCollapsed() && !isMobileSidebarOpen()
                        ? 'opacity-0 w-0 pointer-events-none'
                        : 'opacity-100',
                    ]}
                  >
                    <span class="truncate">{item.label}</span>
                    <Show when={item.badge && item.badge() !== undefined}>
                      <span class="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.badge!()}
                      </span>
                    </Show>
                  </div>
                </a>
              );
            }}
          </For>
        </nav>

        {/* Bottom Section: About and Theme Toggle */}
        <div class="p-2.5 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-1 overflow-hidden">
          {/* About Link */}
          <a
            href="/about"
            onClick={closeMobileSidebar}
            class={[
              'group relative flex items-center justify-start w-full px-2.5 py-2.5 rounded-lg text-xs font-semibold transition-colors duration-150 no-underline overflow-hidden',
              isCurrentRoute('/about')
                ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200',
            ]}
            title={isSidebarCollapsed() && !isMobileSidebarOpen() ? 'About' : undefined}
          >
            <Show when={isCurrentRoute('/about')}>
              <span class="absolute left-0 top-1.5 bottom-1.5 w-1 bg-sky-600 dark:bg-sky-500 rounded-r-full" />
            </Show>

            {/* Left-anchored Icon */}
            <div class="w-5 h-5 shrink-0 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200">
              <svg
                class="w-5 h-5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>

            <div
              class={[
                'ml-3 flex-1 flex items-center whitespace-nowrap overflow-hidden transition-opacity duration-150',
                isSidebarCollapsed() && !isMobileSidebarOpen()
                  ? 'opacity-0 w-0 pointer-events-none'
                  : 'opacity-100',
              ]}
            >
              <span class="truncate">About</span>
            </div>
          </a>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            class="w-full flex items-center justify-start px-2.5 py-2.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200 transition-colors overflow-hidden"
            title={`Switch to ${theme() === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            <div class="w-5 h-5 shrink-0 flex items-center justify-center text-base leading-none">
              {theme() === 'dark' ? '☀️' : '🌙'}
            </div>
            <div
              class={[
                'ml-3 flex-1 flex items-center whitespace-nowrap overflow-hidden transition-opacity duration-150 text-left',
                isSidebarCollapsed() && !isMobileSidebarOpen()
                  ? 'opacity-0 w-0 pointer-events-none'
                  : 'opacity-100',
              ]}
            >
              <span class="truncate">
                {theme() === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}
