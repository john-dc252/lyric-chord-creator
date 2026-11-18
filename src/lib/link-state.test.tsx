import { describe, expect, it } from 'vitest';
import { render } from '@solidjs/testing-library';
import { createRouter, hashHistory, useLinkState } from '@solidjs/router';

/**
 * In @solidjs/router 2.0.0, useLinkState unwraps `paths` nodes via their
 * internal Href brand (`h[HREF] || String(h)`) and treats the router's root
 * (`/`) as exact-only automatically.
 */
describe('useLinkState active matching under hashHistory', () => {
  const probe: Record<string, () => boolean> = {};

  window.location.hash = '#/gallery';

  const TestRouter = createRouter({
    routes: [
      { path: '/', component: () => null },
      {
        path: '/gallery',
        component: () => {
          probe.logicalMatch = useLinkState(() => '/gallery').active;
          probe.pathsNodeMatch = useLinkState(() => TestRouter.paths.gallery).active;
          probe.logicalNonMatch = useLinkState(() => '/about').active;
          probe.rootDefault = useLinkState(() => '/').active;
          probe.rootExact = useLinkState(() => '/', { end: true }).active;
          probe.displayHref = useLinkState(() => '#/gallery').active;
          return null;
        },
      },
      { path: '/about', component: () => null },
    ],
    history: hashHistory(),
  });

  render(() => <TestRouter />);

  it('matches the logical path and paths node of the current route', () => {
    expect(probe.logicalMatch()).toBe(true);
    expect(probe.pathsNodeMatch()).toBe(true);
  });

  it('does not match an unrelated route', () => {
    expect(probe.logicalNonMatch()).toBe(false);
  });

  it('treats the root link as exact-only by default', () => {
    expect(probe.rootDefault()).toBe(false);
    expect(probe.rootExact()).toBe(false);
  });

  it('reports a spurious match when given a display href', () => {
    // Regression guard: a '#'-prefixed string resolves relative to the current
    // route ('/gallery#/gallery') and strips the hash, matching the current
    // route regardless of what follows '#'. Pass logical paths or paths nodes.
    expect(probe.displayHref()).toBe(true);
  });
});
