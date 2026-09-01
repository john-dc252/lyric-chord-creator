import {Title} from '@solidjs/meta';
import {Loading} from 'solid-js';
import '@unocss/reset/tailwind.css';
import 'virtual:uno.css';
import {Router} from './router';
import {useRegisterSW} from "virtual:pwa-register/solid";
import AppLayout from './components/AppLayout';
import './App.css';

export default function App() {
  useRegisterSW({
    onRegisteredSW() {
      console.log('@Lyric-Chord Creator - Service Worker Registered');
    },

    onRegisterError(error) {
      console.error('@Lyric-Chord Creator - Service worker registration error', error);
    },
  });

  return (
    <Router>
      {(props) => (
        <AppLayout>
          <Title>Lyric-Chord Creator</Title>
          <Loading fallback={<main class="p-8 text-center text-slate-500">Loading…</main>}>
            {props.children}
          </Loading>
        </AppLayout>
      )}
    </Router>
  );
}
