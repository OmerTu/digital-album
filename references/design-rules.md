# Design rules (proven on 100-page printed books)

These rules came from many review rounds on real albums that printed perfectly. Follow them unless the user asks for something else, and tell the user when a request breaks one.

## Book
- Read right to left (Hebrew books, `פתיחה עברית`). An open spread = the right page first. Page titles may be Hebrew or English.
- Page numbers: use the album editor's numbers when talking to the user (`EDITOR_OFFSET = 0` in Picabook where `עמוד 1` == plan page 1; `EDITOR_OFFSET = 1` in Lupa because Lupa counts its opening-words page as page 1, so editor page = plan page + 1).
- Lay-flat books (Picabook "הדפסת יהלום" `29×22 cm` → `58×22 cm` canvas; Lupa "הולנדי" `30×22 cm` → `60×22 cm` canvas) open 180° flat with zero gutter loss, and photos may cross the fold.
- Clean white page background (`PAGE_BG_WHITE = True`): gives a crisp, modern look. Blurred photo backgrounds can still be enabled if requested (`PAGE_BG_WHITE = False`).

## Order
- Strict camera-time order, after fixing wrong camera clocks (one camera is often hours off; duplicate shots from two cameras give the exact offset).
- Group by place/section in `SECTIONS` order: photos of the same place belong together on the same spread or consecutive pages.
- Story beats camera time only for planned exceptions (e.g. an intro spread, a key moment moved one page). Use `ORDER_BEFORE` or `PAGE_CHUNKS` in the config. Never change a photo's actual camera time.

## Layout & Limits
- **Maximum 5 photos per page**: Strictly enforced across all single pages and merged double-page spreads. A page with 6+ photos looks cluttered and cheap; keeping 2–5 photos per page guarantees generous sizing and readability.
- **Explicit Section Photo Chunks (`PAGE_CHUNKS`)**: For fine-tuned control over which photos appear on each page of a section, configure `PAGE_CHUNKS: dict[str, list[list[int]]]`.
- **Never crop silently.** Each frame keeps the photo's own shape (portrait stays portrait, 16:9 stays 16:9; at most 5% trim off one side to close a wide gap).
  - **Optional suggested crops (`SUGGESTED_CROPS` → `APPROVED_CROPS`):** When cropping a photo would genuinely make it **much better** (e.g., removing distracting edge clutter/photobombers or bringing distant family closer), propose it in `SUGGESTED_CROPS` (normalized `(x0, y0, x1, y1)` + short reason). Unlike print tuning (`bright`/`contrast`/`sat`), suggested crops are **strictly opt-in** — never auto-applied to layouts or print files. They render as a clickable **"✂ Suggested crop"** chip in `album-plan.html` with a Before/After view; only after the user explicitly approves a crop do we move it into `APPROVED_CROPS`, which then reshapes the frame to the approved crop's exact aspect ratio and crops the original in `prepare_originals.py`.
- A full-page or double-page photo every 5–7 pages (big landscapes, strong family photos). It keeps its shape, framed cleanly on the page.
- Every photo gets a number and a visible preview. Every left-out photo gets a reason. Show counts: candidates / kept / out / cut for space.
- A page can be left partly empty on purpose for handwriting or clean negative space.

## Text
- **Picabook (`COMPANY = "Picabook"`)**: Native editable freeform text boxes (`Heebo Unicode` by default) with no character limit — supports multi-line opening/intro/closing stories, page headers, photo captions (`CAPTIONS`), cover titles, and rotated spine text directly in the editor.
- **Lupa (`COMPANY = "Lupa"`)**: Native page title ≤ 45 characters, photo caption ≤ 21 (longer titles/stories are rendered as >800 px JPEGs via `lupa_titles.py`).
- **No box or background behind any text.** Text colour stands out from the page: dark text (`#1F2328`) on light background, white (`#FFFFFF` + subtle drop shadow) on dark.
- **Never repeat a page header.** A header appears on the first page of its place only. Header title can be right-aligned on specific pages via `TITLE_RIGHT_ALIGN`.
- No icons, symbols or flags in headers.
- Distances: kilometres first, miles in brackets (e.g. "9,100 km (5,666 mi)").
- Notes to the user inside the plan are in the user's chat language; book text in the album's language.
- Spell-check every title before printing. Keep one spelling of a word across the whole book, the cover and the spine.

## Map
- From the photos' own locations, on real roads (OSRM).
- **International Support (`US_STATES = False`)**: For trips outside the US, skips US state polygon processing and state shading, cleanly drawing the OSRM route and numbered stops directly over the shaded relief basemap.
- US trips (`US_STATES = True`): Each state in its own colour with borders and names. Stats line includes distance and state count.
- Route caching to `map/osrm_line.json` and `map/route_stats.json` for rapid rebuilds.
- Credit Esri and OpenStreetMap/OSRM.

## Photo quality & Review Experience
- **Interactive Review Features**:
  - Fullscreen high-resolution lightbox (`#photolb`) with keyboard arrows, Escape key, and direct Google Photos CDN fetching (`=w2048-h1600`).
  - Flagging options: Replace (✕), Question Mark (?), and Star candidate (★). Unkept candidates remain clearly visible (100% opacity).
- Print tuning per photo: brightness, contrast, saturation; lift shadows on faces in shade; straighten tilted horizons (test 3 angles against a grid, pick by eye).
- Full-size originals only (Google Photos `<url>=d`). JPEG q95, sRGB. Never upscale or over-sharpen.
- **No generative edits, ever**: no AI fill, no removing objects, no changing faces or people. Only normal photo controls.
- The editor's on-screen preview of a full page is small (Lupa: 1282 px across a whole spread) and looks soft. That is not the print. Check the real file at 100% and the stored size (Lupa keeps ~277 dpi for full pages).
