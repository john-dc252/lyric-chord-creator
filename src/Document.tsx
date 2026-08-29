import type { ParentProps } from 'solid-js';
import { HydrationScript } from '@solidjs/web';
import {pwaInfo} from 'virtual:pwa-info';

export default function Document(props: ParentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href={`${import.meta.env.BASE_URL}favicon.svg`} />
        <link rel="alternate icon" href={`${import.meta.env.BASE_URL}favicon.ico`} />
        {pwaInfo && (<link rel="manifest" href={pwaInfo?.webManifest.href}/>)}
        <title>Lyric-Chord Creator</title>
        <HydrationScript />
      </head>
      <body class="font-sans antialiased min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {props.children}
      </body>
    </html>
  );
}
