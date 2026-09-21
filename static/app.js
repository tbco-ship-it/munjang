// Builder page. State → render; the engine (munjang.js) judges particles and assembles the sentence.
// Landing state: html.landing shows only the hero + the letter panel; the first letter tap ends it and the studio grid opens
// (letters become the left rail, builder centre, tray right). The particle slots are the quiz: they show "?" until chosen,
// and the panel under the slots asks for one particle at a time with a one-line why after each answer.
(function () {
  const M = window.Munjang, D = window.MJ_DATA, UI = window.MJ_UI, LANG = document.documentElement.lang.slice(0, 2) === 'ja' ? 'ja' : 'en';
  const WHY = Object.assign({ _lang: LANG }, D.templates.why[LANG]);
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const t = (k, v) => (UI[k] || k).replace(/\{(\w+)\}/g, (_, x) => v && v[x] != null ? v[x] : '');
  const mean = w => w[LANG] || w.en || '';
  const KEY = 'munjang.tray';
  const st = { jamo: null, batchim: false, word: null, tpl: D.templates.templates[0], tense: 'pres', picks: {}, judges: {}, active: null, tray: load() };
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st.tray)); } catch (e) {} }
  const nounByH = h => D.words.nouns.find(n => n.h === h);
  const verbByH = h => D.words.verbs.find(v => v.h === h);
  const tplById = id => D.templates.templates.find(x => x.id === id);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const isP = k => /^(SP|OP|OP2)$/.test(k);
  const SPEAKER = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

  // ---------- letters ----------
  function renderJamo() {
    const box = $('#jamo'); box.innerHTML = '';
    [['consonants', M.BASIC_CONSONANTS], ['vowels', M.BASIC_VOWELS]].forEach(([label, list]) => {
      const g = el('div', 'jamo-group'); g.appendChild(el('h3', 'jamo-label', t(label)));
      const row = el('div', 'jamo-row');
      list.forEach(j => { const b = el('button', 'jamo' + (st.jamo === j ? ' on' : ''), j); b.type = 'button'; b.setAttribute('aria-pressed', st.jamo === j); b.onclick = () => pickJamo(j); row.appendChild(b); });
      g.appendChild(row); box.appendChild(g);
    });
  }
  function pickJamo(j) {
    st.jamo = j;
    if (document.documentElement.classList.contains('landing')) leaveLanding();
    renderJamo(); renderWords();
    if (innerWidth < 760) setTimeout(() => $('#words').scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }
  function leaveLanding() {
    document.documentElement.classList.remove('landing');
    if (window.__reveal) window.__reveal($('.studio'), true, 40);
  }
  function wordsFor(j) {
    const all = D.words.nouns.filter(n => M.hasJamo(n.h, j));
    const list = st.batchim ? all.filter(n => M.hasBatchim(n.h)) : all;
    const first = n => { const s = M.syllables(n.h)[0]; return s.cho === j || s.jung === j ? 0 : 1; }; // 가방 before 친구 for ㄱ
    return list.sort((a, b) => first(a) - first(b) || a.h.length - b.h.length);
  }
  function renderWords() {
    const box = $('#words'); box.innerHTML = '';
    if (!st.jamo) return;
    const list = wordsFor(st.jamo).slice(0, 10);
    box.appendChild(el('h3', 'words-h', `<span>${t('words_with', { j: '<b>' + st.jamo + '</b>' })}</span><span class="count">${list.length}</span>`));
    if (!list.length) { box.appendChild(el('p', 'hint', t('no_words', { j: st.jamo }))); return; }
    const ul = el('div', 'word-list');
    list.forEach(n => {
      const card = el('button', 'word' + (st.word && st.word.h === n.h ? ' on' : '')); card.type = 'button';
      const hits = M.jamoPositions(n.h, st.jamo);
      const marked = [...n.h].map((ch, i) => `<span class="${hits.some(p => p.i === i) ? 'hit' : ''}">${ch}</span>`).join('');
      card.innerHTML = `<span class="w-h">${marked}</span><span class="arr">${st.word && st.word.h === n.h ? '✓' : '→'}</span><span class="w-m">${esc(mean(n))}</span><span class="w-r">${esc(n.r)}</span>`;
      card.onclick = () => pickWord(n);
      ul.appendChild(card);
    });
    box.appendChild(ul);
  }

  // ---------- builder ----------
  // Put the tapped word into the frame that suits it and leave the particle slots empty (that is the quiz).
  function pickWord(n) {
    st.word = n;
    const k = n.kind, me = nounByH('저');
    if (k === 'place') { st.tpl = tplById('go'); st.picks = { S: me, D: n, V: verbByH('가다') }; }
    else if (k === 'food') { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('먹다') }; }
    else if (k === 'drink') { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('마시다') }; }
    else if (k === 'skill') { st.tpl = tplById('want'); st.picks = { S: me, O: n, V: verbByH('배우다') }; }
    else if (k === 'media') { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('보다') }; }
    else if (k === 'audio') { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('듣다') }; }
    else if (k === 'item') { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: n.read ? verbByH('읽다') : verbByH('사다') }; }
    else if (k === 'animal') { st.tpl = tplById('exist'); st.picks = { S: n, L: nounByH('집'), V: verbByH('있다') }; }
    else { st.tpl = tplById('act'); st.picks = { S: n, O: nounByH('커피'), V: verbByH('마시다') }; }
    st.tense = st.tpl.tenses[0]; st.judges = {}; st.active = null;
    renderWords(); renderBuilder();
    if (innerWidth < 760) setTimeout(() => $('#builder').scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }
  function setTemplate(tpl) {
    const old = st.picks; st.tpl = tpl; st.judges = {}; st.active = null;
    const p = { S: old.S || nounByH('저') }, slots = tpl.slots;
    if (slots.includes('O')) { const vs = M.verbsFor(tpl, D.words); p.V = old.V && vs.includes(old.V) ? old.V : vs[0]; const cs = M.candidates(tpl, 'O', D.words, p.V); p.O = old.O && cs.includes(old.O) ? old.O : cs[0]; }
    if (slots.includes('D')) { p.D = old.D || old.L || nounByH('학교'); p.V = M.verbsFor(tpl, D.words)[0]; }
    if (slots.includes('L')) { p.L = old.L || old.D || (tpl.id === 'exist' ? nounByH('집') : nounByH('카페')); if (!slots.includes('O')) p.V = M.verbsFor(tpl, D.words)[0]; }
    if (slots.includes('A')) { let as = M.adjectivesFor(p.S, D.words); if (!as.length) { p.S = nounByH('김치'); as = M.adjectivesFor(p.S, D.words); } p.A = as[0]; }
    if (tpl.id === 'exist' && p.S.h === '저') p.S = nounByH('고양이');
    st.picks = p; if (!tpl.tenses.includes(st.tense)) st.tense = tpl.tenses[0];
    $('#frames').hidden = true; renderBuilder();
  }
  function optionsFor(k) {
    if (k === 'S') return M.candidates(st.tpl, 'S', D.words);
    if (k === 'O') return M.candidates(st.tpl, 'O', D.words, st.picks.V);
    if (k === 'D') return M.candidates(st.tpl, 'D', D.words);
    if (k === 'L') return M.candidates(st.tpl, 'L', D.words);
    if (k === 'V' || k === 'VW') return M.verbsFor(st.tpl, D.words);
    if (k === 'A') return M.adjectivesFor(st.picks.S, D.words);
    return [];
  }
  function setPick(k, item) {
    const key = k === 'VW' ? 'V' : k;
    st.picks[key] = item;
    if (key === 'V' && st.picks.O && !M.compatible(item, st.picks.O)) { st.picks.O = M.candidates(st.tpl, 'O', D.words, item)[0]; clearP('OP'); clearP('OP2'); }
    if (key === 'O') { clearP('OP'); clearP('OP2'); }
    if (key === 'S') { clearP('SP'); if (st.tpl.slots.includes('A')) { const as = M.adjectivesFor(item, D.words); if (!as.includes(st.picks.A)) st.picks.A = as[0] || st.picks.A; } }
    if (key === 'D' || key === 'L') clearP(st.tpl.slots[st.tpl.slots.indexOf(key) + 1]);
    st.active = null; renderBuilder();
  }
  function clearP(pk) { delete st.judges[pk]; delete st.picks[pk]; }
  function setParticle(pk, choice) {
    const slots = st.tpl.slots, nounKey = slots[slots.indexOf(pk) - 1];
    let j;
    if (pk === 'SP') j = M.judgeSP(st.tpl, st.picks.S, choice, WHY);
    else j = M.judgeOP(st.tpl, pk === 'OP2' ? st.tpl.op2 : st.tpl.op, st.picks[nounKey], st.picks.V, choice, WHY);
    st.judges[pk] = Object.assign({ choice }, j);
    st.picks[pk] = j.grade === 'no' ? undefined : choice; // a wrong form never enters the sentence; the why line names the right one
    st.active = j.grade === 'no' ? pk : (particleSlots().find(x => !st.picks[x]) || null);
    renderBuilder();
  }
  const particleSlots = () => st.tpl.slots.filter(isP);
  const complete = () => particleSlots().every(pk => st.picks[pk]);
  function activeP() { return st.active || particleSlots().find(pk => !st.picks[pk]) || null; }

  function renderBuilder() {
    // frame menu + line
    const fm = $('#frames'); fm.innerHTML = '';
    D.templates.templates.forEach(tp => { const b = el('button', tp === st.tpl ? 'on' : '', `${esc(tp[LANG] || tp.en)}<small>${esc(tp.ex)}</small>`); b.type = 'button'; b.onclick = () => setTemplate(tp); fm.appendChild(b); });
    $('#frame-line').innerHTML = `<span class="num" aria-hidden="true">✎</span><span>${t('frame_of')}: <b>${esc(st.tpl[LANG] || st.tpl.en)}</b></span>`;
    const tenses = $('#tenses'); tenses.innerHTML = '';
    st.tpl.tenses.forEach(x => { const b = el('button', 'chip' + (x === st.tense ? ' on' : ''), t('tense_' + x)); b.type = 'button'; b.onclick = () => { st.tense = x; renderBuilder(); }; tenses.appendChild(b); });
    tenses.hidden = st.tpl.tenses.length < 2;
    // word head
    const wh = $('#wordhead'), w = st.word;
    if (w) {
      const syl = M.syllables(w.h).map(s => `<i>${s.ch} = ${s.cho}+${s.jung}${s.jong ? '+' + s.jong : ''}</i>`).join('');
      wh.innerHTML = `<div class="syl" aria-hidden="true">${esc(w.h[0])}</div><div><div class="wh" lang="ko">${esc(w.h)}</div><div class="wm">${esc(mean(w))} <span class="wr">· ${esc(w.r)}</span></div><div class="ws">${syl}</div></div><button type="button" class="say" data-say="${esc(w.h)}" aria-label="${t('listen')}" title="${t('listen_hint')}">${SPEAKER}</button>`;
      wh.hidden = false;
    } else wh.hidden = true;
    // slots (word slot + its particle slot stay together)
    const row = $('#slots'); row.innerHTML = '';
    let pair = null; const act = activeP();
    st.tpl.slots.forEach((k, idx) => {
      const s = el('div', 'slot ' + (isP(k) ? 'slot-p' : 'slot-w'));
      if (isP(k)) {
        const j = st.judges[k];
        s.classList.add(j && st.picks[k] ? j.grade : 'empty'); if (k === act) s.classList.add('active');
        s.appendChild(el('span', 'slot-l', t('slot_SP')));
        const b = el('button', 'slot-v', `<b>${st.picks[k] ? esc(st.picks[k]) : '?'}</b>`); b.type = 'button'; b.setAttribute('aria-label', t('slot_SP')); b.onclick = () => { st.active = k; renderBuilder(); };
        s.appendChild(b);
      } else {
        const key = k === 'VW' ? 'V' : k, item = st.picks[key], isV = k === 'V' || k === 'VW' || k === 'A';
        s.appendChild(el('span', 'slot-l', t('slot_' + (k === 'VW' ? 'V' : k))));
        const b = el('button', 'slot-v', item ? `<b lang="ko">${esc(isV ? M.verbForm(item, k === 'VW' ? 'want' : st.tense) : item.h)}</b><small>${esc(mean(item).replace(/^to /, ''))}</small>` : t('pick'));
        b.type = 'button'; b.onclick = () => openPicker(k, s);
        s.appendChild(b);
      }
      const next = st.tpl.slots[idx + 1];
      if (!isP(k) && isP(next || '')) { pair = el('div', 'pair'); pair.appendChild(s); row.appendChild(pair); }
      else if (pair && isP(k)) { pair.appendChild(s); pair = null; }
      else row.appendChild(s);
    });
    renderPanel(act);
    // why lines
    const why = $('#why'); why.innerHTML = '';
    particleSlots().forEach(pk => { const j = st.judges[pk]; if (!j) return;
      const d = el('div', 'why ' + j.grade, `<b>${esc(j.choice)}</b><span class="tag">${t(j.grade === 'ok' ? 'correct' : j.grade === 'soft' ? 'soft' : 'wrong')}</span><p>${esc(j.why)}</p>`);
      if (j.grade === 'no') { const b = el('button', 'link drill-btn', t('drill_btn') + ' →'); b.type = 'button'; b.onclick = () => startDrill(pk, j); d.appendChild(b); }
      why.appendChild(d); });
    if (complete()) why.appendChild(el('div', 'why info', `<b>${t('spaces')}</b><p>${esc(WHY.space)}</p>`));
    why.hidden = !why.children.length;
    renderPreview();
    renderTray();
  }
  // The particle panel asks for one slot at a time.
  function renderPanel(pk) {
    const pp = $('#ppanel');
    if (!pk) { pp.hidden = true; pp.innerHTML = ''; return; }
    const slots = st.tpl.slots, nounKey = slots[slots.indexOf(pk) - 1], noun = st.picks[nounKey];
    const opts = pk === 'SP' ? M.SP_OPTIONS : M.OP_OPTIONS, j = st.judges[pk];
    pp.innerHTML = `<div class="ph"><span>${pk === 'SP' ? t('particle_topic_h') : t('particle_obj_h', { w: noun ? noun.h : '' })}</span><small>${pk === 'SP' ? t('particle_hint_topic') : t('particle_hint_obj')}</small></div><div class="p-opts"></div><p class="pn" lang="ko">${noun ? esc(noun.h) + ' + ?' : ''}</p>`;
    const box = $('.p-opts', pp);
    opts.forEach(p => { const b = el('button', 'p-opt' + (j && j.choice === p ? ' on ' + j.grade : ''), p); b.type = 'button'; b.onclick = () => setParticle(pk, p); box.appendChild(b); });
    pp.hidden = false;
  }
  function renderPreview() {
    const pv = $('#preview');
    if (!st.picks.S) { pv.className = 'preview'; pv.innerHTML = `<p class="cap">✦ ${t('taking_shape')}</p><p class="gloss">${t('two_particles')}</p>`; return; }
    const a = M.assemble(st.tpl, Object.assign({}, st.picks, { tense: st.tense }));
    const done = complete();
    // Unchosen particles render as a blank so the sentence takes shape while the learner works.
    const html = a.chunks.map((c, i) => {
      const pkey = c.kind === 'S' ? 'SP' : (c.kind === 'O' || c.kind === 'D' || c.kind === 'L') ? st.tpl.slots[st.tpl.slots.indexOf(c.kind) + 1] : null;
      const blank = pkey && !st.picks[pkey];
      const text = blank ? `${esc(c.word.h)}<u>&nbsp;&nbsp;</u>` : esc(c.text);
      return `${i ? (done ? '<span class="sp" aria-hidden="true">⎵</span>' : '<span class="sp" aria-hidden="true">&nbsp;</span>') : ''}<span class="ck ck-${c.kind}"><span lang="ko">${text}</span><small lang="${LANG}">${done && !c.tail ? esc(chunkGloss(c)) : '&nbsp;'}</small></span>`;
    }).join('') + `<span class="ck"><span>.</span><small>&nbsp;</small></span>`;
    pv.className = 'preview' + (done ? ' done' : '');
    pv.innerHTML = `<p class="cap">✦ ${done ? t('done_line') : t('taking_shape')}</p><p class="big">${html}</p>` +
      (done ? `<p class="gloss">${esc(gloss(a))}</p><div class="acts"><button type="button" class="btn ghost" id="say">${SPEAKER} ${t('say')}</button><button type="button" class="btn" id="add">${t('add')}</button></div>` : `<p class="gloss">${t('two_particles')}</p>`);
    if (done) { $('#say').onclick = () => speak(a.text); $('#add').onclick = () => addToTray(a); if (st.tray.some(x => x.text === a.text)) { $('#add').textContent = t('added'); $('#add').disabled = true; } }
  }
  // One-word meaning under each chunk: shows the SOV mapping without pretending to be a translation.
  function chunkGloss(c) {
    const w = c.word; if (!w) return '';
    if (c.kind === 'V' || c.kind === 'A') { const m = mean(w).replace(/^to /, '').replace(/^be /, ''); return st.tense === 'want' && c.kind === 'V' ? (LANG === 'ja' ? m + 'たい' : 'want to ' + m) : m; }
    const base = (LANG === 'en' && w.en_g) || mean(w).replace(/ ?[（(].*?[)）]$/, '');
    if (LANG === 'ja') return base + ({ '은': 'は', '는': 'は', '이': 'が', '가': 'が', '을': 'を', '를': 'を', '에': 'に', '에서': 'で' }[c.particle] || '');
    return c.kind === 'D' ? (w.h === '집' ? 'home' : 'to ' + base) : c.kind === 'L' ? (st.tpl.id === 'live' ? 'in ' : 'at ') + base : base;
  }
  function gloss(a) {
    const p = st.picks, m = x => x ? ((LANG === 'en' && x.en_g) || mean(x)).replace(/^to /, '').replace(/ ?[（(].*?[)）]$/, '') : '';
    if (LANG === 'ja') {
      const V = p.V ? (st.tense === 'want' ? m(p.V) + '（〜たい）' : m(p.V)) : '';
      return [p.S && m(p.S) + (st.tpl.sp === 'topic' ? 'は' : 'が'), p.L && m(p.L) + (st.tpl.op === 'loc' || st.tpl.op2 ? 'で' : 'に'), p.D && m(p.D) + 'に', p.O && m(p.O) + 'を', p.A ? m(p.A) : V].filter(Boolean).join(' ');
    }
    const S = p.S ? m(p.S) : '';
    if (p.A) return `${S} ${st.tense === 'past' ? 'was' : 'is'} ${m(p.A).replace(/^be /, '')}`;
    const V = st.tense === 'want' ? `want${S === 'I' ? '' : 's'} to ${m(p.V)}` : st.tense === 'past' ? pastEn(p.V) : (S === 'I' ? m(p.V) : thirdEn(m(p.V)));
    return [S, V, p.O && m(p.O), p.D && (p.D.h === '집' ? 'home' : 'to ' + m(p.D)), p.L && (st.tpl.id === 'live' ? 'in ' : 'at ') + m(p.L)].filter(Boolean).join(' ');
  }
  function thirdEn(v) { return v.replace(/^(\w+)/, x => /(s|ch|sh)$/.test(x) ? x + 'es' : /[^aeiou]y$/.test(x) ? x.slice(0, -1) + 'ies' : x + 's'); }
  function pastEn(v) { const m = { eat: 'ate', drink: 'drank', buy: 'bought', 'see, watch': 'saw', read: 'read', listen: 'listened to', write: 'wrote', learn: 'learned', study: 'studied', meet: 'met', like: 'liked', go: 'went', come: 'came', 'be (there), exist': 'was', live: 'lived', work: 'worked' }; const k = mean(v).replace(/^to /, ''); return m[k] || k + 'ed'; }

  // word picker
  function openPicker(k, anchor) {
    closePicker();
    const opts = optionsFor(k); if (!opts.length) return;
    const sh = el('div', 'picker'); sh.id = 'picker';
    const isV = k === 'V' || k === 'VW' || k === 'A';
    opts.forEach(o => { const b = el('button', 'pk', `<b lang="ko">${esc(isV ? M.verbForm(o, k === 'VW' ? 'want' : st.tense) : o.h)}</b><small>${esc(mean(o))}</small>`); b.type = 'button'; b.onclick = () => { setPick(k, o); closePicker(); }; sh.appendChild(b); });
    anchor.appendChild(sh);
    setTimeout(() => document.addEventListener('click', outside, { once: true }), 0);
    function outside(e) { if (!sh.contains(e.target)) closePicker(); else document.addEventListener('click', outside, { once: true }); }
  }
  function closePicker() { const p = $('#picker'); if (p) p.remove(); }

  // "I want to say…" — accepts Korean, English or Japanese; unknown Korean nouns still get the particle check.
  function freeWord(q) {
    q = q.trim(); if (!q) return null;
    const lq = q.toLowerCase();
    const known = D.words.nouns.find(n => n.h === q) || D.words.nouns.find(n => n.en.toLowerCase() === lq || n.ja === q || (n.en_g || '').toLowerCase().replace(/^(a|an|the|my) /, '') === lq)
      || D.words.nouns.find(n => n.en.toLowerCase().split(/[,(]/)[0].trim() === lq);
    if (known) return known;
    if (M.syllables(q).length === [...q].length) return { h: q, r: '', en: '', ja: '', roles: ['subj', 'obj', 'dest', 'loc'], kind: 'unknown', free: true };
    return null;
  }
  function initFree() {
    const f = $('#free'), inp = $('#free-in'), hint = $('#free-hint');
    f.onsubmit = e => {
      e.preventDefault();
      const n = freeWord(inp.value);
      if (!n) { hint.textContent = t('free_hint_unknown', { w: inp.value.trim() }); return; }
      // Put it where the frame takes a noun: object if there is one, else destination/location, else subject.
      const k = st.tpl.slots.includes('O') && n.roles.includes('obj') ? 'O' : st.tpl.slots.includes('D') ? 'D' : st.tpl.slots.includes('L') ? 'L' : 'S';
      if (!st.word) { st.word = n; if (document.documentElement.classList.contains('landing')) leaveLanding(); }
      setPick(k, n); hint.textContent = t('free_hint_ok', { w: n.h, slot: t('slot_' + k) }); inp.value = '';
    };
  }


  // ---------- mistake drill: three fresh items on the rule the learner just got wrong ----------
  const drill = { items: [], i: 0, score: 0, kind: null };
  const pickN = (arr, n) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  function makeDrill(pk, j) {
    const items = [];
    if (pk === 'SP') {
      // form drill on the natural family of the current frame; mix 받침 yes/no nouns
      const fam = st.tpl.sp, opts = fam === 'topic' ? ['은', '는'] : ['이', '가'];
      const used = new Set(Object.values(st.picks).filter(x => x && x.h).map(x => x.h));
      const pool = M.candidates(st.tpl, 'S', D.words).filter(n => n.h !== '저' && !used.has(n.h) && (fam !== 'topic' || n.kind === 'person' || n.kind === 'animal'));
      const yes = pool.filter(n => M.hasBatchim(n.h)), no = pool.filter(n => !M.hasBatchim(n.h));
      const nouns = pickN([...pickN(yes, 2), ...pickN(no, 2)], 3);
      nouns.forEach(n => { const picks = Object.assign({}, st.picks, { S: n, SP: M.form(n, fam) }); const a = M.assemble(st.tpl, Object.assign(picks, { tense: st.tense })); items.push({ noun: n, before: '', after: a.chunks.slice(1).map(c => c.text).join(' ') + '.', opts, judge: c => M.judgeSP(st.tpl, n, c, WHY) }); });
    } else {
      // family drill: 에 vs 에서 vs 을/를 across move / action / exist frames
      const frames = [['go', 'dest'], ['at', 'loc'], ['exist', 'dest'], ['act', 'obj'], ['live', 'loc']];
      pickN(frames, 3).forEach(([id, expect]) => {
        const tp = tplById(id), key = expect === 'obj' ? 'O' : expect === 'dest' && id !== 'exist' ? 'D' : 'L';
        const v = pickN(M.verbsFor(tp, D.words), 1)[0]; const n = pickN(M.candidates(tp, key, D.words, v), 1)[0]; if (!n || !v) return;
        const S = id === 'exist' ? pickN(D.words.nouns.filter(x => x.kind === 'animal' || x.kind === 'person').filter(x => x.h !== '저'), 1)[0] : nounByH('저');
        const picks = { S, [key]: n, V: v, O: id === 'at' ? pickN(M.candidates(tp, 'O', D.words, v), 1)[0] : (key === 'O' ? n : undefined) };
        const a = M.assemble(tp, Object.assign({}, picks, { tense: 'pres' }));
        const idx = a.chunks.findIndex(c => c.kind === key);
        items.push({ noun: n, before: a.chunks.slice(0, idx).map(c => c.text).join(' '), after: a.chunks.slice(idx + 1).map(c => c.text).join(' ') + '.', opts: [M.form(n, 'obj'), '에', '에서'], judge: c => M.judgeOP(tp, expect, n, v, c, WHY) });
      });
    }
    return items;
  }
  function startDrill(pk, j) { drill.pk = pk; drill.j = j; drill.items = makeDrill(pk, j); drill.i = 0; drill.score = 0; renderDrill(); $('#drill').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  function renderDrill() {
    const box = $('#drill'); if (!drill.items.length) { box.hidden = true; return; }
    box.hidden = false;
    if (drill.i >= drill.items.length) { box.innerHTML = `<div class="ph"><span>${t('drill_h')}</span></div><p class="drill-done">${t('drill_done', { n: drill.score })}</p><div class="acts"><button type="button" class="btn ghost" id="drill-again">${t('drill_again')}</button><button type="button" class="btn" id="drill-close">${t('drill_close')}</button></div>`;
      $('#drill-again').onclick = () => startDrill(drill.pk, drill.j); $('#drill-close').onclick = () => { drill.items = []; renderDrill(); }; return; }
    const it = drill.items[drill.i];
    box.innerHTML = `<div class="ph"><span>${t('drill_h')}</span><small>${t('drill_q', { i: drill.i + 1 })}</small></div><p class="drill-s" lang="ko">${esc(it.before)} <b>${esc(it.noun.h)}<u>&nbsp;&nbsp;</u></b> ${esc(it.after)}</p><div class="p-opts"></div><div class="why" hidden></div>`;
    const opts = $('.p-opts', box);
    it.opts.forEach(o => { const b = el('button', 'p-opt', o); b.type = 'button'; b.onclick = () => {
      const r = it.judge(o); $$('.p-opt', box).forEach(x => x.className = 'p-opt'); b.classList.add('on', r.grade);
      const w = $('.why', box); w.hidden = false; w.className = 'why ' + r.grade; w.innerHTML = `<span class="tag">${t(r.grade === 'ok' ? 'correct' : r.grade === 'soft' ? 'soft' : 'wrong')}</span><p>${esc(r.why)}</p><button type="button" class="link" id="drill-next">${drill.i + 1 < drill.items.length ? t('drill_q', { i: drill.i + 2 }) + ' →' : t('drill_done', { n: drill.score + (r.grade === 'ok' ? 1 : 0) })}</button>`;
      if (r.grade === 'ok') drill.score++; $$('.p-opt', box).forEach(x => x.disabled = true);
      $('#drill-next').onclick = () => { drill.i++; renderDrill(); };
    }; opts.appendChild(b); });
  }

  // ---------- tray ----------
  function addToTray(a) {
    if (st.tray.length >= 5 || st.tray.some(x => x.text === a.text)) return;
    st.tray.push({ text: a.text, gloss: gloss(a), at: Date.now() }); save(); renderTray();
    const b = $('#add'); if (b) { b.textContent = t('added'); b.disabled = true; }
  }
  function renderTray() {
    const list = $('#tray-list'); list.innerHTML = '';
    $('#tray-count').textContent = t('tray_count', { n: st.tray.length });
    if (!st.tray.length) list.appendChild(el('div', 'tray-empty', `<svg viewBox="0 0 64 48" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="6" width="16" height="16" rx="3"/><rect x="24" y="6" width="16" height="16" rx="3"/><rect x="44" y="6" width="16" height="16" rx="3"/><rect x="4" y="26" width="16" height="16" rx="3" opacity=".35"/><rect x="24" y="26" width="16" height="16" rx="3" opacity=".35"/></svg><b>${t('tray_empty_h')}</b><span>${t('tray_empty_p')}</span>`));
    st.tray.forEach((s, i) => {
      const li = el('div', 'tray-item', `<b lang="ko">${esc(s.text)}</b><small>${esc(s.gloss || '')}</small><button type="button" class="x" aria-label="${t('clear')}">✕</button>`);
      li.querySelector('.x').onclick = () => { st.tray.splice(i, 1); save(); renderBuilder(); };
      list.appendChild(li);
    });
    $$('#tray .needs').forEach(b => b.disabled = !st.tray.length);
  }
  function initTray() {
    $('#copy').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(st.tray.map(s => s.text).join('\n')).then(() => { $('#copy').textContent = t('copied'); setTimeout(() => $('#copy').textContent = t('copy'), 1500); }); };
    $('#clear').onclick = () => { st.tray = []; save(); renderBuilder(); };
  }

  // ---------- audio ----------
  let voice = null;
  function findVoice() { const vs = speechSynthesis.getVoices(); voice = vs.find(v => /^ko/.test(v.lang) && /Yuna|Google|Microsoft|Premium|Enhanced/i.test(v.name)) || vs.find(v => /^ko/.test(v.lang)) || null; }
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    if (!voice) findVoice();
    const u = new SpeechSynthesisUtterance(text.replace(/\.$/, '')); u.lang = 'ko-KR'; if (voice) u.voice = voice; u.rate = 0.85;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  if ('speechSynthesis' in window) { findVoice(); speechSynthesis.onvoiceschanged = findVoice; }
  document.addEventListener('click', e => { const b = e.target.closest('[data-say]'); if (b) speak(b.getAttribute('data-say')); });

  // ---------- boot ----------
  renderJamo();
  $('#batchim').onchange = e => { st.batchim = e.target.checked; renderWords(); };
  $('#frame-btn').onclick = () => { $('#frames').hidden = !$('#frames').hidden; };
  $('#roman').onchange = e => { document.documentElement.classList.toggle('roman', e.target.checked); try { localStorage.setItem('munjang.roman', e.target.checked ? '1' : ''); } catch (x) {} };
  try { if (localStorage.getItem('munjang.roman')) { $('#roman').checked = true; document.documentElement.classList.add('roman'); } } catch (x) {}
  initTray(); initFree(); renderBuilder();
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('w') && nounByH(h.get('w'))) { const n = nounByH(h.get('w')); st.jamo = M.syllables(n.h)[0].cho; leaveLanding(); renderJamo(); renderWords(); pickWord(n); }
  else if (h.get('j')) pickJamo(h.get('j'));
})();
