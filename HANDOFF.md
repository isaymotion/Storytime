# Storytime handoff (21 Nov 2026, v1.2.0 built, awaiting publish)

## 1. Project and audience
Storytime is a free web app for readers: bring in a Goodreads or StoryGraph list, add the libraries you use in Libby, see which books can be borrowed now, and open them in Libby. Built for Isabella Navarro, MD (first user and tester, on iPhone), then the public.

- Repo: `github.com/isaymotion/Storytime` (public). `main` is the GitHub Pages site. `dev-tools` holds tests and this doc.
- Live: https://isaymotion.github.io/Storytime/
- Plan: free on GitHub first, see if people use it, then donations or bookshop affiliate links, app stores last.

## 2. Fixed rules
- No accounts, passwords, servers or tracking. All user data stays in the browser.
- Not affiliated with Goodreads, Libby/OverDrive or StoryGraph; the footer disclaimer says so. Keep it.
- OverDrive's terms allow personal, non-commercial use only. Do not add paid features that sell library availability. Keep lookups polite (two at a time, 250 ms pause, results reused 6 hours, stop looking for a book once it can be borrowed).
- Never ask for a Goodreads/StoryGraph password. Neither service allows writing to a shelf; "finished" is tracked inside Storytime with links out.
- Follow the `isaymotion-app-design` skill (shared shell, tokens, QA). Hue 285 violet. Storage prefix `s:v1:`, service-worker cache prefix `storytime-`, library-list cache `stlibs-v1` (must not start with `storytime-` or the service worker deletes it).
- Attribution, exact: `App created by Isabella Navarro, MD. Latest version <Month YYYY>. isaymotion@gmail.com`.
- Every publish: bump the version in `sw.js` (VERSION), `data/app-meta.js` and add a `data/changelog.js` entry; all three must agree.
- Commit messages end with the Co-Authored-By and Claude-Session lines the session provides.
- Her saved preference: use subagents for simpler tasks to save tokens; Claude keeps design and final review.
- Icon: her pixel-art rainbow book (already in `icons/`). Do not redraw it.
- Write to her in plain language; she reads on a phone.

## 3. Architecture and data
Plain HTML/CSS/JS, no build step. Everything app-specific is in the `/* ===== STORYTIME ===== */` section of `js/app.js`; the rest is the shared shell.

```
index.html, css/app.css, js/app.js, sw.js, manifest.webmanifest, icons/
data/app-meta.js, changelog.js, strings.js, hospital.js (shell files; hospital.js unused but required by the design check)
relay/worker.js   optional Cloudflare Worker relay (instructions inside)
```

All outside addresses are in one object, `SRC`, in `js/app.js`:
- `libInfo(key)`: `thunder.api.overdrive.com/v2/libraries/<key>` → `{preferredKey, name, status}` (404 if unknown)
- `libSearch(key, q)`: `.../libraries/<key>/media?query=<q>&perPage=24` → `items[]` with `id, title, firstCreatorName, type.id (ebook|audiobook), isAvailable, availableCopies, ownedCopies, holdsCount, estimatedWaitDays, isHoldable`
- `libList(page)`: `.../v2/libraries?perPage=100&page=N` → `{items, totalItems (~13,184), links.next}`. No name filter exists (`query`, `name`, `search` are ignored).
- `libbyApp(key, q, id?)`: `https://libbyapp.com/search/<key>/search/query-<q>/page-1[/<id>]`. Confirmed by Isabella to open the Libby app on the right book on iPhone.
- `grFeed(uid, shelf, page)`: Goodreads shelf RSS; `grWidget(uid, shelf)`: Goodreads embeddable shelf widget script.

Stored under `s:v1:`:
- `books`: `[{id, title, author, isbn, grId, shelf: 'want'|'reading'|'read', source, doneAt, local?}]` (`local: true` = she changed the shelf here; imports never undo it)
- `libs`: `[{key: 'nypl', name: 'New York Public Library', fav?: true}]` (`fav` = favourite, asked first; `prefLibs()` gives favourites first)
- `avail`: `{bookId: {by: {libKey: {at, ebook: {s:'now'|'wait'|'none', id, copies|holds|days}, audiobook: {...}} | {err:true}}}}`
- `settings`: `{grUser, relay, fmt}` (relay = her own relay address, empty by default; `fmt` = `any`|`ebook`|`audiobook`, the formats she reads, set on My libraries)

Network layer `fetchText(url, valid)`: direct first; if the browser is refused, her own relay then three public relays in turn (`RELAYS`). Goodreads always needs a relay; if all fail, the widget route runs in a sandboxed iframe (titles and authors only, most recent books per shelf).

Checking (`startCheck(books, full)`, v1.2.0): goes book by book, two books at a time. Smart check (`full` false; "Check my libraries", "Check for rereading") asks the library that had the book last time, then favourites, then the rest, and stops for that book once a format she reads is `now` (`hasNow`). Books with a fresh `now` answer are skipped. Full check ("Check every library (slower)", "Check every library for this book") asks all libraries. A book's colour uses only the formats in `settings.fmt`, and it is red only when every library has a saved answer (otherwise "Not checked yet").

Screens (`VIEWS`): `home`, `books/<filter>`, `book/<id>`, `finished` (titled "Read"), `libraries`, `import`. Colours: green = borrow now, orange = holds queue, red = not held; ebook and audiobook separate.

## 4. Recipe for one change
1. `git clone --depth 1 https://github.com/isaymotion/Storytime` (never rebuild from memory).
2. Edit `js/app.js` / `css/app.css`. Reuse `.btn`, `.card`, `.av`, `.book`, `.field`, `.actions`, `.status-line`, `.found`.
3. Add or adjust a case in `tests/test_app.py` (dev-tools) for the change.
4. Bump version in `sw.js` and `data/app-meta.js`; add a `data/changelog.js` entry (types used: feature, update, correction).
5. Run the tests and the design check (section 5). Delete `_qa/`.
6. Commit and `git -c push.negotiate=true push origin main`. Pages republishes in about a minute.
7. Update this doc (project `claude/handoff.md` and `HANDOFF.md` on dev-tools).

## 5. Commands
```
git clone --depth 1 https://github.com/isaymotion/Storytime app
git clone --depth 1 -b dev-tools https://github.com/isaymotion/Storytime tools
pip install playwright cairosvg --break-system-packages && playwright install chromium
python3 tools/tests/test_app.py app            # passing: last line "FAILS: []"
python3 <isaymotion-app-design skill>/scripts/check_design.py app --browser   # passing: "PASS — design contract met"
node -e "new (require('vm').Script)(require('fs').readFileSync('app/js/app.js','utf8'))"   # syntax check
```

## 6. Status
| Area | State |
|---|---|
| v1.1.0 live on `main` | Done |
| v1.2.0 | Built and tested 21 Nov 2026, NOT published: the session was not allowed to push to the repo. She was given `storytime-v1.2.0.zip` (5 changed app files: js/app.js, css/app.css, sw.js, data/app-meta.js, data/changelog.js) and `storytime-dev-tools-v1.2.0.zip`. First check whether `main` shows 1.2.0 in `data/app-meta.js`; if not, redo from the zip or ask her to add the repo to the session, then push |
| Smart check, favourite libraries, format choice (v1.2.0) | Built, mock-tested; not tried by her |
| Goodreads profile link (Want to Read, Currently Reading, Read) | Working for her (profile `57096661-chuu`) via a fallback route; which route is unknown |
| Goodreads / StoryGraph CSV import, add by hand | Built, mock-tested; not tried by her |
| Add libraries by code (several at once) | Built; 24 of her 25 codes verified against the catalogue |
| Availability check and colours | Built, mock-tested; she has not explicitly confirmed a full real run |
| "Open ebook/audiobook in Libby app" buttons | Confirmed working on her iPhone |
| Read shelf with "Check for rereading" | Built, mock-tested |
| Find your library by name (v1.1.0) | Built, mock-tested only; real 13k-library download untested |
| Weekly library-list job | Written, NOT installed (see section 8) |
| Tagalog strings for Storytime screens | Not done (shell strings only) |

Her library codes: nypl, brooklyn, melsa, piercecounty (guess from a cut-off name), clevnet, maryland, sno-isle, buffalo, bpl, northnet, kclibrary, dayton, clc (Digital Downloads Ohio), queenslibrary, timberland, akronlibrary, mcpl, hcpl, jf, spl, ohdbks, library2go, okvirtuallibrary, pioneerok (Oklahoma; unconfirmed), lasvegas.

## 7. Next steps
Still waiting on her answers (asked 21 Nov, none yet):
1. How did the library finder behave on her phone (time for first search, right results)? If slow, discuss the weekly list job (she must add the workflow file herself).
2. Did a real "Check my libraries" run work with her 25 libraries, and how long did it take after v1.2.0? Ask her to mark 3 to 5 favourites first.
3. Does she want her own relay (`relay/worker.js`, free Cloudflare account, ~5 minutes) so the Goodreads link does not depend on public relays?

Feature ideas offered to her on 21 Nov (none approved yet; build only what she picks):
- Book covers (Open Library covers by ISBN; OverDrive items also carry cover art).
- "Ready to borrow" home list and a sort by shortest wait; show wait per library on the book page.
- Hold tracker: she taps "I placed a hold" (Storytime cannot place or read holds), with expected date from the wait estimate.
- Shelf tags from Goodreads/StoryGraph exports as filters; series order; currently-reading pinned on top.
- Library card notes (which libraries need renewing, card expiry) and a per-library count of how many of her books each holds, to show which cards are worth keeping.
- Share a book or a "borrow now" list as text; Kindle-availability flag (US libraries only).
- For red books: bookshop/affiliate links, "suggest a purchase" link to the library, donations link. Keep affiliate links off anything that shows library availability as a paid feature.
- Tagalog strings for Storytime screens; first-run walkthrough; install prompt.
- Before any public push: test with a second person's list, add a privacy note page, and re-read OverDrive's terms.

## 8. Pitfalls learned
- A new session may be able to clone but not push (`not in this session's authorized repository set`). Adding the repo from inside the session was also refused. Do not work around it: give her the changed files, or ask her to add the repo to the session's sources.
- The sandbox shell cannot reach Goodreads, OverDrive or relays. Use WebFetch for single catalogue lookups (one at a time; ~20 in parallel gets rate-limited). `libbyapp.com/api/...` is robots-disallowed.
- Enabling GitHub Pages via the API was not permitted; she switched it on in Settings → Pages.
- Pushing a GitHub Actions workflow and starting it was blocked by the session's safety check. Do not retry or work around it; hand her the files.
- "Menu → library → Share" in Libby does not exist; do not tell users to find codes that way.
- Hash-only navigation does not reload the page: anything painted once at start-up (e.g. the backup count) must be refreshed after saves (`rebuildIndex()` calls `bkPaint()`).
- Playwright with `service_workers='block'` raises a harmless "context is sandboxed" error inside the widget iframe; the test filters it.
- In Playwright, click sticky top-bar buttons by coordinates, not `locator.click()`.
- GitHub Pages path is case-sensitive: `/Storytime/`.
- In tests, tap the format radios (My libraries) by position after centring them (`pick_fmt`); the bottom tab bar covers them otherwise.
- Test mocks: with `lapl` as favourite the smart check makes 9 lookups for 5 books; the full check makes 10.

## 9. Files to re-attach
None. The icon is already in the repo.
