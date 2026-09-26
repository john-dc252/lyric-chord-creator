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
      if ((await fetch(url, {headers: {accept: 'text/html'}})).ok) return;
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

function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 0;
  const pending = new Map();
  const listeners = new Set();

  ws.addEventListener('message', ({data}) => {
    const msg = JSON.parse(data);
    if (msg.id !== undefined) {
      const {resolve: res, reject} = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : res(msg.result);
    } else {
      for (const fn of listeners) fn(msg);
    }
  });

  const send = (method, params = {}, sessionId) =>
    new Promise((res, reject) => {
      const id = ++nextId;
      pending.set(id, {resolve: res, reject});
      ws.send(JSON.stringify({id, method, params, sessionId}));
    });

  const once = (method, sessionId) =>
    new Promise((res) => {
      const fn = (msg) => {
        if (msg.method === method && msg.sessionId === sessionId) {
          listeners.delete(fn);
          res(msg.params);
        }
      };
      listeners.add(fn);
    });

  const opened = new Promise((res, reject) => {
    ws.addEventListener('open', res, {once: true});
    ws.addEventListener('error', reject, {once: true});
  });

  return {opened, send, once, close: () => ws.close()};
}

async function capture(cdp, shot, appUrl) {
  const {browserContextId} = await cdp.send('Target.createBrowserContext');
  const {targetId} = await cdp.send('Target.createTarget', {url: 'about:blank', browserContextId});
  const {sessionId} = await cdp.send('Target.attachToTarget', {targetId, flatten: true});
  const send = (method, params) => cdp.send(method, params, sessionId);

  try {
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', {...shot.viewport, deviceScaleFactor: 1});
    await send('Emulation.setEmulatedMedia', {
      features: [{name: 'prefers-color-scheme', value: 'dark'}],
    });

    const loaded = cdp.once('Page.loadEventFired', sessionId);
    await send('Page.navigate', {url: appUrl});
    await loaded;

    const {exceptionDetails} = await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `(async () => {
        const deadline = Date.now() + 15000;
        while (!document.querySelector('.cm-content')) {
          if (Date.now() > deadline) throw new Error('Editor did not render');
          await new Promise((r) => setTimeout(r, 100));
        }
        ${shot.prepare ?? ''}
        await document.fonts.ready;
        await new Promise((r) => setTimeout(r, 500));
      })()`,
    });
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    }

    const {data} = await send('Page.captureScreenshot', {format: 'png'});
    const out = join(ROOT, 'public', shot.file);
    writeFileSync(out, Buffer.from(data, 'base64'));
    console.log(`✓ public/${shot.file} (${shot.viewport.width}x${shot.viewport.height})`);
  } finally {
    await cdp.send('Target.disposeBrowserContext', {browserContextId});
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
