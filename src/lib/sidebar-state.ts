import { createSignal } from 'solid-js';

const SIDEBAR_COLLAPSED_KEY = 'scgt_sidebar_collapsed';

function getInitialCollapsedState(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (saved !== null) {
        return saved === 'true';
      }
      // Expanded by default on desktop (>=1024px)
      return window.innerWidth < 1024;
    } catch (e) {
      console.error('Failed to read sidebar state:', e);
    }
  }
  return false;
}

// Desktop collapsed state
export const [isSidebarCollapsed, setIsSidebarCollapsedSignal] = createSignal<boolean>(
  getInitialCollapsedState(),
  { name: 'sidebar_collapsed_signal' },
);

// Mobile drawer open state
export const [isMobileSidebarOpen, setIsMobileSidebarOpen] = createSignal<boolean>(false, {
  name: 'mobile_sidebar_open_signal',
});

export function toggleSidebar(): void {
  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
    setIsMobileSidebarOpen(!isMobileSidebarOpen());
  } else {
    const next = !isSidebarCollapsed();
    setIsSidebarCollapsedSignal(next);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch (e) {
        console.error('Failed to save sidebar state:', e);
      }
    }
  }
}

export function closeMobileSidebar(): void {
  setIsMobileSidebarOpen(false);
}

// Close the mobile drawer once the viewport crosses into desktop (>=1024px),
// so it doesn't linger open behind the desktop layout.
if (typeof window !== 'undefined') {
  const mql = window.matchMedia('(min-width: 1024px)');
  const mediaSizeListener = (e: MediaQueryListEvent) => {
    if (e.matches) closeMobileSidebar();
  };
  mql.addEventListener('change', mediaSizeListener);
  import.meta.hot?.dispose(() => mql.removeEventListener('change', mediaSizeListener));
}
