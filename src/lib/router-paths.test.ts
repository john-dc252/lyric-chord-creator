import { describe, expect, it } from 'vitest';
import { createRouter, hashHistory } from '@solidjs/router';

/**
 * The app navigates with plain <a> elements (Solid Router 2.0 has no link
 * component), so every in-app href must be a *display* href — hash-prefixed
 * under hashHistory. A logical path like "/about" in the DOM resolves against
 * the origin root on modifier/middle-click and leaves the app entirely.
 */
describe('router paths proxy', () => {
  const { paths } = createRouter({
    routes: [{ path: '/' }, { path: '/about' }, { path: '/gallery' }],
    history: hashHistory(),
  });

  it('renders hash-prefixed display hrefs', () => {
    expect(paths()).toBe('#/');
    expect(paths.about()).toBe('#/about');
    expect(paths.gallery()).toBe('#/gallery');
  });

  it('coerces uncalled nodes to the same display href', () => {
    // Sidebar/AppLayout pass uncalled nodes straight to the href attribute.
    expect(String(paths)).toBe('#/');
    expect(String(paths.about)).toBe('#/about');
    expect(String(paths.gallery)).toBe('#/gallery');
  });
});
