// Builder page. State → render; the engine (munjang.js) judges particles and assembles the sentence.
// Landing state: html.landing shows only the hero + the letter panel; the first letter tap ends it and the studio grid opens
// (letters become the left rail, builder centre, tray right). The particle slots are the quiz: they show "?" until chosen,
// and the panel under the slots asks for one particle at a time with a one-line why after each answer.
(function () {
  const M = window.Munjang, D = window.MJ_DATA, UI = window.MJ_UI, LANG = ['ja', 'vi'].includes(document.documentElement.lang.slice(0, 2)) ? document.documentElement.lang.slice(0, 2) : 'en';
  const WHY = Object.assign({ _lang: LANG }, D.templates.why[LANG]);
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const t = (k, v) => (UI[k] || k).replace(/\{(\w+)\}/g, (_, x) => v && v[x] != null ? v[x] : '');
  const mean = w => w[LANG] || w.en || '';
  const KEY = 'munjang.tray';
  const st = { jamo: null, batchim: false, word: null, tpl: D.templates.templates[0], tense: 'pres', picks: {}, judges: {}, active: null, level: 1, tray: load(), incompat: false };
  try { st.level = +localStorage.getItem('munjang.level') || 1; } catch (e) {}
  function load() {
    try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!Array.isArray(v)) return [];
      return v.filter(x => x && typeof x.text === 'string' && x.text.length <= 120).slice(0, 5).map(x => ({ text: x.text, gloss: typeof x.gloss === 'string' ? x.gloss.slice(0, 160) : '', parts: Array.isArray(x.parts) ? x.parts.filter(q => q && typeof q.t === 'string').slice(0, 12).map(q => ({ t: q.t.slice(0, 20), p: typeof q.p === 'string' ? q.p.slice(0, 3) : '' })) : null, unreviewed: !!x.unreviewed, at: +x.at || 0 })); } catch (e) { return []; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st.tray)); } catch (e) {} }
  const nounByH = h => D.words.nouns.find(n => n.h === h);
  const verbByH = h => D.words.verbs.find(v => v.h === h);
  const tplById = id => D.templates.templates.find(x => x.id === id);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const isP = k => M.isPKey(k);
  const NOUN_KEYS = ['O', 'D', 'L', 'T', 'H', 'W', 'R'];
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
    st.jamo = j; st.showAll = false;
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
    const all = wordsFor(st.jamo), list = st.showAll ? all : all.slice(0, 10);
    box.appendChild(el('h3', 'words-h', `<span>${t('words_with', { j: '<b>' + esc(st.jamo) + '</b>' })}</span><span class="count">${all.length}</span>`));
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
    if (all.length > list.length) { const more = el('button', 'link more', t('show_all', { n: all.length })); more.type = 'button'; more.onclick = () => { st.showAll = true; renderWords(); }; box.appendChild(more); }
  }

  // ---------- builder ----------
  // Put the tapped word into the frame that suits it and leave the particle slots empty (that is the quiz).
  function pickWord(n) {
    st.word = n;
    const k = n.kind, me = nounByH('저');
    if (k === 'time') { st.tpl = tplById('time'); st.picks = { T: n, S: me, D: nounByH('학교'), V: verbByH('가다') }; }
    else if (k === 'abstract') { st.tpl = tplById('have'); st.picks = { S: me, H: n, V: verbByH('있다') }; }
    else if (k === 'place') { st.tpl = tplById('go'); st.picks = { S: me, D: n, V: verbByH('가다') }; }
    else if (k === 'food') { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('먹다') }; }
    else if (k === 'drink') { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('마시다') }; }
    else if (k === 'skill') { st.tpl = tplById('want'); st.picks = { S: me, O: n, V: verbByH('배우다') }; }
    else if (k === 'media') { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('보다') }; }
    else if (k === 'audio') { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('듣다') }; }
    else if (k === 'item') { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: n.read ? verbByH('읽다') : n.ride ? verbByH('타다') : n.photo ? verbByH('찍다') : verbByH('사다') }; }
    else if (k === 'animal') { st.tpl = tplById('exist'); st.picks = { S: n, L: nounByH('집'), V: verbByH('있다') }; }
    else { st.tpl = tplById('act'); st.picks = { S: n, O: nounByH('커피'), V: verbByH('마시다') }; }
    st.tense = st.tpl.tenses[0]; st.judges = {}; st.active = null; st.incompat = false;
    if ((st.tpl.level || 1) > st.level) { st.level = st.tpl.level; try { localStorage.setItem('munjang.level', String(st.level)); } catch (e) {} }
    renderWords(); renderBuilder();
    if (innerWidth < 760) setTimeout(() => $('#builder').scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }
  function setTemplate(tpl) {
    const old = st.picks; st.tpl = tpl; st.judges = {}; st.active = null;
    const p = { S: old.S || nounByH('저') }, slots = tpl.slots;
    if (!tpl.tenses.includes(st.tense)) st.tense = tpl.tenses[0];
    if (slots.includes('O')) { const vs = M.verbsFor(tpl, D.words, st.tense).filter(v => tpl.verbs !== 'transitive' || !v.to); p.V = old.V && vs.includes(old.V) ? old.V : vs[0]; const cs = M.candidates(tpl, 'O', D.words, p.V); p.O = old.O && cs.includes(old.O) ? old.O : cs[0]; }
    if (slots.includes('D')) { p.D = old.D || old.L || nounByH('학교'); p.V = M.verbsFor(tpl, D.words)[0]; }
    if (slots.includes('L')) { p.L = old.L || old.D || (tpl.id === 'exist' ? nounByH('집') : nounByH('카페')); if (!slots.includes('O')) p.V = M.verbsFor(tpl, D.words)[0]; }
    if (slots.includes('A')) { let as = M.adjectivesFor(p.S, D.words); if (!as.length) { p.S = nounByH('김치'); as = M.adjectivesFor(p.S, D.words); } p.A = as[0]; }
    if (slots.includes('T')) { p.T = old.T || nounByH('주말'); if (!p.D) p.D = old.D || nounByH('공원'); p.V = old.V && old.V.move ? old.V : verbByH('가다'); }
    if (slots.includes('H')) { p.H = old.H || (old.O && old.O.roles.includes('have') ? old.O : nounByH('시간')); p.V = old.V && old.V.have ? old.V : verbByH('있다'); if (p.S.kind !== 'person') p.S = nounByH('저'); }
    if (slots.includes('W')) { p.W = old.W || nounByH('친구'); }
    if (slots.includes('R')) { p.R = old.R || nounByH('친구'); const vs = M.verbsFor(tpl, D.words); p.V = vs.includes(old.V) ? old.V : vs[0]; const cs = M.candidates(tpl, 'O', D.words, p.V); p.O = cs.includes(old.O) ? old.O : cs[0]; }
    if (tpl.id === 'neg' && (!p.V || !p.V.takes)) { p.V = verbByH('마시다'); p.O = nounByH('커피'); }
    if (tpl.id === 'exist' && p.S.h === '저') p.S = nounByH('고양이');
    if (tpl.id === 'want' && !p.S.ga) p.S = nounByH('저');
    const sc = M.candidates(tpl, 'S', D.words); if (!sc.includes(p.S) && !p.S.free) p.S = sc[0] || p.S;
    st.picks = p; if (!tpl.tenses.includes(st.tense)) st.tense = tpl.tenses[0];
    $('#frames').hidden = true; renderBuilder();
  }
  function optionsFor(k) {
    if (k === 'S') return M.candidates(st.tpl, 'S', D.words);
    if (k === 'O') return M.candidates(st.tpl, 'O', D.words, st.picks.V);
    if (k === 'D') return M.candidates(st.tpl, 'D', D.words);
    if (k === 'L') return M.candidates(st.tpl, 'L', D.words);
    if (['T', 'H', 'W', 'R'].includes(k)) return M.candidates(st.tpl, k, D.words);
    if (k === 'V' || k === 'VW' || k === 'NV' || k === 'HV') return M.verbsFor(st.tpl, D.words, k === 'VW' ? 'want' : st.tense);
    if (k === 'A') return M.adjectivesFor(st.picks.S, D.words);
    return [];
  }
  function setPick(k, item) {
    const key = (k === 'VW' || k === 'NV' || k === 'HV') ? 'V' : k;
    st.picks[key] = item;
    if (key === 'O') { clearP('OP'); clearP('OP2'); }
    if (key === 'S') { clearP('SP'); if (st.tpl.slots.includes('A')) { const as = M.adjectivesFor(item, D.words); if (!as.includes(st.picks.A)) st.picks.A = as[0] || st.picks.A; } }
    if (['D', 'L', 'T', 'H', 'W', 'R'].includes(key)) clearP(st.tpl.slots[st.tpl.slots.indexOf(key) + 1]);
    st.incompat = !!(st.picks.V && st.picks.O && !M.compatible(st.picks.V, st.picks.O)); // the learner's word stays; the pair is explained, not silently replaced
    rejudge(); st.active = null; renderBuilder();
  }
  function clearP(pk) { delete st.judges[pk]; delete st.picks[pk]; }
  // Re-run every existing particle judgement against the current nouns/verb/frame so explanations never describe a previous choice.
  function rejudge() {
    for (const pk of particleSlots()) {
      const j = st.judges[pk]; if (!j) continue;
      const nounKey = st.tpl.slots[st.tpl.slots.indexOf(pk) - 1];
      const r = M.judgeP(st.tpl, pk, st.picks[nounKey], st.picks.V, j.choice, WHY);
      st.judges[pk] = Object.assign({ choice: j.choice }, r); st.picks[pk] = r.grade === 'no' ? undefined : j.choice;
    }
  }
  function setParticle(pk, choice) {
    const slots = st.tpl.slots, nounKey = slots[slots.indexOf(pk) - 1];
    if (!st.picks[nounKey]) return;
    const j = M.judgeP(st.tpl, pk, st.picks[nounKey], st.picks.V, choice, WHY);
    st.judges[pk] = Object.assign({ choice }, j);
    st.picks[pk] = j.grade === 'no' ? undefined : choice; // a wrong form never enters the sentence; the why line names the right one
    st.active = j.grade === 'no' ? pk : (particleSlots().find(x => !st.picks[x]) || null);
    renderBuilder();
  }
  const particleSlots = () => st.tpl.slots.filter(pk => isP(pk) && !(pk === 'SP' && st.tense === 'please'));
  const complete = () => !st.incompat && particleSlots().every(pk => st.picks[pk]);
  function activeP() { return st.active || particleSlots().find(pk => !st.picks[pk]) || null; }

  function renderBuilder() {
    // frame menu + line
    const lv = $('#levels'); lv.innerHTML = '';
    Object.entries(D.templates.levels).forEach(([n, lab]) => { const b = el('button', 'chip' + (+n === st.level ? ' on' : ''), esc(lab[LANG] || lab.en)); b.type = 'button'; b.onclick = () => { st.level = +n; try { localStorage.setItem('munjang.level', n); } catch (e) {} if ((st.tpl.level || 1) > st.level) setTemplate(D.templates.templates.find(x => (x.level || 1) <= st.level)); if ((D.templates.tense_levels[st.tense] || 1) > st.level) st.tense = 'pres'; renderBuilder(); }; lv.appendChild(b); });
    const fm = $('#frames'); fm.innerHTML = '';
    D.templates.templates.filter(tp => (tp.level || 1) <= st.level).forEach(tp => { const b = el('button', tp === st.tpl ? 'on' : '', `<span class="lvtag">Lv${tp.level || 1}</span>${esc(tp[LANG] || tp.en)}<small>${esc(tp.ex)}</small>`); b.type = 'button'; b.onclick = () => setTemplate(tp); fm.appendChild(b); });
    $('#frame-line').innerHTML = `<span class="num" aria-hidden="true">✎</span><span>${t('frame_of')}: <b>${esc(st.tpl[LANG] || st.tpl.en)}</b></span>`;
    const tenses = $('#tenses'); tenses.innerHTML = '';
    st.tpl.tenses.filter(x => (D.templates.tense_levels[x] || 1) <= st.level).forEach(x => { const b = el('button', 'chip' + (x === st.tense ? ' on' : ''), t('tense_' + x)); b.type = 'button'; b.onclick = () => { st.tense = x; if (st.picks.V && !M.verbForm(st.picks.V, x)) { const vs = M.verbsFor(st.tpl, D.words, x); st.picks.V = vs[0]; if (st.picks.O && !M.compatible(st.picks.V, st.picks.O)) st.picks.O = M.candidates(st.tpl, 'O', D.words, st.picks.V)[0]; rejudge(); } renderBuilder(); }; tenses.appendChild(b); });
    tenses.hidden = tenses.children.length < 2;
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
      if ((k === 'S' || k === 'SP') && st.tense === 'please') return; // request form has no subject
      const s = el('div', 'slot ' + (isP(k) ? 'slot-p' : 'slot-w'));
      if (isP(k)) {
        const j = st.judges[k];
        s.classList.add(j && st.picks[k] ? j.grade : 'empty'); if (k === act) s.classList.add('active');
        s.appendChild(el('span', 'slot-l', t('slot_SP')));
        const shown = st.picks[k] === '∅' ? t('none_label') : st.picks[k];
        const b = el('button', 'slot-v', `<b>${st.picks[k] ? esc(shown) : '?'}</b>`); b.type = 'button'; b.setAttribute('aria-label', t('slot_SP')); b.onclick = () => { st.active = k; renderBuilder(); };
        s.appendChild(b);
      } else {
        const key = (k === 'VW' || k === 'NV' || k === 'HV') ? 'V' : k, item = st.picks[key], isV = ['V', 'VW', 'NV', 'HV', 'A'].includes(k);
        s.appendChild(el('span', 'slot-l', t('slot_' + (k === 'VW' ? 'V' : k))));
        const vf = item && isV ? (k === 'NV' ? '안 ' : '') + (M.verbForm(item, k === 'VW' ? 'want' : st.tense) || '—') : '';
        if (st.incompat && (key === 'V' || key === 'O')) s.classList.add('bad');
        const b = el('button', 'slot-v', item ? `<b lang="ko">${esc(isV ? vf : item.h)}</b><small>${esc(mean(item).replace(/^to /, ''))}</small>` : t('pick'));
        b.type = 'button'; b.onclick = () => openPicker(k, s);
        s.appendChild(b);
      }
      const next = st.tpl.slots[idx + 1];
      if (!isP(k) && isP(next || '')) { pair = el('div', 'pair'); pair.appendChild(s); row.appendChild(pair); }
      else if (pair && isP(k)) { pair.appendChild(s); pair = null; }
      else row.appendChild(s);
    });
    renderPanel(act);
    renderIncompat();
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
  // Incompatible verb + object: keep both, explain, and offer verbs that do take the object.
  function renderIncompat() {
    let box = $('#incompat');
    if (!box) { box = el('div', 'ppanel incompat'); box.id = 'incompat'; $('#ppanel').insertAdjacentElement('beforebegin', box); }
    if (!st.incompat || !st.picks.O || !st.picks.V) { box.hidden = true; box.innerHTML = ''; return; }
    const o = st.picks.O, v = st.picks.V;
    const verbs = M.verbsFor(st.tpl, D.words, st.tense).filter(x => M.compatible(x, o)).slice(0, 5);
    box.innerHTML = `<div class="ph"><span>✗ ${t('incompat_h')}</span></div><p class="pn">${esc(t('incompat_p', { o: o.h, v: v.h }))}</p><div class="p-opts"></div><p class="pn">${esc(t('incompat_p2', { o: o.h, v: mean(v).replace(/^to /, '') }))}</p>`;
    const opts = $('.p-opts', box);
    verbs.forEach(x => { const b = el('button', 'p-opt', `${esc(M.verbForm(x, st.tense) || x.pres)}`); b.type = 'button'; b.onclick = () => setPick('V', x); opts.appendChild(b); });
    if (!verbs.length) opts.remove();
    box.hidden = false;
  }
  // The particle panel asks for one slot at a time.
  function renderPanel(pk) {
    const pp = $('#ppanel');
    if (!pk || !st.picks.S) { pp.hidden = true; pp.innerHTML = ''; return; }
    const slots = st.tpl.slots, nounKey = slots[slots.indexOf(pk) - 1], noun = st.picks[nounKey];
    const spec = M.pspec(st.tpl, pk), opts = spec.options, j = st.judges[pk];
    const hk = { time: 'particle_time_h', have: 'particle_have_h', with: 'particle_with_h', to: 'particle_to_h' }[spec.expect];
    const head = pk === 'SP' ? t('particle_topic_h') : hk ? t(hk, { w: noun ? noun.h : '' }) : t('particle_obj_h', { w: noun ? noun.h : '' });
    pp.innerHTML = `<div class="ph"><span>${head}</span><small>${pk === 'SP' ? t('particle_hint_topic') : hk ? '' : t('particle_hint_obj')}</small></div><div class="p-opts"></div><p class="pn" lang="ko">${noun ? esc(noun.h) + ' + ?' : ''}</p>`;
    const box = $('.p-opts', pp);
    opts.forEach(p => { const b = el('button', 'p-opt' + (j && j.choice === p ? ' on ' + j.grade : '') + (p === '∅' ? ' none' : ''), p === '∅' ? t('none_label') : p); b.type = 'button'; b.onclick = () => setParticle(pk, p); box.appendChild(b); });
    pp.hidden = false;
  }
  function renderPreview() {
    const pv = $('#preview');
    if (!st.picks.S) { pv.className = 'preview'; pv.innerHTML = `<p class="cap">✦ ${t('taking_shape')}</p><p class="gloss">${t('two_particles')}</p>`; return; }
    const a = M.assemble(st.tpl, Object.assign({}, st.picks, { tense: st.tense }));
    const done = complete() && !a.incomplete;
    const unrev = Object.values(st.picks).some(x => x && x.free);
    // Unchosen particles render as a blank so the sentence takes shape while the learner works.
    const html = a.chunks.map((c, i) => {
      const pkey = c.kind === 'S' ? 'SP' : NOUN_KEYS.includes(c.kind) ? st.tpl.slots[st.tpl.slots.indexOf(c.kind) + 1] : null;
      const blank = pkey && st.picks[pkey] == null;
      const text = blank ? `${esc(c.word.h)}<u>&nbsp;&nbsp;</u>` : esc(c.text);
      return `${i ? (done ? '<span class="sp" aria-hidden="true">⎵</span>' : '<span class="sp" aria-hidden="true">&nbsp;</span>') : ''}<span class="ck ck-${c.kind}"><span lang="ko">${text}</span><small lang="${LANG}">${done && !c.tail ? esc(chunkGloss(c)) : '&nbsp;'}</small></span>`;
    }).join('') + `<span class="ck"><span>.</span><small>&nbsp;</small></span>`;
    pv.className = 'preview' + (done ? ' done' : '');
    pv.innerHTML = `<p class="cap">✦ ${done ? (unrev ? t('unreviewed') : t('done_line')) : t('taking_shape')}</p><p class="big">${html}</p>` +
      (done ? `<p class="gloss">${esc(gloss(a))}</p><div class="acts"><button type="button" class="btn ghost" id="say">${SPEAKER} ${t('say')}</button><button type="button" class="btn" id="add">${t('add')}</button></div>` : `<p class="gloss">${t('two_particles')}</p>`);
    if (done) { $('#say').onclick = () => speak(a.text); $('#add').onclick = () => addToTray(a); if (st.tray.some(x => x.text === a.text)) { $('#add').textContent = t('added'); $('#add').disabled = true; } }
  }
  // One-word meaning under each chunk: shows the SOV mapping without pretending to be a translation.
  function chunkGloss(c) {
    const w = c.word; if (!w) return c.kind === 'N' ? (LANG === 'ja' ? '（否定）' : 'not') : '';
    if (c.kind === 'V' || c.kind === 'A') return LANG === 'ja' ? (predJa(c.kind, w, true) || '') : LANG === 'vi' ? predVi(c.kind, w) : predEn(c.kind, w, 'I', true);
    const base = (LANG === 'en' && w.en_g) || mean(w).replace(/ ?[（(].*?[)）]$/, '');
    if (LANG === 'vi') { const vp = { '에': c.kind === 'T' ? 'vào ' : c.kind === 'D' ? 'đến ' : 'ở ', '에서': 'ở ', '와': 'với ', '과': 'với ', '하고': 'với ', '에게': 'cho ', '한테': 'cho ' }[c.particle] || ''; return (c.kind === 'T' && !c.particle ? '' : vp) + base; }
    if (LANG === 'ja') { const jp = { '은': 'は', '는': 'は', '이': 'が', '가': 'が', '을': 'を', '를': 'を', '에': 'に', '에서': 'で', '와': 'と', '과': 'と', '하고': 'と', '에게': 'に', '한테': 'に' }[c.particle] || ''; return base + (c.kind === 'O' && st.picks.V && st.picks.V.ja_p ? st.picks.V.ja_p : jp); }
    if (c.kind === 'T') return c.particle ? ({ '아침': 'in the morning', '저녁': 'in the evening', '밤': 'at night', '점심': 'at lunch' }[w.h] || 'on ' + base) : base;
    if (c.kind === 'W') return 'with ' + base; if (c.kind === 'R') return 'to ' + base; if (c.kind === 'H') return base;
    return c.kind === 'D' ? (w.h === '집' ? 'home' : 'to ' + base) : c.kind === 'L' ? (st.tpl.id === 'live' ? 'in ' : 'at ') + base : base;
  }
  // Japanese predicate: stored polite forms (ja_pres/ja_past/ja_want), never derived from the dictionary label.
  function predJa(kind, w, short) {
    if (kind === 'A') return st.tense === 'past' ? w.ja_past : w.ja_pres;
    const neg = st.tpl.id === 'neg';
    let f = st.tense === 'want' ? w.ja_want : st.tense === 'past' ? w.ja_past : w.ja_pres;
    if (!f) return null;
    if (st.tense === 'fut') f = w.ja_pres.replace(/ます$/, 'ます（予定）');
    if (st.tense === 'can') f = w.ja_pres.replace(/ます$/, '') + 'ことができます'; if (st.tense === 'must') f = w.ja_pres.replace(/ます$/, '') + 'なければなりません'; if (st.tense === 'please') f = w.ja_pres.replace(/ます$/, '') + 'てください';
    if (neg) f = f.replace(/ます$/, 'ません').replace(/ました$/, 'ませんでした');
    if (st.tpl.id === 'have') f = w.h === '없다' ? (st.tense === 'past' ? 'ありませんでした' : 'ありません') : (st.tense === 'past' ? 'ありました' : 'あります');
    if (st.tpl.id === 'exist' && w.h === '있다') { const S = st.picks.S; f = S && (S.kind === 'person' || S.kind === 'animal') ? (st.tense === 'past' ? 'いました' : 'います') : (st.tense === 'past' ? 'ありました' : 'あります'); }
    return f;
  }
  // Vietnamese predicate: no conjugation; tense/mood particles before the verb.
  function predVi(kind, w) {
    const base = w.vi || mean(w);
    if (kind === 'A') return (st.tense === 'past' ? 'đã ' : '') + base;
    if (st.tpl.id === 'have') return w.h === '없다' ? 'không có' : 'có';
    if (st.tpl.id === 'exist') return (st.tense === 'past' ? 'đã ' : '') + 'ở';
    const neg = st.tpl.id === 'neg' ? 'không ' : '';
    const pre = { pres: '', past: 'đã ', want: 'muốn ', fut: 'sẽ ', can: 'có thể ', must: 'phải ', please: 'hãy ' }[st.tense] || '';
    return pre + neg + base.replace(/ \(.*\)$/, '');
  }
  // English predicate with agreement, from stored en_base/en_3s/en_past.
  function predEn(kind, w, S, short) {
    const first = S === 'I', plural = /^(clothes|shoes|glasses|flowers|vegetables|eggs|strawberries|the news)$/.test(S);
    if (kind === 'A') { const be = st.tense === 'past' ? (first || !plural ? 'was' : 'were') : (first ? 'am' : plural ? 'are' : 'is'); return short ? (w.en_adj || mean(w).replace(/^to be /, '')) : `${be} ${w.en_adj || mean(w).replace(/^to be /, '')}`; }
    const base = w.en_base || mean(w).replace(/^to /, ''), s3 = w.en_3s || base, past = w.en_past || base;
    if (st.tpl.id === 'have' && w.en_have) return st.tense === 'past' ? w.en_have[2] : (first || plural ? w.en_have[0] : w.en_have[1]);
    if (st.tpl.id === 'neg') return st.tense === 'past' ? "didn't " + base : (first || plural ? "don't " : "doesn't ") + base;
    if (st.tense === 'want') return (first || plural ? 'want to ' : 'wants to ') + base;
    if (st.tense === 'fut') return 'will ' + base;
    if (st.tense === 'can') return 'can ' + base; if (st.tense === 'must') return (first || plural ? 'have to ' : 'has to ') + base; if (st.tense === 'please') return 'Please ' + base;
    if (st.tense === 'past') return past;
    if (w.h === '있다' || w.h === '없다') { const be = first ? 'am' : plural ? 'are' : 'is'; return short ? (w.h === '없다' ? be + ' not at' : be + ' at') : (w.h === '없다' ? be + ' not' : be); }
    return first || plural ? base : s3;
  }
  function gloss(a) {
    const p = st.picks, m = x => x ? ((LANG === 'en' && x.en_g) || mean(x)).replace(/^to /, '').replace(/ ?[（(].*?[)）]$/, '') : '';
    if (LANG === 'ja') {
      const V = p.A ? predJa('A', p.A) : (p.V ? predJa('V', p.V) : '');
      if (V === null) return '';
      const op = p.V && p.V.ja_p ? p.V.ja_p : 'を';
      return [p.T && m(p.T) + (p.T.tp === 'none' ? '' : 'に'), p.S && st.tense !== 'please' && m(p.S) + (st.judges.SP && st.judges.SP.choice && /^(이|가)$/.test(st.judges.SP.choice) ? 'が' : 'は'), p.W && m(p.W) + 'と', p.R && m(p.R) + 'に', p.H && m(p.H) + 'が', p.L && m(p.L) + (p.V && p.V.locBoth ? 'に' : st.tpl.op === 'loc' || st.tpl.op2 ? 'で' : 'に'), p.D && m(p.D) + 'に', p.O && m(p.O) + op, V].filter(Boolean).join('') + '。';
    }
    if (LANG === 'vi') {
      const mv = x => x ? (x.vi || mean(x)).replace(/ \(.*\)$/, '') : '';
      const Sv = p.S && st.tense !== 'please' ? mv(p.S) : '';
      const Vv = p.A ? predVi('A', p.A) : (p.V ? predVi('V', p.V) : '');
      const Tv = p.T ? (p.T.tp === 'none' ? mv(p.T) : 'vào ' + mv(p.T)) : '';
      const parts = [Sv, Vv, p.H && mv(p.H), p.O && mv(p.O), p.R && 'cho ' + mv(p.R), p.W && 'với ' + mv(p.W), p.D && (p.D.h === '집' ? 'về nhà' : 'đến ' + mv(p.D)), p.L && 'ở ' + mv(p.L), Tv].filter(Boolean).join(' ');
      return parts.charAt(0).toUpperCase() + parts.slice(1) + '.';
    }
    const S = p.S && st.tense !== 'please' ? m(p.S) : '';
    const V = p.A ? predEn('A', p.A, S) : (p.V ? predEn('V', p.V, S || 'you') : '');
    const T = p.T ? (p.T.tp === 'none' ? m(p.T) : ({ '아침': 'in the morning', '저녁': 'in the evening', '밤': 'at night', '점심': 'at lunch' }[p.T.h] || 'on ' + m(p.T))) : '';
    const O = p.O ? m(p.O) : '';
    const out = [S, V, p.H && m(p.H), O, p.R && 'to ' + m(p.R), p.W && 'with ' + m(p.W), p.D && (p.D.h === '집' ? 'home' : 'to ' + m(p.D)), p.L && (st.tpl.id === 'live' ? 'in ' : 'at ') + m(p.L), T].filter(Boolean).join(' ');
    return out.charAt(0).toUpperCase() + out.slice(1) + '.';
  }
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
    q = (q || '').normalize('NFC').trim().replace(/\s+/g, ' ').slice(0, 30); if (!q) return null;
    const lq = q.toLowerCase();
    const known = D.words.nouns.find(n => n.h === q)
      || D.words.nouns.find(n => (n.alias_en || []).some(a => a.toLowerCase() === lq) || (n.alias_ja || []).includes(q) || (n.vi || '').toLowerCase().replace(/ \(.*\)$/, '') === lq)
      || D.words.nouns.find(n => n.en.toLowerCase() === lq || n.ja === q || (n.en_g || '').toLowerCase().replace(/^(a|an|the|my) /, '') === lq)
      || D.words.nouns.find(n => n.en.toLowerCase().split(/[,(]/)[0].trim() === lq || n.ja.split(/[・（]/)[0] === q);
    if (known) return known;
    // Unknown Hangul: allowed only as a subject/object/have-word in particle-form practice mode (never a place, time or receiver).
    if (M.syllables(q.replace(/ /g, '')).length === [...q.replace(/ /g, '')].length) return { h: q, r: '', en: '', ja: '', roles: ['subj', 'obj', 'have'], kind: 'unknown', feat: [], free: true };
    return null;
  }
  // Ring-pulse the slot a typed word landed in, with a small badge, and bring it into view.
  function flashSlot(k) {
    const idx = st.tpl.slots.indexOf(k); const slot = $$('#slots .slot-w')[st.tpl.slots.filter((x, i) => !isP(x) && i < idx).length];
    if (!slot) return;
    slot.classList.add('flash'); const badge = el('span', 'flash-badge', '← ' + t('flash_badge')); slot.appendChild(badge);
    slot.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { slot.classList.remove('flash'); badge.remove(); }, 2400);
  }
  function initFree() {
    const f = $('#free'), inp = $('#free-in'), hint = $('#free-hint');
    f.onsubmit = e => {
      e.preventDefault();
      const n = freeWord(inp.value);
      if (!n) { hint.textContent = t('free_hint_unknown', { w: inp.value.trim().slice(0, 30) }); return; }
      if (!st.picks.S) { pickWord(n.free ? nounByH('커피') : n); if (!n.free) { hint.textContent = ''; inp.value = ''; return; } }
      // The word goes into the first slot whose role it actually has (object → have-word → destination → location → subject); a person is never a 에-destination.
      const slotFor = { O: 'obj', H: 'have', D: 'dest', L: 'loc', R: 'to', W: 'with', T: 'time', S: 'subj' };
      const k = ['O', 'H', 'D', 'L', 'R', 'T', 'S'].find(x => st.tpl.slots.includes(x) && n.roles.includes(slotFor[x]));
      if (!k) { hint.textContent = t('free_hint_unknown', { w: n.h }); return; }
      if (k === 'O' && st.picks.V && !M.compatible(st.picks.V, n) && !n.free) { const v = M.verbsFor(st.tpl, D.words, st.tense).find(v => M.compatible(v, n)); if (v) st.picks.V = v; else { hint.textContent = t('free_hint_unknown', { w: n.h }); return; } }
      if (k === 'S' && !M.candidates(st.tpl, 'S', D.words).includes(n) && !n.free) { hint.textContent = t('free_hint_unknown', { w: n.h }); return; }
      setPick(k, n); hint.textContent = (n.free ? t('unreviewed') + ' ' : '') + t('free_hint_ok', { w: n.h, slot: t('slot_' + k) }); inp.value = '';
      flashSlot(k);
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
    } else if (!['obj', 'dest', 'loc'].includes(M.pspec(st.tpl, pk).expect)) {
      // same-family drill (time / have / with / to): three fresh nouns in this frame
      const slots = st.tpl.slots, key = slots[slots.indexOf(pk) - 1], spec = M.pspec(st.tpl, pk);
      pickN(M.candidates(st.tpl, key, D.words, st.picks.V).filter(n => n !== st.picks[key]), 3).forEach(n => {
        const picks = Object.assign({}, st.picks, { [key]: n, [pk]: M.form(n, spec.expect) || '∅', tense: st.tense });
        const a = M.assemble(st.tpl, picks); const idx = a.chunks.findIndex(c => c.kind === key);
        items.push({ noun: n, before: a.chunks.slice(0, idx).map(c => c.text).join(' '), after: a.chunks.slice(idx + 1).map(c => c.text).join(' ') + '.', opts: spec.options, judge: c => M.judgeP(st.tpl, pk, n, st.picks.V, c, WHY) });
      });
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
    it.opts.forEach(o => { const b = el('button', 'p-opt' + (o === '∅' ? ' none' : ''), o === '∅' ? t('none_label') : o); b.type = 'button'; b.onclick = () => {
      const r = it.judge(o); $$('.p-opt', box).forEach(x => x.className = 'p-opt'); b.classList.add('on', r.grade);
      const w = $('.why', box); w.hidden = false; w.className = 'why ' + r.grade; w.innerHTML = `<span class="tag">${t(r.grade === 'ok' ? 'correct' : r.grade === 'soft' ? 'soft' : 'wrong')}</span><p>${esc(r.why)}</p><button type="button" class="link" id="drill-next">${drill.i + 1 < drill.items.length ? t('drill_q', { i: drill.i + 2 }) + ' →' : t('drill_done', { n: drill.score + (r.grade === 'ok' ? 1 : 0) })}</button>`;
      if (r.grade === 'ok') drill.score++; $$('.p-opt', box).forEach(x => x.disabled = true);
      $('#drill-next').onclick = () => { drill.i++; renderDrill(); };
    }; opts.appendChild(b); });
  }

  // ---------- tray ----------
  function addToTray(a) {
    if (st.tray.length >= 5 || st.tray.some(x => x.text === a.text)) return;
    const parts = a.chunks.map(c => ({ t: c.text, p: c.particle && !c.tail ? c.particle : '' })); // p = the quizzed particle (blank in the worksheet)
    st.tray.push({ text: a.text, gloss: gloss(a), parts, unreviewed: Object.values(st.picks).some(x => x && x.free), at: Date.now() }); save(); renderTray();
    const b = $('#add'); if (b) { b.textContent = t('added'); b.disabled = true; }
  }
  function renderTray() {
    const list = $('#tray-list'); list.innerHTML = '';
    $('#tray-count').textContent = t('tray_count', { n: st.tray.length });
    if (!st.tray.length) list.appendChild(el('div', 'tray-empty', `<svg viewBox="0 0 64 48" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="6" width="16" height="16" rx="3"/><rect x="24" y="6" width="16" height="16" rx="3"/><rect x="44" y="6" width="16" height="16" rx="3"/><rect x="4" y="26" width="16" height="16" rx="3" opacity=".35"/><rect x="24" y="26" width="16" height="16" rx="3" opacity=".35"/></svg><b>${t('tray_empty_h')}</b><span>${t('tray_empty_p')}</span>`));
    st.tray.forEach((s, i) => {
      const li = el('div', 'tray-item', `<b lang="ko">${esc(s.text)}</b><small>${esc(s.gloss || '')}${s.unreviewed ? ' · ' + esc(t('unreviewed')) : ''}</small><button type="button" class="x" aria-label="${t('clear')}">✕</button>`);
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
  else if (h.get('j') && [...M.BASIC_CONSONANTS, ...M.BASIC_VOWELS].includes(h.get('j'))) pickJamo(h.get('j'));
})();
