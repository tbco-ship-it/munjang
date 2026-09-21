// TOPIK II writing practice: 51/52 blank items judged by the grammar pattern they test; 53/54 원고지 editor with the exam's
// character count (every square counts: syllables, spaces, punctuation) and manuscript-paper rules.
(function () {
  const D = window.MJ_DATA.topik, UI = window.MJ_UI, LANG = ['ja', 'vi'].includes(document.documentElement.lang.slice(0, 2)) ? document.documentElement.lang.slice(0, 2) : 'en';
  const t = (k, v) => (UI[k] || k).replace(/\{(\w+)\}/g, (_, x) => v && v[x] != null ? v[x] : '');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = s => document.querySelector(s);
  // ---- 51/52 ----
  let idx = 0;
  function renderItem() {
    const it = D.items[idx]; const box = $('#tk-item');
    const text = esc(it.text).replace(/\n/g, '<br>').replace(/\(\s*(㉠|㉡)\s*\)/g, (m, k) => `<mark class="tk-blank">${k}</mark>`);
    box.innerHTML = `<p class="tk-title"><span class="tag">${it.q}</span> ${esc(it.title[LANG] || it.title.en)}<small class="tk-src">${it.src ? esc(it.src[LANG] || it.src.en) : ''}</small></p><div class="tk-text" lang="ko">${text}</div>` +
      it.blanks.map((b, i) => `<form class="tk-form" data-i="${i}"><label>${t('topik_blank', { k: b.k })}<div class="free-row"><input type="text" lang="ko" autocomplete="off"><button type="submit" class="btn sm">${t('topik_check')}</button></div></label><div class="why" hidden></div></form>`).join('');
    box.querySelectorAll('.tk-form').forEach(f => f.onsubmit = e => {
      e.preventDefault();
      const b = it.blanks[+f.dataset.i], v = f.querySelector('input').value.trim().replace(/\s+/g, ' ');
      const ok = b.accept.includes(v) || new RegExp(b.pattern).test(v);
      const w = f.querySelector('.why'); w.hidden = false; w.className = 'why ' + (ok ? 'ok' : 'no');
      w.innerHTML = `<span class="tag">${ok ? t('correct_pattern') : t('wrong')}</span><p>${esc(ok ? t('topik_ok') : t('topik_no', { m: b.model }))}</p><p><b>${t('topik_model')}:</b> <span lang="ko">${esc(b.model)}</span> · <b>${t('topik_grammar')}:</b> ${esc(LANG === 'ja' ? b.grammar_ja : LANG === 'vi' && b.grammar_vi ? b.grammar_vi : b.grammar)}</p>`;
    });
  }
  $('#tk-next').onclick = () => { idx = (idx + 1) % D.items.length; renderItem(); };
  renderItem();
  // ---- 53/54 ----
  let q = '53';
  const ta = $('#tk-text'), sel = $('#tk-prompt');
  function fillPrompts() { sel.innerHTML = D.prompts[q].map((p, i) => `<option value="${i}">${q}-${i + 1}</option>`).join(''); showPrompt(); }
  function showPrompt() { const p = D.prompts[q][+sel.value || 0]; $('#tk-prompt-text').textContent = p[LANG] || p.en; }
  document.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { document.querySelectorAll('[data-q]').forEach(x => x.classList.toggle('on', x === b)); q = b.dataset.q; try { ta.value = localStorage.getItem('munjang.topik.' + q) || ''; } catch (e) { ta.value = ''; } fillPrompts(); update(); });
  sel.onchange = showPrompt;
  const COLS = 20;
  // 원고지 layout: paragraphs indent one square; a space never starts a line; punctuation that would start a line rides in the previous square.
  function layout(text) {
    const rows = []; let row = [];
    const push = c => { row.push(c); if (row.length === COLS) { rows.push(row); row = []; } };
    const paras = text.replace(/\r/g, '').split('\n');
    paras.forEach((para, pi) => {
      if (row.length) { while (row.length < COLS) row.push({ ch: '', kind: 'empty' }); rows.push(row); row = []; }
      if (!para.trim()) return;
      push({ ch: '', kind: 'indent' });
      let asciiBuf = '';
      const flush = () => { if (asciiBuf) { push({ ch: asciiBuf, kind: 'syl', ascii: true }); asciiBuf = ''; } };
      for (const ch of para.trim()) {
        // 원고지 convention: lowercase Latin letters and digits go two per square; uppercase one per square
        if (/[a-z0-9]/.test(ch)) { asciiBuf += ch; if (asciiBuf.length === 2) flush(); continue; }
        flush();
        if (ch === ' ') { if (row.length === 0) continue; push({ ch: '', kind: 'space' }); }
        else if (/[.,!?。、！？]/.test(ch)) { if (row.length === 0 && rows.length) rows[rows.length - 1][COLS - 1].tail = (rows[rows.length - 1][COLS - 1].tail || '') + ch; else push({ ch, kind: 'punct' }); if (/[!?！？]/.test(ch) && row.length) push({ ch: '', kind: 'space' }); }
        else push({ ch, kind: 'syl' });
      }
      flush();
    });
    if (row.length) { while (row.length < COLS) row.push({ ch: '', kind: 'empty' }); rows.push(row); }
    return rows;
  }
  function count(rows) { let n = 0; rows.forEach(r => r.forEach(c => { if (c.kind === 'syl' || c.kind === 'space' || c.kind === 'punct' || c.kind === 'indent') n++; })); return n; } // 원고지 cells used; a tail shares its cell
  function update() {
    const rows = layout(ta.value), n = count(rows), [a, b] = D.targets[q];
    $('#tk-count').textContent = t('topik_count', { n }); $('#tk-range').textContent = t('topik_range', { a, b });
    const st = $('#tk-status'); st.className = 'tag ' + (n < a ? 'warn' : n > b ? 'no' : 'ok'); st.textContent = n < a ? t('topik_short', { n: a - n }) : n > b ? t('topik_over', { n: n - b }) : t('topik_inrange');
    const notes = $('#tk-notes'); notes.innerHTML = '';
    const yo = (ta.value.match(/요[.!?]?(\s|$)/g) || []).length;
    if (yo) notes.innerHTML = `<div class="why soft"><span class="tag">${t('soft')}</span><p>${esc(t('topik_style_warn', { n: yo }))}</p></div>`;
    const sheet = $('#tk-sheet'); sheet.innerHTML = '';
    rows.slice(0, 40).forEach(r => { const line = document.createElement('div'); line.className = 'line'; r.forEach(c => { const cell = document.createElement('span'); cell.className = 'cell ' + c.kind + ' t'; if (c.ch) cell.textContent = c.ch; if (c.tail) { const i = document.createElement('i'); i.textContent = c.tail; cell.appendChild(i); } line.appendChild(cell); }); sheet.appendChild(line); });
    try { localStorage.setItem('munjang.topik.' + q, ta.value); } catch (e) {}
  }
  ta.oninput = update;
  try { ta.value = localStorage.getItem('munjang.topik.' + q) || ''; } catch (e) {}
  fillPrompts(); update();
  $('#tk-print').onclick = () => window.print();
  // timer
  let acc = 0, t0 = null, tick = null; // acc = seconds accumulated while running; Stop pauses
  const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  $('#tk-start').onclick = () => { if (tick) { clearInterval(tick); tick = null; acc += Math.floor((Date.now() - t0) / 1000); $('#tk-start').textContent = t('topik_start'); return; } t0 = Date.now(); tick = setInterval(() => $('#tk-time').textContent = fmt(acc + Math.floor((Date.now() - t0) / 1000)), 500); $('#tk-start').textContent = t('topik_stop'); };
  $('#tk-reset').onclick = () => { clearInterval(tick); tick = null; t0 = null; acc = 0; $('#tk-time').textContent = '00:00'; $('#tk-start').textContent = t('topik_start'); };
})();
