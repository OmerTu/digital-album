# Picabook (picabook.co.il): products, deals and the Web 4.0 editor route

Facts verified November 2026 on `www.picabook.co.il`, `support.picabook.co.il`, and live `editor.picabook.co.il`.
**Always re-check live prices, active sale percentages, and voucher terms before quoting.**

## Where to look
- Albums entry & wizard: https://www.picabook.co.il/HE-IL/Albums.asp?type=0
- Full price list & format specs: https://www.picabook.co.il/HE-IL/Albums_Price.asp
- Shipping options & turnaround: https://www.picabook.co.il/HE-IL/Shipping.asp
- Discounts & stacking policy: https://www.picabook.co.il/HE-IL/Discounts.asp
- Pic-A-Club memberships: https://www.picabook.co.il/HE-IL/Pic-A-Club.asp
- Support Knowledge Base (Be'eri Print House specs): https://support.picabook.co.il/portal/he/kb/picabook
- Live Online Editor (requires sign-in): `https://editor.picabook.co.il/?open=<PROJECT_GUID>`
- Decline non-essential cookies and close promotional pop-ups. Never sign up, log in, add to cart, or order for the user.

## Products & Sizes (Be'eri Print House / דפוס בארי)
- **Formats & dimensions (width × height cm):**
  - **פנורמי (Panoramic Landscape): 29 × 22 cm** — top pick for trip albums (soft, hard, or **הדפסת יהלום** lay-flat; also **פנורמי חלון** 29×22 in leatherette/linen).
  - **פריזמה גדול (Square Large): 29 × 30 cm** (hard or הדפסת יהלום; also **פריזמה חלון** 29×30 in leatherette/linen).
  - **פריזמה קטן (Square Small): 21.5 × 22 cm** (soft, hard, or הדפסת יהלום).
  - **פורטרט (Portrait): 22 × 30 cm** (soft, hard, or הדפסת יהלום).
  - **פורטפוליו (Portfolio XL): 40 × 30 cm** (hard or הדפסת יהלום).
- **Paper & binding:**
  - **הדפסת יהלום (Diamond Lay-Flat — recommended):** heavyweight 340 gsm photographic sheets (laminated back-to-back with rigid core), seamless **180° flat opening** with zero gutter loss across the center fold. Essential when spreads carry panoramic/drone shots or merged cross-fold layouts.
  - **נייר קלאסי (Classic):** 170 gsm coated chromo paper with gloss protective varnish, standard spine binding (has center gutter).
- **Page counts & increments:**
  - Minimum: **24 pages** (base price covers 24 pages).
  - Maximum: **100 pages strictly** for **הדפסת יהלום**; **144 pages** for Classic hard/soft covers.
  - **Page step in the Web 4.0 Online Editor:** **`+4` pages** (`+2` spreads at a time: 24, 28, 32, …, 100). Always set `BOOK_PAGE_STEP = 4` in `album_config.py`.
  - **Page numbering (`EDITOR_OFFSET = 0`):** Page 1 in `plan.json` is `"עמוד 1"` in Picabook (1-to-1 match; unlike Lupa, Picabook has no extra unnumbered opening-words page before page 1 — an uncounted white barcode/logo sheet is added at the back during binding).
- **Example prices (Nov 2026 — re-check live):**
  - **פנורמי 29×22 הדפסת יהלום:** Base 24 pp = 219 ₪ list (153 ₪ at 30% off) + 5.00 ₪/extra page list (3.50 ₪/page = 14 ₪ per +4 pages at 30% off). **100 pp = 599 ₪ list / ~419 ₪ on 30% sale.**
  - **פנורמי 29×22 כריכה קשה (קלאסי):** Base 24 pp = 149 ₪ list (104 ₪ at 30% off) + 3.50 ₪/extra page list (2.45 ₪/page at 30% off). **100 pp = 415 ₪ list / ~290 ₪ on 30% sale.**

## Deals, Vouchers & Shipping: how to compare
- **No stacking ("אין כפל הנחות"):** site-wide percentage sales, promo codes, Pic-A-Club discounts, and workplace/club vouchers do **not** combine. Discounts apply to the base book and extra pages, **never to shipping**.
- **Club vouchers** (Hever / חבר, בהצדעה, קרנות השוטרים, טוב, שלך): typically cover the **base 24-page book** for the specific model; extra pages above 24 are charged at **full list price** at checkout, plus shipping. Compare:
  1. Site-wide sale total (discounted base + discounted extra pages + shipping)
  2. Club voucher total (voucher cost + `(pages − 24) × list_extra_page_price` + shipping)
- **Quantity discounts (identical copies):** 2–5 copies = 10% off list; 6+ copies = 20% off list.
- **Shipping (`Shipping.asp`):**
  - Self-pickup from Rosh HaAyin (HaSibim 49 / Be'eri logistics): **0 ₪**
  - CargoBox locker / pickup point / registered mail: **22 ₪**
  - Cargo courier to door: **39 ₪** (up to 2 albums can consolidate in one shipping fee).
  - Production time: ~5 business days for Classic, ~7–8 business days for Diamond Lay-flat, plus 3–4 business days delivery.

---

## Why Picabook's Web 4.0 Editor Beats Baking Images
Picabook's browser editor (`https://editor.picabook.co.il/?open=<GUID>`, powered by Sunpics Angular 12 + Fabric.js) gives full vector & freeform layout control:
1. **Native freeform Hebrew & English text boxes (`טקסט`):**
   - Transparent background by default (no coloured box behind text!).
   - **140 fonts** including **`Heebo Unicode`** (default match for our plan), `Rubik Unicode`, `Assistant Unicode`, `Alef Unicode`, `OpenSansHebrew Unicode`, `VarelaRound Unicode`, `SecularOne Unicode`, `Arimo Unicode`, `Arial Unicode`, and EFT display fonts.
   - Native **Bold** (`icon_bold`), custom font size (`numericInput`), hex/picker colour, RTL/LTR direction (`RTLdir` / `LTRdir`), alignment (`icon_alignright` / `center` / `left`), expandable **drop shadow (`הצללה`)** for light text over photos, exact cm position (`מיקום`), and **no 45-character cap**.
   - Therefore **do NOT run `lupa_titles.py` or rasterize `TEXT_HALF` cards**: all page headers, opening words, intro stories, closing text, QR captions (`title_he`), cover titles, and spine text stay **live editable text boxes**!
2. **Exact centimeter frame positioning & sizing:**
   - Single page = **29.0 × 22.0 cm**; open spread = **58.0 × 22.0 cm**; origin `(0, 0)` at top-left; center fold at `x = 29.0 cm`.
   - Every photo frame accepts exact `x, y, width, height` in **cm** (`input.inputsDimsPos`), layer ordering (`שכבות`), border width/colour, and seamless cross-fold placement on הדפסת יהלום spreads.
   - Original filenames are preserved on upload (`012_004_n045.jpg`), with no 800 px minimum-size rejection.
3. **Native QR Code tool (`QR Code`):**
   - Left toolbar `QR Code` button generates crisp vector QR objects directly from a URL (`הוסף קוד קישור`), paired with a native `Heebo Unicode` caption box right underneath (`title_he`). Pre-rendered `make_qr.py` tiles are also supported when custom background tinting is desired.

---

## Spread & Coordinate Geometry in Hebrew RTL ("פתיחה עברית")
For a book of `P` pages (where `P` is even, `24 <= P <= 100`, step `4`), the bottom filmstrip (`#page-thumbnails page-thumbnail`) and `.pageArea` array have **`N = P // 2 + 2`** items indexed `0 .. N - 1` (ordered left-to-right in the DOM = back-of-book to front-of-book):

| `.pageArea` / Filmstrip Index | Filmstrip Label | Canvas Size (cm) | Left Half (`0 .. 29 cm`) | Right Half (`29 .. 58 cm`) |
| :--- | :--- | :--- | :--- | :--- |
| **`N - 1`** (e.g. `13` for 24p, `51` for 100p) | **`כריכה`** | Cover wrap (`~58+spine × 22 cm`) | **Front Cover (`כריכה קידמית`)** | **Back Cover (`כריכה אחורית`)** · Spine (`שדרה`) in center |
| **`N - 2`** (e.g. `12` for 24p, `50` for 100p) | **`עמוד 1`** | **`29.0 × 22.0 cm`** (single page) | Page 1 (`x: 0 .. 29 cm`) | *(Inside front cover — not part of single canvas)* |
| **`N - 2 - k`** (`k = 1 .. P/2 - 1`) | **`עמוד 2k - (2k+1)`** | **`58.0 × 22.0 cm`** (lay-flat spread) | **Odd page `2k + 1`** (read second) | **Even page `2k`** (read first) |
| **`0`** (leftmost) | **`עמוד P`** | **`29.0 × 22.0 cm`** (single page) | Page `P` (`x: 0 .. 29 cm`) | *(Inside back cover — not part of single canvas)* |

- **Print bleed & safe margins (Be'eri specs):** ~0.5 cm outer bleed on trim edges; keep all text, QR codes, and faces **at least 0.8–1.0 cm inside outer edges**, and never place small text directly on the `x = 29.0 cm` fold crease.

---

## Push Procedure (Every Round)

### 1. Build upload files & Picabook layout JSON locally
Run from the album folder:
```bash
python3 make_upload_set.py
python3 picabook_layout.py
python3 make_html.py
python3 check_book.py
```
This writes:
- `ready/upload/*.jpg` and `ready/upload/batches.json` (tuned full-res photos + pre-composed `fullpage`/`spread` blurred-fill images + `003_map.jpg` at 29×22 / 58×22 cm, 300 dpi).
- `ready/picabook_layout.json` — every spread's exact `editor_index`, `label`, photo `frames` (`x, y, w, h` in cm + filename), native `texts` (`text, font, size_pt, bold, align, dir, color, shadow, x, y, w, h` in cm), and `qrs` (`url, title_he, x, y, s` in cm).

### 2. One-time project creation & sign-in (user signs in)
1. On `https://www.picabook.co.il/HE-IL/Albums.asp?type=0`, select:
   - **"עיצוב חכם ללא תבנית"** (clean blank white template) — or the user's chosen theme
   - Format: **`פנורמי 29x22 ס״מ`** · Cover: **`הדפסת יהלום`** · Direction: **`פתיחה עברית`**
   - Project Name: plain letters/numbers/spaces **only** (Picabook's validator rejects `'$@#*()%^""/|&\`).
2. Click **"קדימה, התחילו לעצב"** and pause so the user signs in (`UserLoginIframe.asp`). Never enter credentials.
3. Once `https://editor.picabook.co.il/?open=<GUID>` loads, check the page count in the bottom filmstrip. If `P > 24`, click `.icon_addpages` (`+` at the bottom filmstrip), choose `+(P - 24) עמודים` (in multiples of 4, up to `+76` = 100 pages), and confirm.
4. Turn **off** Smart-Book auto-reflow (`smartbook-component mat-slide-toggle`) on spreads you lay out manually so adding a frame does not auto-shuffle existing frames.

### 3. Upload photos
- Stage each batch from `ready/upload/batches.json` into `<ArtifactDirectory>/browser_sandbox/uploads/` (when driving via Antigravity's Browser Subagent) or feed directly via `input[type="file"]` in the Photos panel (**`הוספת תמונות` → `המחשב שלי`**).
- Sort the gallery by **Name (`מיון/סינון` → `שם`)** so `001_...` through `100_...` appear in exact page order.

### 4. Apply spreads (`ready/picabook_layout.json`)
You have two automation paths depending on the browser tool connected:

#### Path A · Antigravity Browser Subagent (`/browser` — Playwright UI batching)
Work spread by spread (or only changed spreads), batching operations per spread in a single script step:
1. **Select spread:** click `#page-thumbnails page-thumbnail` with heading matching `spread.label` (e.g. `כריכה`, `עמוד 1`, `עמוד 2 - 3`, …, `עמוד 100`).
2. **Background:** white `#FFFFFF` is already default; if a custom background colour or image is configured, set it in the `רקע` tab (`Apply to Spread` / `Left` / `Right`).
3. **Photo frames (`spread.frames`):**
   - Drag the matching thumbnail (by filename) onto `.canvas-container` (or click `תבנית תמונה` to add a frame and drop the photo into it).
   - Select the frame on `.upper-canvas` and set its exact **`x`, `y`, `w`, `h` in cm** via the right-panel `input.inputsDimsPos` fields (or proportional canvas drag: `px = canvasBox.x + (cm / canvas_w_cm) * canvasBox.width`).
   - Disable auto-crop clipping if needed (`התאמת תמונה`) so the photo's full aspect ratio shows cleanly; set thin white border (`2 px`) for overlapping/grouped photos or `0` for `bleed: true` full-bleed maps/heroes/spreads.
4. **Native text boxes (`spread.texts`):**
   - Click **`טקסט`** in the left toolbar, then click on the canvas at the target position (this dismisses the `.textEditDisableRB` overlay and activates `<rbar-text-component>`).
   - Double-click to type `t.text`, select `mat-select.fontSelect` → **`Heebo Unicode`** (or configured font), set `numericInput` font size (`t.size_pt`), click `.icon_bold` when `t.bold` is true, set alignment (`.icon_alignright` / `.icon_aligncenter` / `.icon_alignleft`) and direction (`.RTLdir` / `.LTRdir`), set colour (`בחר צבע:`), enable `הצללה` shadow if `t.shadow` is true (`ink == "light"`), and set exact `x, y` cm in `מיקום` (`input.inputsDimsPos`).
5. **QR codes (`spread.qrs`):**
   - Click **`QR Code`** in the left toolbar → enter `q.url` in the modal input → click **`הוסף קוד קישור`**.
   - Position & size the QR element to `(q.x, q.y, q.s, q.s)` cm, bring to front (`שכבות` → top layer), and add a small native `Heebo Unicode` text box right below it with `q.title_he`.
6. **Save every few spreads:** press `Control+s` / `Meta+s` (triggers `POST /api/v1/Project/SaveProjectComplete` + `SaveComplete`) and click **`אישור`** on `"הפרוייקט נשמר בהצלחה"`.

#### Path B · Chrome DevTools MCP / Console JS (`scripts/picabook_apply.js`)
When connected with full JS evaluation (`evaluate_script` or browser console):
1. Inject `scripts/picabook_apply.js` (defines `window.claudePicabook`) and load `ready/picabook_layout.json`.
2. Run `claudePicabook.inspect()` to verify captured project state, Fabric canvases, and uploaded image map.
3. Run `await claudePicabook.applySpread(editorIndex)` (or `applyAll({only: [...]})`) to populate Fabric.js frames, native `Heebo Unicode` `Textbox` objects, and QR elements at exact cm coordinates, then trigger save (`Ctrl+S` / `claudePicabook.save()`), reload, and run `claudePicabook.check()`.

---

## Things That Bite (Verified in Live Web 4.0 Editor)
- **Smart-Book toggle (`smartbook-component`):** Picabook's smart-layout mode is ON by default (`mat-slide-toggle.mat-checked` at top-left of the spread stage). Leave it OFF on spreads you position manually — otherwise adding/deleting an item auto-rearranges the whole spread!
- **`div.textEditDisableRB` overlay on the right sidebar:** Clicking `טקסט` in the left toolbar shows the text sidebar *covered* by `.textEditDisableRB` until you click/double-click the text box on the canvas to focus it. Always click the text box on canvas before interacting with `<text-props-editor-component>`.
- **25-second auto-save prompt:** Picabook periodically pops up `"הפרוייקט ישמר בעוד 25 שניות"` and `"הפרוייקט נשמר בהצלחה"` (`אישור`). Dismiss those dialogs if they appear mid-step so they don't intercept clicks.
- **Cover Front vs Back sides:** On the flat **`כריכה`** spread (highest index), **`כריכה קידמית` (Front Cover) is the LEFT half (`x: 0 .. 29 cm`)** and **`כריכה אחורית` (Back Cover) is the RIGHT half (`x: 29 .. 58 cm`)**, with the **`שדרה` (Spine)** down the center! Do not accidentally place the front cover photo on the right half.
- **Filmstrip order is reversed (`0` = last page, `N-1` = cover):** Always match spreads by their `<h3>` label (`כריכה`, `עמוד 1`, `עמוד 2 - 3`, …) or `editor_index = (P // 2 + 1)` down to `0` from `ready/picabook_layout.json`.
- **Project name special characters:** When creating the project on `Albums.asp`, never put quotes, `&`, `/`, `-` or symbols matching `/['$@#*()%^\""/|&\\]/` in the project title — the wizard blocks submission.
- **One editor tab only:** Having the same project open in two tabs will overwrite saves.
- **Preview 3D (`turn.js`) for final check:** Click `Preview 3D` in the top bar (or step spread-by-spread at 100% zoom) to visually inspect every spread, header alignment, fold crossing, cover, and spine before telling the user the album is ready to order.
