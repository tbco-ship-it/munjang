// 원고지 sheet: the tray sentences from localStorage laid out one syllable per cell, one blank cell per space.
// A space never starts a line; a full stop that would start a line shares the previous cell (원고지 convention). This is a sentence-copying grid; paragraph indentation is a TOPIK-page concern (topik.js).
(function () {
  const M = window.Munjang, UI = window.MJ_UI;
  const COLS = 20, ROWS = 10;
  const sheet = document.getElementById('sheet');
  let tray = [];
  try { const v = JSON.parse(localStorage.getItem('munjang.tray') || '[]'); if (Array.isArray(v)) tray = v.filter(x => x && typeof x.text === 'string' && x.text.length <= 120).slice(0, 5); } catch (e) {}
  function layout(text) {
    // returns rows of cells: {ch, kind: 'syl'|'space'|'punct'|'empty', tail?: '.'}
    const rows = []; let row = [];
    const push = c => { row.push(c); if (row.length === COLS) { rows.push(row); row = []; } };
    for (const ch of text) {
      if (ch === ' ') { if (row.length === 0) continue; push({ ch: '', kind: 'space' }); }
      else if (/[.,!?]/.test(ch)) { if (row.length === 0 && rows.length) { rows[rows.length - 1][COLS - 1].tail = ch; } else push({ ch, kind: 'punct' }); }
      else push({ ch, kind: 'syl' });
    }
    if (row.length) { while (row.length < COLS) row.push({ ch: '', kind: 'empty' }); rows.push(row); }
    return rows;
  }
  function render() {
    if (!tray.length) return;
    sheet.innerHTML = '';
    const title = document.createElement('div'); title.className = 'sheet-title'; title.innerHTML = `<b>문장 연습</b><span>${new Date().toISOString().slice(0, 10)} · munjanglab.com</span>`;
    sheet.appendChild(title);
    tray.forEach((s, i) => {
      const block = document.createElement('div'); block.className = 'sent';
      const cap = document.createElement('p'); cap.className = 'cap'; const b = document.createElement('b'); b.textContent = (i + 1) + '.'; const ko = document.createElement('span'); ko.lang = 'ko'; ko.textContent = s.text; const sm = document.createElement('small'); sm.textContent = (s.gloss || '') + (s.unreviewed ? ' · ' + (UI.unreviewed || '') : ''); cap.append(b, ' ', ko, ' ', sm);
      block.appendChild(cap);
      // Line 1: the sentence (light, for tracing when enabled). Lines 2–3: the same cells empty, for free writing.
      [true, false, false].forEach(trace => {
        layout(s.text).forEach(r => {
          const line = document.createElement('div'); line.className = 'line';
          r.forEach(c => {
            const cell = document.createElement('span'); cell.className = 'cell ' + c.kind + (trace ? ' t' : ' w');
            if (trace && c.ch) cell.textContent = c.ch;
            if (c.tail && trace) { const t = document.createElement('i'); t.textContent = c.tail; cell.appendChild(t); }
            line.appendChild(cell);
          });
          block.appendChild(line);
        });
      });
      sheet.appendChild(block);
    });
  }
  const pageStyle = document.createElement('style'); document.head.appendChild(pageStyle);
  document.querySelectorAll('[data-paper]').forEach(b => b.onclick = () => { document.querySelectorAll('[data-paper]').forEach(x => x.classList.toggle('on', x === b)); sheet.classList.toggle('a4', b.dataset.paper === 'a4'); sheet.classList.toggle('letter', b.dataset.paper === 'letter'); pageStyle.textContent = `@page{size:${b.dataset.paper === 'letter' ? 'Letter' : 'A4'};margin:14mm}`; });
  const g = document.getElementById('guide'); g.onchange = () => sheet.classList.toggle('guide', g.checked);
  const tr = document.getElementById('trace'); tr.onchange = () => sheet.classList.toggle('notrace', !tr.checked);
  document.getElementById('do-print').onclick = () => window.print();
  render();
})();
