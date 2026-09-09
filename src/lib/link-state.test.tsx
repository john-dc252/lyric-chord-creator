import { describe, expect, it } from 'vitest';
import { render } from '@solidjs/testing-library';
import { createRouter, hashHistory, useLinkState } from '@solidjs/router';

/**
 * useLinkState does `String(href())` internally, so it must be given the
 * logical path ('/gallery'), never a `paths` node or display href ('#/gallery').
 * A '#'-prefixed value is stripped to '' by the router's comparablePath, which
 * then prefix-matches every route and reports every link as active.
 */
describe('useLinkState active matching under hashHistory', () => {
  const probe: Record<string, boolean> = {};

  window.location.hash = '#/gallery';

  const TestRouter = createRouter({
    routes: [
      { path: '/', component: () => null },
      {
        path: '/gallery',
        component: () => {
          probe.logicalMatch = useLinkState(() => '/gallery').active();
          probe.logicalNonMatch = useLinkState(() => '/about').active();
          probe.rootPrefix = useLinkState(() => '/').active();
          probe.rootExact = useLinkState(() => '/', { end: true }).active();
          probe.displayHref = useLinkState(() => '#/gallery').active();
          return null;
        },
      },
      { path: '/about', component: () => null },
    ],
    history: hashHistory(),
  });

  render(() => <TestRouter />);

  it('matches the logical path of the current route', () => {
    expect(probe.logicalMatch).toBe(true);
  });

  it('does not match an unrelated route', () => {
    expect(probe.logicalNonMatch).toBe(false);
  });

  it('needs end:true for the root link, which otherwise matches everything', () => {
    // comparablePath('/') normalizes to '', so prefix matching makes the root
    // link active on every route. The root link must opt into exact matching.
    expect(probe.rootPrefix).toBe(true);
    expect(probe.rootExact).toBe(false);
  });

  it('reports a spurious match when given a display href', () => {
    // Regression guard: this is the bug — '#/gallery' matches everything, so
    // it would also be true on '/about'. Pass logical paths instead.
    expect(probe.displayHref).toBe(true);
  });
});
