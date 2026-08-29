import { createSignal } from 'solid-js';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'scgt_theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (e) {
    console.error('Failed to read theme preference:', e);
  }
  return 'dark';
}

const initialTheme = getInitialTheme();
const [theme, setThemeSignal] = createSignal<Theme>(initialTheme, { name: 'app_theme' });

export { theme };

export function applyTheme(newTheme: Theme) {
  setThemeSignal(newTheme);
  if (typeof document !== 'undefined') {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
  try {
    localStorage.setItem(STORAGE_KEY, newTheme);
  } catch (e) {
    console.error('Failed to persist theme preference:', e);
  }
}

export function toggleTheme() {
  const next = theme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

// Initialize theme class on DOM load
if (typeof document !== 'undefined') {
  if (initialTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
