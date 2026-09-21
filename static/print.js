// 원고지 sheet: the tray sentences from localStorage laid out one syllable per cell, one blank cell per space.
// Modes: copy (light tracing line + two blank lines) · worksheet (particle squares left blank with a dashed border, answer key at the bottom).
// A space never starts a line; a full stop that would start a line shares the previous cell (원고지 convention). Paragraph indentation is a TOPIK-page concern (topik.js).
(function () {
  const M = window.Munjang, UI = window.MJ_UI;
  const t = k => UI[k] || k;
  const COLS = 20;
  const sheet = document.getElementById('sheet');
  let tray = [], mode = 'copy';
  try { const v = JSON.parse(localStorage.getItem('munjang.tray') || '[]'); if (Array.isArray(v)) tray = v.filter(x => x && typeof x.text === 'string' && x.text.length <= 120).slice(0, 5); } catch (e) {}
  // cells for one sentence: [{ch, kind, blank?}] — worksheet blanks come from the stored particle of each chunk
  function cellsOf(s, ws) {
    const out = [];
    const parts = ws && Array.isArray(s.parts) && s.parts.length ? s.parts : [{ t: s.text.replace(/[.!?]$/, ''), p: '' }];
    parts.forEach((pt, i) => {
      if (i) out.push({ ch: '', kind: 'space' });
      const chars = [...pt.t]; const n = pt.p ? [...pt.p].length : 0;
      chars.forEach((ch, j) => out.push({ ch, kind: 'syl', blank: ws && n && j >= chars.length - n }));
    });
    const end = s.text.match(/[.!?]$/); if (end) out.push({ ch: end[0], kind: 'punct' });
    return out;
  }
  function layout(cells) {
    const rows = []; let row = [];
    const push = c => { row.push(c); if (row.length === COLS) { rows.push(row); row = []; } };
    for (const c of cells) {
      if (c.kind === 'space') { if (row.length === 0) continue; push(c); }
      else if (c.kind === 'punct') { if (row.length === 0 && rows.length) rows[rows.length - 1][COLS - 1].tail = c.ch; else push(c); }
      else push(c);
    }
    if (row.length) { while (row.length < COLS) row.push({ ch: '', kind: 'empty' }); rows.push(row); }
    return rows;
  }
  function line(r, trace) {
    const el = document.createElement('div'); el.className = 'line';
    r.forEach(c => {
      const cell = document.createElement('span'); cell.className = 'cell ' + c.kind + (trace ? ' t' : ' w') + (c.blank ? ' blank' : '');
      if (c.ch && trace && !c.blank) cell.textContent = c.ch;
      if (c.tail && trace) { const i = document.createElement('i'); i.textContent = c.tail; cell.appendChild(i); }
      el.appendChild(cell);
    });
    return el;
  }
  function render() {
    if (!tray.length) return;
    sheet.innerHTML = ''; sheet.classList.toggle('ws', mode === 'ws');
    const title = document.createElement('div'); title.className = 'sheet-title';
    const b = document.createElement('b'); b.textContent = mode === 'ws' ? '조사 워크시트' : '한글 문장 연습'; const span = document.createElement('span'); span.textContent = new Date().toISOString().slice(0, 10) + ' · hangulsteps.com'; title.append(b, span);
    sheet.appendChild(title);
    if (mode === 'ws') { const h = document.createElement('p'); h.className = 'ws-hint'; h.textContent = t('ws_hint'); sheet.appendChild(h); }
    const answers = [];
    tray.forEach((s, i) => {
      const block = document.createElement('div'); block.className = 'sent';
      const cap = document.createElement('p'); cap.className = 'cap';
      const bb = document.createElement('b'); bb.textContent = (i + 1) + '.'; const sm = document.createElement('small'); sm.textContent = (s.gloss || '') + (s.unreviewed ? ' · ' + (UI.unreviewed || '') : '');
      cap.append(bb, ' ');
      if (mode !== 'ws') { const ko = document.createElement('span'); ko.lang = 'ko'; ko.textContent = s.text; cap.append(ko, ' '); }
      cap.append(sm); block.appendChild(cap);
      if (mode === 'ws') {
        layout(cellsOf(s, true)).forEach(r => block.appendChild(line(r, true)));
        const ans = (s.parts || []).filter(p => p.p).map(p => p.p);
        answers.push({ n: i + 1, ans, text: s.text });
      } else {
        const rows = layout(cellsOf(s, false));
        [true, false, false].forEach(trace => rows.forEach(r => block.appendChild(line(r, trace))));
      }
      sheet.appendChild(block);
    });
    if (mode === 'ws') {
      const key = document.createElement('div'); key.className = 'answers' + (document.getElementById('answers').checked ? '' : ' hide');
      const h = document.createElement('b'); h.textContent = t('answers_h'); key.appendChild(h);
      answers.forEach(a => { const p = document.createElement('p'); p.lang = 'ko'; p.textContent = `${a.n}. ${a.ans.join(' · ') || '—'}  (${a.text})`; key.appendChild(p); });
      sheet.appendChild(key);
    }
  }
  const pageStyle = document.createElement('style'); document.head.appendChild(pageStyle);
  document.querySelectorAll('[data-paper]').forEach(b => b.onclick = () => { document.querySelectorAll('[data-paper]').forEach(x => x.classList.toggle('on', x === b)); sheet.classList.toggle('a4', b.dataset.paper === 'a4'); sheet.classList.toggle('letter', b.dataset.paper === 'letter'); pageStyle.textContent = `@page{size:${b.dataset.paper === 'letter' ? 'Letter' : 'A4'};margin:14mm}`; });
  document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { document.querySelectorAll('[data-mode]').forEach(x => x.classList.toggle('on', x === b)); mode = b.dataset.mode; document.getElementById('answers-wrap').hidden = mode !== 'ws'; document.getElementById('trace').closest('label').hidden = mode === 'ws'; render(); });
  const g = document.getElementById('guide'); g.onchange = () => sheet.classList.toggle('guide', g.checked);
  const tr = document.getElementById('trace'); tr.onchange = () => sheet.classList.toggle('notrace', !tr.checked);
  document.getElementById('answers').onchange = render;
  document.getElementById('do-print').onclick = () => window.print();
  if (location.hash === '#ws') document.querySelector('[data-mode="ws"]').click(); else render();
})();
