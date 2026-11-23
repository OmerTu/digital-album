"""Per-album settings. Copy to the album folder as album_config.py and fill in as the work goes on.

Photo numbers (#) are the numbers fetch_album.py gives (camera-time order).
For Picabook (default), plan page "no" == editor page number (EDITOR_OFFSET = 0, Panoramic 29 x 22 cm).
For Lupa, editor page number = plan page "no" + 1 (Lupa counts its opening-words page as page 1, 30 x 22 cm).
Every value below is an example: replace or empty it.
"""

# ---- language, company & book geometry ------------------------------------------------------------------
LANG = "he"  # page titles, map labels, facts: "he" (Hebrew) or "en" (English). The book reads right to left.
COMPANY = "Picabook"  # "Picabook" (default: picabook.co.il Web 4.0) | "Lupa" (lupa.co.il) | other maker name
PW = 29.0  # single page width in cm (Picabook Panoramic: 29.0; Lupa Panoramic Large: 30.0)
PH = 22.0  # single page height in cm (22.0 for both Picabook Panoramic and Lupa Panoramic Large)
BOOK_PAGES = None  # fixed page count; None = the natural length rounded up to BOOK_PAGE_STEP
BOOK_MIN_PAGES = 24  # product minimum (24 for Picabook & Lupa)
BOOK_MAX_PAGES = 100  # product maximum (100 for Picabook Diamond "הדפסת יהלום" & Lupa Dutch lay-flat; 144 Classic)
BOOK_PAGE_STEP = 4  # pages added per step in the editor (+4 pages = +2 spreads in Picabook Web 4.0 & Lupa)
EDITOR_OFFSET = 0  # 0 for Picabook ("עמוד 1" == plan page 1); set None or 1 for Lupa when using opening-words page

# ---- Picabook native typography & editor options ---------------------------------------------------------
PICABOOK_FONT = "Heebo Unicode"  # native editor font ("Heebo Unicode", "Rubik Unicode", "Assistant Unicode", "Alef Unicode")
PICABOOK_TITLE_PT = 24  # native page header font size in editor points
PICABOOK_BODY_PT = 14  # native body text font size (opening words, intro story, TEXT_HALF, closing)
PICABOOK_CAPTION_PT = 11  # native QR code label / photo caption font size
PICABOOK_NATIVE_QR = True  # True = use Picabook's native vector QR tool + native Hebrew label below it
PICABOOK_NATIVE_COVER_TEXT = True  # True = place cover title, subtitle & spine as editable native text boxes

# ---- sections = places, in trip order -----------------------------------------------------------------------
# (id, page title in LANG, English name, keywords matched in the reviewers' "place" text; the longest match wins)
SECTIONS: list[tuple[str, str, str, list[str]]] = [
    ("S01", "יוצאים לדרך", "Departure", ["home", "airport", "flight"]),
    ("S02", "רומא", "Rome", ["rome", "colosseum"]),
    ("S03", "Amalfi Coast", "Amalfi Coast", ["amalfi", "positano"]),
    ("S04", "חוזרים הביתה", "Home", []),
]
FORCE_SECTION: dict[int, str] = {}  # photo # -> section id, when the keywords put a photo in the wrong place

# ---- opening & closing pages -----------------------------------------------------------------------------
COVER = 0  # photo # for the cover (one family photo in big scenery)
COVER_ONLY = True  # the cover photo is on the cover only; inside: map, opening words, departure
DEPARTURE: list[int] = []  # leaving-home photos (dog goodbye, airport, plane)
OPENING_AFTER_DEPARTURE = True
INTRO_PHOTOS: list[int] = []  # "home on wheels" / trip-base intro spread (the one planned exception to time order)
INTRO_BRING_BACK: dict[int, str] = {}
INTRO_AFTER = "S02"  # the intro spread comes right after this section
INTRO_TITLE_HE = ""  # its page title (LANG)
INTRO_TEXT_HE = ""
INTRO_TEXT_BOX = False
OPENING_PHOTO = None  # photo # (or a dict with n/x/y/w/h cm) on the opening-words page
OPENING_PHOTOS: list[dict] = []
OPENING_TITLE_HE = ""
OPENING_TEXT_HE = ""
OPENING_SIGN_HE = ""
OPENING_TEXT_SHOW = True
OPENING_BG = None  # faded photo behind the opening-words page (file in ready/upload)
OPENING_BLANK = False
CLOSING_TITLE_HE = ""  # last page header (e.g. "מילות סיום..." / "Closing words")
CLOSING_TEXT_HE = ""  # optional body paragraph on the closing page (native editable text in Picabook)
NO_CLOSING_PAGE = False  # True = skip closing page when videos/closing words are embedded across the album

# ---- cover (make_cover_photo.py + native cover text or make_cover_title.py) ------------------------------
COVER_TITLE_HE = "Our trip"  # first line of the cover title (any language)
COVER_SUB_HE = "2026"  # second line, half size
SPINE_TEXT_HE = ""  # spine text (defaults to "COVER_TITLE_HE · COVER_SUB_HE" when empty)
COVER_SRC = ""  # full-size cover photo (or the user's RAW export)
COVER_RATIO = 29.0 / 22.0  # front cover shape (Picabook Panoramic: 29/22; Lupa Panoramic Large: 3900/2860)
COVER_LEFT = None  # px cut on the left (None = evenly from both sides); move so the sky lands under the title
COVER_PEOPLE = (0.30, 0.52, 0.80, 1.02)  # where the people are (fractions): their shadows get lifted
COVER_SKY = (1.55, 0.86, 1.25)  # sky saturation, deepen, cloud contrast (1, 1, 1 = untouched)
COVER_TITLE_CX = 1450  # title centre on the cover sheet (px, for Lupa baked cover title)
COVER_TITLE_FONT = 207
COVER_IMAGE = "ready/upload/000_cover.jpg"  # shown on the plan (use 000_cover_title.jpg if baking title into image)
BACK_COVER_IMAGE = None
COVER_NOTE = "The cover photo fills the front cover; in Picabook the title and spine text stay editable native text boxes."

# ---- photo choices (review rounds) -------------------------------------------------------------------------
REPLACE: dict[int, int] = {}  # photo in the book -> replacement photo
FORCE_OUT: dict[int, str] = {}  # photo -> reason shown in the plan
FORCE_KEEP: set[int] = set()
FORCE_HERO: set[int] = set()  # full page
NO_HERO: set[int] = set()
SPREAD_FORCE: set[int] = set()  # double-page spread (drone shots, panoramas)
NOTES: dict[int, str] = {}  # notes shown on a photo in the plan
CAPTIONS: dict[int, str] = {}  # optional short printed caption per photo # (native editable text box in Picabook)
SWAPS: list[tuple[int, int]] = []  # applied in order, after layout
FILL_PICKS: list[int] = []
BIGGER: list[tuple[int, int]] = []  # (a, b): a gets the bigger frame
SAME_SIZE: list[tuple[int, int]] = []
PAGE_MAX: dict[str, int] = {}  # section -> max photos per page (never exceeds 5)
PAGE_CHUNKS: dict[str, list[list[int]]] = {}  # explicit section photo grouping per page: {"S02": [[1,2,3], [4,5]]}
ORDER_BEFORE: dict[int, int] = {}  # photo a goes right before photo b (story exceptions; never fake times)
CLOCK_FIXES: list[dict] = []  # [{"mp": 17.9, "tz_hours": 8, "shift_hours": 5}] wrong camera clocks
ORDER_NOTE = ", with wrong camera clocks fixed"
LOCK_FILE = ""  # "plan_locked.json" once the user approved the book: no automatic reshuffles after that
TEXT_HALF: dict = {}  # section -> {"photos": [...], "title": "", "text": ""}: half a spread of text
SPREAD_3_PLACES = True
STORE_KEY = "album-marks-r1"  # change every review round, so old marks don't come back

# ---- print tuning (prepare_originals.py) -------------------------------------------------------------------
# photo -> extra fixes: "shadows" 0-160 (+ "region" x0,y0,x1,y1), "bright"/"contrast"/"sat" %, "rotate" degrees
EXTRA_TUNE: dict[int, dict] = {}

# ---- optional suggested crops (strictly opt-in — NEVER auto-applied like tuning) ---------------------------
# SUGGESTED_CROPS: photos where cropping would make the photo much better. Never applied automatically;
# shown as a clickable "Suggested crop" chip in album-plan.html with a Before/After view so the user can
# approve or decline each crop individually.
# box = (x0, y0, x1, y1) as fractions 0..1 of the full photo.
SUGGESTED_CROPS: dict[int, dict] = {
    # 42: {"box": (0.12, 0.08, 0.88, 0.92), "reason": "Remove empty space on the edges and bring the family closer"},
}
# APPROVED_CROPS: crops explicitly APPROVED by the user. Only entries here reshape the frame in layout_pages.py
# and crop the print original in prepare_originals.py. Accepts (x0, y0, x1, y1) or {"box": (...), "reason": "..."}.
APPROVED_CROPS: dict[int, tuple | dict] = {
    # 42: (0.12, 0.08, 0.88, 0.92),
}

# ---- page headers & layout ---------------------------------------------------------------------------------
HIDDEN_TITLES: dict[int, list[str]] = {}  # plan page no -> sections whose header is removed
EXTRA_TITLES: dict[int, str] = {}  # plan page no -> extra header text
TITLE_BOTTOM: set[int] = set()  # headers at the page bottom
TITLE_SCALE: dict[int, float] = {}  # smaller header (e.g. to fit beside a QR)
TITLE_RIGHT_ALIGN: set[int] = set()  # plan page numbers where header title aligns right
HERO_TITLE_PAGES: set[int] = set()  # full-page photos that keep their section header
PAGE_BG_WHITE = True  # True = pure white (#ffffff) page background on all pages (modern clean look)

# ---- backgrounds (used when PAGE_BG_WHITE = False) ---------------------------------------------------------
BG_TEXTURES: dict[int, int] = {}  # editor spread index -> photo used as a full-spread background
BG_TEXTURE_FADE: dict[int, float] = {}  # spread -> 0.2 = 20% lighter
BG_TEXTURE_SOFTEN = 0.0

# ---- route map (make_map.py) -------------------------------------------------------------------------------
# (number, label in LANG, dates, lat, lng, label side l/r/t/b/n) — coordinates from the photos' own locations
US_STATES = False  # True for US road trips (colors visited states); False for international trips
STOPS: list[tuple] = []
ROUTE: list[tuple[float, float]] = []  # driving waypoints in trip order
NUDGE: dict[int, tuple[int, int]] = {}
SIDE_TRIP: list[tuple[float, float]] = []  # dashed line (flight, boat)
SIDE_TRIP_LABEL = ""
MAP_TITLE = ""  # default "המסלול שלנו" / "Our route"
MAP_SUBTITLE = ""
MAP_NOTE = ""
ROUTE_MILES_ACTUAL = None  # odometer / rental bill, when known
STATE_LABEL_AT: dict[str, tuple[float, float]] = {}  # US trips: move a state's name

# ---- QR codes & video titles (make_qr.py; rules in references/qr-rules.md) ------------------------------------
# page = plan page no; x/y = top-left and s = size, in cm on that page (29x22 for Picabook, 30x22 for Lupa);
# bg = page colour under the code; t = a unique EXIF second; title_he = label rendered next to the QR;
# url = direct link opened on click and encoded in Picabook's native QR element.
# Top-margin placement (x=1.0, y=0.22, s=1.92) keeps clearance above photos starting at y >= 2.4 cm.
# VIDEO_TITLES maps video # -> short title printed next to its QR code (overrides/fills QR_CODES title_he,
# and lets you pre-name videos from the album planner before placing their QR codes).
VIDEO_TITLES: dict[int, str] = {
    # 14: "סרטוני רומא",
}
QR_CODES: list[dict] = [
    # {"file": "ready/upload/qr_2026-05-02_rome.jpg", "src": "qr-codes/2026-05-02_rome.jpg", "bg": (255, 255, 255),
    #  "t": 41, "page": 12, "x": 1.0, "y": 0.22, "s": 1.92, "title_he": "סרטוני רומא", "video_n": 14,
    #  "url": "https://photos.app.goo.gl/...", "note": "Rome videos - top margin"},
]
QR_DEFAULT_BG = (255, 255, 255)

# ---- trip plan link & QR banner (optional) -------------------------------------------------------------------
TRIP_PLAN_URL = ""  # URL to full trip itinerary/drive document (opens direct on click)
TRIP_PLAN_QR = ""   # e.g. "qr-codes/trip-plan.jpg" (or ready/upload/...)
TRIP_PLAN_TITLE = ""  # e.g. "תוכנית הטיול המלאה" / "Complete Trip Itinerary"
TRIP_PLAN_DESC = ""   # e.g. "סריקת הקוד תוביל לקובץ המסלול המפורט" / "Scan to open trip doc"

# ---- plan page -----------------------------------------------------------------------------------------------
ALBUM_TAB_TITLE = "Album plan"
ALBUM_TITLE = "Our trip · album plan"
ALBUM_LINE = "Shared Google album · dates"
OUTPUT_HTML = "album-plan.html"
PRODUCT_HTML = ""  # recommended book + price table (HTML card); "__ROOM__" = number of photos that fit
THEMES: list[tuple] = []  # (key, name, English name, tag, why, [sample images in themes/])
THEME_NOTE = "Picabook's 'עיצוב חכם ללא תבנית' (clean white) gives a modern gallery look; check themes in the editor if you prefer decorative backgrounds."
EMO: dict[str, str] = {}  # optional: one cartoon symbol per section (Noto emoji code point); off by default
TRIP_FACTS: list[tuple[str, str]] = []  # (fact in LANG, source) from the family's trip documents
