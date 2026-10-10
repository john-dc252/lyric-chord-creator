import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authNotice, completeSignInFromUrl, currentUser, setAuthNotice } from './auth';

const user = { id: 'u1', email: 'a@example.com', name: 'A', picture: null, createdAt: '' };

function landOn(query: string) {
  window.history.replaceState(null, '', `/apps/lyric-chord-creator/${query}#/`);
}

describe('completeSignInFromUrl', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    setAuthNotice(null);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('exchanges the code when client_state matches, then cleans the URL', async () => {
    sessionStorage.setItem('lcc_login_client_state', 'abc123abc123abc123');
    landOn('?login_code=code1&client_state=abc123abc123abc123');
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ token: 't', user }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await completeSignInFromUrl();
    expect(fetchMock).toHaveBeenCalledWith(
      '/auth/exchange',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ code: 'code1' }) }),
    );
    expect(currentUser()?.email).toBe('a@example.com');
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('#/');
  });

  it('rejects a login this tab did not start', async () => {
    sessionStorage.setItem('lcc_login_client_state', 'mine-mine-mine-mine');
    landOn('?login_code=evil&client_state=attacker-attacker');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await completeSignInFromUrl();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(authNotice()).toBe('Sign-in couldn’t be verified. Try again.');
  });

  it('maps provider errors to a message', async () => {
    sessionStorage.setItem('lcc_login_client_state', 'abc123abc123abc123');
    landOn('?login_error=access_denied&client_state=abc123abc123abc123');
    await completeSignInFromUrl();
    expect(authNotice()).toBe('Sign-in was cancelled.');
  });
});
