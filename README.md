# Storytime

Bring in your Goodreads or StoryGraph list, add the libraries you use in Libby, and see which books you can borrow right now. It runs entirely in the browser, works offline after the first visit, and can be installed on phones and desktops.

**Live site:** https://isaymotion.github.io/Storytime/ (after GitHub Pages is switched on; see below)

## Features

- **Bring in a list:** a Goodreads profile link (reads the public Want to Read, Currently Reading and Read shelves), a Goodreads or StoryGraph export file (CSV), or books typed in by hand.
- **My libraries:** find a library by name, town or county to get its Libby code, or add libraries by code or web address (several at once, separated by commas).
- **My books:** every book checked at every library. Green = borrow now, orange = holds queue (with the estimated wait), red = not at your libraries. Ebook and audiobook are shown separately, and each coloured button opens that title in Libby.
- **Read:** books you have read, which you can check at your libraries for a reread. Mark a book as finished and one-tap links open its Goodreads and StoryGraph pages so you can update your shelf there, and the finished list exports as a CSV.
- The shared isaymotion shell: menu, search (press `/`), back and forward buttons, light/dark theme, text size, What's new, and backup (export, import, undo).
- No accounts, no passwords, no tracking. Books and libraries are saved in the browser on each device.

## Where the data comes from (please read before changing anything)

Storytime is free and non-commercial, and it is not affiliated with Goodreads, Libby/OverDrive or The StoryGraph. None of them offers an official connection for apps like this one, so:

| What | How | Note |
|---|---|---|
| Library availability | The public OverDrive catalogue address that library websites themselves use (`thunder.api.overdrive.com`) | Unofficial: it can change or be withdrawn without notice. Lookups run two at a time with a pause, and results are reused for 6 hours. OverDrive's terms allow personal, non-commercial use only. |
| Goodreads list | The public shelf feed (RSS) of a profile, or the export file | Goodreads refuses requests from web pages, so the feed goes through a relay (see `relay/worker.js`). The export file needs no relay. |
| StoryGraph list | The export file | StoryGraph has no feed or API. |
| Marking as read | Kept inside Storytime | Neither Goodreads nor StoryGraph lets outside apps change a shelf; Storytime links to the book's page instead. |

All of these addresses live in one object, `SRC`, near the top of the Storytime section of `js/app.js`.

## Files to upload

Upload everything in this folder to the root of the repository, keeping the folder structure:

```
.nojekyll               (empty file; tells GitHub Pages not to run Jekyll)
README.md
index.html              App shell (top bar, sidebar menu, footer, bottom tabs)
css/app.css             Styles (light and dark themes)
js/app.js               Router, menu, views (VIEWS), navigation (NAV), search, theme, backup
data/app-meta.js        App name, version, attribution (window.APP_META), menu links (window.APP_LINKS)
                        and the commented MIGRATE_KEYS example
data/changelog.js       What's new entries (window.APP_CHANGELOG)
data/hospital.js        Hospital, program, posts and year levels (window.HOSPITAL), shared across apps
data/strings.js         Shell UI strings in English and Tagalog (window.STRINGS)
icons/                  icon-192.png, icon-512.png, icon-maskable-512.png (required),
                        favicon-32.png, favicon-64.png, apple-touch-icon.png (recommended)
manifest.webmanifest    Install metadata
sw.js                   Offline cache (the app's own files only; lookups always use the network)
relay/worker.js         Optional: your own relay as a free Cloudflare Worker (instructions inside)
```

The header logo uses `icons/icon-192.png`.

## Publish on GitHub Pages

1. Create a new repository named `Storytime` on GitHub and upload all files in this folder, keeping the folder structure.
2. In the repository, open **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, and save.
4. After a minute the site is live at `https://isaymotion.github.io/Storytime/`.
5. On a phone, open that link, then use **Add to Home Screen** (iPhone Safari) or **Install app** (Android Chrome).

There is no build step and no dependencies. To preview locally, run `python3 -m http.server` in this folder and visit `http://localhost:8000`.

## Adding a screen

1. In `js/app.js`, inside the `APP VIEWS` section, add `VIEWS.myscreen = function (arg) { return '<div class="wrap page">...</div>'; };` (use `esc()` on any data).
2. Add one entry to the `NAV` array: `{ label: 'My screen', href: '#/myscreen', icon: 'star', group: 'Screens' }`. That adds it to the sidebar, the drawer and the home tiles.
3. Optional: add rows to `SEARCH_INDEX` (`{title, text, href, kind}`) so the screen shows up in search.
4. Add an entry to the top of `data/changelog.js` and bump the version (below).

Reusable CSS classes are in `css/app.css`: `btn`, `btn--solid`, `link-btn`, `filters`/`filter`, `seg`, `card`, `row`, `callout`, `table-wrap`, `page`/`page__head`, `crumb`, `empty`, `badge`, `meter`. Storytime adds `book`, `av` (availability button), `field`, `actions`, `stats`/`stat` and `status-line`.

## Shared data, languages and other apps

- `data/hospital.js` defines `window.HOSPITAL` (hospital name, program, province, posts, year levels, form prefix). It is shared across the apps: edit it in one place and copy the file to the others instead of hardcoding these values.
- `data/strings.js` defines `window.STRINGS = { en, tl }` for the shell's own UI text. Use `t('key')` in `js/app.js`; it falls back to English, then to the key. The Tagalog values are a draft until Dr. Navarro reviews them. Add the same key to both languages when you add shell text.
- `window.APP_LINKS` (in `data/app-meta.js`) feeds the "Other apps" menu group. The entry matching this app's own repo slug is skipped, so the same list works in every app. These links never appear in the home tiles, search or tab bar.
- `window.MIGRATE_KEYS` (optional; a commented example is in `data/app-meta.js`) is for a restyled app whose storage prefix changed: at startup each saved key under an old prefix is copied under the new prefix and the old key removed, so saved progress survives.

## Version and What's new

- The app version is a semantic version string (for example `1.0.0`). It lives in `data/app-meta.js` (`version`), in the first entry of `data/changelog.js`, and in `sw.js` (`VERSION`).
- `data/changelog.js` is newest first. Each entry is `{version, date, title, items:[{type, text}]}` where `date` is ISO `YYYY-MM-DD` and `type` is `feature`, `update`, `correction` or `content`. Write plain sentences, sentence-case titles, no emoji, and start an item with the feature name and a colon.
- For every release: add the changelog entry at the top, update `version` in `data/app-meta.js`, set `VERSION` in `sw.js` to the same version (this makes returning users get the new files), and update "Latest version November 2026" in `index.html`, `data/app-meta.js` and this README.
- The unseen badge is keyed on the version string: visitors see a count of entries newer than the last version they opened on the What's new page.
- Storage keys start with `s:v1:`, and cache names start with `storytime-`. All isaymotion apps share one origin (`isaymotion.github.io`), so keep both unique per app. Do not change them after release, or saved data will be lost.

## Attribution

App created by Isabella Navarro, MD. Latest version November 2026. isaymotion@gmail.com

An independent tool for readers. Not affiliated with or endorsed by Goodreads, Libby, OverDrive or The StoryGraph.
