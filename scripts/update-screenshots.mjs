#!/usr/bin/env node
// Regenerates the PWA manifest / README screenshots in public/.
//
// Serves the app with the Vite dev server and drives a headless Chrome over
// the DevTools protocol (no extra dependencies). Each shot runs in a fresh
// browser context, so it captures the default sample template. Runs before
// `vite build` so the build copies the fresh images from public/.
// Skipped with a warning when Chrome isn't installed (e.g. CI).
//
// Usage: pnpm screenshots
// Env:   CHROME_PATH — Chrome/Chromium binary (defaults to the first found on PATH)

import {spawn, spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const APP_PATH = '/apps/lyric-chord-creator/';

const SHOTS = [
  {
    file: 'lyric-chord-creator-screenshot.png',
    viewport: {width: 1881, height: 936, mobile: false},
  },
  {
    file: 'lyric-chord-creator-screenshot-mobile.png',
    viewport: {width: 390, height: 853, mobile: true},
  },
  {
    file: 'lyric-chord-creator-screenshot-previewer-mobile.png',
    viewport: {width: 390, height: 853, mobile: true},
    // Runs in the page: switch to the Preview tab at 100% zoom.
    prepare: `
      document.querySelector('#preview-tab').click();
      await new Promise((r) => requestAnimationFrame(r));
      [...document.querySelectorAll('#preview-panel button')]
        .find((b) => b.textContent.trim() === '100%')
        ?.click();
    `,
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  console.log('Looking for Chrome installation...');
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const {status, stdout} = spawnSync('which', [bin], {encoding: 'utf8'});
    if (status === 0) {
      const chromeInstallation = stdout.trim();
      console.log('Found:', chromeInstallation);
      return chromeInstallation;
    }
  }
  throw new Error('Chrome not found. Set CHROME_PATH.');
}

function getFreePort() {
  return new Promise((res, reject) => {
    const srv = createServer();
    srv.on('error', reject);
    srv.listen(0, () => {
      const {port} = srv.address();
      srv.close(() => res(port));
    });
  });
}

async function waitForServer(url, server, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`vite dev server exited (${server.exitCode})`);
    try {
      const res = await fetch(url, {headers: {accept: 'text/html'}});
      await res.body?.cancel();
      if (res.ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error(`Server did not start at ${url}`);
}

function launchChrome(chromePath, userDataDir) {
  const proc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--force-color-profile=srgb',
  ]);
  const wsUrl = new Promise((resolveUrl, reject) => {
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) resolveUrl(match[1]);
    });
    proc.on('exit', (code) => reject(new Error(`Chrome exited (${code}):\n${stderr}`)));
  });
  return {proc, wsUrl};
}

function connectCdp(wsUrl, defaultTimeoutMs = 30_000) {
  const ws = new WebSocket(wsUrl);
  let nextId = 0;
  let closedReason = null;
  const pending = new Map();
  const listeners = new Set();

  const abortAll = (reason) => {
    if (closedReason) return;
    closedReason = reason;
    for (const {reject, timer} of pending.values()) {
      clearTimeout(timer);
      reject(reason);
    }
    pending.clear();
    for (const entry of listeners) {
      clearTimeout(entry.timer);
      entry.reject(reason);
    }
    listeners.clear();
  };

  ws.addEventListener('message', ({data}) => {
    const msg = JSON.parse(data);
    if (msg.id !== undefined) {
      const entry = pending.get(msg.id);
      if (!entry) return;
      pending.delete(msg.id);
      clearTimeout(entry.timer);
      msg.error ? entry.reject(new Error(msg.error.message)) : entry.resolve(msg.result);
    } else {
      for (const entry of listeners) entry.fn(msg);
    }
  });

  ws.addEventListener('close', () => abortAll(new Error('CDP WebSocket closed unexpectedly')));
  ws.addEventListener('error', () => abortAll(new Error('CDP WebSocket error')));

  const send = (method, params = {}, sessionId, timeoutMs = defaultTimeoutMs) =>
    new Promise((res, reject) => {
      if (closedReason) return reject(closedReason);
      const id = ++nextId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP request timed out after ${timeoutMs}ms: ${method}`));
      }, timeoutMs);
      pending.set(id, {resolve: res, reject, timer});
      ws.send(JSON.stringify({id, method, params, sessionId}));
    });

  const once = (method, sessionId, timeoutMs = defaultTimeoutMs) =>
    new Promise((res, reject) => {
      if (closedReason) return reject(closedReason);
      const entry = {
        fn: (msg) => {
          if (msg.method === method && msg.sessionId === sessionId) {
            clearTimeout(entry.timer);
            listeners.delete(entry);
            res(msg.params);
          }
        },
        reject,
        timer: setTimeout(() => {
          listeners.delete(entry);
          reject(new Error(`CDP event timed out after ${timeoutMs}ms: ${method}`));
        }, timeoutMs),
      };
      listeners.add(entry);
    });

  const opened = new Promise((res, reject) => {
    ws.addEventListener('open', res, {once: true});
    ws.addEventListener('error', () => reject(new Error('Failed to open CDP WebSocket')), {
      once: true,
    });
  });

  return {opened, send, once, close: () => ws.close()};
}

async function evaluateWhenReady(send, shot, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Timed out waiting for page to settle');
    try {
      const {exceptionDetails} = await send(
        'Runtime.evaluate',
        {
          awaitPromise: true,
          expression: `(async () => {
            const deadline = Date.now() + ${Math.min(remaining, 15_000)};
            while (!document.querySelector('.cm-content')) {
              if (Date.now() > deadline) throw new Error('Editor did not render');
              await new Promise((r) => setTimeout(r, 100));
            }
            ${shot.prepare ?? ''}
            await Promise.race([
              document.fonts.ready,
              new Promise((r) => setTimeout(r, 5000)),
            ]);
            await new Promise((r) => setTimeout(r, 500));
          })()`,
        },
        remaining + 2_000,
      );
      if (exceptionDetails) {
        throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
      }
      return;
    } catch (error) {
      // Vite's dependency optimizer or asset retry can trigger a full-page
      // reload mid-evaluation on cold starts; retry in the new context.
      const transient =
        /Execution context was destroyed|Cannot find context|Inspected target navigated/i.test(
          error.message,
        );
      if (!transient || Date.now() >= deadline) throw error;
      await sleep(250);
    }
  }
}

async function capture(cdp, shot, appUrl) {
  const {browserContextId} = await cdp.send('Target.createBrowserContext');
  const {targetId} = await cdp.send('Target.createTarget', {url: 'about:blank', browserContextId});
  const {sessionId} = await cdp.send('Target.attachToTarget', {targetId, flatten: true});
  const send = (method, params, timeoutMs) => cdp.send(method, params, sessionId, timeoutMs);

  try {
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', {...shot.viewport, deviceScaleFactor: 1});
    await send('Emulation.setEmulatedMedia', {
      features: [{name: 'prefers-color-scheme', value: 'dark'}],
    });

    const loaded = cdp.once('Page.loadEventFired', sessionId);
    await send('Page.navigate', {url: appUrl});
    await loaded;

    await evaluateWhenReady(send, shot);

    const {data} = await send('Page.captureScreenshot', {format: 'png'});
    const out = join(ROOT, 'public', shot.file);
    writeFileSync(out, Buffer.from(data, 'base64'));
    console.log(`✓ public/${shot.file} (${shot.viewport.width}x${shot.viewport.height})`);
  } finally {
    await cdp.send('Target.disposeBrowserContext', {browserContextId}).catch(() => {});
  }
}

async function main() {
  let chromePath;
  try {
    chromePath = findChrome();
  } catch (error) {
    console.warn(`⚠ Skipping screenshots: ${error.message}`);
    return;
  }

  console.log('Looking for a free port...');
  const port = await getFreePort();
  console.log('Using port ', port);
  const appUrl = `http://localhost:${port}${APP_PATH}`;
  const server = spawn('pnpm', ['exec', 'vite', '--port', String(port), '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'ignore', 'inherit'],
    detached: true,
  });
  const userDataDir = mkdtempSync(join(tmpdir(), 'lcc-screenshots-'));
  let chrome;
  let cdp;

  try {
    console.log('Starting server for screen capture...');
    await waitForServer(appUrl, server);
    chrome = launchChrome(chromePath, userDataDir);
    cdp = connectCdp(await chrome.wsUrl);
    await cdp.opened;
    console.log('Capturing screenshots...');
    for (const shot of SHOTS) await capture(cdp, shot, appUrl);
    console.log('DONE.');
  } finally {
    cdp?.close();
    chrome?.proc.kill();
    if (server.exitCode === null) process.kill(-server.pid);
    await sleep(250);
    rmSync(userDataDir, {recursive: true, force: true});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
