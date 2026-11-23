"""Turn the album plan into exact centimeter positions & native text elements for Picabook's Web 4.0 editor.

Unlike Lupa (which requires baking page titles and text cards into >800px JPEGs), Picabook's Sunpics
Angular + Fabric.js editor supports:
  - Native freeform Hebrew & English text boxes (Heebo Unicode, bold, color, drop shadow, no background box)
  - Exact centimeter photo frame positions & sizes (single page 29x22 cm, lay-flat spread 58x22 cm)
  - Native vector QR Code elements + native Hebrew caption labels underneath
  - Preserved upload filenames (matched directly by filename as well as EXIF timestamp)

Usage (inside the album folder, after layout_pages.py and make_upload_set.py):
    python3 picabook_layout.py

Writes ready/picabook_layout.json — ordered in book reading order AND tagged with Picabook's exact
filmstrip `editor_index` (N-1 = כריכה, N-2 = עמוד 1, N-3..1 = עמוד 2-3 .. (P-2)-(P-1), 0 = עמוד P).
"""
import glob
import json
import os
import re
import sys
from typing import Any

from PIL import Image

sys.path.insert(0, os.getcwd())
import album_config as C  # noqa: E402

PW = float(getattr(C, "PW", None) or 29.0)
PH = float(getattr(C, "PH", None) or 22.0)
SW = round(2 * PW, 2)
FONT = getattr(C, "PICABOOK_FONT", "Heebo Unicode")
TITLE_PT = int(getattr(C, "PICABOOK_TITLE_PT", 24))
BODY_PT = int(getattr(C, "PICABOOK_BODY_PT", 14))
CAPTION_PT = int(getattr(C, "PICABOOK_CAPTION_PT", 11))
NATIVE_QR = bool(getattr(C, "PICABOOK_NATIVE_QR", True))
NATIVE_COVER_TEXT = bool(getattr(C, "PICABOOK_NATIVE_COVER_TEXT", True))
WHITE_BG = bool(getattr(C, "PAGE_BG_WHITE", True))
VIDEO_TITLES: dict[int, str] = {
    int(k): str(v).strip()
    for k, v in (getattr(C, "VIDEO_TITLES", None) or {}).items()
    if str(k).lstrip("-").isdigit()
}

SAFE_CM = 0.8  # keep text & QR codes >= 0.8 cm inside outer trim edges
MAP_FILE = "ready/upload/003_map.jpg"


def is_hebrew(text: str) -> bool:
    return any("\u0590" <= ch <= "\u05ff" for ch in text)


def upload_files() -> dict[tuple[int, str], str]:
    """Map (photo_number, 'photo' | 'fullpage' | 'spread' | 'herospread') -> relative upload path."""
    out: dict[tuple[int, str], str] = {}
    for f in sorted(glob.glob("ready/upload/*_n*.jpg")):
        m = re.search(r"_n(\d{3})(?:_(fullpage|spread|herospread))?\.jpg$", f)
        if m:
            out[(int(m.group(1)), m.group(2) or "photo")] = f
    return out


def resolve_qr_url(q: dict[str, Any], photos_by_n: dict[int, dict[str, Any]]) -> str:
    if q.get("url"):
        return q["url"]
    for key in ("file", "src"):
        path = q.get(key)
        if path and os.path.exists(path):
            try:
                import cv2
                im = cv2.imread(path)
                if im is not None:
                    im = cv2.copyMakeBorder(im, 40, 40, 40, 40, cv2.BORDER_CONSTANT, value=[255, 255, 255])
                    for det_cls in (getattr(cv2, "QRCodeDetectorAruco", None), cv2.QRCodeDetector):
                        if det_cls:
                            val, _, _ = det_cls().detectAndDecode(im)
                            if val:
                                return val
            except Exception:
                pass
    vn = q.get("video_n")
    if vn and vn in photos_by_n:
        p = photos_by_n[vn]
        return p.get("share_url") or p.get("url", "")
    return ""


def make_frame(
    n: int,
    path: str,
    x: float,
    y: float,
    w: float,
    h: float,
    *,
    bleed: bool = False,
    role: str = "photo",
) -> dict[str, Any]:
    """Construct a Picabook photo frame specification in centimeters (top-left origin)."""
    im_w = im_h = 0
    if path and os.path.exists(path):
        with Image.open(path) as im:
            im_w, im_h = im.size
    return {
        "n": n,
        "role": role,
        "file": path,
        "filename": os.path.basename(path) if path else "",
        "x": round(x, 2),
        "y": round(y, 2),
        "w": round(w, 2),
        "h": round(h, 2),
        "bleed": bleed,
        "border_px": 0 if bleed else 2,
        "border_color": "#FFFFFF",
        "img_w": im_w,
        "img_h": im_h,
    }


def make_text(
    text: str,
    x: float,
    y: float,
    w: float,
    h: float,
    *,
    role: str = "page_title",
    size_pt: int = TITLE_PT,
    bold: bool = True,
    align: str | None = None,
    color: str = "#1F2328",
    shadow: bool = False,
    angle: float = 0.0,
) -> dict[str, Any]:
    """Construct a native Picabook editable text box specification in centimeters (no background box)."""
    rtl = is_hebrew(text)
    return {
        "role": role,
        "text": text.strip(),
        "font": FONT,
        "size_pt": round(size_pt, 1),
        "bold": bold,
        "italic": False,
        "align": align or ("right" if rtl else "left"),
        "dir": "rtl" if rtl else "ltr",
        "color": color,
        "bg_transparent": True,
        "shadow": shadow,
        "angle": angle,
        "x": round(x, 2),
        "y": round(y, 2),
        "w": round(w, 2),
        "h": round(h, 2),
    }


def sample_ink(frames: list[dict[str, Any]], box: tuple[float, float, float, float]) -> tuple[str, bool]:
    """Return (hex_color, use_shadow) for text sitting over `box` (x0, y0, x1, y1) cm."""
    x0, y0, x1, y1 = box
    for f in reversed(frames):
        if not f.get("bleed") or not f.get("file") or not os.path.exists(f["file"]):
            continue
        fx0, fy0, fx1, fy1 = f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]
        if fx0 <= x0 + 0.2 and fx1 >= x1 - 0.2 and fy0 <= y0 + 0.2 and fy1 >= y1 - 0.2:
            with Image.open(f["file"]) as raw:
                im = raw.convert("L")
                W_, H_ = im.size
                c0 = max(0, min(W_ - 1, int((x0 - fx0) / max(0.1, f["w"]) * W_)))
                c1 = max(c0 + 1, min(W_, int((x1 - fx0) / max(0.1, f["w"]) * W_)))
                r0 = max(0, min(H_ - 1, int((y0 - fy0) / max(0.1, f["h"]) * H_)))
                r1 = max(r0 + 1, min(H_, int((y1 - fy0) / max(0.1, f["h"]) * H_)))
                hist = im.crop((c0, r0, c1, r1)).histogram()
                lum = sum(i * c for i, c in enumerate(hist)) / max(1, sum(hist))
                return ("#1F2328", False) if lum > 145 else ("#FFFFFF", True)
    return ("#1F2328", False)


def estimate_title_width_cm(text: str, size_pt: float, max_w: float) -> float:
    """Generous width for a single-line native text box so Fabric.js never wraps a page header."""
    est = max(5.5, len(text) * (size_pt * 0.022) + 1.4)
    return round(min(max_w, est), 2)


def build_single_page_items(
    pg: dict[str, Any],
    offset_x: float,
    files: dict[tuple[int, str], str],
    sec_title: dict[str, str],
    shown_secs: set[str],
    existing_frames: list[dict[str, Any]] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Return (frames, texts) for a non-merged single page placed at horizontal `offset_x` cm (0 or PW)."""
    frames: list[dict[str, Any]] = []
    texts: list[dict[str, Any]] = []
    no = pg["no"]
    kind = pg["kind"]
    captions = getattr(C, "CAPTIONS", {})

    # 1. Frames / Page body
    if kind in ("hero", "title"):
        n = pg["photos"][0]
        fp = files.get((n, "fullpage")) or files.get((n, "photo"), "")
        if not WHITE_BG and (n, "fullpage") in files:
            frames.append(make_frame(n, files[(n, "fullpage")], offset_x, 0.0, PW, PH, bleed=True, role="fullpage"))
        else:
            r = pg["rects"][0]
            frames.append(make_frame(n, files.get((n, "photo"), fp), offset_x + r["x"], r["y"], r["w"], r["h"], bleed=False, role="hero"))
        if kind == "title":
            sub = f"\n{C.COVER_SUB_HE}" if getattr(C, "COVER_SUB_HE", "") else ""
            texts.append(
                make_text(
                    f"{C.COVER_TITLE_HE}{sub}",
                    offset_x + 2.0,
                    1.2,
                    PW - 4.0,
                    3.2,
                    role="opening_cover_title",
                    size_pt=round(TITLE_PT * 1.45),
                    align="center",
                    color="#FFFFFF",
                    shadow=True,
                )
            )
    elif kind == "map":
        map_src = MAP_FILE if os.path.exists(MAP_FILE) else ("map/route_map.png" if os.path.exists("map/route_map.png") else "")
        frames.append(make_frame(0, map_src, offset_x, 0.0, PW, PH, bleed=True, role="map"))
    elif kind == "opening":
        parts = [p for p in [getattr(C, "OPENING_TITLE_HE", ""), getattr(C, "OPENING_TEXT_HE", ""), getattr(C, "OPENING_SIGN_HE", "")] if p]
        if parts:
            texts.append(
                make_text(
                    "\n\n".join(parts),
                    offset_x + 3.5,
                    3.2,
                    PW - 7.0,
                    PH - 6.4,
                    role="opening_words",
                    size_pt=BODY_PT + 2,
                    bold=False,
                    align="center",
                )
            )
    elif kind in ("text", "closing"):
        body_txt = getattr(C, "CLOSING_TEXT_HE", "") if kind == "closing" else ""
        if body_txt:
            texts.append(
                make_text(
                    body_txt,
                    offset_x + 3.0,
                    4.0,
                    PW - 6.0,
                    PH - 8.0,
                    role=kind,
                    size_pt=BODY_PT + 1,
                    bold=False,
                    align="center" if len(body_txt) < 120 else "right",
                )
            )
    else:
        for r in pg.get("rects", []):
            n = r["n"]
            fp = r.get("file") or files.get((n, "photo"), "")
            frames.append(make_frame(n, fp, offset_x + r["x"], r["y"], r["w"], r["h"], bleed=False, role="photo"))
            if n in captions and captions[n]:
                cap_y = r["y"] + r["h"] + 0.12
                if cap_y + 0.7 <= PH - SAFE_CM:
                    texts.append(
                        make_text(
                            captions[n],
                            offset_x + r["x"],
                            cap_y,
                            r["w"],
                            0.65,
                            role="photo_caption",
                            size_pt=CAPTION_PT,
                            bold=False,
                        )
                    )

    # 2. Native Page Header (never repeated across the book)
    header_parts: list[str] = []
    if kind == "closing":
        ct = getattr(C, "CLOSING_TITLE_HE", "")
        if ct and ct not in shown_secs:
            shown_secs.add(ct)
            header_parts.append(ct)
    elif kind in ("photos", "text", "feature") or (kind == "hero" and no in getattr(C, "HERO_TITLE_PAGES", set())):
        hidden = set(getattr(C, "HIDDEN_TITLES", {}).get(no, []))
        for s in (pg.get("secs") or ([pg["sec"]] if pg.get("sec") else [])):
            if s not in hidden and s not in shown_secs and s in sec_title:
                shown_secs.add(s)
                header_parts.append(sec_title[s])
    extra = getattr(C, "EXTRA_TITLES", {}).get(no)
    if extra:
        header_parts.append(extra)

    if header_parts:
        full_title = " · ".join(header_parts)
        scale = float(getattr(C, "TITLE_SCALE", {}).get(no, 1.0))
        pt = round(TITLE_PT * scale, 1)
        bottom = no in getattr(C, "TITLE_BOTTOM", set())
        ty = round(PH - 1.75, 2) if bottom else 0.72
        th = 1.15
        tw = estimate_title_width_cm(full_title, pt, PW - 2.0)
        tx = round(offset_x + PW - 1.0 - tw, 2)
        tx = max(round(offset_x + SAFE_CM, 2), tx)
        all_bg = (existing_frames or []) + frames
        color, shadow = sample_ink(all_bg, (tx, ty, tx + tw, ty + th))
        texts.append(
            make_text(
                full_title,
                tx,
                ty,
                tw,
                th,
                role="page_title",
                size_pt=pt,
                bold=True,
                color=color,
                shadow=shadow,
            )
        )

    return frames, texts


def build_merged_spread_items(
    right: dict[str, Any],
    left: dict[str, Any],
    files: dict[tuple[int, str], str],
    sec_title: dict[str, str],
    shown_secs: set[str],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Return (frames, texts) for a merged 2-page lay-flat spread (58 x 22 cm, seamless across x=PW)."""
    frames: list[dict[str, Any]] = []
    texts: list[dict[str, Any]] = []
    captions = getattr(C, "CAPTIONS", {})

    for r in right.get("rects", []):
        n = r["n"]
        fp = r.get("file") or files.get((n, "photo"), "")
        frames.append(make_frame(n, fp, r["x"], r["y"], r["w"], r["h"], bleed=False, role="photo"))
        if n in captions and captions[n]:
            cap_y = r["y"] + r["h"] + 0.12
            if cap_y + 0.7 <= PH - SAFE_CM and abs((r["x"] + r["w"] / 2) - PW) > 1.5:
                texts.append(
                    make_text(
                        captions[n],
                        r["x"],
                        cap_y,
                        r["w"],
                        0.65,
                        role="photo_caption",
                        size_pt=CAPTION_PT,
                        bold=False,
                    )
                )

    # Rich native text blocks on intro or TEXT_HALF spreads (no JPEG textcards needed!)
    if right["kind"] == "intro":
        if getattr(C, "INTRO_TITLE_HE", "") and "INTRO" not in shown_secs:
            shown_secs.add("INTRO")
            tw = estimate_title_width_cm(C.INTRO_TITLE_HE, TITLE_PT, PW - 2.0)
            texts.append(make_text(C.INTRO_TITLE_HE, SW - 1.0 - tw, 0.72, tw, 1.15, role="page_title"))
        if getattr(C, "INTRO_TEXT_BOX", False) and getattr(C, "INTRO_TEXT_HE", ""):
            head = f"{C.INTRO_TITLE_HE}\n\n" if getattr(C, "INTRO_TITLE_HE", "") else ""
            texts.append(
                make_text(
                    f"{head}{C.INTRO_TEXT_HE}",
                    SW - 11.2,
                    2.4,
                    10.2,
                    18.6,
                    role="intro_story",
                    size_pt=BODY_PT,
                    bold=False,
                )
            )
        return frames, texts

    th_cfg = getattr(C, "TEXT_HALF", {}).get(left.get("sec"), {}) if left.get("textbox") else {}
    if th_cfg and (th_cfg.get("title") or th_cfg.get("text")):
        block = "\n\n".join(x for x in [th_cfg.get("title", ""), th_cfg.get("text", "")] if x)
        texts.append(
            make_text(
                block,
                1.0,
                2.4,
                round(PW - 16.4, 2),
                18.6,
                role="text_half",
                size_pt=BODY_PT,
                bold=False,
            )
        )

    # Section headers on merged spreads (placed on their respective area, kept clear of the x=PW fold)
    for t in right.get("titles", []):
        on_left = t["right"] <= PW + 6.0
        pg_no = left["no"] if on_left else right["no"]
        hidden = set(getattr(C, "HIDDEN_TITLES", {}).get(pg_no, []))
        secs = [s for s in t.get("secs", [t["sec"]]) if s not in hidden and s not in shown_secs and s in sec_title]
        if not secs:
            continue
        for s in secs:
            shown_secs.add(s)
        full_title = " · ".join(sec_title[s] for s in secs)
        scale = float(getattr(C, "TITLE_SCALE", {}).get(pg_no, 1.0))
        pt = round(TITLE_PT * scale, 1)
        bottom = pg_no in getattr(C, "TITLE_BOTTOM", set())
        ty = round(PH - 1.75, 2) if bottom else 0.72
        right_edge = min(t["right"], PW - 0.8) if on_left else max(t["right"], PW + 5.0)
        if pg_no in getattr(C, "TITLE_RIGHT_ALIGN", set()):
            right_edge = (PW - 1.0) if on_left else (SW - 1.0)
        max_w = (right_edge - SAFE_CM) if on_left else (right_edge - (PW + 0.8))
        tw = estimate_title_width_cm(full_title, pt, max(5.0, max_w))
        tx = round(right_edge - tw, 2)
        if not on_left and tx < PW + 0.6:
            tx = round(PW + 0.6, 2)
        color, shadow = sample_ink(frames, (tx, ty, tx + tw, ty + 1.15))
        texts.append(
            make_text(
                full_title,
                tx,
                ty,
                tw,
                1.15,
                role="page_title",
                size_pt=pt,
                bold=True,
                color=color,
                shadow=shadow,
            )
        )

    return frames, texts


def resolve_qr_label(q: dict[str, Any]) -> str:
    """Resolve the title placed next to a QR code: VIDEO_TITLES[video_n] overrides/fills title_he."""
    vn = q.get("video_n")
    if vn is not None:
        try:
            vn_int = int(vn)
            if vn_int in VIDEO_TITLES:
                return VIDEO_TITLES[vn_int]
        except (TypeError, ValueError):
            pass
    return str(q.get("title_he") or q.get("title") or "").strip()


def attach_qrs_and_avoid_title_collisions(
    sp: dict[str, Any],
    qrs_for_spread: list[tuple[dict[str, Any], float, str]],
) -> None:
    """Add QR elements + native caption labels next to each QR, nudging any page header if needed."""
    sp_qrs: list[dict[str, Any]] = []

    def _overlaps(a: tuple[float, float, float, float], b: tuple[float, float, float, float], pad: float = 0.0) -> bool:
        return not (a[2] <= b[0] - pad or b[2] <= a[0] - pad or a[3] <= b[1] - pad or b[3] <= a[1] - pad)

    def _hits_photo(x: float, y: float, w: float, h: float) -> bool:
        bx = (x, y, x + w, y + h)
        return any(
            not f.get("bleed") and _overlaps(bx, (f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]))
            for f in sp["frames"]
        )

    def _hits_text(x: float, y: float, w: float, h: float, roles: tuple[str, ...] = ("page_title", "qr_caption")) -> bool:
        bx = (x, y, x + w, y + h)
        return any(
            t.get("role") in roles and _overlaps(bx, (t["x"], t["y"], t["x"] + t["w"], t["y"] + t["h"]), pad=0.12)
            for t in sp["texts"]
        )

    def _nudge_page_titles_for_box(bx0: float, by0: float, bx1: float, by1: float, ox: float) -> None:
        for t in sp["texts"]:
            if t["role"] != "page_title":
                continue
            tcx = t["x"] + t["w"] / 2
            if not (ox - 0.1 <= tcx <= ox + PW + 0.1):
                continue
            overlap_y = not (t["y"] + t["h"] < by0 - 0.12 or by1 + 0.12 < t["y"])
            overlap_x = not (t["x"] + t["w"] < bx0 - 0.25 or bx1 + 0.25 < t["x"])
            if overlap_x and overlap_y:
                page_left = round(ox + SAFE_CM, 2)
                page_right = round(ox + PW - 1.0, 2)
                if (bx0 + bx1) / 2 < ox + PW * 0.55:
                    new_left = round(bx1 + 0.35, 2)
                    right_edge = max(t["x"] + t["w"], min(page_right, round(new_left + t["w"], 2)))
                    if right_edge - new_left >= 4.5:
                        t["x"] = new_left
                        t["w"] = round(right_edge - new_left, 2)
                else:
                    new_right = round(bx0 - 0.35, 2)
                    new_left = max(page_left, round(new_right - t["w"], 2))
                    if new_right - new_left >= 4.5:
                        t["x"] = new_left
                        t["w"] = round(new_right - new_left, 2)

    for q, ox, url in qrs_for_spread:
        qx = round(ox + float(q["x"]), 2)
        qy = round(float(q["y"]), 2)
        qs = round(float(q["s"]), 2)
        label = resolve_qr_label(q)
        qr_entry = {
            "page": q["page"],
            "video_n": q.get("video_n"),
            "mode": "native" if NATIVE_QR else "image",
            "url": url,
            "file": q.get("file", ""),
            "filename": os.path.basename(q.get("file", "")) if q.get("file") else "",
            "x": qx,
            "y": qy,
            "w": qs,
            "h": qs,
            "title_he": label,
            "note": q.get("note", ""),
            "z_layer": "top",
        }
        sp_qrs.append(qr_entry)

        # Keep page titles clear of this QR box
        _nudge_page_titles_for_box(qx, qy, qx + qs, qy + qs, ox)

        # Native caption label NEXT TO the QR code (horizontally adjacent, vertically centered),
        # falling back to directly below if neither horizontal side fits cleanly.
        if label:
            lh = 0.65
            lw = round(max(2.4, min(6.5, len(label) * (CAPTION_PT * 0.022) + 0.9)), 2)
            ly_side = round(max(0.22, min(PH - 0.3 - lh, qy + (qs - lh) / 2)), 2)
            prefer_right = (float(q["x"]) + qs / 2) <= PW * 0.55

            cand_right = (round(qx + qs + 0.18, 2), ly_side, lw, lh, "left")
            cand_left = (round(qx - 0.18 - lw, 2), ly_side, lw, lh, "right")
            lx_below = round(max(ox + 0.5, min(ox + PW - 0.5 - lw, qx + qs / 2 - lw / 2)), 2)
            cand_below = (lx_below, round(qy + qs + 0.06, 2), lw, 0.52, "center")

            candidates = ([cand_right, cand_left, cand_below] if prefer_right else [cand_left, cand_right, cand_below])
            placed = None
            for cx, cy, cw, ch, calign in candidates:
                if cx < ox + 0.45 or cx + cw > ox + PW - 0.45 or cy < 0.18 or cy + ch > PH - 0.25:
                    continue
                if _hits_photo(cx, cy, cw, ch):
                    continue
                if _hits_text(cx, cy, cw, ch):
                    _nudge_page_titles_for_box(cx, cy, cx + cw, cy + ch, ox)
                if not _hits_text(cx, cy, cw, ch):
                    placed = (cx, cy, cw, ch, calign)
                    break

            if placed:
                lx, ly, cw, ch, calign = placed
                color, shadow = sample_ink(sp["frames"], (lx, ly, lx + cw, ly + ch))
                sp["texts"].append(
                    make_text(
                        label,
                        lx,
                        ly,
                        cw,
                        ch,
                        role="qr_caption",
                        size_pt=CAPTION_PT,
                        bold=True,
                        align=calign,
                        color=color,
                        shadow=shadow,
                    )
                )

    sp["qrs"] = sp_qrs


def build_cover_spread(editor_index: int, photos_by_n: dict[int, dict[str, Any]], files: dict[tuple[int, str], str]) -> dict[str, Any]:
    """Build Picabook's Cover spread (`כריכה`): Left half = Front Cover (`כריכה קידמית`), Right half = Back Cover (`כריכה אחורית`)."""
    frames: list[dict[str, Any]] = []
    texts: list[dict[str, Any]] = []

    cov_path = ""
    for candidate in (
        getattr(C, "COVER_PHOTO_FILE", ""),
        "ready/upload/000_cover.jpg" if NATIVE_COVER_TEXT else "ready/upload/000_cover_title.jpg",
        getattr(C, "COVER_IMAGE", ""),
        "ready/upload/000_cover.jpg",
    ):
        if candidate and os.path.exists(candidate):
            cov_path = candidate
            break
    if not cov_path and getattr(C, "COVER", 0):
        cov_path = files.get((C.COVER, "fullpage")) or files.get((C.COVER, "photo"), "")

    if cov_path:
        # Verified in live Picabook Web 4.0 editor: Front Cover ("כריכה קידמית") is the LEFT half (x: 0 .. PW cm)
        frames.append(make_frame(getattr(C, "COVER", 0) or 0, cov_path, 0.0, 0.0, PW, PH, bleed=True, role="front_cover"))

    back_img = getattr(C, "BACK_COVER_IMAGE", None)
    if back_img and os.path.exists(back_img):
        frames.append(make_frame(0, back_img, PW, 0.0, PW, PH, bleed=True, role="back_cover"))

    title_main = getattr(C, "COVER_TITLE_HE", "").strip()
    title_sub = getattr(C, "COVER_SUB_HE", "").strip()
    spine_txt = (getattr(C, "SPINE_TEXT_HE", "") or " · ".join(x for x in (title_main, title_sub) if x)).strip()

    if NATIVE_COVER_TEXT and title_main:
        texts.append(
            make_text(
                title_main,
                1.5,
                1.4,
                PW - 3.0,
                2.6,
                role="cover_title",
                size_pt=42,
                bold=True,
                align="center",
                color="#FFFFFF",
                shadow=True,
            )
        )
        if title_sub:
            texts.append(
                make_text(
                    title_sub,
                    2.5,
                    4.1,
                    PW - 5.0,
                    1.5,
                    role="cover_subtitle",
                    size_pt=22,
                    bold=True,
                    align="center",
                    color="#FFFFFF",
                    shadow=True,
                )
            )
    if spine_txt:
        texts.append(
            make_text(
                spine_txt,
                round(PW - 0.5, 2),
                2.0,
                1.0,
                PH - 4.0,
                role="spine_title",
                size_pt=12,
                bold=True,
                align="center",
                color="#1F2328",
                shadow=False,
                angle=90.0,
            )
        )

    return {
        "book_step": 0,
        "editor_index": editor_index,
        "label": "כריכה",
        "kind": "cover",
        "pages": [],
        "w_cm": SW,
        "h_cm": PH,
        "bg_color": "#FFFFFF",
        "frames": frames,
        "texts": texts,
        "qrs": [],
    }


def main() -> None:
    plan = json.load(open("plan.json"))
    pages: list[dict[str, Any]] = plan["pages"]
    photos_by_n = {p["n"]: p for p in plan["photos"]}
    files = upload_files()
    sec_title = (
        {k: v["he"] for k, v in plan["sections"].items()}
        if isinstance(plan["sections"], dict)
        else {x["id"]: x["he"] for x in plan["sections"]}
    )

    P = len(pages)
    if P % 2 != 0:
        raise SystemExit(f"Picabook requires an even page count (got {P}); check BOOK_PAGE_STEP=4 in album_config.py")
    total_editor_spreads = P // 2 + 2  # Cover + Page 1 + (P/2 - 1) double spreads + Page P

    # Pre-group QR codes by plan page number
    qrs_by_page: dict[int, list[tuple[dict[str, Any], str]]] = {}
    for q in getattr(C, "QR_CODES", []):
        url = resolve_qr_url(q, photos_by_n)
        qrs_by_page.setdefault(int(q["page"]), []).append((q, url))

    shown_secs: set[str] = set()
    spreads: list[dict[str, Any]] = []

    # 0. Cover (rightmost in Picabook filmstrip: editor_index = P // 2 + 1)
    spreads.append(build_cover_spread(P // 2 + 1, photos_by_n, files))

    # 1. Page 1 ("עמוד 1", single page canvas 29 x 22 cm, editor_index = P // 2)
    f1, t1 = build_single_page_items(pages[0], 0.0, files, sec_title, shown_secs)
    sp1 = {
        "book_step": 1,
        "editor_index": P // 2,
        "label": "עמוד 1",
        "kind": "single",
        "pages": [1],
        "w_cm": PW,
        "h_cm": PH,
        "bg_color": "#FFFFFF",
        "frames": f1,
        "texts": t1,
        "qrs": [],
    }
    attach_qrs_and_avoid_title_collisions(sp1, [(q, 0.0, u) for q, u in qrs_by_page.get(1, [])])
    spreads.append(sp1)

    # 2. Interior 2-page Lay-flat Spreads: k = 1 .. P//2 - 1 ("עמוד 2k - 2k+1", editor_index = P // 2 - k)
    for k in range(1, P // 2):
        right, left = pages[2 * k - 1], pages[2 * k]  # RTL reading order: right (even 2k) first, left (odd 2k+1) second
        ed_idx = P // 2 - k
        label = f"עמוד {right['no']} - {left['no']}"
        sp_frames: list[dict[str, Any]] = []
        sp_texts: list[dict[str, Any]] = []

        # Optional full-spread texture photo behind everything
        tex_n = getattr(C, "BG_TEXTURES", {}).get(k)
        if tex_n and not WHITE_BG:
            tex_file = f"ready/upload/texbg_s{k:02d}_{tex_n}.jpg"
            if os.path.exists(tex_file):
                sp_frames.append(make_frame(0, tex_file, 0.0, 0.0, SW, PH, bleed=True, role="texture_bg"))

        if right["kind"] == "spread":
            n = right["photos"][0]
            if not WHITE_BG and (n, "spread") in files:
                sp_frames.append(make_frame(n, files[(n, "spread")], 0.0, 0.0, SW, PH, bleed=True, role="spread_full"))
            else:
                r = right["rects"][0]
                fp = files.get((n, "photo")) or files.get((n, "spread"), "")
                sp_frames.append(make_frame(n, fp, r["x"], r["y"], r["w"], r["h"], bleed=(r["w"] >= SW - 0.2), role="spread_photo"))
        elif right.get("merged"):
            mf, mt = build_merged_spread_items(right, left, files, sec_title, shown_secs)
            sp_frames.extend(mf)
            sp_texts.extend(mt)
        else:
            hero = next((p for p in (right, left) if p["kind"] == "hero"), None)
            face = left if hero is right else right
            if not WHITE_BG and hero and face["kind"] in ("photos", "text", "closing") and (hero["photos"][0], "herospread") in files:
                hn = hero["photos"][0]
                sp_frames.append(make_frame(hn, files[(hn, "herospread")], 0.0, 0.0, SW, PH, bleed=True, role="herospread_bg"))
                face_ox = PW if face is right else 0.0
                ff, ft = build_single_page_items(face, face_ox, files, sec_title, shown_secs, existing_frames=sp_frames)
                sp_frames.extend(ff)
                sp_texts.extend(ft)
            else:
                # Build right page first (even page: x in PW..2*PW) so section headers appear on right page first!
                rf, rt = build_single_page_items(right, PW, files, sec_title, shown_secs, existing_frames=sp_frames)
                sp_frames.extend(rf)
                sp_texts.extend(rt)
                lf, lt = build_single_page_items(left, 0.0, files, sec_title, shown_secs, existing_frames=sp_frames)
                sp_frames.extend(lf)
                sp_texts.extend(lt)

        sp_obj = {
            "book_step": k + 1,
            "editor_index": ed_idx,
            "label": label,
            "kind": "spread",
            "pages": [right["no"], left["no"]],
            "w_cm": SW,
            "h_cm": PH,
            "bg_color": "#FFFFFF",
            "frames": sp_frames,
            "texts": sp_texts,
            "qrs": [],
        }
        qr_items = [(q, PW, u) for q, u in qrs_by_page.get(right["no"], [])] + [
            (q, 0.0, u) for q, u in qrs_by_page.get(left["no"], [])
        ]
        attach_qrs_and_avoid_title_collisions(sp_obj, qr_items)
        spreads.append(sp_obj)

    # 3. Last Page ("עמוד P", single page canvas 29 x 22 cm, editor_index = 0)
    fl, tl = build_single_page_items(pages[-1], 0.0, files, sec_title, shown_secs)
    sp_last = {
        "book_step": P // 2 + 1,
        "editor_index": 0,
        "label": f"עמוד {P}",
        "kind": "single",
        "pages": [P],
        "w_cm": PW,
        "h_cm": PH,
        "bg_color": "#FFFFFF",
        "frames": fl,
        "texts": tl,
        "qrs": [],
    }
    attach_qrs_and_avoid_title_collisions(sp_last, [(q, 0.0, u) for q, u in qrs_by_page.get(P, [])])
    spreads.append(sp_last)

    os.makedirs("ready", exist_ok=True)
    out_data = {
        "company": "Picabook",
        "format": f"Panoramic_{PW:g}x{PH:g}",
        "cover_type": "Diamond",
        "rtl": True,
        "page_w_cm": PW,
        "page_h_cm": PH,
        "spread_w_cm": SW,
        "total_pages": P,
        "add_pages_needed": max(0, P - 24),
        "total_editor_spreads": total_editor_spreads,
        "default_font": FONT,
        "spreads": spreads,
    }
    out_path = "ready/picabook_layout.json"
    with open(out_path, "w", encoding="utf8") as fh:
        json.dump(out_data, fh, ensure_ascii=False, indent=2)

    n_frames = sum(len(s["frames"]) for s in spreads)
    n_texts = sum(len(s["texts"]) for s in spreads)
    n_qrs = sum(len(s["qrs"]) for s in spreads)
    print(
        f"Wrote {out_path}: {len(spreads)} editor spreads ({P} pages, +{max(0, P - 24)} above 24p base), "
        f"{n_frames} photo/map frames, {n_texts} native '{FONT}' text boxes, {n_qrs} QR elements."
    )
    print("Next: python3 check_book.py")


if __name__ == "__main__":
    main()
