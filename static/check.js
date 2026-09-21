// "Check my sentence" page — rule-based only; the verdict line always says what was NOT judged.
(function () {
  const M = window.Munjang, D = window.MJ_DATA, UI = window.MJ_UI, LANG = ['ja', 'vi'].includes(document.documentElement.lang.slice(0, 2)) ? document.documentElement.lang.slice(0, 2) : 'en';
  const WHY = Object.assign({ _lang: LANG }, D.templates.why[LANG]);
  const t = (k, v) => (UI[k] || k).replace(/\{(\w+)\}/g, (_, x) => v && v[x] != null ? v[x] : '');
  const fill = (k, v) => (WHY[k] || k).replace(/\{(\w+)\}/g, (_, x) => v && v[x] != null ? v[x] : '');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const L = { ok: t('correct'), soft: t('soft'), no: t('wrong'), maybe: '?', info: 'i' };
  const form = document.getElementById('chk'), inp = document.getElementById('chk-in'), out = document.getElementById('chk-out');
  function run(text) {
    const r = M.checkSentence(text, D.words, WHY);
    if (r.verdict === 'empty') { out.hidden = true; return; }
    const badFix = new Map(r.notes.filter(n => n.fix).map(n => [n.vars.w || '', n.fix]));
    out.querySelector('.chk-chunks').innerHTML = r.chunks.map(c => {
      const cls = c.status === 'ok' || c.status === 'bare' ? 'ok' : c.status === 'no' ? 'no' : c.status === 'maybe' || c.status === 'unknown' ? 'maybe' : '';
      const hasNote = r.notes.some(n => n.grade === 'no' && (n.fix && (n.fix.startsWith(c.stem || '\u0000') || n.vars.v === c.text || n.vars.p === c.text)));
      return `<span class="ck-chunk ${hasNote ? 'no' : cls}">${esc(c.text)}<i>${hasNote ? '✗' : cls === 'ok' ? '✓' : cls === 'no' ? '✗' : '?'}</i></span>`;
    }).join(' ');
    const notes = document.getElementById('chk-notes'); notes.innerHTML = '';
    r.notes.forEach(n => {
      const g = n.grade === 'maybe' ? 'soft' : n.grade === 'info' ? 'info' : n.grade;
      const d = document.createElement('div'); d.className = 'why ' + g;
      d.innerHTML = `${n.fix ? `<b lang="ko">${esc(n.fix)}</b>` : ''}<span class="tag">${L[n.grade] || n.grade}</span><p>${esc(fill(n.key, n.vars))}${n.unknown ? ' — ' + esc(WHY.chk_unknown) : ''}</p>`;
      notes.appendChild(d);
    });
    notes.hidden = !r.notes.length;
    const v = document.getElementById('chk-verdict');
    v.className = 'why ' + (r.verdict === 'ok' ? 'ok' : r.verdict === 'no' ? 'no' : 'soft') + ' verdict';
    v.innerHTML = `<p>${esc(r.verdict === 'ok' ? WHY.chk_ok : r.verdict === 'no' ? WHY.chk_no : fill('chk_partial', { n: r.unknown }))}</p>`;
    out.hidden = false;
  }
  form.onsubmit = e => { e.preventDefault(); run(inp.value); };
  document.querySelectorAll('.ex').forEach(b => b.onclick = () => { inp.value = b.dataset.ex; run(inp.value); });
  const q = new URLSearchParams(location.search).get('s'); if (q) { inp.value = q; run(q); }
})();
