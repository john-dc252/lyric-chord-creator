import {createSignal, flush, untrack} from 'solid-js';
import { apiFetch, apiJson, ApiError, cloudEnabled, configureApiAuth, dispositionFilename } from './api';
import { downloadBlob, todayStamp } from './download';

export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  createdAt: string;
}

export interface Provider {
  name: string;
  label: string;
  startUrl: string;
}

interface Session {
  token: string;
  user: User;
}

const SESSION_KEY = 'lcc_session';
const CLIENT_STATE_KEY = 'lcc_login_client_state';

const LOGIN_ERRORS: Record<string, string> = {
  access_denied: 'Sign-in was cancelled.',
  email_unverified: 'Your account email isn’t verified with the provider.',
  missing_email: 'The provider didn’t share an email address.',
  provider_unavailable: 'The sign-in provider is unavailable. Try again later.',
};

function loadSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

const [session, setSessionSignal] = createSignal<Session | null>(loadSession(), {
  name: 'auth_session',
});

/** One-shot message about sign-in/out, shown by the app shell. */
export const [authNotice, setAuthNotice] = createSignal<string | null>(null, {
  name: 'auth_notice',
});

export function currentUser(): User | null {
  return session()?.user ?? null;
}

export function isSignedIn(): boolean {
  return session() !== null;
}

type SessionListener = (user: User | null) => void;
const listeners: SessionListener[] = [];

/** Lets stores react to sign-in/out without a reactive owner. */
export function onSessionChange(listener: SessionListener): void {
  listeners.push(listener);
}

function setSession(next: Session | null): void {
  const changedUser = session()?.user.id !== next?.user.id;
  setSessionSignal(next);
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
    // TODO: find alternative to calling flush. refactor might be needed.
    flush();
  } catch {}
  if (changedUser) listeners.forEach((l) => l(next?.user ?? null));
}

function currentToken(): string | null {
  return untrack(session)?.token ?? null;
}

function handleUnauthorized(): void {
  setSession(null);
  setAuthNotice('Your session expired. Sign in again.');
}

// oxlint-disable-next-line solid/reactivity -- plain callbacks for the API client, not a reactive scope
configureApiAuth(currentToken, handleUnauthorized);

export async function fetchProviders(): Promise<Provider[]> {
  const body = await apiJson<{ providers: Provider[] }>('/auth/config');
  return body.providers;
}

function randomClientState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Navigates to the provider; the backend redirects back with a login code. */
export function signIn(provider: Provider): void {
  const clientState = randomClientState();
  sessionStorage.setItem(CLIENT_STATE_KEY, clientState);
  const url = new URL(provider.startUrl);
  url.searchParams.set('client_state', clientState);
  window.location.assign(url.toString());
}

/** Consumes `login_code` / `login_error` from the URL after the provider redirect. */
export async function completeSignInFromUrl(): Promise<void> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('login_code');
  const error = url.searchParams.get('login_error');
  if (!code && !error) return;

  const returnedState = url.searchParams.get('client_state');
  const expectedState = sessionStorage.getItem(CLIENT_STATE_KEY);
  sessionStorage.removeItem(CLIENT_STATE_KEY);
  for (const key of ['login_code', 'login_error', 'client_state']) url.searchParams.delete(key);
  window.history.replaceState(window.history.state, '', url.toString());

  // Reject logins this tab didn't start (login CSRF).
  if (!returnedState || returnedState !== expectedState) {
    if (code || error) setAuthNotice('Sign-in couldn’t be verified. Try again.');
    return;
  }
  if (error) {
    setAuthNotice(LOGIN_ERRORS[error] ?? 'Sign-in failed. Try again.');
    return;
  }
  try {
    const next = await apiJson<Session>('/auth/exchange', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    setSession(next);
    setAuthNotice(`Signed in as ${next.user.email}.`);
  } catch (e) {
    setAuthNotice(e instanceof ApiError ? e.message : 'Sign-in failed. Try again.');
  }
}

/** Refreshes the stored user; clears the session if the server rejects it. */
async function refreshUser(): Promise<void> {
  const current = session();
  if (!current) return;
  try {
    const user = await apiJson<User>('/auth/me');
    setSession({ token: current.token, user });
  } catch {
    // 401 is handled by the API client; keep the session when offline.
  }
}

async function endSession(path: '/auth/logout' | '/auth/logout-all'): Promise<void> {
  try {
    await apiFetch(path, { method: 'POST' });
  } finally {
    setSession(null);
  }
}

export const signOut = () => endSession('/auth/logout');
export const signOutEverywhere = () => endSession('/auth/logout-all');

export async function downloadCloudArchive(): Promise<void> {
  const res = await apiFetch('/templates/export');
  const blob = await res.blob();
  downloadBlob(blob, dispositionFilename(res, `lyric-chord-cloud-library-${todayStamp()}.zip`));
}

export async function deleteAccount(): Promise<void> {
  await apiFetch('/auth/me', { method: 'DELETE' });
  setSession(null);
}

/** Runs once at startup: finishes a pending sign-in redirect, then refreshes the user. */
async function initAuth(): Promise<void> {
  await completeSignInFromUrl();
  await refreshUser();
}

if (typeof window !== 'undefined' && cloudEnabled) {
  // oxlint-disable-next-line solid/reactivity -- one-time imperative startup, not a reactive scope
  void initAuth();
}
