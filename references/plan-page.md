# The HTML plan page

`make_html.py` writes one self-contained page (`OUTPUT_HTML`): photos are embedded as base64 previews, with direct links to full-resolution Google Photos CDN images. Serve it on localhost and show it in the browser pane (`python3 -m http.server 8000 --bind 127.0.0.1`).

## What it shows
- Title line, counts (candidates / kept / out / cut for space / pages, full pages, spreads).
- Trip facts from the family's documents (`TRIP_FACTS`), the cover and back cover.
- Recommended product and price table (`PRODUCT_HTML`), layout rules, reasons for left-out photos.
- The route map, theme recommendations with sample images.
- **Trip Plan card** (when `TRIP_PLAN_URL`/`TRIP_PLAN_QR` are configured): prominent banner linking to the full itinerary doc.
- **Review instruction banner** (bilingual Hebrew/English): explains controls, mark types, and shortcuts.
- **Every page** in book order, as open spreads (right page first), drawn to scale:
  - Clean white page backgrounds (`PAGE_BG_WHITE = True`) by default.
  - Photos render in their enhanced **After tuning** view by default (`<body class="after">`, merging `EXTRA_TUNE` overrides); click **Show: After tuning** in the toolbar to toggle back to **Before**.
  - Photos show their number badge, aspect-ratio framing, hover-only action buttons (`✕`, `?`, `🔍` fade in only when hovering over the photo), and — only on photos where a tighter crop would make them much better — an always-visible clickable **`✂ Suggested crop`** chip.
  - Page titles, QR codes with titles next to them (`VIDEO_TITLES` / `title_he`), text pages. Editor page numbers under each page.
- **Photo index of all candidates**:
  - Full-opacity thumbnails for unkept photos (not dimmed, making them easy to review), displayed in **After tuning** view by default.
  - Hover-only overlay buttons on each photo (`★` Star on unkept candidates, `🔍` Zoom for fullscreen high-res lightbox), plus the **`✂ Suggested crop`** chip on photos with a crop suggestion and a **`✂ Suggested crops`** filter button.
- **Video Gallery (`#videos`) at the bottom**:
  - Displays all videos captured during the trip, clearly distinguishing between those **part of the album** (linked via QR code with page number and title) and those **outside the album**.
  - Inline **Title next to QR** input on every video card (and inside `#videolb`) so the user can name any video; edits preview immediately next to matching QR codes on album pages and export via **Copy my marks**.
  - Hover-only overlay buttons on video thumbnails (`★`, `?`, `▶`), plus direct watch links (`▶ צפה בסרטון ↗`) and `#videolb` modal. Once the user finalizes which videos go in the book, update each selected video's link in Google Photos (**Share → Create link → Create link → Copy**) into `VIDEO_LINKS` so QR codes open the specific video on Android as well as iOS/Web.
  - Toolbar filters: All videos, In album (with QR), Outside album, Starred, Questions, My marks (includes videos with edited titles), and real-time search.

## Interactive Tools and Marks (plan.js)
- **Optional Suggested Crops (`✂ Suggested crop` chip & `#croplb` Before / After Modal)**:
  - Strictly opt-in and independent of the global **Before / After tuning** toggle — unapproved suggestions never alter the photo on the page or in print files.
  - Clicking the **`✂ Suggested crop`** chip on any spread photo or Photo Index card opens `#croplb`, showing **Before (Original)** with an exact toggleable crop-frame overlay side-by-side with **After (Suggested crop)**, the agent's short reason, and the resulting dimensions/aspect ratio.
  - User chooses **✓ Approve crop**, **✕ Keep original (no crop)**, or **Reset**, plus an optional note. Approving updates the chip to green (`✓ Crop approved`), previews the crop cleanly, and exports the exact approval + box coordinates via **Copy my marks**.
- **Enlarged QR Code Modal (`.qrbig`)**:
  - Clicking any QR code (or its label) on album pages opens an enlarged, clear view.
  - Includes an inline **Title next to QR** input to set or tweak the label live on the page (synced with the Video Gallery card when linked to `video_n`).
  - Features a prominent **"פתח קישור ישיר בדפדפן ↗"** button that directly opens the destination link (Google Photos video/album or trip plan document) in a new browser tab.
- **Video Gallery & Video Modal (`#videolb`)**:
  - Direct watch button (`▶ צפה בסרטון ↗`) on every video card.
  - Clicking a video card opens `#videolb` with the video preview, place, description, duration, album status, and editable **Title next to QR** field.
  - Allows marking any video with **Star (★ Favorite)** or **Question Mark (?)** without losing its custom title.
- **Fullscreen High-Res Photo Lightbox (`#photolb`)**:
  - Click the **🔍** button on any photo tile or in the candidate index.
  - Instantly shows the local thumbnail, while asynchronously fetching the high-resolution (`=w2048-h1600`) image directly from Google Photos CDN with an animated spinner.
  - **Keyboard navigation**: Left/Right arrow keys navigate between photos; `Escape` closes the lightbox.
  - Shows metadata (dimensions, megapixels, timestamp, camera model, review note, tuning parameters).
  - Direct "Open in Google Photos ↗" link.
  - In-modal quick action buttons (Replace ✕, Star ★, Question ?, Add back).
- **Marks**:
  - **Replace (✕)**: Red ✕ on an album photo; click a candidate from the index to replace it.
  - **Question Mark (?)**: Flag any photo or video with an amber question mark badge and review question/note.
  - **Star (★)**: Star candidate photos in the Photo Index or videos in the Video Gallery to mark favorites to add to the book.
  - **Swap**: Swap two photos on the same page or spread ("Swap with").
  - **Add back**: Bring back a left-out or cut-for-space photo.
- **Toolbar Filters**:
  - Filter photos by **★ Starred** or **? Questions** to quickly review flagged items.
  - Filter videos by in-album, outside album, starred, or questions.
- **Saving & Exporting**:
  - Marks and custom video/QR titles are persisted in `localStorage` (`STORE_KEY`).
  - **Copy my marks** generates a structured, easy-to-paste summary in chat containing replacements, removals, kept photos, question notes, starred candidates, video marks (favorites & questions), and custom video/QR titles.

## Applying a round
1. Ask for the pasted "Copy my marks" text (in Cowork; or on Mac read with `read_chrome_marks.py <STORE_KEY>`).
2. Put them in `album_config.py`: `REPLACE`, `FORCE_OUT`, `FORCE_KEEP`, `FORCE_HERO`, `SWAPS`, `NOTES`, `PAGE_CHUNKS`, `VIDEO_TITLES` (and/or `QR_CODES[...]["title_he"]`). For approved crops, move the approved box into `APPROVED_CROPS` and remove it from `SUGGESTED_CROPS` (for declined crops, simply remove from `SUGGESTED_CROPS` — never apply unapproved crops). Bump `STORE_KEY`.
3. A swap marked again means "put them back": remove the old swap, don't add a new one.
4. Rebuild (`build_plan.py → layout_pages.py → prepare_originals.py` if any new `APPROVED_CROPS` / `EXTRA_TUNE` → `make_html.py`), then check that each mark really happened before confirming. Back up `plan.json` and `album_config.py` first.
5. When the user approves the book, set `LOCK_FILE` so later rounds change only what they ask.

## Chat requests (no marks needed)
The user may simply say "page 42: swap 165 and 172", "straighten 328", "make 498 a full page like 496", "clean white background", "move the title to page 75", "enhance 433". Translate editor page numbers to plan page numbers (`plan == editor` for Picabook where `EDITOR_OFFSET = 0`; `plan = editor − 1` for Lupa where `EDITOR_OFFSET = 1`), update `album_config.py`, rebuild, and verify on the plan.
