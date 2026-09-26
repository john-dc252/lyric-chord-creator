import {Title} from '@solidjs/meta';
import {Loading, onSettled, Show} from 'solid-js';
import '@unocss/reset/tailwind.css';
import 'virtual:uno.css';
import {Router} from './router';
import {useRegisterSW} from "virtual:pwa-register/solid";
import AppLayout from './components/AppLayout';
import UpdateAvailableModal from './components/UpdateAvailableModal';
import './App.css';

const SERVICE_WORKER_UPDATE_INTERVAL_MILLIS = 60 * 60 * 1000;
const UPDATE_REMIND_LATER_MILLIS = 60 * 60 * 1000;

export default function App() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swScriptUrl, registration) {
      console.log('@Lyric-Chord Creator - Service Worker Registered');

      if (!registration) {
        return;
      }

      setInterval(() => {
        registration.update().then();
      }, SERVICE_WORKER_UPDATE_INTERVAL_MILLIS);
    },

    onRegisterError(error) {
      console.error('@Lyric-Chord Creator - Service worker registration error', error);
    },
  });

  let remindLaterTimer: ReturnType<typeof setTimeout> | undefined;
  const handleUpdateLater = () => {
    setNeedRefresh(false);
    clearTimeout(remindLaterTimer);
    remindLaterTimer = setTimeout(() => setNeedRefresh(true), UPDATE_REMIND_LATER_MILLIS);
  };

  onSettled(() => {
    if (typeof window === 'undefined') return;

    const MAX_RETRIES = 5;
    const RETRY_KEY = 'lyric_chord_creator.vite_preload_retry_count';

    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

    const handlePreloadError = (event: Event) => {
      const retryCount = parseInt(sessionStorage.getItem(RETRY_KEY) || '0', 10);
      if (retryCount >= MAX_RETRIES) {
        console.error(`@Lyric-Chord Creator - Dynamic chunk preload failed after ${MAX_RETRIES} attempts.`, event);
        return;
      }

      sessionStorage.setItem(RETRY_KEY, (retryCount + 1).toString());
      window.location.reload();
    };

    window.addEventListener('vite:preloadError', handlePreloadError);

    // Reset retry counters once session has been stable
    const resetTimer = setTimeout(() => {
      sessionStorage.removeItem(RETRY_KEY);
      sessionStorage.removeItem('lyric_chord_creator.pwa_asset_retry_count');
    }, 5000);

    return () => {
      clearTimeout(resetTimer);
      clearTimeout(remindLaterTimer);
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
      window.removeEventListener('vite:preloadError', handlePreloadError);
    };
  });

  return (
    <Router>
      {(props) => (
        <AppLayout>
          <Title>Lyric-Chord Creator</Title>
          <Loading fallback={<main class="p-8 text-center text-slate-500">Loading…</main>}>
            {props.children}
          </Loading>
          <Show when={needRefresh()}>
            <UpdateAvailableModal onUpdate={() => updateServiceWorker()} onLater={handleUpdateLater} />
          </Show>
        </AppLayout>
      )}
    </Router>
  );
}
