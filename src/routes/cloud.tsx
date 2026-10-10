import { Title } from '@solidjs/meta';
import { Show } from 'solid-js';
import LibraryView from '../components/LibraryView';
import { cloudEnabled } from '../lib/api';
import { isSignedIn } from '../lib/auth';
import { setAccountDialogOpen } from '../lib/account-ui';

export default function Cloud() {
  return (
    <Show
      when={cloudEnabled && isSignedIn()}
      fallback={
        <div class="h-full flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
          <Title>Cloud Library - Lyric-Chord Creator</Title>
          <div class="max-w-sm text-center space-y-3">
            <span class="i-lucide-cloud w-12 h-12 text-slate-400 mx-auto" aria-hidden="true" />
            <h1 class="font-bold text-base text-slate-800 dark:text-slate-200">Cloud Library</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {cloudEnabled
                ? 'Sign in to save templates to your account and use them on any device.'
                : 'Cloud sync isn’t available in this build.'}
            </p>
            <Show when={cloudEnabled}>
              <button
                type="button"
                onClick={() => setAccountDialogOpen(true)}
                class="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white"
              >
                Sign in
              </button>
            </Show>
          </div>
        </div>
      }
    >
      <LibraryView library="cloud" />
    </Show>
  );
}
