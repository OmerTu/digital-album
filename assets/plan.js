const src = n => 'data:image/jpeg;base64,' + I[n];
const filt = t => `brightness(${1 + t.bright / 100}) contrast(${1 + t.contrast / 100}) saturate(${1 + t.sat / 100})`;
const KEY = STORE_KEY;
let M = {};
try { M = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { M = {}; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(M)); } catch (e) {} refreshMarks(); };
const isHebrew = (document.documentElement.lang === 'he') || (typeof LANG !== 'undefined' && LANG === 'he') || document.dir === 'rtl';

// Set up album photo tiles
document.querySelectorAll('.ph').forEach(el => {
  const n = el.dataset.n;
  el.style.backgroundImage = `url(${src(n)})`;
  el.style.setProperty('--f', filt(D[n].t));
  el.onclick = e => {
    if (e.target.closest('.mk')) {
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

  c.innerHTML = `
    <div class="img" style="background-image:url(${src(p.n)})">
      <i>${p.n}</i>
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
    if (e.target.closest('.pc-btn.star')) {
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
    delete M[n];
  } else {
    M[n] = { kind, note: (M[n] && M[n].note) || '', with: (M[n] && M[n].with) || '' };
  }
  save();
}

function refreshMarks() {
  document.querySelectorAll('.ph').forEach(el => {
    const n = el.dataset.n;
    const m = M[n];
    const isRep = m && m.kind === 'replace';
    const isSwap = m && m.kind === 'swap';
    const isQ = m && m.kind === 'question';
    el.classList.toggle('marked', isRep || isSwap);
    el.classList.toggle('marked-q', isQ);
    const qb = el.querySelector('.q-badge');
    if (qb) qb.style.display = isQ ? 'flex' : 'none';
    el.dataset.with = m && m.with ? (m.kind === 'swap' ? ` ↔ #${m.with}` : ` ← #${m.with}`) : '';
  });

  grid.querySelectorAll('.pc').forEach(c => {
    const n = c.dataset.n;
    const m = M[n];
    const isRep = m && m.kind === 'replace';
    const isSwap = m && m.kind === 'swap';
    const isAdd = m && m.kind === 'add';
    const isStar = m && m.kind === 'star';
    const isQ = m && m.kind === 'question';

    c.classList.toggle('marked', isRep || isSwap || isAdd);
    c.classList.toggle('starred', isStar);
    c.classList.toggle('marked-q', isQ);

    const mkl = c.querySelector('.mkl');
    if (mkl) {
      if (isRep) mkl.innerHTML = `· <span class="st m">REPLACE${m.with ? ' WITH #' + m.with : ''}</span>`;
      else if (isSwap) mkl.innerHTML = `· <span class="st m">SWAP WITH #${m.with}</span>`;
      else if (isAdd) mkl.innerHTML = `· <span class="st m">MARKED: ADD BACK</span>`;
      else if (isStar) mkl.innerHTML = `· <span class="st star">★ STARRED</span>`;
      else if (isQ) mkl.innerHTML = `· <span class="st qmark">? QUESTION</span>`;
      else mkl.textContent = '';
    }
  });

  const vgrid = document.getElementById('vgrid');
  if (vgrid) {
    vgrid.querySelectorAll('.vc').forEach(c => {
      const n = c.dataset.n;
      const m = M[n];
      const isStar = m && m.kind === 'star';
      const isQ = m && m.kind === 'question';

      c.classList.toggle('starred', isStar);
      c.classList.toggle('marked-q', isQ);

      const mkl = c.querySelector('.v-mkl');
      if (mkl) {
        if (isStar) mkl.innerHTML = `· <span class="st star">★ ${isHebrew ? 'מועדף' : 'STARRED'}</span>`;
        else if (isQ) mkl.innerHTML = `· <span class="st qmark">? ${isHebrew ? 'שאלה' : 'QUESTION'}${m.note ? ': ' + m.note : ''}</span>`;
        else mkl.textContent = '';
      }
    });
  }

  const r = Object.values(M).filter(m => m.kind === 'replace').length;
  const a = Object.values(M).filter(m => m.kind === 'add').length;
  const w = Object.values(M).filter(m => m.kind === 'swap').length;
  const q = Object.values(M).filter(m => m.kind === 'question').length;
  const s = Object.values(M).filter(m => m.kind === 'star').length;

  const parts = [];
  if (r) parts.push(`Replace: ${r}`);
  if (w) parts.push(`Swap: ${w}`);
  if (a) parts.push(`Add back: ${a}`);
  if (q) parts.push(`Questions (?): ${q}`);
  if (s) parts.push(`Starred (★): ${s}`);

  document.getElementById('markcount').textContent = parts.length ? parts.join(' · ') : 'No marks yet';
  apply();
  if (typeof applyVideoFilters === 'function') applyVideoFilters();
  if (currentZoomN) updateZoomActions(currentZoomN);
  if (typeof updateVideoModalMarks === 'function' && currentVidN) updateVideoModalMarks(currentVidN);
}

function marksText() {
  const photoEntries = [];
  const videoEntries = [];

  Object.entries(M).forEach(([n, m]) => {
    const isVid = m.is_video || (typeof V !== 'undefined' && V.some(v => String(v.n) === String(n)));
    if (isVid) {
      videoEntries.push([n, m]);
    } else {
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

  if (videoEntries.length) {
    if (lines.length) lines.push('');
    lines.push(isHebrew ? '=== סימוני סרטונים ===' : '=== Video marks ===');
    videoEntries.sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([n, m]) => {
      const v = (typeof V !== 'undefined' ? V : []).find(x => String(x.n) === String(n)) || {};
      const albStatus = v.in_album ? (isHebrew ? `באלבום, עמוד ${v.page || '–'}` : `in album, p. ${v.page || '–'}`) : (isHebrew ? 'מחוץ לאלבום' : 'outside album');
      if (m.kind === 'star') {
        lines.push(isHebrew
          ? `★ סרטון מועדף #${n} (${albStatus}${v.dur_str ? ', ' + v.dur_str : ''})${v.pl ? ' · ' + v.pl : ''}${m.note ? ` — ${m.note}` : ''}`
          : `★ Starred video #${n} (${albStatus}${v.dur_str ? ', ' + v.dur_str : ''})${v.pl ? ' · ' + v.pl : ''}${m.note ? ` — ${m.note}` : ''}`);
      } else if (m.kind === 'question') {
        lines.push(isHebrew
          ? `? שאלה על סרטון #${n} (${albStatus}${v.dur_str ? ', ' + v.dur_str : ''})${m.note ? `: ${m.note}` : ''}`
          : `? Question on video #${n} (${albStatus}${v.dur_str ? ', ' + v.dur_str : ''})${m.note ? `: ${m.note}` : ''}`);
      } else {
        lines.push(`Video #${n} (${m.kind})${m.note ? ` — ${m.note}` : ''}`);
      }
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

  if (p.k) {
    const setWith = w => { M[n] = { kind: 'replace', with: w ? String(w) : '', note: (M[n] && M[n].note) || '' }; save(); show(n); };
    const secs = Object.keys(S).sort(); const si = secs.indexOf(p.sec);
    const fill = wide => {
      const near = wide ? secs.slice(Math.max(0, si - 1), si + 2) : [p.sec];
      const list = Object.values(D).filter(x => near.includes(x.sec) && String(x.n) !== n && (!x.k || wide)).sort((a, b) => (a.k - b.k) || (b.sc - a.sc) || (a.o - b.o));
      document.getElementById('cands').innerHTML = list.map(x => `<div class="cand ${m && m.with == x.n ? 'sel' : ''} ${x.k ? 'inalb' : ''}" data-w="${x.n}" title="${x.s}"><img src="${src(x.n)}" alt="#${x.n}"><i>${x.n}</i>${x.k ? '<em>in album</em>' : x.sc ? '<em>cut</em>' : ''}</div>`).join('') || '<span class="muted">No other photos from this place — try "More from nearby places" or type a number.</span>';
      document.querySelectorAll('#cands .cand').forEach(c => c.onclick = () => setWith(c.dataset.w));
    };
    fill(false);
    document.getElementById('mates').innerHTML = (p.mt || []).map(x => `<div class="cand ${m && m.kind === 'swap' && m.with == x ? 'sel' : ''}" data-s="${x}" title="${D[x].s}"><img src="${src(x)}" alt="#${x}"><i>${x}</i></div>`).join('') || '<span class="muted">This photo is alone on its page.</span>';
    document.querySelectorAll('#mates .cand').forEach(c => c.onclick = () => { const w = c.dataset.s;
      if (M[n] && M[n].kind === 'swap' && M[n].with === w) delete M[n]; else M[n] = { kind: 'swap', with: w, note: (M[n] && M[n].note) || '' };
      save(); show(n); });
    document.getElementById('more').onclick = () => fill(true);
    document.getElementById('bw').onchange = e => { const w = e.target.value.trim().replace('#', ''); if (D[w]) setWith(w); };
    const nw = document.getElementById('nowith'); if (nw) nw.onclick = () => setWith('');
  }
  document.getElementById('bc').onclick = () => lb.classList.remove('show');
  document.getElementById('bn').oninput = e => { if (!M[n]) M[n] = { kind: p.k ? 'replace' : 'add', note: '' }; M[n].note = e.target.value; save(); };
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
    `;
    document.getElementById('z-add').onclick = () => toggle(n, 'add');
    document.getElementById('z-star').onclick = () => toggle(n, 'star');
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

document.addEventListener('keydown', e => {
  if (photolb.classList.contains('show')) {
    if (e.key === 'Escape') closeZoom();
    else if (e.key === 'ArrowLeft') prevZoom();
    else if (e.key === 'ArrowRight') nextZoom();
  } else if (lb.classList.contains('show')) {
    if (e.key === 'Escape') lb.classList.remove('show');
  }
});

const ba = document.getElementById('ba');
ba.onclick = () => {
  document.body.classList.toggle('after');
  ba.textContent = document.body.classList.contains('after') ? 'Show: After tuning' : 'Show: Before';
  ba.classList.toggle('on');
  if (currentZoomN) {
    const p = D[currentZoomN];
    photolbImg.style.filter = document.body.classList.contains('after') ? filt(p.t) : 'none';
  }
};

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
      || (mode === 'star' && m && m.kind === 'star')
      || (mode === 'question' && m && m.kind === 'question')
      || (mode === 'marked' && !!m);
    const okq = !q || String(p.n) === q || (p.pl + ' ' + p.s + ' ' + p.r).toLowerCase().includes(q);
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
    const statusBadge = v.in_album
      ? `<span class="st k">${isHebrew ? 'באלבום' : 'In album'}${v.page ? ' · ' + (isHebrew ? `עמוד ${v.page}` : `p. ${v.page}`) : ''}${v.qr_title ? ' (' + v.qr_title + ')' : ''}</span>`
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
        <div class="vc-foot">
          <a class="vc-watch-link" href="${v.su || v.qr_url || v.u || '#'}" target="_blank" rel="noopener noreferrer">
            <span>▶ ${isHebrew ? 'צפה בסרטון ↗' : 'Watch video ↗'}</span>
          </a>
          ${v.page ? `<button type="button" class="vc-page-btn" data-page="${v.page}">${isHebrew ? `עמוד ${v.page} ↲` : `Page ${v.page} ↲`}</button>` : ''}
        </div>
      </div>
    `;

    card.addEventListener('click', e => {
      if (e.target.closest('.vc-btn.star')) {
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
    delete M[n];
  } else {
    M[n] = { kind, note: (M[n] && M[n].note) || '', is_video: true };
  }
  save();
}

function promptVideoQuestion(n) {
  n = String(n);
  const cur = (M[n] && M[n].kind === 'question') ? (M[n].note || '') : '';
  const note = prompt(isHebrew ? `הערה או שאלה לגבי סרטון #${n}:` : `Question or note on video #${n}:`, cur);
  if (note === null) return;
  if (note.trim()) {
    M[n] = { kind: 'question', note: note.trim(), is_video: true };
  } else if (M[n] && M[n].kind === 'question') {
    delete M[n];
  }
  save();
}

function openVideoModal(n) {
  const v = (typeof V !== 'undefined' ? V : []).find(x => x.n === n);
  if (!v || !videolb) return;
  currentVidN = n;

  videolb.querySelector('#videolb-num').textContent = `#${v.n}`;
  videolb.querySelector('#videolb-dur-pill').textContent = v.dur_str || '';
  videolb.querySelector('#videolb-img').src = src(v.n);

  const statusEl = videolb.querySelector('#videolb-status');
  statusEl.className = 'videolb-status ' + (v.in_album ? 'k' : 'o');
  statusEl.textContent = v.in_album
    ? (isHebrew ? `באלבום · עמוד ${v.page || '–'}${v.qr_title ? ' (' + v.qr_title + ')' : ''}` : `In album · Page ${v.page || '–'}`)
    : (isHebrew ? 'מחוץ לאלבום' : 'Outside album');

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

  updateVideoModalMarks(v.n);
  videolb.classList.add('show');
}

function updateVideoModalMarks(n) {
  if (!videolb) return;
  n = String(n);
  const m = M[n];
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

    const okm = vmode === 'all'
      || (vmode === 'in_album' && v.in_album)
      || (vmode === 'not_in_album' && !v.in_album)
      || (vmode === 'star' && m && m.kind === 'star')
      || (vmode === 'question' && m && m.kind === 'question')
      || (vmode === 'marked' && !!m);

    const okq = !vq || String(v.n) === vq || (v.pl + ' ' + v.s + ' ' + (v.qr_title || '')).toLowerCase().includes(vq);
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

// Click a QR code to see it large and open direct link
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
      <a class="qr-direct-link" target="_blank" rel="noopener noreferrer">
        <span class="qr-link-icon">↗</span>
        <span class="qr-link-text">${isHebrew ? 'פתח קישור ישיר בדפדפן' : 'Open direct link in browser'}</span>
      </a>
    </div>
  `;
  document.body.appendChild(box);
  const close = () => box.classList.remove('show');

  document.addEventListener('click', e => {
    const q = e.target.closest('img.qr');
    if (q) {
      e.preventDefault(); e.stopPropagation();
      const wrap = q.closest('.qr-wrap');
      const url = q.dataset.url || (wrap && wrap.dataset.url) || '';
      box.querySelector('img').src = q.src;
      const title = (q.title || '').replace(/^QR · /, '');
      const pageNo = (q.closest('[data-page]') || { dataset: {} }).dataset.page || '';
      box.querySelector('.qrbig-title').textContent = title;
      box.querySelector('.qrbig-sub').textContent = pageNo ? (isHebrew ? `עמוד ${pageNo}` : `Page ${pageNo}`) : '';

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
    if (e.target.closest('a.qr-direct-link')) {
      // Allow link click to open normally
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
