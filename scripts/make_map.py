"""Build the trip route map (print quality) from photo-location stops.

1. Driving route between stops from OSRM (OpenStreetMap routing).
2. Basemap: Esri World Terrain Base (no labels, shaded relief), with every state we drove through tinted in its
   own color and state borders on top (US Census Bureau boundaries via the us-atlas package, public domain).
3. Hebrew labels (stops, state names, title, km first with miles in brackets, number of states) via an HTML
   overlay rendered by headless Chrome -> map/route_map.png
"""
import io
import json
import math
import subprocess
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

from PIL import Image, ImageDraw, ImageFilter

UA = "Mozilla/5.0 (family photo album route map)"
COMPANY = "Picabook"
PW: float | None = None
PH: float | None = None
W_OUT, H_OUT = 3425, 2598  # 29 x 22 cm at 300 dpi (recomputed from PW/PH below)
Z = 8  # tile zoom (256 px Esri terrain tiles)
TILE = 256

# ---- defaults; album_config.py sets the real stops ----
STOPS: list[tuple] = []  # (number, Hebrew label, dates, lat, lng, label side: l/r/t/b/n=hidden)
ROUTE: list[tuple[float, float]] = []  # driving waypoints in trip order (stops + en-route points from the photos)
NUDGE: dict[int, tuple[int, int]] = {}  # move crowded pins a few px
SIDE_TRIP: list[tuple[float, float]] = []  # optional dashed line (flight / boat)
SIDE_TRIP_LABEL = ""
LANG = "he"  # label language: "he" or "en"
MAP_TITLE = ""  # default: "המסלול שלנו" / "Our route"
MAP_SUBTITLE = ""  # e.g. "אמריקה 2021 · 48 ימים בקרוואן" (distance and number of states are added below it)
ROUTE_MILES_ACTUAL: float | None = None  # odometer / rental bill, when known (the drawn route misses driving inside parks)
STATE_LABEL_AT: dict[str, tuple[float, float]] = {}  # move a state's name: {"Utah": (lat, lng)}
STATE_COLORS = ["#FF9F43", "#54A0FF", "#1DD1A1", "#FF6B6B", "#FECA57", "#A29BFE", "#48DBFB", "#FF9FF3",
                "#10AC84", "#F368E0", "#EE5253", "#0ABDE3"]  # states we drove through, in the order we entered them
STATES_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
STATES_HE = {
    "Alabama": "אלבמה", "Alaska": "אלסקה", "Arizona": "אריזונה", "Arkansas": "ארקנסו", "California": "קליפורניה",
    "Colorado": "קולורדו", "Connecticut": "קונטיקט", "Delaware": "דלאוור", "Florida": "פלורידה", "Georgia": "ג׳ורג׳יה",
    "Hawaii": "הוואי", "Idaho": "איידהו", "Illinois": "אילינוי", "Indiana": "אינדיאנה", "Iowa": "איווה", "Kansas": "קנזס",
    "Kentucky": "קנטקי", "Louisiana": "לואיזיאנה", "Maine": "מיין", "Maryland": "מרילנד", "Massachusetts": "מסצ׳וסטס",
    "Michigan": "מישיגן", "Minnesota": "מינסוטה", "Mississippi": "מיסיסיפי", "Missouri": "מיזורי", "Montana": "מונטנה",
    "Nebraska": "נברסקה", "Nevada": "נבדה", "New Hampshire": "ניו המפשייר", "New Jersey": "ניו ג׳רזי",
    "New Mexico": "ניו מקסיקו", "New York": "ניו יורק", "North Carolina": "צפון קרוליינה", "North Dakota": "דקוטה הצפונית",
    "Ohio": "אוהיו", "Oklahoma": "אוקלהומה", "Oregon": "אורגון", "Pennsylvania": "פנסילבניה", "Rhode Island": "רוד איילנד",
    "South Carolina": "דרום קרוליינה", "South Dakota": "דקוטה הדרומית", "Tennessee": "טנסי", "Texas": "טקסס", "Utah": "יוטה",
    "Vermont": "ורמונט", "Virginia": "וירג׳יניה", "Washington": "וושינגטון", "West Virginia": "מערב וירג׳יניה",
    "Wisconsin": "ויסקונסין", "Wyoming": "ויומינג",
}

import os, sys  # noqa: E401
sys.path.insert(0, os.getcwd())
try:
    from album_config import *  # noqa: F401,F403  (per-album settings; run from the album folder)
except ImportError:
    pass
_pw = float(PW) if PW is not None else (29.0 if str(COMPANY).lower() == "picabook" else 30.0)
_ph = float(PH) if PH is not None else 22.0
W_OUT, H_OUT = round(_pw * 300 / 2.54), round(_ph * 300 / 2.54)


def world_px(lat: float, lng: float) -> tuple[float, float]:
    """Web-Mercator pixel coordinates at zoom Z for @2x tiles."""
    size = TILE * 2 ** Z
    x = (lng + 180) / 360 * size
    s = math.sin(math.radians(lat))
    y = (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * size
    return x, y


def osrm_route() -> list[tuple[float, float]]:
    """Road geometry through all waypoints (lat, lng list)."""
    cache_path = "map/osrm_line.json"
    if os.path.exists(cache_path) and os.path.exists("map/route_stats.json"):
        return [tuple(p) for p in json.load(open(cache_path))]
    coords = ";".join(f"{lng},{lat}" for lat, lng in ROUTE)
    url = f"https://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=geojson"
    out = subprocess.run(["curl", "-s", "-A", UA, url], capture_output=True, text=True, timeout=120).stdout
    g = json.loads(out)["routes"][0]
    print("route km", round(g["distance"] / 1000), "miles", round(g["distance"] / 1609.34))
    json.dump({"km": g["distance"] / 1000}, open("map/route_stats.json", "w"))
    line = [(lat, lng) for lng, lat in g["geometry"]["coordinates"]]
    json.dump(line, open(cache_path, "w"))
    return line


def states() -> dict[str, list[list[tuple[float, float]]]]:
    """State name -> outer rings as (lng, lat), decoded from the us-atlas TopoJSON (cached in map/)."""
    path = "map/states-10m.json"
    if not os.path.exists(path):
        subprocess.run(["curl", "-s", "-o", path, STATES_URL], timeout=120)
    t = json.load(open(path))
    (sx, sy), (tx, ty) = t["transform"]["scale"], t["transform"]["translate"]
    arcs = []
    for a in t["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in a:
            x, y = x + dx, y + dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)

    def ring(ids: list[int]) -> list[tuple[float, float]]:
        out: list[tuple[float, float]] = []
        for i in ids:
            pts = arcs[i] if i >= 0 else arcs[~i][::-1]
            out.extend(pts if not out else pts[1:])
        return out

    res = {}
    for g in t["objects"]["states"]["geometries"]:
        polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
        res[g["properties"]["name"]] = [ring(p[0]) for p in polys]
    return res


def inside(lng: float, lat: float, rg: list[tuple[float, float]]) -> bool:
    """Ray casting point-in-polygon."""
    hit = False
    for (x1, y1), (x2, y2) in zip(rg, rg[1:] + rg[:1]):
        if (y1 > lat) != (y2 > lat) and lng < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
            hit = not hit
    return hit


def state_of(lat: float, lng: float, st: dict) -> str | None:
    for name, rings in st.items():
        if any(inside(lng, lat, r) for r in rings):
            return name
    return None


def visited_states(line: list[tuple[float, float]], st: dict) -> list[str]:
    """States entered along the route, in arrival order."""
    seen: list[str] = []
    for lat, lng in line[::3]:  # sample every ~1.5 km
        s = state_of(lat, lng, st)
        if s and s not in seen:
            seen.append(s)
    return seen


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def paint_states(base: Image.Image, to_out, st: dict, visited: list[str]) -> Image.Image:
    """Tint visited states in their palette color and draw white state borders."""
    color_map = {name: STATE_COLORS[i % len(STATE_COLORS)] for i, name in enumerate(visited)}
    over = Image.new("RGBA", (W_OUT, H_OUT), (0, 0, 0, 0))
    dr = ImageDraw.Draw(over)
    for name, col in color_map.items():
        rgb = hex_to_rgb(col)
        for ring in st.get(name, []):
            poly = [to_out(lat, lng) for lng, lat in ring]
            dr.polygon(poly, fill=(*rgb, 58))
    # state borders
    for name, rings in st.items():
        for ring in rings:
            poly = [to_out(lat, lng) for lng, lat in ring]
            dr.line(poly, fill=(255, 255, 255, 140), width=3)
    base = base.convert("RGBA")
    base.alpha_composite(over)
    return base


def tile(coord: tuple[int, int]) -> tuple[tuple[int, int], Image.Image]:
    x, y = coord
    path = f"map/tiles/{Z}_{x}_{y}.jpg"
    if not os.path.exists(path):
        url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{Z}/{y}/{x}"
        subprocess.run(["curl", "-s", "-o", path, "-A", UA, url], timeout=60)
    return (x, y), Image.open(path).convert("RGB")


def state_labels(to_out, st: dict, visited: list[str]) -> list[dict]:
    """Positions and names of all states inside or touching the crop."""
    labels = []
    col_map = {name: STATE_COLORS[i % len(STATE_COLORS)] for i, name in enumerate(visited)}
    for name, rings in st.items():
        if name in STATE_LABEL_AT:
            lat, lng = STATE_LABEL_AT[name]
        else:
            main_r = max(rings, key=len)
            lat = sum(p[1] for p in main_r) / len(main_r)
            lng = sum(p[0] for p in main_r) / len(main_r)
        x, y = to_out(lat, lng)
        if -200 < x < W_OUT + 200 and -200 < y < H_OUT + 200:
            labels.append({
                "name": name, "he": STATES_HE.get(name, name) if LANG == "he" else name,
                "x": round(x), "y": round(y), "v": name in visited,
                "c": col_map.get(name, "#8a9099")
            })
    return labels


def map_line(n_states: int) -> str:
    """Stats under the map title (distance in km and miles, and number of states for US trips)."""
    dist = "כ-<b>__KM__ ק״מ</b> (__MILES__ מייל)" if LANG == "he" else "approx. <b>__KM__ km</b> (__MILES__ miles)"
    if not globals().get("US_STATES", True) or n_states == 0:
        return dist
    states_part = f"{n_states} מדינות" if LANG == "he" else f"{n_states} states"
    return f"{dist} · {states_part}" if LANG == "he" else f"{dist} across {states_part}"


def main() -> None:
    os.makedirs("map/tiles", exist_ok=True)
    line = osrm_route()
    print("line points:", len(line))

    pts = line + [(lat, lng) for *_, lat, lng, _ in STOPS]
    min_lat = min(p[0] for p in pts)
    max_lat = max(p[0] for p in pts)
    min_lng = min(p[1] for p in pts)
    max_lng = max(p[1] for p in pts)

    # world pixels of the bounding box
    (x_a, y_a) = world_px(max_lat, min_lng)
    (x_b, y_b) = world_px(min_lat, max_lng)
    w_pts = x_b - x_a
    h_pts = y_b - y_a

    # aspect ratio 3543 x 2598 = ~1.3637
    target_aspect = W_OUT / H_OUT
    pad = 0.08
    cx, cy = (x_a + x_b) / 2, (y_a + y_b) / 2
    if w_pts / h_pts > target_aspect:
        w_crop = w_pts * (1 + 2 * pad)
        h_crop = w_crop / target_aspect
    else:
        h_crop = h_pts * (1 + 2 * pad)
        w_crop = h_crop * target_aspect

    x0, y0 = cx - w_crop / 2, cy - h_crop / 2
    x1, y1 = cx + w_crop / 2, cy + h_crop / 2

    tx = range(int(x0 // TILE), int(x1 // TILE) + 1)
    ty = range(int(y0 // TILE), int(y1 // TILE) + 1)
    with ThreadPoolExecutor(12) as ex:
        tiles = dict(ex.map(tile, [(x, y) for x in tx for y in ty]))
    big = Image.new("RGB", (len(tx) * TILE, len(ty) * TILE))
    for (x, y), im in tiles.items():
        big.paste(im, ((x - tx[0]) * TILE, (y - ty[0]) * TILE))
    ox, oy = tx[0] * TILE, ty[0] * TILE
    crop = big.crop((int(x0 - ox), int(y0 - oy), int(x1 - ox), int(y1 - oy)))
    scale = W_OUT / crop.width
    base = crop.resize((W_OUT, H_OUT), Image.LANCZOS)

    def to_out(lat: float, lng: float) -> tuple[float, float]:
        px, py = world_px(lat, lng)
        return (px - x0) * scale, (py - y0) * scale

    if globals().get("US_STATES", True):
        st = states()
        visited = visited_states(line, st)
        print("states on the route:", len(visited), visited)
        base = paint_states(base, to_out, st, visited)
    else:
        st, visited = {}, []
        import numpy as np
        b = np.asarray(base.convert("RGB"), dtype=np.float32)
        base = Image.fromarray(np.clip(b * 0.82 + 255 * 0.18, 0, 255).astype(np.uint8))

    # route line, drawn 2x then downsampled for smooth edges
    S = 2
    layer = Image.new("RGBA", (W_OUT * S, H_OUT * S), (0, 0, 0, 0))
    dr = ImageDraw.Draw(layer)
    path = [(x * S, y * S) for x, y in (to_out(a, b) for a, b in line)]
    dr.line(path, fill=(255, 255, 255, 235), width=26 * S, joint="curve")
    dr.line(path, fill=(200, 72, 32, 255), width=14 * S, joint="curve")
    sa, sb = (to_out(*p) for p in SIDE_TRIP) if SIDE_TRIP else ((0, 0), (0, 0))
    n = 22 if SIDE_TRIP else 0
    for i in range(0, n, 2):
        p = (sa[0] + (sb[0] - sa[0]) * i / n, sa[1] + (sb[1] - sa[1]) * i / n)
        q = (sa[0] + (sb[0] - sa[0]) * (i + 1) / n, sa[1] + (sb[1] - sa[1]) * (i + 1) / n)
        dr.line([(p[0] * S, p[1] * S), (q[0] * S, q[1] * S)], fill=(40, 90, 160, 255), width=9 * S)
    layer = layer.resize((W_OUT, H_OUT), Image.LANCZOS)
    base = base.convert("RGBA")
    shadow = layer.split()[3].filter(ImageFilter.GaussianBlur(8)).point(lambda v: v * 0.35)
    base.paste((0, 0, 0, 255), (0, 0), shadow)
    base.alpha_composite(layer)
    base.convert("RGB").save("map/route_base.png")

    km = ROUTE_MILES_ACTUAL * 1.609344 if ROUTE_MILES_ACTUAL else json.load(open("map/route_stats.json"))["km"]
    pins = []
    for num, he, dates, lat, lng, side in STOPS:
        x, y = to_out(lat, lng)
        dx, dy = NUDGE.get(num, (0, 0))
        pins.append({"n": num, "he": he, "d": dates, "x": round(x + dx), "y": round(y + dy), "s": side})
    gx, gy = to_out(*SIDE_TRIP[1]) if SIDE_TRIP else (-999, -999)
    html = OVERLAY.replace("__PINS__", json.dumps(pins, ensure_ascii=False)) \
        .replace("__STATES__", json.dumps(state_labels(to_out, st, visited), ensure_ascii=False)) \
        .replace("__LINE__", map_line(len(visited))).replace("__LANG__", LANG).replace("__DIR__", "rtl" if LANG == "he" else "ltr") \
        .replace("__MILES__", f"{round(km / 1.609344, -2 if ROUTE_MILES_ACTUAL else 0):,.0f}").replace("__KM__", f"{round(km, -2 if ROUTE_MILES_ACTUAL else 0):,.0f}") \
        .replace("__GX__", str(round(gx))).replace("__GY__", str(round(gy))) \
        .replace("__TITLE__", MAP_TITLE or ("המסלול שלנו" if LANG == "he" else "Our route")).replace("__SUB__", MAP_SUBTITLE).replace("__SIDE__", SIDE_TRIP_LABEL) \
        .replace("3543px", f"{W_OUT}px").replace("2598px", f"{H_OUT}px")
    open("map/overlay.html", "w").write(html)
    from chrome import CHROME as chrome, T
    here = os.path.abspath("map/overlay.html")
    subprocess.run([*T(90), chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    f"--user-data-dir={os.path.abspath('map/.chr')}", f"--window-size={W_OUT},{H_OUT}",
                    "--virtual-time-budget=4000", f"--screenshot={os.path.abspath('map/route_map.png')}",
                    "file://" + urllib.parse.quote(here)], capture_output=True)
    if os.path.exists("map/route_map.png"):
        print("done", Image.open("map/route_map.png").size)


OVERLAY = """<!doctype html><html lang="__LANG__" dir="__DIR__"><head><meta charset="utf-8"><style>
html,body{margin:0;width:3543px;height:2598px;overflow:hidden;font-family:"SF Hebrew","Arial Hebrew",Arial,sans-serif;}
.map{position:absolute;inset:0;background:url(route_base.png) no-repeat;background-size:3543px 2598px;}
.pin{position:absolute;width:60px;height:60px;margin:-30px 0 0 -30px;border-radius:50%;background:#1f3b57;color:#fff;
 font:700 32px/60px "SF Hebrew",Arial;text-align:center;border:6px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.35);direction:ltr;}
.pin.first{background:#2f7d4f}.pin.last{background:#b23b3b}
.lab{position:absolute;white-space:nowrap;font:700 44px/1.1 "SF Hebrew",Arial;color:#1d2530;
 text-shadow:0 0 6px #fff,0 0 6px #fff,0 0 10px #fff,0 0 14px #fff;}
.lab small{display:block;font-weight:500;font-size:32px;color:#4a5563;}
.title{position:absolute;top:90px;left:90px;width:1000px;text-align:right;color:#1d2530;text-shadow:0 0 10px #fff,0 0 18px #fff;}
.title h1{margin:0;font:800 130px/1 "SF Hebrew",Arial;letter-spacing:-2px;}
.title p{margin:18px 0 0;font:600 46px/1.3 "SF Hebrew",Arial;color:#3a4654;}
.legend{position:absolute;left:90px;top:560px;width:800px;background:rgba(255,255,255,.93);border-radius:32px;
 padding:34px 40px;box-shadow:0 10px 30px rgba(0,0,0,.18);}
.legend div{white-space:nowrap;font:600 32px/1.5 "SF Hebrew",Arial;color:#1d2530;display:flex;gap:16px;align-items:baseline;}
.legend b{display:inline-block;min-width:46px;height:46px;border-radius:50%;background:#1f3b57;color:#fff;text-align:center;font:700 25px/46px Arial;direction:ltr;flex:none;}
.legend span{color:#6b7480;font-weight:500;font-size:28px;margin-inline-start:auto;direction:ltr;}
.heli{position:absolute;font:600 34px/1.2 "SF Hebrew",Arial;color:#285aa0;text-shadow:0 0 6px #fff,0 0 10px #fff;white-space:nowrap;}
.credit{position:absolute;left:30px;bottom:18px;font:24px Arial;color:#6b7480;direction:ltr;}
.st{position:absolute;white-space:nowrap;transform:translate(-50%,-50%);font:800 76px/1 "SF Hebrew",Arial;letter-spacing:3px;
 text-shadow:0 0 8px rgba(255,255,255,.9),0 0 16px rgba(255,255,255,.8);opacity:.9}
.st.o{font:600 46px/1 "SF Hebrew",Arial;color:#8a9099;letter-spacing:1px;opacity:.85}
</style></head><body><div class="map"></div>
<div class="title"><h1>__TITLE__</h1><p>__SUB__<br>__LINE__</p></div>
<div id="states"></div><div id="pins"></div><div class="legend" id="legend"></div>
<div class="heli" style="left:calc(__GX__px - 330px);top:calc(__GY__px - 95px)">__SIDE__</div>

<script>
const ST = __STATES__; const sb = document.getElementById('states');
const shade = (h, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(h.substr(i, 2), 16) * k).toString(16).padStart(2, '0')).join('');
ST.forEach(s => { const d = document.createElement('div'); d.className = 'st' + (s.v ? '' : ' o');
  d.style.left = s.x + 'px'; d.style.top = s.y + 'px'; if (s.v) d.style.color = shade(s.c, 0.55); d.textContent = s.he; sb.appendChild(d); });
const P = __PINS__; const box = document.getElementById('pins'); const lg = document.getElementById('legend');
P.forEach((p, i) => {
  const d = document.createElement('div'); d.className = 'pin' + (i === 0 ? ' first' : i === P.length - 1 ? ' last' : '');
  d.style.left = p.x + 'px'; d.style.top = p.y + 'px'; d.textContent = p.n; box.appendChild(d);
  const l = document.createElement('div'); l.className = 'lab'; l.innerHTML = p.he + '<small dir="ltr">' + p.d + '</small>'; if (p.s === 'n') l.style.display = 'none';
  box.appendChild(l);
  const r = l.getBoundingClientRect();
  const off = 58;
  if (p.s === 'r') { l.style.left = (p.x + off) + 'px'; l.style.top = (p.y - r.height / 2) + 'px'; }
  if (p.s === 'l') { l.style.left = (p.x - off - r.width) + 'px'; l.style.top = (p.y - r.height / 2) + 'px'; }
  if (p.s === 't') { l.style.left = (p.x - r.width / 2) + 'px'; l.style.top = (p.y - off - r.height) + 'px'; }
  if (p.s === 'b') { l.style.left = (p.x - r.width / 2) + 'px'; l.style.top = (p.y + off) + 'px'; }
  const g = document.createElement('div'); g.innerHTML = '<b>' + p.n + '</b>' + p.he + '<span>' + p.d + '</span>'; lg.appendChild(g);
});
</script></body></html>"""

if __name__ == "__main__":
    main()
