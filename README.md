# 📸 Digital Album Skill for Google Antigravity

An end-to-end skill for **Google Antigravity** that turns a shared Google Photos album of a trip or event into a professionally printed photo book (**Picabook / picabook.co.il** default, **Lupa**, Shutterfly, and more).

---

## ✨ Features

- **Google Photos Extraction**: Automatically pulls all items, separates photos and videos, and detects video durations and direct share links.
- **Interactive Album Plan (`album-plan.html`)**:
  - **Spread & Page Layouts**: Enforces high-standard design rules (clean white backgrounds, max 5 photos per page, proper margins), defaults to the **After tuning** enhanced photo view (with Before/After toggle), and keeps photo action buttons hidden until hovering over a photo.
  - **Full-Screen Lightbox**: Click any photo to view full resolution.
  - **Enlarged QR Codes with Direct Browser Link & Inline Title Edit**: Clicking any QR code (or its label) opens an enlarged card with a one-click browser link and inline title editor that previews live next to the QR code.
  - **Dedicated Video Gallery (`#videos`)**: Review all trip videos (both placed in the album and unplaced), search by place/title, play directly, set a custom title for each video (added next to its QR code via `VIDEO_TITLES`), and mark favorites (★) or questions (?).
  - **Client-Side Review & Markups**: Mark replacement candidates, star favorites, set video/QR titles, and export feedback with "Copy my marks" to paste back to Antigravity.
- **Itinerary Maps**: Generates route maps with OpenStreetMap support for international trips.
- **Print Pre-Flight Check**: Checks bleed margins, low-resolution warnings, QR readability, and face occlusions.
- **Picabook (`picabook.co.il`) & Lupa Automation**:
  - **Picabook Web 4.0 (Default)**: Native editable `Heebo Unicode` Hebrew/English text boxes (headers, stories, captions, cover & rotated spine text with zero background boxes), exact centimeter (`0.01 cm`) photo frame locations & sizes (`29×22 cm` Panoramic Diamond Lay-flat / `58×22 cm` spreads), and native vector QR codes + Hebrew captions (`picabook_layout.py` + `picabook_apply.js`).
  - **Lupa**: Full crop-ready assets, >800 px title tiles, and automated WebSocket/DOM driver scripts (`lupa_layout.py`, `lupa_titles.py`, `lupa_apply.js`).

---

## 🚀 Installation

### 1. Clone into your Antigravity Skills directory
```bash
git clone https://github.com/OmerTu/digital-album.git ~/.gemini/config/skills/digital-album
```

*(Alternatively, to install for a single workspace/project only, clone into `<project-root>/.agents/skills/digital-album`).*

### 2. Install Python Dependencies
```bash
pip install -r ~/.gemini/config/skills/digital-album/requirements.txt
```
Dependencies:
- `pillow`
- `numpy`
- `opencv-python-headless`
- `qrcode`

---

## 💡 How to Use

In any Antigravity conversation, simply invoke the skill:

1. **Paste your shared album link**:
   > *"I want to make a photo album from this trip: https://photos.app.goo.gl/..."*
   > or type `/digital-album`

2. **Antigravity will**:
   - Inspect the album photos, dates, locations, and videos.
   - Propose book sizes, themes, and page counts.
   - Generate `album-plan.html` for you to review, mark favorites, and inspect videos.
   - Apply your marks and export final print spreads or drive the album builder.

---

## 📄 License

This project is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE).  
For commercial licensing inquiries, see [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md).
