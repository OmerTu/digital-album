---
name: digital-album
description: Turn a shared Google Photos album of a trip into a printed photo book, end to end. It learns the trip (photo count, places, dates), researches the album maker's books, sales and vouchers, suggests the best book and theme, picks and enhances the best photos, builds an interactive HTML plan the user marks up, drives the album editor in the browser (first-class automated support for Picabook / picabook.co.il with native editable text boxes, exact cm frame placement & native QR codes, plus Lupa and guided support for other makers), places QR codes for videos, and runs a final print check. Use it whenever someone wants a photo album, photo book, "אלבום", "ספר תמונות", "פיקאבוק", "picabook", "לופה" or a printed trip book, shares a photos.app.goo.gl / photos.google.com album link for a book, asks which album maker or deal is best, or continues work on an album folder ("page 42…", "swap 165 and 172", "straighten 328", "add a QR to page 12") — even if they never say "skill".
---

# Digital album: from a Google Photos link to a printed book

The user is usually not technical. Do all the technical work yourself, explain in plain words, show results
visually (the HTML plan, screenshots), and verify before saying something is done. End each reply with 2–3 short
next-step options. Ask only for decisions that are the user's: the book, the theme, the photos, the texts, the
price option. Never order, never add to cart, never enter passwords or payment details, decline non-essential
cookies. Edit nothing in the album editor before the user says go for that round.

Read before starting: `references/design-rules.md` (the look and the rules), then the reference for the stage.

## Stage 0 · Setup (first time on this computer)
Ask for (or create) one folder per album. Copy `scripts/*` and `assets/plan.css`, `assets/plan.js` into it, and
`assets/album_config_template.py` as `album_config.py` (defaults to `COMPANY = "Picabook"`, `PW = 29.0`, `PH = 22.0`,
`BOOK_PAGE_STEP = 4`, `EDITOR_OFFSET = 0`; set `COMPANY = "Lupa"`, `PW = 30.0`, `EDITOR_OFFSET = 1` for Lupa).
Run the checks in `references/cowork-setup.md`.
Ask once: the book's text language (Hebrew or English titles; the book reads right to left either way).

## Stage 1 · Learn the trip from the album link
1. `python3 fetch_album.py "<link>" [dest_dir]`: numbered photos (camera-time order), 600 px previews, contact sheets of
   20, sizes, cameras, quality stats, and saves `raw_items.json`. Report: photo count, dates, number of cameras, videos.
2. Review every photo with parallel subagents, all launched in one message, ~140 photos each, with
   `references/review_prompt.md` (they write `notes/part<N>.json`). Merge their places → SECTIONS in
   album_config.py (page title per place in the book's language; no 45-char cap in Picabook, ≤45 chars in Lupa).
3. `python3 clock_check.py` (needs the review notes): finds a camera whose clock was off (one is common). Put the
   fix in CLOCK_FIXES and tell the user in one line.
4. Locations: `references/locations.md` (the owner's signed-in Google Photos, or ask for the stops).
Show: the trip as a list of places with dates and photo counts.

## Stage 2 · Learn the album maker
Ask which company — **recommend Picabook (`www.picabook.co.il`, פנורמי 29×22 הדפסת יהלום)** first for Israel
(richer online editor with freeform editable Hebrew/English text boxes, exact `cm` frame sizing/positioning, and
native QR codes), or **Lupa (`www.lupa.co.il`)**. For Picabook read `references/picabook.md`; for Lupa read
`references/lupa.md`; for any other maker follow `references/other-companies.md`. Check live: books, sizes, page
limits (Picabook Diamond Lay-flat: 24–100 pp in `+4` steps; Classic: up to 144 pp), lay-flat, current sales, coupons
and vouchers (and whether they stack), shipping. Use a background subagent for the deal research while you work.
Show a price table with sources and the total for the likely page count.

## Stage 3 · Suggest the book and theme
- Page count from the photos: about 3–5 photos per page (strictly maximum 5 photos per page) plus a full page every 5–7 pages; round to the maker's
  page step (`BOOK_PAGE_STEP = 4` for Picabook Diamond); at most the product's maximum (100 pages for Picabook Diamond, 144 for Classic / Lupa).
- Shape from the photos (mostly landscape → panoramic: `29×22 cm` in Picabook, `30×22 cm` in Lupa). Lay-flat ("הדפסת יהלום" in Picabook, "הולנדי" in Lupa) if there are drone shots or panoramas.
- 3–5 themes that fit the trip's look, with sample pictures in `themes/`, one marked as the top pick.
Write PRODUCT_HTML and THEMES in the config. The user decides.

## Stage 4 · Build the HTML plan
1. Fill album_config.py: `COMPANY`, `PW`, `PH`, `SECTIONS`, `COVER`, `DEPARTURE`, intro, texts, `EXTRA_TUNE`, `STOPS`/`ROUTE` (supports `US_STATES = False` for non-US trips), `PAGE_BG_WHITE = True` (clean modern white background), and optional `CAPTIONS`/`TRIP_PLAN_URL`/`PAGE_CHUNKS`.
   - **Optional suggested crops (`SUGGESTED_CROPS`):** Inspect photos flagged `crop tighter` (or any photo where cropping would genuinely make it **much better**, e.g. removing distracting edges or bringing a distant subject closer) by opening `thumbs/NNN.jpg` and writing normalized `SUGGESTED_CROPS[n] = {"box": (x0, y0, x1, y1), "reason": "..."}`. **Never** auto-apply crops or put unapproved crops in `APPROVED_CROPS` — suggested crops stay strictly optional behind a clickable **"✂ Suggested crop"** chip in the HTML plan (unlike automatic brightness/contrast tuning).
2. `python3 build_plan.py && python3 layout_pages.py`, then `python3 prepare_originals.py` (full-size originals,
   print tuning, straightening, and ONLY user-approved `APPROVED_CROPS`), `python3 make_map.py`, `python3 make_html.py`.
3. Check: every kept photo framed once, maximum 5 photos per page strictly respected, every left-out photo has a reason, page count right, a big photo every
   5–7 pages, no crop beyond 5%.
4. Serve the folder on localhost (`python3 -m http.server <port> --bind 127.0.0.1`) and open the plan in the
   browser pane. Screenshot pages yourself before showing it. What the page has: `references/plan-page.md` (including the Video Gallery at the bottom displaying all trip videos, in-album vs unlinked, with direct watch links and favorite/question marking).

## Stage 5 · Changes (as many rounds as the user wants)
Interactive marks from the plan ("Copy my marks") or plain chat requests:
- **Interactive tools**: Photos display in their tuned (**After tuning**) view by default (toggleable with Before). Photo action buttons (`✕`, `?`, `★`, `🔍`) appear only on hover over each photo (same for video thumbnail buttons). Photos with a proposed crop display a clickable **`✂ Suggested crop`** chip opening a Before/After crop comparison modal to approve or keep original (strictly opt-in, independent of tuning). Fullscreen high-res lightbox (`🔍`, keyboard arrow navigation, Esc), Star (`★`) to bookmark candidates from the Photo Index, Question Mark (`?`) to flag photos or videos with questions, Video Gallery with direct Google Photos links, star/question marking, and inline **per-video QR title** inputs (also editable in the video modal and enlarged QR modal, updating the label next to the QR code live), Replace (`✕`), Swap, and Add back. Candidate photos outside the album keep 100% opacity for comfortable review.
- Apply marks in the config (`REPLACE`, `FORCE_OUT`, `FORCE_KEEP`, `PAGE_CHUNKS`, `CAPTIONS`, `VIDEO_TITLES`, `QR_CODES`, `APPROVED_CROPS` for user-approved crops only, etc.), rebuild, check each change really happened, show it. Details: `references/plan-page.md`. Typical requests:
replace, swap, add back, full page, background photo, straighten (test 3 angles on a grid, pick by eye),
enhance (show before/after), new photos from a new link (fetch into a sub-folder, number them after the last
photo), move or reword a title, cover photo and cover title (`make_cover_photo.py`, `make_cover_title.py` — note Picabook places crisp native editable cover & spine text directly over `000_cover.jpg`).
No generative edits, ever. Back up plan.json and album_config.py before each round.

## Stage 6 · The album editor
Use Antigravity's built-in Browser Subagent (`/browser`) or Chrome DevTools / Playwright MCP tool to interact with the Google Photos tab and the web editor.
- **Picabook (`editor.picabook.co.il`, default):** the user signs in and creates a blank project (e.g., פנורמי 29×22, הדפסת יהלום, פתיחה עברית). Run:
  `make_upload_set.py → make_qr.py → make_cover_photo.py → picabook_layout.py → make_html.py → check_book.py`.
  Then follow "Push Procedure" in `references/picabook.md` (Path A via `/browser` UI batching or Path B via `picabook_apply.js`): disable `עיצוב אוטומטי`, add extra pages (`+4` combobox), upload `ready/upload/*.jpg` in batches, place each frame at its exact `x, y, w, h` in `cm`, add native editable `Heebo Unicode` text boxes (page headers, intro/opening/closing stories, photo captions, cover title + subtitle, rotated spine title — **never** baked into title-tile JPEGs, and **never** with a background box), place native QR codes + Hebrew labels, click `שמירה`, screenshot every spread, and verify.
- **Lupa (`lupa.co.il`):** the user signs in and creates the book (product, size, pages, theme) and uploads one photo. Follow "Push procedure" in `references/lupa.md`:
  `lupa_layout.py → lupa_titles.py → restamp_tiles.py → make_html.py → check_book.py`, upload missing batches (≤10 MB), load `lupa_apply.js`, rebuild only changed spreads, save, reload, screenshot, check.
- **Other makers:** print-ready page/spread files and a guided upload (`references/other-companies.md`).

## Stage 7 · QR codes
1. **Finalize Android-safe per-video links once video selection is done (required before final QRs / editor push):**
   - The default `photos.google.com/share/<album>/photo/<item>?key=...` URL from `fetch_album.py` only opens the specific video on Web and iOS — on **Android**, it opens the main album instead!
   - Therefore, once the user finishes choosing which videos go in the book, open each selected video in Google Photos (signed-in browser via `/browser` or Chrome DevTools MCP) and click **Share** (`שתף`) → **Create link** (`צור קישור`) → **Create link** (`צור קישור`) → **Copy** (`העתק`) to get a standalone `https://photos.app.goo.gl/...` link for that individual video.
   - Store each standalone link in `VIDEO_LINKS` (and/or `QR_CODES[...]["url"]`) in `album_config.py`, then re-run `make_qr.py` (auto-rebuilds source & upload QR images when URLs change), `picabook_layout.py`, `make_html.py`, and `check_book.py` (which blocks any remaining album-item `/share/.../photo/...` QR link).
2. Offer a QR code per place that has a video or itinerary doc (`make_qr.py` with dual-detector verification). Name each QR file from the linked item's own date and place, and place it in the top margin (`x=1.0, y=0.22, s=1.92`) or on background with the layering rules: `references/qr-rules.md`.
3. In Picabook (`PICABOOK_NATIVE_QR = True`), `picabook_layout.py` emits native vector QR codes (`הוסף קוד קישור`) plus a native `Heebo Unicode` caption (from `VIDEO_TITLES` or `title_he`) placed next to the QR code (falling back below if side margin is tight) and automatically shifts page headers to avoid collisions. A QR is always the top layer, never crosses a photo's edge, and opens direct links (with inline title editing) in the plan modal.

## Stage 8 · Final check, then the user orders
1. `python3 check_book.py`: sharpness of every photo, cropping, overlaps, duplicates, native text bounds & non-repetition, QR size / trim / top layer / straddling / **Android-safe standalone video URLs** (fails if any QR still points to `photos.google.com/share/.../photo/...`). In Picabook also `claudePicabook.check()` (or visual spread pass); in Lupa `claudeLupa.check()`.
2. Look at every spread in the editor (step through every `.pageArea` thumbnail in Picabook from `כריכה` down to `עמוד P`, or set page index in Lupa; screenshot each).
   Look for: hidden or cut text, boxes behind text, misplaced QR codes, empty areas, repeated headers.
3. Spell-check every page title, the cover title and the spine text; keep one spelling of each word.
4. Answer print-quality worries with evidence: the stored file size and dpi, and a 100% crop of the real file.
5. Price table again with the best option and its deadline. Stop at "ready to order".

## Files in this skill
- `scripts/`: the pipeline (fetch, review merge, layout, tuning, map, plan page, `picabook_layout.py`, `lupa_layout.py` + `lupa_titles.py`, QR, restamping, cover, `check_book.py`) plus `picabook_apply.js` (Picabook Web 4.0 editor helper) and `lupa_apply.js` (Lupa editor driver).
- `references/`: `design-rules`, `picabook`, `lupa`, `other-companies`, `plan-page`, `qr-rules`, `locations`, `cowork-setup`, `review_prompt`.
- `assets/`: `album_config_template.py`, `plan.css`, `plan.js`.

## License

Version 2.0 is available for personal and other noncommercial use under the PolyForm Noncommercial License
1.0.0. Commercial use requires a separate written license from Idan Shenhav. See `LICENSE` and
`COMMERCIAL-LICENSE.md`; this includes copying, pitching, selling, licensing, or providing the skill to a print
house, album maker, photo-book company, or other business. The `LICENSE` file governs.
