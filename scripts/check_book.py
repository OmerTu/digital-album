"""Final check of the book before it goes to the album editor or to print (run in the album folder).

Supports both Picabook (ready/picabook_layout.json, default) and Lupa (ready/lupa_layout.json):
  ERRORS (exit code 1): missing files, photos under 200 dpi, photos cropped more than 5%, photos covering
    each other, a photo used twice, repeated or colliding native text headers, QR codes that are too small,
    missing URL/file, not on top, or that STRADDLE a photo's edge.
  NOTES: photos 200-250 dpi, every page/cover/spine title (read them for spelling), QR codes sitting inside a photo
    (make sure they are on background, never on faces).
Usage:
    python3 check_book.py              # auto-detects Picabook or Lupa from album_config.py / ready/
    python3 check_book.py --picabook   # force Picabook check
    python3 check_book.py --lupa       # force Lupa check
"""
import glob
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.getcwd())

PX_CM = 300 / 2.54  # editor px per cm (300 dpi)
QR_MIN = round(2.0 * PX_CM)  # printed QR at least 2 cm (Lupa px)
TRIM = round(0.5 * PX_CM)  # anything important at least 0.5 cm inside the trim (Lupa px)
CLEAR = round(0.3 * PX_CM)  # a QR keeps 0.3 cm away from any photo edge it does not sit inside (Lupa px)


def box(f: dict) -> tuple:
    return (f["x"] - f["w"] / 2, f["y"] - f["h"] / 2, f["x"] + f["w"] / 2, f["y"] + f["h"] / 2)


def box_cm(item: dict) -> tuple[float, float, float, float]:
    return (float(item["x"]), float(item["y"]), float(item["x"]) + float(item["w"]), float(item["y"]) + float(item["h"]))


def overlap(a: tuple, b: tuple) -> tuple:
    return max(0, min(a[2], b[2]) - max(a[0], b[0])), max(0, min(a[3], b[3]) - max(a[1], b[1]))


def check_picabook(layout_path: str = "ready/picabook_layout.json") -> int:
    L = json.load(open(layout_path, encoding="utf8"))
    pw = float(L.get("page_w_cm", 29.0))
    total_pages = int(L.get("total_pages", 0))
    cover_type = L.get("cover_type", "Diamond")

    err: list[str] = []
    note: list[str] = []
    used: dict[int, list[str]] = {}
    titles: list[str] = []
    seen_page_titles: dict[str, str] = {}

    if cover_type == "Diamond":
        if total_pages > 100:
            err.append(f"total_pages={total_pages} exceeds Picabook Diamond Lay-flat maximum of 100 pages")
        elif total_pages < 24 or (total_pages - 24) % 4 != 0:
            note.append(f"total_pages={total_pages}: Picabook Diamond Lay-flat starts at 24 pages and adds in steps of +4")

    clear_cm = 0.25

    for s in L.get("spreads", []):
        tag = f"{s.get('label', '?')} [idx={s.get('editor_index')}]"
        kind = s.get("kind", "spread")
        W = float(s.get("w_cm", pw))
        H = float(s.get("h_cm", 22.0))
        frames = s.get("frames", [])
        texts = s.get("texts", [])
        qrs = s.get("qrs", [])

        non_bleed_photos = [f for f in frames if not f.get("bleed") and f.get("n", 0) != 0]

        for f in frames:
            fp = f.get("file", "")
            role = f.get("role", "photo")
            n = int(f.get("n", 0))
            if not fp or not os.path.exists(fp):
                err.append(f"{tag}: missing upload file '{fp}' (#{n}, role={role})")
                continue
            if role in ("texture_bg", "herospread_bg"):
                continue
            with Image.open(fp) as im:
                ia = im.width / im.height
                fa = float(f["w"]) / float(f["h"])
                crop = 1.0 - min(ia / fa, fa / ia)
                dpi = im.width * min(1.0, fa / ia) / (float(f["w"]) / 2.54)
            label_id = f"#{n}" if n else role
            if dpi < 200:
                err.append(f"{tag}: {label_id} only {dpi:.0f} dpi (blurry in print)")
            elif dpi < 250:
                note.append(f"{tag}: {label_id} {dpi:.0f} dpi (fine, not razor sharp)")
            if not f.get("bleed") and n != 0 and crop > 0.055:
                err.append(f"{tag}: #{n} cropped {crop:.0%} (rule: no crop, 5% at most)")
            if kind != "cover" and n != 0:
                used.setdefault(n, []).append(s.get("label", str(s.get("book_step"))))

        for a in range(len(non_bleed_photos)):
            for b in range(a + 1, len(non_bleed_photos)):
                ox, oy = overlap(box_cm(non_bleed_photos[a]), box_cm(non_bleed_photos[b]))
                if ox > 0.07 and oy > 0.07:
                    err.append(
                        f"{tag}: #{non_bleed_photos[a]['n']} and #{non_bleed_photos[b]['n']} overlap ({ox:.2f}x{oy:.2f} cm)"
                    )

        for t in texts:
            t_role = t.get("role", "text")
            txt = (t.get("text") or "").strip()
            if not txt:
                err.append(f"{tag}: empty native text box (role={t_role})")
                continue
            if not t.get("bg_transparent", True):
                err.append(f"{tag}: text '{txt[:25]}' has a background box (rule: no box behind text)")
            if t_role in ("page_title", "cover_title", "cover_subtitle", "spine_title", "opening_cover_title", "qr_caption"):
                titles.append(f"{tag} ({t_role}): {txt.replace(chr(10), ' / ')}")
            if t_role == "page_title":
                if txt in seen_page_titles:
                    err.append(f"{tag}: repeated page header '{txt}' (already on {seen_page_titles[txt]})")
                else:
                    seen_page_titles[txt] = tag
                tb = box_cm(t)
                if kind == "spread" and tb[0] < pw < tb[2]:
                    err.append(f"{tag}: page header '{txt}' crosses the center fold at x={pw:g} cm")
                for p in non_bleed_photos:
                    ox, oy = overlap(tb, box_cm(p))
                    if ox > 0.08 and oy > 0.08:
                        err.append(f"{tag}: page header '{txt}' overlaps photo #{p['n']}")
            if t_role != "spine_title":
                tb = box_cm(t)
                if tb[0] < 0.15 or tb[1] < 0.10 or tb[2] > W - 0.15 or tb[3] > H - 0.15:
                    err.append(f"{tag}: text '{txt[:24]}' extends into outer bleed/trim ({tb[0]:.2f},{tb[1]:.2f}..{tb[2]:.2f},{tb[3]:.2f})")
                elif tb[0] < 0.45 or tb[2] > W - 0.45:
                    note.append(f"{tag}: text '{txt[:24]}' is within 0.45 cm of left/right trim")

        for q in qrs:
            qb = box_cm(q)
            q_id = f"p.{q.get('page')} ({q.get('title_he') or q.get('filename') or 'QR'})"
            if min(float(q["w"]), float(q["h"])) < 1.9:
                err.append(f"{tag}: QR {q_id} is {min(float(q['w']), float(q['h'])):.2f} cm (min 1.9 cm)")
            if q.get("z_layer") != "top":
                err.append(f"{tag}: QR {q_id} is not marked as top layer")
            has_file = bool(q.get("file") and os.path.exists(q["file"]))
            if q.get("mode") == "image" and not has_file:
                err.append(f"{tag}: QR {q_id} image file missing '{q.get('file')}'")
            elif q.get("mode") == "native" and not q.get("url") and not has_file:
                err.append(f"{tag}: QR {q_id} has neither a target URL nor a fallback QR image")
            if qb[0] < 0.25 or qb[1] < 0.15 or qb[2] > W - 0.25 or qb[3] > H - 0.15:
                note.append(f"{tag}: QR {q_id} closer than 0.25 cm to trim; check quiet zone")
            for p in non_bleed_photos:
                pb = box_cm(p)
                ox, oy = overlap(qb, pb)
                inside = (
                    qb[0] >= pb[0] + clear_cm
                    and qb[1] >= pb[1] + clear_cm
                    and qb[2] <= pb[2] - clear_cm
                    and qb[3] <= pb[3] - clear_cm
                )
                near = overlap((qb[0] - clear_cm, qb[1] - clear_cm, qb[2] + clear_cm, qb[3] + clear_cm), pb)
                if inside:
                    note.append(f"{tag}: QR {q_id} sits inside #{p['n']}: check it is on background, not on a face")
                elif (ox > 0 and oy > 0) or (near[0] > 0 and near[1] > 0):
                    err.append(
                        f"{tag}: QR {q_id} straddles or touches edge of #{p['n']} "
                        f"(move onto background with >= {clear_cm} cm space, or fully inside the photo)"
                    )
            for t in texts:
                if t.get("role") == "page_title":
                    ox, oy = overlap(qb, box_cm(t))
                    if ox > 0.05 and oy > 0.05:
                        err.append(f"{tag}: QR {q_id} collides with page header '{t.get('text')}'")

    for n, where in used.items():
        if len(where) > 1:
            err.append(f"#{n} is used twice across interior spreads ({where})")

    print(f"Picabook check: {len(L.get('spreads', []))} editor spreads ({total_pages} pages) checked")
    if titles:
        print("\nNATIVE TITLES & LABELS (read for spelling):\n  " + "\n  ".join(titles))
    if note:
        print("\nNOTES:\n  " + "\n  ".join(note))
    print("\nERRORS:\n  " + "\n  ".join(err) if err else "\nNo errors.")
    return 1 if err else 0


def check_lupa(layout_path: str = "ready/lupa_layout.json") -> int:
    import lupa_layout as LL

    def is_qr(f: dict) -> bool:
        return f.get("bleed") and f["n"] == 0 and f["w"] < LL.HALF - 2 and not f.get("title_tile") and not f.get("texture")

    def is_photo(f: dict) -> bool:
        return not f.get("bleed") and f["n"] != 0 or (f["n"] != 0 and f["w"] < LL.HALF - 2)

    L = json.load(open(layout_path))
    path_of = {}
    for f in glob.glob("ready/upload/*.jpg"):
        if not os.path.basename(f).startswith("old_"):
            path_of.setdefault(LL.key_of(f), f)
    err, note, used, titles = [], [], {}, []
    for i, s in enumerate(L["spreads"]):
        fr = [f for f in s.get("frames", []) + s.get("prolog_frames", [])]
        photos = [f for f in fr if is_photo(f)]
        qrs = [f for f in s.get("frames", []) if is_qr(f)]
        for f in fr:
            p = path_of.get(f["k"])
            if not p:
                err.append(f"spread {i}: no upload file for {f['k']} (#{f['n']})")
                continue
            if f in photos:
                im = Image.open(p)
                ia, fa = im.width / im.height, f["w"] / f["h"]
                crop = 1 - min(ia / fa, fa / ia)
                dpi = im.width * min(1, fa / ia) / f["w"] * 300
                if dpi < 200:
                    err.append(f"spread {i}: #{f['n']} only {dpi:.0f} dpi (blurry in print)")
                elif dpi < 250:
                    note.append(f"spread {i}: #{f['n']} {dpi:.0f} dpi (fine, not razor sharp)")
                if crop > 0.05:
                    err.append(f"spread {i}: #{f['n']} cropped {crop:.0%} (rule: no crop, 5% at most)")
                used.setdefault(f["n"], []).append(i)
            if f.get("title_tile"):
                titles.append(f"spread {i}: {f.get('text', '')}")
        for a in range(len(photos)):
            for b in range(a + 1, len(photos)):
                ox, oy = overlap(box(photos[a]), box(photos[b]))
                if ox > 8 and oy > 8:
                    err.append(f"spread {i}: #{photos[a]['n']} and #{photos[b]['n']} cover each other")
        frames = s.get("frames", [])
        if qrs and any(not is_qr(f) for f in frames[frames.index(qrs[0]):]):
            err.append(f"spread {i}: a QR code is not the top layer (it must be the last frame)")
        W = LL.SW if s.get("type", "LAYFLAT_TYPE") == "LAYFLAT_TYPE" else LL.HALF
        for q in qrs:
            b = box(q)
            if min(q["w"], q["h"]) < QR_MIN:
                err.append(f"spread {i}: QR {q['k']} is {q['w'] / PX_CM:.1f} cm (min 2 cm)")
            if b[0] < TRIM - 30 or b[1] < TRIM - 30 or b[2] > W - TRIM + 30 or b[3] > LL.SH - TRIM + 30:
                note.append(f"spread {i}: QR {q['k']} closer than 0.5 cm to the trim (the code's own margin may cover it; check)")
            for p in photos + [f for f in frames if f.get("title_tile")]:
                pb = box(p)
                ox, oy = overlap(b, pb)
                inside = b[0] >= pb[0] + CLEAR and b[1] >= pb[1] + CLEAR and b[2] <= pb[2] - CLEAR and b[3] <= pb[3] - CLEAR
                near = overlap((b[0] - CLEAR, b[1] - CLEAR, b[2] + CLEAR, b[3] + CLEAR), pb)
                what = "title" if p.get("title_tile") else f"#{p['n']}"
                if inside and not p.get("title_tile"):
                    note.append(f"spread {i}: QR {q['k']} sits inside {what}: check it is on background, not on a face")
                elif (ox > 0 and oy > 0) or (near[0] > 0 and near[1] > 0):
                    err.append(f"spread {i}: QR {q['k']} straddles or touches the edge of {what} "
                               f"(move it fully onto background with 0.3 cm space, or fully inside the photo)")
    for n, where in used.items():
        if len(where) > 1:
            err.append(f"#{n} is used twice (spreads {where})")
    print(f"Lupa check: {len(L['spreads'])} spreads checked")
    print("\nPAGE TITLES (read for spelling):\n  " + "\n  ".join(titles) if titles else "")
    if note:
        print("\nNOTES:\n  " + "\n  ".join(note))
    print("\nERRORS:\n  " + "\n  ".join(err) if err else "\nNo errors.")
    return 1 if err else 0


def main() -> int:
    args = set(sys.argv[1:])
    if "--picabook" in args:
        return check_picabook()
    if "--lupa" in args:
        return check_lupa()

    company = "Picabook"
    try:
        import album_config as C
        company = getattr(C, "COMPANY", "Picabook") or "Picabook"
    except Exception:
        pass

    has_pb = os.path.exists("ready/picabook_layout.json")
    has_lupa = os.path.exists("ready/lupa_layout.json")

    if company.lower() == "lupa" and has_lupa:
        return check_lupa()
    if has_pb:
        return check_picabook()
    if has_lupa:
        return check_lupa()
    print("ERROR: Neither ready/picabook_layout.json nor ready/lupa_layout.json found. Run picabook_layout.py (or lupa_layout.py) first.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
