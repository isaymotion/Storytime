# Storytime dev-tools

Not part of the published app. Kept on this branch so `main` (the GitHub Pages site) stays clean.

| File | What it is | How to run |
|---|---|---|
| `tests/test_app.py` | End-to-end browser test with a stand-in library catalogue, Goodreads feed, relays and widget (no real network needed). | `pip install playwright && playwright install chromium`, then `python3 tests/test_app.py /path/to/Storytime-main-checkout`. Passing = last line `FAILS: []`. Screenshots go to `$ST_OUT` (default `/tmp/storytime-qa`). Uses port 8765. |
| `optional-library-list/build-libraries.mjs` | Node 20 script that pages through the public OverDrive library list and writes `data/libraries.json` (`{built, libraries:[[code,name],...]}`). Never run against the real service yet. | On `main`, it must live at `tools/build-libraries.mjs`. `node tools/build-libraries.mjs` |
| `optional-library-list/libraries.yml` | GitHub Actions workflow (weekly + manual) that runs the script and commits the list. NOT installed. | Only if Isabella approves: she adds it to `main` as `.github/workflows/libraries.yml` herself. The app already reads `data/libraries.json` when present. |
| `HANDOFF.md` | Copy of the project handoff doc. | Read first. |

The design check lives in the `isaymotion-app-design` skill: `python3 <skill>/scripts/check_design.py <app dir> --browser` (delete the `_qa/` folder it creates before committing).
