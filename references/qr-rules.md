# QR codes on album pages

A QR code on an album page opens trip videos, photo sets, or documents (such as the trip plan). Offer one per destination or highlight that has a video set.

## 1. Get the link and the name
- Ask the user for each link (a Google Photos album/video link, or a Google Drive document). Keep the exact URL.
- Name the file from the linked item's own **date taken + place taken** (its Info / Details panel in Google Photos or Drive): `YYYY-MM-DD_<place-slug>.jpg`. Never use the album name or upload date. Missing date or place: ask. Never overwrite; add `-02`.

## 2. Make the code (`make_qr.py`)
Run:
```bash
python3 scripts/make_qr.py
```
- Creates clean, high-contrast QR codes with proper quiet-zone padding.
- Uses `PIL.Image.LANCZOS` resampling and dual detector verification (`cv2.QRCodeDetector()` and `cv2.QRCodeDetectorAruco()`) to guarantee scannability both at full size and printed size (down to 1.9 cm).
- Output goes to `ready/upload/qr_<date>_<slug>.jpg` and `qr-codes/`.

## 3. Position and Layering Rules
- **Size:** 1.92 cm to 2.34 cm printed.
- **Top Margin Placement:**
  - Standard photo layouts start at `y >= 2.4 cm`, leaving a generous top white margin (`y = 0.0` to `2.2 cm`).
  - Placing QR codes at `x = 1.0, y = 0.22, s = 1.92` (or right margin `x = 9.2`) sits them cleanly in the header area without touching or obstructing any photo frames.
- **Layering (critical print rule):**
  - The QR is always the **top layer** of its page, above photos and frame lines.
  - **Never straddle a photo's edge**: it must sit either completely on the page background (with ≥ 0.3 cm margin) or completely inside a photo (with ≥ 0.3 cm margin from the frame).
  - No frame border around the QR: in Picabook use the native `QR Code` (`הוסף קוד קישור`) element (`PICABOOK_NATIVE_QR = True`, crisp vector output, zero border) or a borderless image frame (`border_px = 0`); in Lupa `m_folder_frame = {m_width_px: 8, m_frame_opacity: 0}`.
- **Background Color:**
  - `QR_DEFAULT_BG = (255, 255, 255)` (pure white). Tints the code's quiet zone to match the page background.
- **Labels (`VIDEO_TITLES` / `title_he`)**:
  - Set titles per video in `VIDEO_TITLES = {video_n: "short title"}` in `album_config.py` (overrides/fills `QR_CODES[...]["title_he"]`, and can also be set interactively from each video card, video modal, or QR modal in `album-plan.html`).
  - In `album-plan.html`, QR codes render inside a `.qr-wrap` container with the `.qr-label` placed **next to** the QR code (to its right on left-margin QRs, to its left on right-side QRs) and click-to-preview + inline title editing.
  - In **Picabook**, `picabook_layout.py` places a crisp native `Heebo Unicode` caption (`role="qr_caption"`) **next to** the QR code (horizontally adjacent, vertically centered in the top margin; falling back below if side margin is tight) and automatically shifts any nearby page header so they never collide.

## 4. Configuration Schema (`album_config.py`)
Per-video titles (applied automatically to matching `video_n` QR codes and pre-populated in the planner's Video Gallery):
```python
VIDEO_TITLES = {
    14: "נשנוש ענבים בשדה",
}
```
Each entry in `QR_CODES`:
```python
{
    "file": "ready/upload/qr_2026-09-10_airport.jpg",
    "src": "qr-codes/2026-09-10_airport.jpg",
    "bg": (255, 255, 255),
    "t": 10,                 # unique EXIF second for upload identification
    "page": 4,               # plan page number
    "x": 1.0, "y": 0.22,     # cm from top-left of page
    "s": 1.92,               # size in cm
    "title_he": "נשנוש ענבים בשדה",  # label shown next to QR (optional if set in VIDEO_TITLES)
    "video_n": 14,           # optional: video number in items.json
    "url": "https://...",    # direct URL for opening in browser
    "note": "נשנוש ענבים בשדה (סרטון #14)"
}
```

## 5. Verification
- `python3 check_book.py` verifies QR code sizes, margins, trim distances, and layer ordering.
- In the HTML plan, clicking any QR code opens an enlarged preview with a "פתח קישור ישיר בדפדפן ↗" button to test the destination URL directly.
