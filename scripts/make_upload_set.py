"""Build the upload set for designing the album inside Picabook or Lupa.

Usage (album folder, after prepare_originals.py):  python3 make_upload_set.py
- Picabook with clean white backgrounds (COMPANY == "Picabook" and PAGE_BG_WHITE == True, default):
    Every kept photo (including full-page heroes and 2-page spreads) is saved directly as its tuned JPEG
    (long side <= 3600 px, JPEG q90) preserving its true aspect ratio for exact cm placement in Picabook.
- Lupa (or Picabook with blurred backgrounds, PAGE_BG_WHITE == False):
    Photos on normal pages -> the tuned photo itself (long side <= 3600 px, JPEG q90).
    Full-page photos and double-page spreads -> pre-composed 300-dpi images with the blurred fill built in.
Every file gets EXIF DateTimeOriginal = the photo's real time (camera clocks fixed) and a page-order file name.
Writes ready/upload/ and ready/upload/batches.json (<= 9.5 MB per batch).
"""
import json
import os
import sys
from datetime import datetime, timezone

from PIL import Image

sys.path.insert(0, os.getcwd())
import album_config as C  # noqa: E402

MAX_SIDE = 3600
MAX_SPREAD_SIDE = 7200  # preserve full 300-dpi resolution for 2-page panoramas (58 cm = 6850 px at 300 dpi)
BATCH_BYTES = 9_500_000


def stamp(p: dict) -> datetime:
    """Photo's local time with the clock fixes applied (as used for the album order)."""
    return datetime.fromtimestamp((p["cts"] + (p["tz"] or 0)) / 1000, timezone.utc).replace(tzinfo=None)


def save_with_time(im: Image.Image, out: str, when: datetime, quality: int = 90) -> None:
    """JPEG with EXIF date so Lupa and Picabook sort it right."""
    exif = Image.Exif()
    t = when.strftime("%Y:%m:%d %H:%M:%S")
    exif[0x0132] = t
    exif.get_ifd(0x8769)[0x9003] = t
    im.save(out, "JPEG", quality=quality, subsampling=0, dpi=(300, 300), exif=exif)


def main() -> None:
    """Write the upload files and batches."""
    os.makedirs("ready/upload", exist_ok=True)
    is_picabook_white = str(getattr(C, "COMPANY", "Picabook")).lower() == "picabook" and bool(getattr(C, "PAGE_BG_WHITE", True))

    plan = json.load(open("plan.json"))
    pages = plan["pages"]
    photos = {p["n"]: p for p in plan["photos"]}
    src_files = {i["n"]: os.path.abspath(i["file"]) for i in json.load(open("ready/photos/index.json"))}

    wide_photos: set[int] = set()
    for pg in pages:
        if pg["kind"] == "spread":
            wide_photos.update(pg.get("photos", []))
        for r in pg.get("rects", []):
            if float(r.get("w", 0)) > 30.0 and r.get("n"):
                wide_photos.add(int(r["n"]))

    R = None
    big = {}  # photo n -> ("page", pg) or ("spread", right_half, left_half)
    if not is_picabook_white:
        sys.argv = [sys.argv[0], "--no-symbols"]  # render_spreads: symbols are the last step
        import render_spreads as _R
        R = _R
        for i, pg in enumerate(pages):
            if pg["kind"] in ("hero", "title"):
                big[pg["photos"][0]] = ("page", pg)
            elif pg["kind"] == "spread" and pg.get("half") == "right":
                big[pg["photos"][0]] = ("spread", pg, pages[i + 1])

    files = []
    if os.path.exists("map/route_map.png") and not os.path.exists("ready/upload/003_map.jpg"):  # the route-map page
        save_with_time(Image.open("map/route_map.png").convert("RGB"), "ready/upload/003_map.jpg", datetime(2001, 1, 4, 8, 0, 0), quality=92)
    if os.path.exists("ready/upload/003_map.jpg"):
        files.append("ready/upload/003_map.jpg")

    order = sorted((p for p in photos.values() if p["keep"] and p["page"]), key=lambda p: (p["page"], p["album_order"]))
    for k, p in enumerate(order):
        n = p["n"]
        name = f"ready/upload/{p['page']:03d}_{k:03d}_n{n:03d}"
        if n in big and R is not None:
            spec = big[n]
            if spec[0] == "page":
                nm, html, W = R.build_opening(900 + k, None, spec[1])
            else:
                nm, html, W = R.build_opening(900 + k, spec[1], spec[2])
            jpg = R.shoot(900 + k, nm, html, W, stamp(p))
            im = Image.open(jpg).convert("RGB")
            out = name + ("_fullpage.jpg" if spec[0] == "page" else "_spread.jpg")
            save_with_time(im, out, stamp(p), quality=90)
            os.remove(jpg)
        else:
            im = Image.open(src_files[n]).convert("RGB")
            max_px = MAX_SPREAD_SIDE if n in wide_photos else MAX_SIDE
            im.thumbnail((max_px, max_px), Image.LANCZOS)
            out = name + ".jpg"
            save_with_time(im, out, stamp(p))
        files.append(out)

    batches, cur, size = [], [], 0
    for f in files:
        s = os.path.getsize(f)
        if cur and size + s > BATCH_BYTES:
            batches.append(cur)
            cur, size = [], 0
        cur.append(os.path.abspath(f))
        size += s
    if cur:
        batches.append(cur)
    json.dump(batches, open("ready/upload/batches.json", "w"), indent=1)
    total = sum(os.path.getsize(f) for f in files)
    print(f"{len(files)} files ({sum(1 for f in files if 'fullpage' in f)} full pages, {sum(1 for f in files if 'spread' in f)} spreads), "
          f"{total / 1e6:.1f} MB, {len(batches)} upload batches")


if __name__ == "__main__":
    main()
