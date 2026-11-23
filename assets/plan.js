const src = n => 'data:image/jpeg;base64,' + I[n];
const cropSrc = n => (typeof CROP_IMGS !== 'undefined' && CROP_IMGS[n]) ? ('data:image/jpeg;base64,' + CROP_IMGS[n]) : src(n);
const filt = t => `brightness(${1 + t.bright / 100}) contrast(${1 + t.contrast / 100}) saturate(${1 + t.sat / 100})`;
const escAttr = s => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hasOwn = (obj, k) => !!obj && Object.prototype.hasOwnProperty.call(obj, k);
const KEY = STORE_KEY;
let M = {};
try { M = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { M = {}; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(M)); } catch (e) {} refreshMarks(); };
const isHebrew = (document.documentElement.lang === 'he') || (typeof LANG !== 'undefined' && LANG === 'he') || document.dir === 'rtl';

function cleanupMark(n) {
  n = String(n);
  const m = M[n];
  if (!m) return;
  if (!m.kind && !m.note && !hasOwn(m, 'qr_title') && !m.crop && !m.crop_note) {
    delete M[n];
  }
}

function getCropDecision(n) {
  n = String(n);
  return (M[n] && M[n].crop) || '';
}

function cropChipLabel(dec) {
  if (dec === 'approve') return isHebrew ? '✓ חיתוך אושר' : '✓ Crop approved';
  if (dec === 'decline') return isHebrew ? '✕ נשמר מקורי' : '✕ Keep original';
  return isHebrew ? '✂ הצעת חיתוך' : '✂ Suggested crop';
}

function setCropDecision(n, decision) {
  n = String(n);
  if (!decision) {
    if (M[n]) {
      delete M[n].crop;
      cleanupMark(n);
    }
  } else {
    M[n] = { ...(M[n] || {}), kind: (M[n] && M[n].kind) || '', crop: decision };
  }
  save();
}

function setCropNote(n, rawNote) {
  n = String(n);
  const trimmed = String(rawNote || '').trim();
  if (!trimmed) {
    if (M[n]) {
      delete M[n].crop_note;
      cleanupMark(n);
    }
  } else {
    M[n] = { ...(M[n] || {}), kind: (M[n] && M[n].kind) || '', crop_note: trimmed };
  }
  save();
}

function findVideo(n) {
  return (typeof V !== 'undefined' && Array.isArray(V)) ? V.find(x => String(x.n) === String(n)) : null;
}

function getVideoTitle(n) {
  n = String(n);
  if (M[n] && hasOwn(M[n], 'qr_title')) return M[n].qr_title || '';
  const v = findVideo(n);
  return (v && v.qr_title) || '';
}

function setVideoTitle(n, rawVal) {
  n = String(n);
  const v = findVideo(n);
  const initial = ((v && v.qr_title) || '').trim();
  const trimmed = String(rawVal || '').trim();
  if (trimmed === initial) {
    if (M[n]) {
      delete M[n].qr_title;
      if (!M[n].kind && !M[n].note) delete M[n];
    }
  } else {
    if (!M[n]) M[n] = { kind: '', note: '', is_video: true };
    M[n].qr_title = trimmed;
    M[n].is_video = true;
  }
  save();
}

function setStandaloneQrTitle(qrIdx, rawVal, pageNo, origNote, initTitle) {
  const key = 'qr_' + qrIdx;
  const initial = String(initTitle || '').trim();
  const trimmed = String(rawVal || '').trim();
  if (trimmed === initial) {
    delete M[key];
  } else {
    M[key] = {
      kind: '',
      qr_title: trimmed,
      qr_page: pageNo || '',
      qr_note: origNote || '',
      is_qr: true,
    };
  }
  save();
}

function syncQrLabels() {
  document.querySelectorAll('.qr-wrap').forEach(wrap => {
    const vn = wrap.dataset.videoN;
    const qidx = wrap.dataset.qrIdx;
    const initTitle = wrap.dataset.initTitle || '';
    let title = initTitle;
    if (vn && M[vn] && hasOwn(M[vn], 'qr_title')) {
      title = M[vn].qr_title || '';
    } else if (qidx !== undefined && qidx !== '' && M['qr_' + qidx] && hasOwn(M['qr_' + qidx], 'qr_title')) {
      title = M['qr_' + qidx].qr_title || '';
    }
    let lbl = wrap.querySelector('.qr-label');
    if (title) {
      if (!lbl) {
        lbl = document.createElement('span');
        lbl.className = 'qr-label he';
        lbl.setAttribute('dir', 'auto');
        wrap.appendChild(lbl);
      }
      lbl.textContent = title;
      lbl.style.display = '';
    } else if (lbl) {
      lbl.textContent = '';
      lbl.style.display = 'none';
    }
    wrap.dataset.curTitle = title;
  });
}

// Set up album photo tiles
document.querySelectorAll('.ph').forEach(el => {
  const n = el.dataset.n;
  el.style.backgroundImage = `url(${src(n)})`;
  el.style.setProperty('--f', filt(D[n].t));
  el.onclick = e => {
    if (e.target.closest('.crop-chip')) {
      e.stopPropagation();
      openCropModal(n);
    } else if (e.target.closest('.mk')) {
      e.stopPropagation();
      toggle(n, 'replace');
    } else if (e.target.closest('.mk-q')) {
      e.stopPropagation();
      toggle(n, 'question');
    } else if (e.target.closest('.mk-z')) {
      e.stopPropagation();
      zoomPhoto(n);
    } else {
      show(n);
    }
  };
});
document.querySelectorAll('.blur, .texbg').forEach(el => { el.style.backgroundImage = `url(${src(el.dataset.bg)})`; });

// Photo Index grid
const grid = document.getElementById('grid');
Object.values(D).sort((a, b) => a.o - b.o).forEach(p => {
  const c = document.createElement('div');
  c.className = 'pc' + (p.k ? '' : ' out');
  c.dataset.n = p.n;
  const st = p.k
    ? `<span class="st k">KEEP · page ${p.pg}${p.h ? ' · FULL PAGE' : ''}</span>`
    : (p.sc ? '<span class="st c">CUT FOR SPACE</span>' : '<span class="st o">OUT</span>');

  const starBtn = !p.k ? `<button type="button" class="pc-btn star" title="${isHebrew ? 'סמן בכוכב (★)' : 'Star photo (★)'}">★</button>` : '';
  const zoomBtn = `<button type="button" class="pc-btn zoom" title="${isHebrew ? 'הגדל תמונה (איכות גבוהה) 🔍' : 'Enlarge photo (high-res) 🔍'}">🔍</button>`;
  const cropChip = p.scrop
    ? `<button type="button" class="crop-chip" data-n="${p.n}" title="${escAttr(p.scrop.reason || (isHebrew ? 'לחץ להשוואת לפני/אחרי ולאישור חיתוך' : 'Click to compare Before/After and approve crop'))}">${cropChipLabel(getCropDecision(p.n))}</button>`
    : '';

  c.innerHTML = `
    <div class="img" style="background-image:url(${src(p.n)})">
      <i>${p.n}</i>
      ${cropChip}
      <div class="pc-acts">${starBtn}${zoomBtn}</div>
    </div>
    <div class="body">
      ${st} <span class="st m mkl"></span>
      <div><b>${p.pl}</b></div>
      <div>${p.s}</div>
      ${p.k ? '' : `<div class="muted">Why: ${p.r}</div>`}
      <div class="muted">${p.d}</div>
    </div>`;

  c.querySelector('.img').style.setProperty('--f', filt(p.t));
  c.querySelector('.img').onclick = e => {
    if (e.target.closest('.crop-chip')) {
      e.stopPropagation();
      openCropModal(p.n);
    } else if (e.target.closest('.pc-btn.star')) {
      e.stopPropagation();
      toggle(p.n, 'star');
    } else if (e.target.closest('.pc-btn.zoom')) {
      e.stopPropagation();
      zoomPhoto(p.n);
    } else {
      show(p.n);
    }
  };
  grid.appendChild(c);
});

function toggle(n, kind) {
  n = String(n);
  if (M[n] && M[n].kind === kind) {
    M[n].kind = '';
    M[n].with = '';
    cleanupMark(n);
  } else {
    M[n] = { ...(M[n] || {}), kind, note: (M[n] && M[n].note) || '', with: (M[n] && M[n].with) || '' };
  }
  save();
}

function refreshMarks() {
  document.querySelectorAll('.ph').forEach(el => {
    const n = el.dataset.n;
    const p = D[n];
    const m = M[n];
    const isRep = m && m.kind === 'replace';
    const isSwap = m && m.kind === 'swap';
    const isQ = m && m.kind === 'question';
    const cdec = getCropDecision(n);
    el.classList.toggle('marked', isRep || isSwap);
    el.classList.toggle('marked-q', isQ);
    const qb = el.querySelector('.q-badge');
    if (qb) qb.style.display = isQ ? 'flex' : 'none';
    el.dataset.with = m && m.with ? (m.kind === 'swap' ? ` ↔ #${m.with}` : ` ← #${m.with}`) : '';
    if (p && p.scrop) {
      const approved = cdec === 'approve';
      el.classList.toggle('crop-approved', approved);
      el.style.backgroundImage = `url(${approved ? cropSrc(n) : src(n)})`;
      const chip = el.querySelector('.crop-chip');
      if (chip) {
        chip.classList.toggle('approved', approved);
        chip.classList.toggle('declined', cdec === 'decline');
        chip.textContent = cropChipLabel(cdec);
      }
    }
  });

  grid.querySelectorAll('.pc').forEach(c => {
    const n = c.dataset.n;
    const p = D[n];
    const m = M[n];
    const isRep = m && m.kind === 'replace';
    const isSwap = m && m.kind === 'swap';
    const isAdd = m && m.kind === 'add';
    const isStar = m && m.kind === 'star';
    const isQ = m && m.kind === 'question';
    const cdec = getCropDecision(n);

    c.classList.toggle('marked', isRep || isSwap || isAdd);
    c.classList.toggle('starred', isStar);
    c.classList.toggle('marked-q', isQ);

    if (p && p.scrop) {
      const approved = cdec === 'approve';
      const imgEl = c.querySelector('.img');
      if (imgEl) imgEl.style.backgroundImage = `url(${approved ? cropSrc(n) : src(n)})`;
      const chip = c.querySelector('.crop-chip');
      if (chip) {
        chip.classList.toggle('approved', approved);
        chip.classList.toggle('declined', cdec === 'decline');
        chip.textContent = cropChipLabel(cdec);
      }
    }

    const mkl = c.querySelector('.mkl');
    if (mkl) {
      const badges = [];
      if (isRep) badges.push(`<span class="st m">REPLACE${m.with ? ' WITH #' + m.with : ''}</span>`);
      else if (isSwap) badges.push(`<span class="st m">SWAP WITH #${m.with}</span>`);
      else if (isAdd) badges.push('<span class="st m">MARKED: ADD BACK</span>');
      else if (isStar) badges.push('<span class="st star">★ STARRED</span>');
      else if (isQ) badges.push('<span class="st qmark">? QUESTION</span>');
      if (cdec === 'approve') badges.push(`<span class="st crop-ok">${isHebrew ? '✂ חיתוך אושר' : '✂ CROP APPROVED'}</span>`);
      else if (cdec === 'decline') badges.push(`<span class="st crop-no">${isHebrew ? '✂ ללא חיתוך' : '✂ KEEP ORIGINAL'}</span>`);
      mkl.innerHTML = badges.length ? '· ' + badges.join(' · ') : '';
    }
  });

  const vgrid = document.getElementById('vgrid');
  if (vgrid) {
    vgrid.querySelectorAll('.vc').forEach(c => {
      const n = c.dataset.n;
      const m = M[n];
      const v = findVideo(n);
      const isStar = !!(m && m.kind === 'star');
      const isQ = !!(m && m.kind === 'question');
      const hasCustomTitle = !!(m && hasOwn(m, 'qr_title'));
      const curTitle = getVideoTitle(n);

      c.classList.toggle('starred', isStar);
      c.classList.toggle('marked-q', isQ);
      c.classList.toggle('has-title', !!curTitle);
      c.classList.toggle('title-edited', hasCustomTitle);

      const inp = c.querySelector('.vc-qr-title');
      if (inp && document.activeElement !== inp && inp.value !== curTitle) {
        inp.value = curTitle;
      }

      const stTitle = c.querySelector('.vc-status-title');
      if (stTitle && v && v.in_album) {
        stTitle.textContent = curTitle ? ` (${curTitle})` : '';
      }

      const mkl = c.querySelector('.v-mkl');
      if (mkl) {
        const badges = [];
        if (isStar) badges.push(`<span class="st star">★ ${isHebrew ? 'מועדף' : 'STARRED'}</span>`);
        else if (isQ) badges.push(`<span class="st qmark">? ${isHebrew ? 'שאלה' : 'QUESTION'}${m.note ? ': ' + escAttr(m.note) : ''}</span>`);
        if (hasCustomTitle) badges.push(`<span class="st vtitle">🏷️ ${isHebrew ? 'כותרת עודכנה' : 'TITLE SET'}</span>`);
        mkl.innerHTML = badges.length ? '· ' + badges.join(' · ') : '';
      }
    });
  }

  syncQrLabels();

  const r = Object.values(M).filter(m => m.kind === 'replace').length;
  const a = Object.values(M).filter(m => m.kind === 'add').length;
  const w = Object.values(M).filter(m => m.kind === 'swap').length;
  const q = Object.values(M).filter(m => m.kind === 'question').length;
  const s = Object.values(M).filter(m => m.kind === 'star').length;
  const t = Object.values(M).filter(m => hasOwn(m, 'qr_title')).length;
  const ca = Object.values(M).filter(m => m.crop === 'approve').length;
  const cd = Object.values(M).filter(m => m.crop === 'decline').length;

  const parts = [];
  if (r) parts.push(`Replace: ${r}`);
  if (w) parts.push(`Swap: ${w}`);
  if (a) parts.push(`Add back: ${a}`);
  if (q) parts.push(`Questions (?): ${q}`);
  if (s) parts.push(`Starred (★): ${s}`);
  if (ca) parts.push(`Crops approved: ${ca}`);
  if (cd) parts.push(`Crops declined: ${cd}`);
  if (t) parts.push(`QR titles: ${t}`);

  document.getElementById('markcount').textContent = parts.length ? parts.join(' · ') : 'No marks yet';
  const jumpCropBtn = document.getElementById('jump-crop');
  if (jumpCropBtn) {
    const allScrops = Object.values(D).filter(p => p.scrop);
    const pending = allScrops.filter(p => !getCropDecision(p.n)).length;
    jumpCropBtn.textContent = pending
      ? (isHebrew ? `✂ ${pending} הצעות חיתוך ממתינות` : `✂ ${pending} pending crop${pending === 1 ? '' : 's'}`)
      : (isHebrew ? `✂ כל ${allScrops.length} הצעות החיתוך נבדקו ✓` : `✂ All ${allScrops.length} crops reviewed ✓`);
  }
  apply();
  if (typeof applyVideoFilters === 'function') applyVideoFilters();
  if (currentZoomN) updateZoomActions(currentZoomN);
  if (typeof updateCropModalState === 'function' && currentCropN) updateCropModalState(currentCropN);
  if (typeof updateVideoModalMarks === 'function' && currentVidN) updateVideoModalMarks(currentVidN);
}

function marksText() {
  const photoEntries = [];
  const cropEntries = [];
  const videoEntries = [];
  const qrEntries = [];

  Object.entries(M).forEach(([n, m]) => {
    if (!m) return;
    if (m.is_qr) {
      qrEntries.push([n, m]);
      return;
    }
    if (m.crop || m.crop_note) {
      cropEntries.push([n, m]);
    }
    const isVid = m.is_video || (typeof V !== 'undefined' && V.some(v => String(v.n) === String(n)));
    if (isVid) {
      if (m.kind || m.note || hasOwn(m, 'qr_title')) videoEntries.push([n, m]);
    } else if (m.kind || m.note) {
      photoEntries.push([n, m]);
    }
  });

  const lines = [];

  if (photoEntries.length) {
    photoEntries.sort((a, b) => ((D[a[0]] && D[a[0]].o) || 0) - ((D[b[0]] && D[b[0]].o) || 0)).forEach(([n, m]) => {
      const p = D[n] || {};
      if (m.kind === 'replace') {
        lines.push((m.with ? `Replace #${n} (page ${p.pg || '–'}) with #${m.with}` : `Remove #${n} (page ${p.pg || '–'}), no replacement yet`) + (m.note ? ` — ${m.note}` : ''));
      } else if (m.kind === 'swap') {
        lines.push(`Swap #${n} and #${m.with} (page ${p.pg || '–'})${m.note ? ` — ${m.note}` : ''}`);
      } else if (m.kind === 'add') {
        lines.push(`Add back #${n}${m.note ? ` — ${m.note}` : ''}`);
      } else if (m.kind === 'question') {
        lines.push(`Question on #${n} (page ${p.pg || 'out'})${m.note ? `: ${m.note}` : ''}`);
      } else if (m.kind === 'star') {
        lines.push(`Star #${n} (candidate)${m.note ? ` — ${m.note}` : ''}`);
      } else {
        lines.push(`Mark #${n}${m.note ? ` — ${m.note}` : ''}`);
      }
    });
  }

  if (cropEntries.length) {
    if (lines.length) lines.push('');
    lines.push(isHebrew ? '=== הצעות חיתוך (Crops) ===' : '=== Suggested crops ===');
    cropEntries.sort((a, b) => ((D[a[0]] && D[a[0]].o) || 0) - ((D[b[0]] && D[b[0]].o) || 0)).forEach(([n, m]) => {
      const p = D[n] || {};
      const pgTxt = p.pg ? (isHebrew ? `עמוד ${p.pg}` : `page ${p.pg}`) : (isHebrew ? 'מחוץ לאלבום' : 'out');
      const boxStr = p.scrop && p.scrop.box ? ` box [${p.scrop.box.join(', ')}]` : '';
      const noteStr = m.crop_note ? ` — ${m.crop_note}` : '';
      if (m.crop === 'approve') {
        lines.push(isHebrew
          ? `✂ אשר חיתוך לתמונה #${n} (${pgTxt})${boxStr}${noteStr}`
          : `✂ Approve crop on #${n} (${pgTxt})${boxStr}${noteStr}`);
      } else if (m.crop === 'decline') {
        lines.push(isHebrew
          ? `✂ שמור מקורי (ללא חיתוך) לתמונה #${n} (${pgTxt})${noteStr}`
          : `✂ Keep original (decline crop) on #${n} (${pgTxt})${noteStr}`);
      } else if (m.crop_note) {
        lines.push(isHebrew
          ? `✂ הערה להצעת חיתוך לתמונה #${n} (${pgTxt})${boxStr}${noteStr}`
          : `✂ Note on suggested crop for #${n} (${pgTxt})${boxStr}${noteStr}`);
      }
    });
  }

  if (videoEntries.length || qrEntries.length) {
    if (lines.length) lines.push('');
    lines.push(isHebrew ? '=== סימונים וכותרות סרטונים / QR ===' : '=== Video & QR marks / titles ===');
    videoEntries.sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([n, m]) => {
      const v = findVideo(n) || {};
      const albStatus = v.in_album ? (isHebrew ? `באלבום, עמוד ${v.page || '–'}` : `in album, p. ${v.page || '–'}`) : (isHebrew ? 'מחוץ לאלבום' : 'outside album');
      const hasTitle = hasOwn(m, 'qr_title');
      const titleSuffix = hasTitle
        ? (m.qr_title
          ? (isHebrew ? ` | כותרת ליד ה-QR: "${m.qr_title}"` : ` | QR title: "${m.qr_title}"`)
          : (isHebrew ? ' | הסר כותרת QR' : ' | remove QR title'))
        : '';
      if (m.kind === 'star') {
        lines.push((isHebrew
          ? `★ סרטון מועדף #${n} (${albStatus}${v.dur_str ? ', ' + v.dur_str : ''})${v.pl ? ' · ' + v.pl : ''}${m.note ? ` — ${m.note}` : ''}`
          : `★ Starred video #${n} (${albStatus}${v.dur_str ? ', ' + v.dur_str : ''})${v.pl ? ' · ' + v.pl : ''}${m.note ? ` — ${m.note}` : ''}`) + titleSuffix);
      } else if (m.kind === 'question') {
        lines.push((isHebrew
          ? `? שאלה על סרטון #${n} (${albStatus}${v.dur_str ? ', ' + v.dur_str : ''})${m.note ? `: ${m.note}` : ''}`
          : `? Question on video #${n} (${albStatus}${v.dur_str ? ', ' + v.dur_str : ''})${m.note ? `: ${m.note}` : ''}`) + titleSuffix);
      } else if (hasTitle) {
        const titleAction = m.qr_title
          ? (isHebrew ? `כותרת ליד ה-QR: "${m.qr_title}"` : `QR title: "${m.qr_title}"`)
          : (isHebrew ? 'הסר כותרת QR' : 'remove QR title');
        lines.push(isHebrew
          ? `🏷️ כותרת לסרטון #${n} (${albStatus}${v.dur_str ? ', ' + v.dur_str : ''})${v.pl ? ' · ' + v.pl : ''} — ${titleAction}`
          : `🏷️ Video title #${n} (${albStatus}${v.dur_str ? ', ' + v.dur_str : ''})${v.pl ? ' · ' + v.pl : ''} — ${titleAction}`);
      } else if (m.kind) {
        lines.push(`Video #${n} (${m.kind})${m.note ? ` — ${m.note}` : ''}`);
      }
    });
    qrEntries.forEach(([, m]) => {
      if (!hasOwn(m, 'qr_title')) return;
      const action = m.qr_title ? `"${m.qr_title}"` : (isHebrew ? 'הסר כותרת' : 'remove title');
      lines.push(isHebrew
        ? `🏷️ כותרת לקוד QR (עמוד ${m.qr_page || '–'})${m.qr_note ? ' · ' + m.qr_note : ''} — ${action}`
        : `🏷️ QR code title (page ${m.qr_page || '–'})${m.qr_note ? ' · ' + m.qr_note : ''} — ${action}`);
    });
  }

  return lines.length ? (isHebrew ? 'סימונים לאלבום ולסרטונים:\n' : 'Album & video marks:\n') + lines.join('\n') : '';
}

document.getElementById('copy').onclick = async () => {
  const t = marksText(); if (!t) return;
  try { await navigator.clipboard.writeText(t); } catch (e) { const b = document.getElementById('copybox'); b.value = t; b.select(); document.execCommand('copy'); }
  const btn = document.getElementById('copy'); btn.textContent = 'Copied ✓ — paste to Claude'; setTimeout(() => btn.textContent = 'Copy my marks', 2500);
};
document.getElementById('clear').onclick = () => { if (confirm('Clear all marks?')) { M = {}; save(); } };

const lb = document.getElementById('lb');
function show(n) {
  n = String(n); const p = D[n]; const m = M[n];
  const status = p.k ? `<b style="color:var(--keep)">Kept</b> · page ${p.pg}${p.h ? ' (full page / spread)' : ''}` : (p.sc ? `<b style="color:var(--cut)">Cut for space</b>` : `<b style="color:var(--out)">Left out</b>`);

  let actHtml = '';
  if (p.k) {
    const isRep = m && m.kind === 'replace';
    const isQ = m && m.kind === 'question';
    actHtml = `
      <button class="${isRep ? 'btn-mark' : ''}" id="bm">${isRep ? '✓ Marked for replacement' : 'Mark for replacement'}</button>
      <button class="${isQ ? 'btn-mark' : ''}" id="bm-q" style="background:${isQ ? '#d97706' : '#f59e0b'};color:#fff">${isQ ? (isHebrew ? '✓ מסומן עם ?' : '✓ Marked with ?') : (isHebrew ? '? סמן בסימן שאלה' : '? Mark with question mark')}</button>
    `;
  } else {
    const isAdd = m && m.kind === 'add';
    const isStar = m && m.kind === 'star';
    actHtml = `
      <button class="${isAdd ? 'btn-mark' : ''}" id="bm">${isAdd ? '✓ Marked: add back' : 'Add back to album'}</button>
      <button class="${isStar ? 'btn-mark' : ''}" id="bm-star" style="background:${isStar ? '#d97706' : '#f59e0b'};color:#fff">${isStar ? (isHebrew ? '★ מסומן בכוכב' : '★ Starred') : (isHebrew ? '★ סמן בכוכב' : '★ Star photo')}</button>
    `;
  }

  document.getElementById('lbin').innerHTML = `
    <div class="cmp"><img src="${src(n)}" alt="before"><img src="${src(n)}" alt="after" style="filter:${filt(p.t)}"></div>
    <div class="meta">
      <h3>Photo #${p.n}</h3>
      <p>${status}</p>
      <p><b>${p.pl}</b> · ${p.d}</p>
      <p>${p.s}</p>
      ${p.k ? '' : `<p><b>Why out:</b> ${p.r}</p>`}${p.note ? `<p><b>Note:</b> ${p.note}</p>` : ''}
      ${p.fr ? `<p><b>Frame:</b> ${p.fr}</p>` : ''}
      <p><b>Tuning:</b> ${p.tt}</p>
      ${p.acrop ? `<p><b>Crop:</b> ${isHebrew ? 'חיתוך מאושר' : 'Approved crop'} [${p.acrop.box.join(', ')}]${p.acrop.reason ? ' — ' + escAttr(p.acrop.reason) : ''}</p>` : ''}
      ${p.scrop ? `<p><b>${isHebrew ? 'הצעת חיתוך אופציונלית:' : 'Optional suggested crop:'}</b> ${escAttr(p.scrop.reason || '')} <button type="button" id="bcrop" style="background:${getCropDecision(n) === 'approve' ? '#15803d' : '#4f46e5'};color:#fff;margin-inline-start:6px">${cropChipLabel(getCropDecision(n))} · ${isHebrew ? 'לפני / אחרי' : 'Before / After'}</button></p>` : ''}
      <p class="muted">Reviewer hint: ${p.fx || 'none'} · quality ${p.q}/5 · ratio ${p.ar}</p>
      <p class="he muted">${S[p.sec] ? S[p.sec].he : ''}</p>
      <div class="actions">
        ${actHtml}
        <button id="bzoom" style="background:#2563eb;color:#fff">${isHebrew ? '🔍 הגדל תמונה (איכות מקסימלית)' : '🔍 Enlarge high-res'}</button>
        <button id="bc">Close</button>
      </div>
      ${p.k ? `<div class="pick"><b>Replace with:</b> <span class="muted">click a photo from this place, or type a number</span>
        <div class="cands" id="cands"></div>
        <div class="actions"><input type="search" id="bw" placeholder="Photo #" value="${m && m.kind === 'replace' && m.with ? m.with : ''}" style="width:110px"><button id="more">More from nearby places</button>${m && m.kind === 'replace' && m.with ? '<button id="nowith">No replacement</button>' : ''}</div></div>
        <div class="pick"><b>Swap with</b> <span class="muted">another photo on this page / spread (they trade places)</span>
        <div class="cands" id="mates"></div></div>` : ''}
      <input type="text" id="bn" placeholder="Optional note (e.g. crop less, brighter, question details)" value="${m ? (m.note || '').replace(/"/g, '&quot;') : ''}">
      <p class="muted">Left: before · Right: after tuning (preview)</p>
    </div>`;

  document.getElementById('bm').onclick = () => { toggle(n, p.k ? 'replace' : 'add'); show(n); };
  if (document.getElementById('bm-q')) {
    document.getElementById('bm-q').onclick = () => { toggle(n, 'question'); show(n); };
  }
  if (document.getElementById('bm-star')) {
    document.getElementById('bm-star').onclick = () => { toggle(n, 'star'); show(n); };
  }
  document.getElementById('bzoom').onclick = () => { lb.classList.remove('show'); zoomPhoto(n); };
  if (document.getElementById('bcrop')) {
    document.getElementById('bcrop').onclick = () => { lb.classList.remove('show'); openCropModal(n); };
  }

  if (p.k) {
    const setWith = w => { M[n] = { ...(M[n] || {}), kind: 'replace', with: w ? String(w) : '', note: (M[n] && M[n].note) || '' }; save(); show(n); };
    const secs = Object.keys(S).sort(); const si = secs.indexOf(p.sec);
    const fill = wide => {
      const near = wide ? secs.slice(Math.max(0, si - 1), si + 2) : [p.sec];
      const list = Object.values(D).filter(x => near.includes(x.sec) && String(x.n) !== n && (!x.k || wide)).sort((a, b) => (a.k - b.k) || (b.sc - a.sc) || (a.o - b.o));
      document.getElementById('cands').innerHTML = list.map(x => `<div class="cand ${m && m.with == x.n ? 'sel' : ''} ${x.k ? 'inalb' : ''}" data-w="${x.n}" title="${escAttr(x.s)}"><img src="${src(x.n)}" alt="#${x.n}" style="--f:${filt(x.t)}"><i>${x.n}</i>${x.k ? '<em>in album</em>' : x.sc ? '<em>cut</em>' : ''}</div>`).join('') || '<span class="muted">No other photos from this place — try "More from nearby places" or type a number.</span>';
      document.querySelectorAll('#cands .cand').forEach(c => c.onclick = () => setWith(c.dataset.w));
    };
    fill(false);
    document.getElementById('mates').innerHTML = (p.mt || []).map(x => `<div class="cand ${m && m.kind === 'swap' && m.with == x ? 'sel' : ''}" data-s="${x}" title="${escAttr(D[x].s)}"><img src="${src(x)}" alt="#${x}" style="--f:${filt(D[x].t)}"><i>${x}</i></div>`).join('') || '<span class="muted">This photo is alone on its page.</span>';
    document.querySelectorAll('#mates .cand').forEach(c => c.onclick = () => { const w = c.dataset.s;
      if (M[n] && M[n].kind === 'swap' && M[n].with === w) { M[n].kind = ''; M[n].with = ''; cleanupMark(n); }
      else M[n] = { ...(M[n] || {}), kind: 'swap', with: w, note: (M[n] && M[n].note) || '' };
      save(); show(n); });
    document.getElementById('more').onclick = () => fill(true);
    document.getElementById('bw').onchange = e => { const w = e.target.value.trim().replace('#', ''); if (D[w]) setWith(w); };
    const nw = document.getElementById('nowith'); if (nw) nw.onclick = () => setWith('');
  }
  document.getElementById('bc').onclick = () => lb.classList.remove('show');
  document.getElementById('bn').oninput = e => { M[n] = { ...(M[n] || {}), kind: (M[n] && M[n].kind) || (p.k ? 'replace' : 'add'), note: e.target.value }; save(); };
  lb.classList.add('show');
}
lb.onclick = e => { if (e.target === lb) lb.classList.remove('show'); };

// Fullscreen Photo Lightbox Implementation
let currentZoomN = null;
const allPhotoKeys = Object.keys(D).sort((a, b) => D[a].o - D[b].o);
const photolb = document.getElementById('photolb');
const photolbImg = document.getElementById('photolb-img');
const photolbSpinner = document.getElementById('photolb-spinner');

function zoomPhoto(n) {
  n = String(n);
  if (!D[n]) return;
  currentZoomN = n;
  const p = D[n];

  document.getElementById('photolb-n').textContent = '#' + p.n;
  document.getElementById('photolb-date').textContent = p.d + ' · ' + p.pl + (S[p.sec] ? ' (' + (isHebrew ? S[p.sec].he : (S[p.sec].en || S[p.sec].he)) + ')' : '');

  const tag = document.getElementById('photolb-tag');
  tag.className = 'photolb-tag ' + (p.k ? 'k' : 'o');
  tag.textContent = p.k
    ? (isHebrew ? `בעמוד ${p.pg}${p.h ? ' · עמוד שלם' : ''}` : `Page ${p.pg}${p.h ? ' · full page' : ''}`)
    : (p.sc ? (isHebrew ? 'נחתך מחוסר מקום' : 'Cut for space') : (isHebrew ? 'מחוץ לאלבום' : 'Out of album'));

  let desc = p.s || '';
  if (!p.k && p.r) desc += isHebrew ? ` — סיבה: ${p.r}` : ` — Why: ${p.r}`;
  if (p.note) desc += isHebrew ? ` | הערה: ${p.note}` : ` | Note: ${p.note}`;
  document.getElementById('photolb-desc').textContent = desc;

  const gpl = document.getElementById('photolb-gp');
  if (p.su) {
    gpl.href = p.su;
    gpl.textContent = isHebrew ? 'פתח ב-Google Photos ↗' : 'Open in Google Photos ↗';
    gpl.style.display = 'inline-flex';
  } else {
    gpl.style.display = 'none';
  }

  // Load preview immediately from base64
  photolbImg.src = src(n);
  photolbImg.style.filter = document.body.classList.contains('after') ? filt(p.t) : 'none';

  // Asynchronously load high-res from CDN
  if (p.u) {
    photolbSpinner.style.display = 'block';
    photolbSpinner.textContent = isHebrew ? 'טוען איכות גבוהה...' : 'Loading high-res...';
    const hiRes = new Image();
    const hiResUrl = p.u + '=w2048-h1600';
    hiRes.onload = () => {
      if (currentZoomN === n) {
        photolbImg.src = hiResUrl;
        photolbSpinner.style.display = 'none';
      }
    };
    hiRes.onerror = () => {
      photolbSpinner.style.display = 'none';
    };
    hiRes.src = hiResUrl;
  } else {
    photolbSpinner.style.display = 'none';
  }

  updateZoomActions(n);
  photolb.classList.add('show');
}

function updateZoomActions(n) {
  const p = D[n];
  const m = M[n];
  const actDiv = document.getElementById('photolb-actions');
  if (!actDiv) return;

  const cropBtnHtml = p.scrop
    ? `<button type="button" class="photolb-btn btn-crop ${getCropDecision(n) === 'approve' ? 'approved btn-active' : ''}" id="z-crop">${cropChipLabel(getCropDecision(n))}</button>`
    : '';

  if (p.k) {
    const isRep = m && m.kind === 'replace';
    const isQ = m && m.kind === 'question';
    actDiv.innerHTML = `
      <button type="button" class="photolb-btn btn-replace ${isRep ? 'btn-active' : ''}" id="z-rep">
        ${isRep ? (isHebrew ? '✓ מסומן להחלפה' : '✓ Marked for replacement') : (isHebrew ? '✕ סמן להחלפה' : '✕ Mark for replacement')}
      </button>
      <button type="button" class="photolb-btn btn-question ${isQ ? 'btn-active' : ''}" id="z-q">
        ${isQ ? (isHebrew ? '✓ מסומן בסימן שאלה (?)' : '✓ Marked with ?') : (isHebrew ? '? סמן בסימן שאלה' : '? Mark with question mark')}
      </button>
      ${cropBtnHtml}
    `;
    document.getElementById('z-rep').onclick = () => toggle(n, 'replace');
    document.getElementById('z-q').onclick = () => toggle(n, 'question');
  } else {
    const isAdd = m && m.kind === 'add';
    const isStar = m && m.kind === 'star';
    actDiv.innerHTML = `
      <button type="button" class="photolb-btn btn-add ${isAdd ? 'btn-active' : ''}" id="z-add">
        ${isAdd ? (isHebrew ? '✓ סומן להוספה לאלבום' : '✓ Marked to add') : (isHebrew ? '+ הוסף לאלבום' : '+ Add to album')}
      </button>
      <button type="button" class="photolb-btn btn-star ${isStar ? 'btn-active' : ''}" id="z-star">
        ${isStar ? (isHebrew ? '★ מסומן בכוכב' : '★ Starred') : (isHebrew ? '★ סמן בכוכב' : '★ Star photo')}
      </button>
      ${cropBtnHtml}
    `;
    document.getElementById('z-add').onclick = () => toggle(n, 'add');
    document.getElementById('z-star').onclick = () => toggle(n, 'star');
  }
  if (document.getElementById('z-crop')) {
    document.getElementById('z-crop').onclick = () => { closeZoom(); openCropModal(n); };
  }
}

function closeZoom() {
  photolb.classList.remove('show');
  currentZoomN = null;
}

function prevZoom() {
  if (!currentZoomN) return;
  const idx = allPhotoKeys.indexOf(currentZoomN);
  if (idx > 0) zoomPhoto(allPhotoKeys[idx - 1]);
}

function nextZoom() {
  if (!currentZoomN) return;
  const idx = allPhotoKeys.indexOf(currentZoomN);
  if (idx < allPhotoKeys.length - 1) zoomPhoto(allPhotoKeys[idx + 1]);
}

document.getElementById('photolb-close').onclick = closeZoom;
document.getElementById('photolb-prev').onclick = prevZoom;
document.getElementById('photolb-next').onclick = nextZoom;
photolb.onclick = e => { if (e.target === photolb) closeZoom(); };

// Optional Suggested Crop Before / After Modal
const croplb = document.getElementById('croplb');
let currentCropN = null;

function openCropModal(n) {
  n = String(n);
  const p = D[n];
  if (!p || !p.scrop || !croplb) return;
  currentCropN = n;
  const sc = p.scrop;
  const [x0, y0, x1, y1] = sc.box;
  const pgTxt = p.pg ? (isHebrew ? `עמוד ${p.pg}` : `Page ${p.pg}`) : (isHebrew ? 'מחוץ לאלבום' : 'Out of album');

  document.getElementById('croplb-title').textContent = isHebrew
    ? `✂ הצעת חיתוך · תמונה #${p.n} (${pgTxt})`
    : `✂ Suggested crop · Photo #${p.n} (${pgTxt})`;
  document.getElementById('croplb-reason').textContent = sc.reason
    ? sc.reason
    : (isHebrew ? 'חיתוך ממוקד יותר לשיפור הקומפוזיציה' : 'Tighter framing to improve composition');

  const keepW = Math.round((x1 - x0) * 100);
  const keepH = Math.round((y1 - y0) * 100);
  document.getElementById('croplb-meta').textContent = isHebrew
    ? `${p.pl} · שומר ${keepW}% רוחב × ${keepH}% גובה (${sc.w}×${sc.h} px · יחס ${p.ar} → ${sc.ar}) · החיתוך אופציונלי ואינו מופעל ללא אישור`
    : `${p.pl} · keeps ${keepW}% W × ${keepH}% H (${sc.w}×${sc.h} px · aspect ${p.ar} → ${sc.ar}) · optional — never applied unless approved`;

  const beforeImg = document.getElementById('croplb-before');
  const afterImg = document.getElementById('croplb-after');
  const stage = document.getElementById('croplb-stage');
  const guide = document.getElementById('croplb-guide');

  const sameFilter = document.body.classList.contains('after') ? filt(p.t) : 'none';
  beforeImg.src = src(n);
  beforeImg.style.filter = sameFilter;
  afterImg.src = cropSrc(n);
  afterImg.style.filter = sameFilter;

  guide.style.left = (x0 * 100) + '%';
  guide.style.top = (y0 * 100) + '%';
  guide.style.width = ((x1 - x0) * 100) + '%';
  guide.style.height = ((y1 - y0) * 100) + '%';
  stage.classList.remove('no-guide');
  const gbtn = document.getElementById('croplb-guide-toggle');
  if (gbtn) gbtn.textContent = isHebrew ? 'הסתר מסגרת' : 'Hide crop frame';

  const noteIn = document.getElementById('croplb-note');
  if (noteIn) {
    noteIn.value = (M[n] && M[n].crop_note) || '';
    noteIn.oninput = e => { setCropNote(n, e.target.value); };
  }

  updateCropModalState(n);
  croplb.classList.add('show');
}

function updateCropModalState(n) {
  if (!croplb) return;
  n = String(n);
  const dec = getCropDecision(n);
  const appBtn = document.getElementById('croplb-approve');
  const decBtn = document.getElementById('croplb-decline');
  const rstBtn = document.getElementById('croplb-reset');
  if (appBtn) {
    appBtn.classList.toggle('active', dec === 'approve');
    appBtn.textContent = dec === 'approve'
      ? (isHebrew ? '✓ חיתוך מאושר' : '✓ Crop approved')
      : (isHebrew ? '✓ אשר חיתוך' : '✓ Approve crop');
    appBtn.onclick = () => { setCropDecision(n, dec === 'approve' ? '' : 'approve'); };
  }
  if (decBtn) {
    decBtn.classList.toggle('active', dec === 'decline');
    decBtn.textContent = dec === 'decline'
      ? (isHebrew ? '✕ נשמר מקורי (נבחר)' : '✕ Keep original (selected)')
      : (isHebrew ? '✕ שמור מקורי (ללא חיתוך)' : '✕ Keep original (no crop)');
    decBtn.onclick = () => { setCropDecision(n, dec === 'decline' ? '' : 'decline'); };
  }
  if (rstBtn) {
    rstBtn.style.visibility = (dec || (M[n] && M[n].crop_note)) ? 'visible' : 'hidden';
    rstBtn.onclick = () => {
      setCropNote(n, '');
      setCropDecision(n, '');
      const noteIn = document.getElementById('croplb-note');
      if (noteIn) noteIn.value = '';
    };
  }
}

function closeCropModal() {
  if (croplb) croplb.classList.remove('show');
  currentCropN = null;
}

if (croplb) {
  const cClose = document.getElementById('croplb-close');
  if (cClose) cClose.onclick = closeCropModal;
  const gToggle = document.getElementById('croplb-guide-toggle');
  if (gToggle) {
    gToggle.onclick = () => {
      const stage = document.getElementById('croplb-stage');
      const hidden = stage.classList.toggle('no-guide');
      gToggle.textContent = hidden
        ? (isHebrew ? 'הצג מסגרת' : 'Show crop frame')
        : (isHebrew ? 'הסתר מסגרת' : 'Hide crop frame');
    };
  }
  croplb.addEventListener('click', e => { if (e.target === croplb) closeCropModal(); });
}

document.addEventListener('keydown', e => {
  if (croplb && croplb.classList.contains('show')) {
    if (e.key === 'Escape') closeCropModal();
  } else if (photolb.classList.contains('show')) {
    if (e.key === 'Escape') closeZoom();
    else if (e.key === 'ArrowLeft') prevZoom();
    else if (e.key === 'ArrowRight') nextZoom();
  } else if (lb.classList.contains('show')) {
    if (e.key === 'Escape') lb.classList.remove('show');
  }
});

const ba = document.getElementById('ba');
const syncBa = () => {
  const isAfter = document.body.classList.contains('after');
  if (ba) {
    ba.textContent = isAfter ? 'Show: After tuning' : 'Show: Before';
    ba.classList.toggle('on', isAfter);
  }
};
// Show tuned ("after effects") photos by default (never auto-applies suggested crops)
document.body.classList.add('after');
syncBa();
if (ba) {
  ba.onclick = () => {
    document.body.classList.toggle('after');
    syncBa();
    if (currentZoomN) {
      const p = D[currentZoomN];
      photolbImg.style.filter = document.body.classList.contains('after') ? filt(p.t) : 'none';
    }
    if (currentCropN) {
      const p = D[currentCropN];
      const f = document.body.classList.contains('after') ? filt(p.t) : 'none';
      const bImg = document.getElementById('croplb-before');
      const aImg = document.getElementById('croplb-after');
      if (bImg) bImg.style.filter = f;
      if (aImg) aImg.style.filter = f;
    }
  };
}

let jumpCropIdx = 0;
const jumpCropBtnEl = document.getElementById('jump-crop');
if (jumpCropBtnEl) {
  jumpCropBtnEl.onclick = () => {
    const spreadChips = [...document.querySelectorAll('#spreads .crop-chip')];
    const pendingChips = spreadChips.filter(el => !getCropDecision(el.dataset.n));
    const pool = pendingChips.length ? pendingChips : spreadChips;
    if (pool.length) {
      const target = pool[jumpCropIdx % pool.length];
      jumpCropIdx += 1;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      const idxBtn = document.querySelector('button.f[data-f="crop"]');
      if (idxBtn) {
        idxBtn.click();
        document.getElementById('index').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };
}

let mode = 'all';
function apply() {
  const q = document.getElementById('q').value.trim().toLowerCase();
  grid.querySelectorAll('.pc').forEach(c => {
    const p = D[c.dataset.n];
    const m = M[c.dataset.n];
    const okm = mode === 'all'
      || (mode === 'keep' && p.k)
      || (mode === 'out' && !p.k && !p.sc)
      || (mode === 'cut' && p.sc)
      || (mode === 'hero' && p.h)
      || (mode === 'crop' && !!p.scrop)
      || (mode === 'star' && m && m.kind === 'star')
      || (mode === 'question' && m && m.kind === 'question')
      || (mode === 'marked' && !!(m && (m.kind || m.note || m.crop || m.crop_note)));
    const okq = !q || String(p.n) === q || (p.pl + ' ' + p.s + ' ' + p.r + ' ' + ((p.scrop && p.scrop.reason) || '')).toLowerCase().includes(q);
    c.style.display = okm && okq ? '' : 'none';
  });
}
document.querySelectorAll('button.f').forEach(b => b.onclick = () => {
  document.querySelectorAll('button.f').forEach(x => x.classList.remove('on'));
  b.classList.add('on');
  mode = b.dataset.f;
  apply();
});
document.getElementById('q').oninput = apply;
document.getElementById('jump').onchange = e => {
  const el = document.querySelector(`.page[data-page="${e.target.value.trim()}"]`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
// --- Video Gallery Logic ---
let vmode = 'all';
const vgrid = document.getElementById('vgrid');
const videolb = document.getElementById('videolb');
let currentVidN = null;

function renderVideoGrid() {
  if (!vgrid || typeof V === 'undefined' || !Array.isArray(V)) return;
  vgrid.innerHTML = '';
  V.forEach(v => {
    const card = document.createElement('div');
    card.className = 'vc' + (v.in_album ? ' in-album' : ' out-album');
    card.dataset.n = v.n;

    const starBtn = `<button type="button" class="vc-btn star" title="${isHebrew ? 'סמן סרטון כמועדף (★)' : 'Star video (★)'}">★</button>`;
    const qBtn = `<button type="button" class="vc-btn question" title="${isHebrew ? 'הוסף שאלה / הערה (?)' : 'Flag question (?/note)'}">?</button>`;
    const playBtn = `<button type="button" class="vc-btn play" title="${isHebrew ? 'צפה בסרטון ↗' : 'Watch video ↗'}">▶</button>`;

    const durBadge = v.dur_str ? `<span class="vc-dur">${v.dur_str}</span>` : '';
    const curTitle = getVideoTitle(v.n);
    const statusBadge = v.in_album
      ? `<span class="st k">${isHebrew ? 'באלבום' : 'In album'}${v.page ? ' · ' + (isHebrew ? `עמוד ${v.page}` : `p. ${v.page}`) : ''}<span class="vc-status-title">${curTitle ? ' (' + escAttr(curTitle) + ')' : ''}</span></span>`
      : `<span class="st o">${isHebrew ? 'מחוץ לאלבום' : 'Outside album'}</span>`;

    card.innerHTML = `
      <div class="vc-thumb" style="background-image:url(${src(v.n)})">
        <span class="vc-play-icon">▶</span>
        ${durBadge}
        <i class="vc-num">${v.n}</i>
        <div class="vc-acts">${starBtn}${qBtn}${playBtn}</div>
      </div>
      <div class="vc-body">
        <div class="vc-status">${statusBadge} <span class="st m v-mkl"></span></div>
        <div class="vc-title"><b>#${v.n} · ${v.pl || ''}</b></div>
        <div class="vc-desc">${v.s || ''}</div>
        <div class="vc-date muted">${v.d || ''}</div>
        <div class="vc-qr-title-wrap">
          <label class="vc-qr-title-lbl" for="vt-${v.n}">${isHebrew ? 'כותרת ליד ה-QR:' : 'Title next to QR:'}</label>
          <input type="text" class="vc-qr-title" id="vt-${v.n}" data-n="${v.n}" dir="auto"
                 placeholder="${isHebrew ? 'הקלד כותרת שתופיע ליד ה-QR...' : 'Title to print next to QR...'}"
                 value="${escAttr(curTitle)}">
        </div>
        <div class="vc-foot">
          <a class="vc-watch-link" href="${v.su || v.qr_url || v.u || '#'}" target="_blank" rel="noopener noreferrer">
            <span>▶ ${isHebrew ? 'צפה בסרטון ↗' : 'Watch video ↗'}</span>
          </a>
          ${v.page ? `<button type="button" class="vc-page-btn" data-page="${v.page}">${isHebrew ? `עמוד ${v.page} ↲` : `Page ${v.page} ↲`}</button>` : ''}
        </div>
      </div>
    `;

    const titleInp = card.querySelector('.vc-qr-title');
    if (titleInp) {
      titleInp.addEventListener('input', e => {
        setVideoTitle(v.n, e.target.value);
      });
    }

    card.addEventListener('click', e => {
      if (e.target.closest('.vc-qr-title-wrap')) {
        e.stopPropagation();
      } else if (e.target.closest('.vc-btn.star')) {
        e.stopPropagation();
        toggleVideoMark(v.n, 'star');
      } else if (e.target.closest('.vc-btn.question')) {
        e.stopPropagation();
        promptVideoQuestion(v.n);
      } else if (e.target.closest('.vc-page-btn')) {
        e.stopPropagation();
        const pNum = e.target.closest('.vc-page-btn').dataset.page;
        const pageEl = document.querySelector(`.page[data-page="${pNum}"]`);
        if (pageEl) pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (e.target.closest('.vc-watch-link')) {
        e.stopPropagation();
      } else {
        openVideoModal(v.n);
      }
    });

    vgrid.appendChild(card);
  });
}

function toggleVideoMark(n, kind) {
  n = String(n);
  if (M[n] && M[n].kind === kind) {
    M[n].kind = '';
    if (!M[n].note && !hasOwn(M[n], 'qr_title')) delete M[n];
  } else {
    M[n] = { ...(M[n] || {}), kind, note: (M[n] && M[n].note) || '', is_video: true };
  }
  save();
}

function promptVideoQuestion(n) {
  n = String(n);
  const cur = (M[n] && M[n].kind === 'question') ? (M[n].note || '') : '';
  const note = prompt(isHebrew ? `הערה או שאלה לגבי סרטון #${n}:` : `Question or note on video #${n}:`, cur);
  if (note === null) return;
  if (note.trim()) {
    M[n] = { ...(M[n] || {}), kind: 'question', note: note.trim(), is_video: true };
  } else if (M[n] && M[n].kind === 'question') {
    M[n].kind = '';
    M[n].note = '';
    if (!hasOwn(M[n], 'qr_title')) delete M[n];
  }
  save();
}

function openVideoModal(n) {
  const v = findVideo(n);
  if (!v || !videolb) return;
  currentVidN = v.n;

  videolb.querySelector('#videolb-num').textContent = `#${v.n}`;
  videolb.querySelector('#videolb-dur-pill').textContent = v.dur_str || '';
  videolb.querySelector('#videolb-img').src = src(v.n);

  videolb.querySelector('#videolb-place').textContent = v.pl || '';
  videolb.querySelector('#videolb-scene').textContent = v.s || '';
  videolb.querySelector('#videolb-details').textContent = [v.d, v.dur_str ? (isHebrew ? `משך: ${v.dur_str}` : `Duration: ${v.dur_str}`) : ''].filter(Boolean).join(' · ');

  const openBtn = videolb.querySelector('#videolb-open-btn');
  const watchUrl = v.su || v.qr_url || v.u || '';
  if (watchUrl) {
    openBtn.href = watchUrl;
    openBtn.style.display = 'inline-flex';
  } else {
    openBtn.style.display = 'none';
  }

  const titleIn = videolb.querySelector('#videolb-qr-title');
  if (titleIn) {
    titleIn.value = getVideoTitle(v.n);
    titleIn.oninput = e => { setVideoTitle(v.n, e.target.value); };
  }

  updateVideoModalMarks(v.n);
  videolb.classList.add('show');
}

function updateVideoModalMarks(n) {
  if (!videolb) return;
  n = String(n);
  const v = findVideo(n);
  const m = M[n];
  const curTitle = getVideoTitle(n);
  const statusEl = videolb.querySelector('#videolb-status');
  if (statusEl && v) {
    statusEl.className = 'videolb-status ' + (v.in_album ? 'k' : 'o');
    statusEl.textContent = v.in_album
      ? (isHebrew ? `באלבום · עמוד ${v.page || '–'}${curTitle ? ' (' + curTitle + ')' : ''}` : `In album · Page ${v.page || '–'}${curTitle ? ' (' + curTitle + ')' : ''}`)
      : (isHebrew ? 'מחוץ לאלבום' : 'Outside album');
  }
  const titleIn = videolb.querySelector('#videolb-qr-title');
  if (titleIn && document.activeElement !== titleIn && titleIn.value !== curTitle) {
    titleIn.value = curTitle;
  }
  const starBtn = videolb.querySelector('#vlb-btn-star');
  const qBtn = videolb.querySelector('#vlb-btn-q');
  if (starBtn) {
    const isStar = m && m.kind === 'star';
    starBtn.className = 'videolb-btn star' + (isStar ? ' active-star' : '');
    starBtn.textContent = isStar ? (isHebrew ? '★ מועדף (מסומן)' : '★ Starred') : (isHebrew ? '★ סמן כמועדף' : '★ Star favorite');
    starBtn.onclick = () => { toggleVideoMark(n, 'star'); };
  }
  if (qBtn) {
    const isQ = m && m.kind === 'question';
    qBtn.className = 'videolb-btn question' + (isQ ? ' active-q' : '');
    qBtn.textContent = isQ ? (isHebrew ? `? שאלה (${m.note || 'הערה'})` : `? Question (${m.note || 'note'})`) : (isHebrew ? '? הוסף שאלה / הערה' : '? Add question / note');
    qBtn.onclick = () => { promptVideoQuestion(n); };
  }
}

function closeVideoModal() {
  if (videolb) videolb.classList.remove('show');
  currentVidN = null;
}

if (videolb) {
  const closeBtn = videolb.querySelector('#videolb-close');
  if (closeBtn) closeBtn.onclick = closeVideoModal;
  videolb.addEventListener('click', e => {
    if (e.target === videolb) closeVideoModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && videolb.classList.contains('show')) closeVideoModal();
  });
}

function applyVideoFilters() {
  if (!vgrid || typeof V === 'undefined') return;
  const vq = (document.getElementById('vq') ? document.getElementById('vq').value : '').trim().toLowerCase();

  vgrid.querySelectorAll('.vc').forEach(c => {
    const v = V.find(x => String(x.n) === c.dataset.n);
    if (!v) return;
    const m = M[c.dataset.n];
    const curTitle = getVideoTitle(v.n);

    const okm = vmode === 'all'
      || (vmode === 'in_album' && v.in_album)
      || (vmode === 'not_in_album' && !v.in_album)
      || (vmode === 'star' && m && m.kind === 'star')
      || (vmode === 'question' && m && m.kind === 'question')
      || (vmode === 'marked' && !!(m && (m.kind || hasOwn(m, 'qr_title'))));

    const okq = !vq || String(v.n) === vq || (v.pl + ' ' + v.s + ' ' + (v.qr_title || '') + ' ' + curTitle).toLowerCase().includes(vq);
    c.style.display = okm && okq ? '' : 'none';
  });
}

document.querySelectorAll('button.vf').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('button.vf').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    vmode = b.dataset.vf;
    applyVideoFilters();
  };
});
const vqEl = document.getElementById('vq');
if (vqEl) vqEl.oninput = applyVideoFilters;

renderVideoGrid();
refreshMarks();

// Click a QR code (or its label) to see it large, edit its title, and open direct link
(() => {
  const box = document.createElement('div');
  box.className = 'qrbig';
  box.innerHTML = `
    <div class="qrbig-card" dir="${isHebrew ? 'rtl' : 'ltr'}">
      <button type="button" class="qrbig-close" title="סגור (Esc)">✕</button>
      <img alt="QR Code">
      <div class="qrbig-meta">
        <div class="qrbig-title"></div>
        <div class="qrbig-sub muted"></div>
      </div>
      <div class="qrbig-edit">
        <label for="qrbig-title-in">${isHebrew ? 'כותרת שתופיע ליד ה-QR:' : 'Title next to QR code:'}</label>
        <input type="text" id="qrbig-title-in" class="qrbig-title-input" dir="auto" placeholder="${isHebrew ? 'הקלד כותרת שתופיע ליד ה-QR...' : 'Enter title to print next to QR...'}">
      </div>
      <a class="qr-direct-link" target="_blank" rel="noopener noreferrer">
        <span class="qr-link-icon">↗</span>
        <span class="qr-link-text">${isHebrew ? 'פתח קישור ישיר בדפדפן' : 'Open direct link in browser'}</span>
      </a>
    </div>
  `;
  document.body.appendChild(box);
  const close = () => box.classList.remove('show');
  const titleInput = box.querySelector('#qrbig-title-in');
  let activeQrCtx = null;

  titleInput.addEventListener('input', e => {
    if (!activeQrCtx) return;
    const val = e.target.value;
    box.querySelector('.qrbig-title').textContent = val.trim() || activeQrCtx.fallbackTitle;
    if (activeQrCtx.videoN) {
      setVideoTitle(activeQrCtx.videoN, val);
    } else if (activeQrCtx.qrIdx !== '') {
      setStandaloneQrTitle(activeQrCtx.qrIdx, val, activeQrCtx.pageNo, activeQrCtx.fallbackTitle, activeQrCtx.initTitle);
    }
  });

  document.addEventListener('click', e => {
    const clickedQr = e.target.closest('img.qr, .qr-label');
    if (clickedQr) {
      const wrap = clickedQr.closest('.qr-wrap');
      const q = wrap ? wrap.querySelector('img.qr') : clickedQr;
      if (!q) return;
      e.preventDefault(); e.stopPropagation();
      const url = q.dataset.url || (wrap && wrap.dataset.url) || '';
      box.querySelector('img').src = q.src;
      const fallbackTitle = (q.title || '').replace(/^QR · /, '');
      const curTitle = (wrap && (wrap.dataset.curTitle !== undefined ? wrap.dataset.curTitle : wrap.dataset.initTitle)) || '';
      const initTitle = (wrap && wrap.dataset.initTitle) || '';
      const pageNo = (q.closest('[data-page]') || { dataset: {} }).dataset.page || '';
      const videoN = (wrap && wrap.dataset.videoN) || '';
      const qrIdx = (wrap && wrap.dataset.qrIdx !== undefined) ? wrap.dataset.qrIdx : '';

      activeQrCtx = { videoN, qrIdx, pageNo, fallbackTitle, initTitle };
      box.querySelector('.qrbig-title').textContent = curTitle || fallbackTitle;
      const subParts = [];
      if (pageNo) subParts.push(isHebrew ? `עמוד ${pageNo}` : `Page ${pageNo}`);
      if (videoN) subParts.push(isHebrew ? `סרטון #${videoN}` : `Video #${videoN}`);
      box.querySelector('.qrbig-sub').textContent = subParts.join(' · ');

      const editWrap = box.querySelector('.qrbig-edit');
      if (videoN || qrIdx !== '') {
        editWrap.style.display = '';
        titleInput.value = curTitle;
      } else {
        editWrap.style.display = 'none';
      }

      const link = box.querySelector('a.qr-direct-link');
      if (url) {
        link.href = url;
        link.style.display = 'inline-flex';
      } else {
        link.style.display = 'none';
      }
      box.classList.add('show');
      return;
    }
    if (e.target.closest('.qrbig-close')) {
      e.preventDefault(); e.stopPropagation();
      close();
      return;
    }
    if (e.target.closest('a.qr-direct-link') || e.target.closest('.qrbig-edit')) {
      return;
    }
    if (e.target === box) {
      close();
    }
  }, true);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && box.classList.contains('show')) close();
  });
})();
