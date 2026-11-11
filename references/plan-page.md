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
  - Photos with their numbers, aspect ratio framing, and action buttons.
  - Page titles, QR codes with Hebrew labels (`title_he`), text pages. Editor page numbers under each page.
- **Photo index of all candidates**:
  - Full-opacity thumbnails for unkept photos (not dimmed, making them easy to review).
  - Star (★) button on unkept candidates to bookmark them for addition.
  - Zoom (🔍) button to open the fullscreen lightbox.
- **Video Gallery (`#videos`) at the bottom**:
  - Displays all videos captured during the trip, clearly distinguishing between those **part of the album** (linked via QR code with page number and title) and those **outside the album**.
  - Direct option to watch and open each video (in Google Photos or via the `#videolb` video modal).
  - Marking videos with **Favorite (Star ★)** or **Question Mark (?)** for reviews.
  - Toolbar filters: All videos, In album (with QR), Outside album, Starred, Questions, and real-time search.

## Interactive Tools and Marks (plan.js)
- **Enlarged QR Code Modal (`.qrbig`)**:
  - Clicking any QR code on album pages opens an enlarged, clear view.
  - Features a prominent **"פתח קישור ישיר בדפדפן ↗"** button that directly opens the destination link (Google Photos video/album or trip plan document) in a new browser tab.
- **Video Gallery & Video Modal (`#videolb`)**:
  - Direct watch button (`▶ צפה בסרטון ↗`) on every video card.
  - Clicking a video card opens `#videolb` with the video preview, place, description, duration, and album status.
  - Allows marking any video with **Star (★ Favorite)** or **Question Mark (?)**.
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
  - Marks are persisted in `localStorage` (`STORE_KEY`).
  - **Copy my marks** generates a structured, easy-to-paste summary in chat containing replacements, removals, kept photos, question notes, starred candidates, and video marks (favorites & questions).

## Applying a round
1. Ask for the pasted "Copy my marks" text (in Cowork; or on Mac read with `read_chrome_marks.py <STORE_KEY>`).
2. Put them in `album_config.py`: `REPLACE`, `FORCE_OUT`, `FORCE_KEEP`, `FORCE_HERO`, `SWAPS`, `NOTES`, `PAGE_CHUNKS`. Bump `STORE_KEY`.
3. A swap marked again means "put them back": remove the old swap, don't add a new one.
4. Rebuild (`build_plan.py → layout_pages.py → make_html.py`), then check that each mark really happened before confirming. Back up `plan.json` and `album_config.py` first.
5. When the user approves the book, set `LOCK_FILE` so later rounds change only what they ask.

## Chat requests (no marks needed)
The user may simply say "page 42: swap 165 and 172", "straighten 328", "make 498 a full page like 496", "clean white background", "move the title to page 75", "enhance 433". Translate editor page numbers to plan page numbers (`plan == editor` for Picabook where `EDITOR_OFFSET = 0`; `plan = editor − 1` for Lupa where `EDITOR_OFFSET = 1`), update `album_config.py`, rebuild, and verify on the plan.
