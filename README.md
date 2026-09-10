# Lyric-Chord Creator

**Lyric-Chord Creator** is a modern, lightweight, and offline-capable web app built with **SolidJS 2.x** for creating, editing, and printing multi-column lyric-and-chord sheets.

Chords are anchored directly to lyrics in plain text (`{G}`) and automatically reflow into balanced multi-column pages designed for print, with `@column_break` and `@page_break` for manual fine-tuning.

<p>
  <img src="public/lyric-chord-creator-screenshot.png" alt="Lyric-Chord Creator Desktop View" width="100%" />
</p>

<p>
  <img src="public/lyric-chord-creator-screenshot-mobile.png" alt="Mobile Editor View" width="48%" />
  <img src="public/lyric-chord-creator-screenshot-previewer-mobile.png" alt="Mobile Preview View" width="48%" />
</p>

---

## ✨ Features

- **Exact Chord Anchoring**: Embed `{Chord}` directly into lyrics or use `@chord_sequence` for standalone progressions.
- **On-the-Fly Transposition**: Shift keys (±11 semitones) in preview and print without modifying source templates.
- **Adaptive Sheet Layout**: Letter, A4, Legal, or custom sizes; portrait (1–2 cols) or landscape (1–4 cols); adjustable font sizes (6–20pt) and margins.
- **Live Preview & Print**: Real-time rendering, zoom presets (**Fit**, **75%**, **100%**), fullscreen preview, and lyric-chord sheet printing.
- **CodeMirror 6 Editor**: Syntax highlighting, soft wrap, scroll-past-end, hybrid relative line numbers, and live song header tracking synced to cursor position.
- **Vim Mode**: Modal editing with custom Ex commands (`:w` / `:up` to quick-save; `:rnu`, `:nornu`, `:relativenumber`, `:norelativenumber` for line numbers).
- **File I/O**: Drag-and-drop any text file into the editor, import (`.lcct.txt`, `.scgt.txt`, `.txt`), and export (`.lcct.txt`).
- **Template Gallery**: Save, duplicate, rename, search (by all, template name, title, artist, or lyrics), and manage templates locally.
- **PWA & Offline**: Installable PWA with offline caching and light/dark theme toggle.

---

## 📝 Syntax Reference

```txt
@title: Amazing Grace
@artist: John Newton
@empty_line

[Verse 1]
@empty_line
A{G}mazing grace, how {C}sweet the {G}sound
That saved a {D7}wretch like me

@column_break

[Verse 2]
@empty_line
'Twas {G}grace that taught my {C}heart to {G}fear
```

| Directive | Description |
| :--- | :--- |
| `@title: <Title>` | Song title header (bold, underlined). |
| `@artist: <Artist>` | Artist metadata line. |
| `[<Section Name>]` | Section header (e.g. `[Verse 1]`, `[Chorus]`), kept with following lines. |
| `{<Chord>}` | In-line chord positioned directly above syllable or word. |
| `@chord_sequence: <Chords>` | Standalone chord progression (e.g. `G - D - Em - C`). |
| `@empty_line` | Blank vertical spacing (plain empty lines are ignored). |
| `@column_break` | Breaks content into the next column. |
| `@page_break` | Starts a new physical page (supports multiple songs per document). |

---

## 🛠️ Tech Stack

- **Framework**: [SolidJS 2.x](https://solidjs.com)
- **Editor**: [CodeMirror 6](https://codemirror.net/) with [@replit/codemirror-vim](https://github.com/replit/codemirror-vim)
- **Styling**: [UnoCSS](https://unocss.dev) (`@unocss/preset-wind4`)
- **Build & PWA**: [Vite](https://vitejs.dev) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- **Testing & Linting**: [Vitest](https://vitest.dev) + [oxlint](https://oxc.rs)

---

## 🚀 Getting Started

```bash
# Install dependencies & run dev server
pnpm install
pnpm dev

# Build & preview production assets
pnpm build
pnpm serve

# Lint & test
pnpm lint
pnpm test
```

Open [http://localhost:3000/apps/lyric-chord-creator](http://localhost:3000/apps/lyric-chord-creator) in your browser.

---

## 🤖 LLM Use Disclosure

While I developed the template syntax, processor, and CSS-based chord anchoring mechanism entirely on my own, the web app implementation was built primarily with AI assistance (`Antigravity CLI` with `Gemini 7.3`, and later, `Claude Code` with `Opus 5`), with manual guidance and customizations. This document was also generated with LLM assistance.

- [Original project repository](https://github.com/john-dc252/printable-song-chord-guide)
- [Repository with further revisions to the original project (Static apps repository)](https://github.com/john-dc252/john-dc252.github.io)

---

## 📄 License

MIT
