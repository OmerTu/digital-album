// Helper for Picabook's Web 4.0 Online Editor (https://editor.picabook.co.il/?open=<GUID>).
// Powered by Sunpics (Angular 12 + Fabric.js, 29x22 cm single page / 58x22 cm lay-flat spread).
//
// Note on Antigravity browser tools:
// - When driving Picabook via Antigravity's built-in Browser Subagent (/browser), follow Path A in
//   references/picabook.md (Playwright UI batching directly from ready/picabook_layout.json — no JS eval needed).
// - When connected via Chrome DevTools MCP (`evaluate_script`) or pasted in Chrome DevTools Console, this file
//   defines `window.claudePicabook` for inspecting live Angular/Fabric canvases, loading ready/picabook_layout.json,
//   converting cm <-> canvas coordinates, turning off Smart-Book auto-reflow, navigating spreads, and running QA.

window.claudePicabook = (() => {
  // Capture Sunpics API traffic metadata passively (never logs or exposes auth tokens)
  if (!window.__claudePicabookHooked) {
    window.__picabookTraffic = { lastSaveOk: null, lastParseAt: null, imageCatalog: null };
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__pbUrl = String(url || '');
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      this.addEventListener('load', function () {
        try {
          if (/RefreshProjectsImages/i.test(this.__pbUrl) && this.status === 200) {
            window.__picabookTraffic.imageCatalog = JSON.parse(this.responseText);
          } else if (/SaveComplete|SaveProjectComplete/i.test(this.__pbUrl)) {
            window.__picabookTraffic.lastSaveOk = this.status === 200;
          } else if (/ParseProject/i.test(this.__pbUrl) && this.status === 200) {
            window.__picabookTraffic.lastParseAt = Date.now();
          }
        } catch (e) {}
      });
      return origSend.apply(this, arguments);
    };
    window.__claudePicabookHooked = true;
  }

  const getThumbs = () =>
    [...document.querySelectorAll('#page-thumbnails page-thumbnail')].map((el, idx) => ({
      index: idx,
      label: (el.querySelector('h3')?.textContent || '').trim(),
      el,
    }));

  const activeCanvasInfo = () => {
    const areas = [...document.querySelectorAll('pages-component')];
    for (let i = 0; i < areas.length; i++) {
      const lower = areas[i].querySelector('canvas.lower-canvas');
      if (!lower) continue;
      const rect = lower.getBoundingClientRect();
      if (rect.width > 20 && rect.height > 20) {
        // Locate Fabric.js canvas instance if attached to DOM node or Angular component
        const fabricCanvas =
          lower.__canvas ||
          lower.fabric ||
          (window.ng && (() => {
            try {
              const comp = window.ng.getComponent(areas[i]);
              return comp && (comp.canvas || comp._canvas || comp.fabricCanvas);
            } catch (e) {
              return null;
            }
          })()) ||
          null;
        return {
          editorIndex: i,
          domRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          canvasAttrW: Number(lower.getAttribute('width') || rect.width),
          canvasAttrH: Number(lower.getAttribute('height') || rect.height),
          exceededMargins: !!areas[i].querySelector('.exceededMarginsH, .exceededMarginsV'),
          smartToggleChecked: !!areas[i].querySelector('smartbook-component mat-slide-toggle.mat-checked'),
          fabricCanvas,
          areaEl: areas[i],
        };
      }
    }
    return null;
  };

  return {
    async loader() {
      let inp = document.getElementById('__claude_pb_in');
      if (!inp) {
        inp = document.createElement('input');
        inp.type = 'file';
        inp.id = '__claude_pb_in';
        inp.setAttribute('aria-label', 'claude picabook layout loader');
        inp.style.cssText = 'position:fixed;left:280px;top:52px;width:220px;height:30px;z-index:2147483647';
        inp.addEventListener('change', async () => {
          window.__picabookLayout = JSON.parse(await inp.files[0].text());
          inp.remove();
        });
        document.body.appendChild(inp);
      }
      return 'Feed ready/picabook_layout.json to input[aria-label="claude picabook layout loader"]';
    },

    inspect() {
      const thumbs = getThumbs();
      const active = activeCanvasInfo();
      const projectOpenId = new URLSearchParams(location.search).get('open') || '';
      const lowResWarnings = document.querySelectorAll('img[src*="warning_final_lr"], img[src*="warning_final_vr"]').length;
      return {
        projectSelected: !!projectOpenId,
        spreadCount: thumbs.length,
        labels: thumbs.map(t => `${t.index}: ${t.label}`),
        active: active
          ? {
              editorIndex: active.editorIndex,
              label: thumbs[active.editorIndex]?.label || '',
              domRect: active.domRect,
              exceededMargins: active.exceededMargins,
              smartToggleChecked: active.smartToggleChecked,
              hasFabricRef: !!active.fabricCanvas,
            }
          : null,
        lowResWarnings,
        layoutLoaded: !!(window.__picabookLayout && window.__picabookLayout.spreads),
        traffic: {
          lastSaveOk: window.__picabookTraffic.lastSaveOk,
          hasImageCatalog: !!window.__picabookTraffic.imageCatalog,
        },
      };
    },

    async goTo(labelOrIndex) {
      const thumbs = getThumbs();
      const target =
        typeof labelOrIndex === 'number'
          ? thumbs[labelOrIndex]
          : thumbs.find(t => t.label === String(labelOrIndex).trim());
      if (!target) return { ok: false, error: `Spread not found: ${labelOrIndex}` };
      const clickEl = target.el.querySelector('.pageThumb') || target.el;
      clickEl.scrollIntoView({ block: 'nearest', inline: 'center' });
      clickEl.click();
      await new Promise(r => setTimeout(r, 450));
      return { ok: true, index: target.index, label: target.label, active: this.inspect().active };
    },

    disableSmartBook() {
      const active = activeCanvasInfo();
      if (!active) return { ok: false, error: 'No active spread canvas' };
      const toggle = active.areaEl.querySelector('smartbook-component mat-slide-toggle.mat-checked label');
      if (toggle) toggle.click();
      return { ok: true, wasChecked: !!toggle };
    },

    cmToScreen(xCm, yCm, wCm = 0, hCm = 0) {
      const active = activeCanvasInfo();
      if (!active) return null;
      const thumbs = getThumbs();
      const lbl = thumbs[active.editorIndex]?.label || '';
      const single = /^עמוד\s+\d+$/.test(lbl);
      const canvasWcm = single ? 29.0 : 58.0;
      const canvasHcm = 22.0;
      const sx = active.domRect.width / canvasWcm;
      const sy = active.domRect.height / canvasHcm;
      return {
        screenX: Math.round(active.domRect.x + xCm * sx),
        screenY: Math.round(active.domRect.y + yCm * sy),
        screenW: Math.round(wCm * sx),
        screenH: Math.round(hCm * sy),
        centerX: Math.round(active.domRect.x + (xCm + wCm / 2) * sx),
        centerY: Math.round(active.domRect.y + (yCm + hCm / 2) * sy),
      };
    },

    planFor(labelOrIndex) {
      const L = window.__picabookLayout;
      if (!L || !L.spreads) return { error: 'Load ready/picabook_layout.json first' };
      const sp =
        typeof labelOrIndex === 'number'
          ? L.spreads.find(s => s.editor_index === labelOrIndex)
          : L.spreads.find(s => s.label === String(labelOrIndex).trim());
      if (!sp) return { error: `Spread ${labelOrIndex} not in picabook_layout.json` };
      return sp;
    },

    async check() {
      const thumbs = getThumbs();
      const issues = {
        spreadCountMismatch: null,
        exceededMargins: [],
        lowResIcons: [],
        smartBookStillOn: [],
      };
      const L = window.__picabookLayout;
      if (L && L.total_editor_spreads && thumbs.length !== L.total_editor_spreads) {
        issues.spreadCountMismatch = { editor: thumbs.length, plan: L.total_editor_spreads };
      }
      for (const t of thumbs) {
        (t.el.querySelector('.pageThumb') || t.el).click();
        await new Promise(r => setTimeout(r, 220));
        const active = activeCanvasInfo();
        if (!active) continue;
        if (active.exceededMargins) issues.exceededMargins.push(t.label);
        if (active.smartToggleChecked) issues.smartBookStillOn.push(t.label);
        const warns = active.areaEl.querySelectorAll('img[src*="warning_final_lr"], img[src*="warning_final_vr"]').length;
        if (warns > 0) issues.lowResIcons.push([t.label, warns]);
      }
      return { spreadsChecked: thumbs.length, issues };
    },
  };
})();
'claudePicabook ready';
