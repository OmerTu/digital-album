"""Prepare QR codes for the Lupa book so they show NO visible frame.

Usage (album folder):  python3 make_qr.py
For every entry in QR_CODES (album_config.py) it reads the source file ("src", from qr-codes/), and writes "file"
(ready/upload/qr_*.jpg):
- trimmed to the code, with a quiet zone of 2 modules (scanners need it)
- recolored: the light part becomes the PAGE BACKGROUND color ("bg" in the entry, default the theme teal
  174,219,214), the code becomes a deep dark color -> no white square, no frame, just the code on the page
- EXIF DateTimeOriginal = the date in the file name + 23:59:SS (unique second per entry), so lupa_layout.py can match
  it to Lupa's renamed upload
- checked: the code must still scan (OpenCV), at full size and at phone-distance size; otherwise the script stops.
In Lupa the QR frame must ALSO get an invisible line: m_folder_frame = {m_width_px: 8, m_frame_opacity: 0}
(width 0 = theme's dark line; '#00FFFFFF' is drawn white). lupa_apply.js does that for frames marked "bleed" (lupa_layout.py marks QR frames).
"""
import re
from datetime import datetime

import cv2
import numpy as np
from PIL import Image

import os
import sys
sys.path.insert(0, os.getcwd())
import album_config as C


def save_with_time(im: Image.Image, out: str, when: datetime, quality: int = 90) -> None:
    """JPEG with EXIF date so Lupa sorts it right."""
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    exif = Image.Exif()
    t = when.strftime("%Y:%m:%d %H:%M:%S")
    exif[0x0132] = t
    exif.get_ifd(0x8769)[0x9003] = t
    im.save(out, "JPEG", quality=quality, subsampling=0, dpi=(300, 300), exif=exif)

TEAL = getattr(C, "QR_DEFAULT_BG", (255, 255, 255))  # page colour under the code when an entry gives no "bg"
DARK = (28, 45, 42)


def is_album_item_url(url: str) -> bool:
    """True if url is a Google Photos album-item deep link that opens the main album instead of the video on Android."""
    return bool(re.search(r"photos\.google\.com/share/[^/]+/photo/", url or ""))


def decode_qr(path: str) -> str:
    """Decode QR payload from an image file (or '' if unreadable)."""
    if not path or not os.path.exists(path):
        return ""
    img = cv2.imread(path)
    if img is None:
        return ""
    img = cv2.copyMakeBorder(img, 40, 40, 40, 40, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    for det in (cv2.QRCodeDetector(), cv2.QRCodeDetectorAruco()):
        val, _, _ = det.detectAndDecode(img)
        if val:
            return val
    return ""


def ensure_src_qr(src: str, target_url: str) -> None:
    """Rebuild source QR image if missing or if its encoded URL is stale (e.g. updated in VIDEO_LINKS)."""
    if not target_url:
        return
    if os.path.exists(src) and decode_qr(src) == target_url:
        return
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)
    import create_qr as CQ
    os.makedirs(os.path.dirname(src) or ".", exist_ok=True)
    tile = CQ.round_tile(CQ.build_qr(target_url))
    jpeg = Image.new("RGB", tile.size, "white")
    jpeg.paste(tile, mask=tile.getchannel("A"))
    jpeg.save(src, format="JPEG", quality=96, subsampling=0, optimize=True)
    if src.lower().endswith((".jpg", ".jpeg")):
        tile.save(os.path.splitext(src)[0] + ".png")


def prepare(src: str, out: str, when: datetime, bg: tuple = TEAL, dark: tuple = DARK) -> str:
    """Write the frameless QR and return what it scans to."""
    # A tinted QR is only safe when its modules remain clearly separated from
    # the page. On darker backgrounds, use a light quiet-zone plate instead of
    # allowing the dots and page tint to merge in print or on a phone camera.
    # The outer Lupa frame remains invisible; this is only the QR's scan-safe
    # quiet zone.
    if (0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2]) < 150:
        bg = (248, 247, 240)
        dark = (20, 24, 22)
    g = np.asarray(Image.open(src).convert("L"))
    ys, xs = np.where(g < 128)
    g = g[ys.min():ys.max() + 1, xs.min():xs.max() + 1]  # tight to the code (drops any caption / old margin)
    pad = round(g.shape[1] / 65 * 2)  # ~2 modules of quiet zone
    g = np.pad(g, pad, constant_values=255).astype(np.float32) / 255
    g = np.clip((g - 0.35) / 0.4, 0, 1)  # any light shade (old card / margin) becomes page background
    rgb = np.array(dark, np.float32) + (np.array(bg, np.float32) - np.array(dark, np.float32)) * g[..., None]
    im = Image.fromarray(rgb.clip(0, 255).astype(np.uint8)).resize((900, 900), Image.LANCZOS)
    save_with_time(im, out, when, quality=95)
    img = cv2.imread(out)
    detectors = [cv2.QRCodeDetector(), cv2.QRCodeDetectorAruco()]
    full = next((r for r in (d.detectAndDecode(img)[0] for d in detectors) if r), "")
    small_img = cv2.copyMakeBorder(cv2.resize(img, (240, 240), interpolation=cv2.INTER_AREA), 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    small = next((r for r in (d.detectAndDecode(small_img)[0] for d in detectors) if r), "")
    if not full or full != small:
        raise SystemExit(f"{out}: does not scan reliably ({full!r} / {small!r}) – use a cleaner source file")
    return full


def main() -> None:
    """All QR codes in QR_CODES."""
    comp = getattr(C, "COMPANY", "Picabook")
    off = getattr(C, "EDITOR_OFFSET", getattr(C, "LUPA_OFFSET", None))
    if off is None:
        off = 0 if str(comp).lower() == "picabook" else 1
    video_links = {
        int(k): str(v).strip()
        for k, v in (getattr(C, "VIDEO_LINKS", None) or {}).items()
        if str(k).lstrip("-").isdigit() and str(v).strip()
    }
    bad_android: list[str] = []
    for k, q in enumerate(getattr(C, "QR_CODES", [])):
        vn = q.get("video_n")
        target_url = (video_links.get(int(vn)) if vn is not None and str(vn).lstrip("-").isdigit() else "") or (q.get("url") or "").strip()
        if target_url:
            ensure_src_qr(q["src"], target_url)
        m_date = re.search(r"(\d{4})-(\d{2})-(\d{2})", q["src"])
        d = m_date.groups() if m_date else ("2026", "01", "01")
        when = datetime(int(d[0]), int(d[1]), int(d[2]), 23, 59, q.get("t", 30 + k % 30))  # "t": new second for a re-made file
        url = prepare(q["src"], q["file"], when, tuple(q.get("bg", TEAL)), tuple(q.get("dark", DARK)))  # "dark": darker dots on a dark page
        print(f"{q['file']}  page {q['page'] + off} ({comp})  ->  {url}")
        if is_album_item_url(url):
            bad_android.append(f"  page {q['page'] + off} ({q.get('title_he') or q['file']}): {url}")
    if bad_android:
        print(
            "\nWARNING: These QR codes use album-item links (photos.google.com/share/.../photo/...), which open the\n"
            "main album instead of the video on Android! Once video selection is final, open each video in Google Photos\n"
            "-> Share -> Create link -> Create link -> Copy, put the standalone photos.app.goo.gl/... link in\n"
            "VIDEO_LINKS (or QR_CODES['url']) in album_config.py, and re-run make_qr.py:\n"
            + "\n".join(bad_android)
        )


if __name__ == "__main__":
    main()
