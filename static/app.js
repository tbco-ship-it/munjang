// Builder page. State → render; the engine (munjang.js) judges particles and assembles the sentence.
// Landing state: html.landing shows only the hero + the letter panel; the first letter tap ends it and the studio grid opens
// (letters become the left rail, builder centre, tray right). The particle slots are the quiz: they show "?" until chosen,
// and the panel under the slots asks for one particle at a time with a one-line why after each answer.
(function () {
  const M = window.Munjang, D = window.MJ_DATA, UI = window.MJ_UI, LANG = ['ja', 'vi'].includes(document.documentElement.lang.slice(0, 2)) ? document.documentElement.lang.slice(0, 2) : 'en';
  const WHY = Object.assign({ _lang: LANG, _conn: D.templates.conn || {} }, D.templates.why[LANG]);
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const t = (k, v) => (UI[k] || k).replace(/\{(\w+)\}/g, (_, x) => v && v[x] != null ? v[x] : '');
  const mean = w => w[LANG] || w.en || '';
  const KEY = 'munjang.tray';
  const st = { jamo: null, batchim: false, word: null, tpl: D.templates.templates[0], tense: 'pres', picks: {}, judges: {}, active: null, level: 1, tray: load(), incompat: false };
  try { st.level = Math.min(5, Math.max(1, +localStorage.getItem('munjang.level') || 1)); } catch (e) {}
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
  const NOUN_KEYS = M.NOUN_SLOTS;
  // slot name → pick key (VF:reo / VW / NV / HV all hold the verb in picks.V; NV2 holds picks.V2; AUX:/FIX: are fixed)
  const pickKey = k => k.startsWith('VF:') || k === 'VW' || k === 'NV' || k === 'HV' || k === 'MV' ? 'V' : k.startsWith('AF:') ? 'A' : k === 'NV2' ? 'V2' : k.startsWith('AUX:') ? 'AUX' : k.startsWith('FIX:') ? null : k;
  const isVerbSlot = k => /^(V|VW|NV|HV|MV|V1|V2|NV2|VF:|AUX:)/.test(k);
  // the verb that governs a noun slot (O → its clause's verb; D in a purpose frame → 가다)
  function verbFor(nounKey) { const vk = M.verbKeyFor(st.tpl, nounKey); return st.picks[pickKey(vk)]; }
  const CONN = D.templates.conn || {};
  const connLab = k => (CONN[k] && CONN[k].lab) || k;
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
    const actor = k === 'person' || k === 'animal';
    if (k === 'pos') { st.tpl = tplById('location'); st.picks = { S: nounByH('가방'), REF: nounByH('의자'), POS: n, V: verbByH('있다') }; }
    else if (k === 'qword') { st.tpl = tplById(n.roles.includes('qd') ? 'q_where' : 'q_what'); st.picks = n.roles.includes('qd') ? { S: nounByH('친구'), QD: n, V: verbByH('가다') } : { S: nounByH('친구'), QO: n, V: verbByH('먹다') }; }
    else if (n.elder) { st.tpl = tplById('hongive'); st.picks = { S: me, R: n, O: nounByH('선물'), V: verbByH('드리다') }; }
    else if (k === 'time') { st.tpl = tplById('time'); st.picks = { T: n, S: me, D: nounByH('학교'), V: verbByH('가다') }; }
    else if (k === 'place') { st.tpl = tplById('go'); st.picks = { S: me, D: n, V: verbByH('가다') }; }
    else if (n.roles.includes('have') && k === 'abstract') { st.tpl = tplById('have'); st.picks = { S: me, H: n, V: verbByH('있다') }; }
    else if (k === 'abstract') { st.tpl = tplById('is'); st.picks = { S: n, A: M.adjectivesFor(n, D.words)[0] }; }
    else if (k === 'food') { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('먹다') }; }
    else if (k === 'drink') { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('마시다') }; }
    else if (n.do) { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('하다') }; }
    else if (k === 'skill') { st.tpl = tplById('want'); st.picks = { S: me, O: n, V: verbByH('배우다') }; }
    else if (n.write && !n.read) { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('쓰다') }; }
    else if (n.read) { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('읽다') }; }
    else if (n.ride) { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('타다') }; }
    else if (n.photo) { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('찍다') }; }
    else if (n.play) { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('치다') }; }
    else if (k === 'media') { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('보다') }; }
    else if (k === 'audio') { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('듣다') }; }
    else if (k === 'item') { st.tpl = tplById('act'); st.picks = { S: me, O: n, V: verbByH('사다') }; }
    else if (k === 'animal') { st.tpl = tplById('exist'); st.picks = { S: n, L: nounByH('집'), V: verbByH('있다') }; }
    else if (k === 'person') { st.tpl = tplById('act'); st.picks = { S: n, O: nounByH('커피'), V: verbByH('마시다') }; }
    else { st.tpl = tplById('is'); st.picks = { S: n, A: M.adjectivesFor(n, D.words)[0] || D.words.adjectives[0] }; } // never a non-actor as the subject of an action
    // safety: the picked pair must be one the engine allows
    if (st.picks.O && st.picks.V && !M.compatible(st.picks.V, st.picks.O)) { const v = M.verbsFor(st.tpl, D.words).find(x => M.compatible(x, st.picks.O)); if (v) st.picks.V = v; else { st.tpl = tplById('is'); st.picks = { S: n, A: M.adjectivesFor(n, D.words)[0] || D.words.adjectives[0] }; } }
    if (!st.picks.O && !st.picks.V && !st.picks.A && st.tpl.slots.includes('O')) { st.picks.V = M.verbsFor(st.tpl, D.words)[0]; st.picks.O = M.candidates(st.tpl, 'O', D.words, st.picks.V)[0]; }
    st.tense = st.tpl.tenses[0]; st.judges = {}; st.active = null; st.incompat = false;
    if ((st.tpl.level || 1) > st.level) { st.level = st.tpl.level; try { localStorage.setItem('munjang.level', String(st.level)); } catch (e) {} }
    renderWords(); renderBuilder();
    if (innerWidth < 760) setTimeout(() => $('#builder').scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }
  function setTemplate(tpl) {
    const old = st.picks; st.tpl = tpl; st.judges = {}; st.active = null;
    const p = { S: old.S || nounByH('저') }, slots = tpl.slots;
    if (!tpl.tenses.includes(st.tense)) st.tense = tpl.tenses[0];
    const two = slots.includes('CP');
    if (slots.includes('O') && !two) { const vs = M.verbsFor(tpl, D.words, st.tense).filter(v => tpl.verbs !== 'transitive' || !v.to); p.V = old.V && vs.includes(old.V) ? old.V : vs[0]; const cs = M.candidates(tpl, 'O', D.words, p.V); p.O = old.O && cs.includes(old.O) ? old.O : cs[0]; if (slots.includes('O2')) { const cs2 = M.candidates(tpl, 'O2', D.words, p.V).filter(n => n !== p.O); p.O2 = old.O2 && cs2.includes(old.O2) ? old.O2 : (cs2[0] || nounByH('차')); } }
    if (two) {
      // first clause: verb (or adjective) + the connective quiz; second clause: verb + its own object
      const v2s = M.verbsFor(tpl, D.words, st.tense).filter(v => !v.to); p.V2 = old.V2 && v2s.includes(old.V2) ? old.V2 : (old.V && v2s.includes(old.V) ? old.V : v2s[0]);
      if (slots.includes('V1')) { const v1s = M.verbsFor(tpl, D.words, st.tense, 'V1').filter(v => !v.to); p.V1 = old.V1 && v1s.includes(old.V1) ? old.V1 : v1s.find(v => v !== p.V2) || v1s[0]; }
      if (slots.includes('A1')) { const as = M.candidates(tpl, 'A1', D.words, null, p); p.A1 = old.A1 && as.includes(old.A1) ? old.A1 : (as.find(a => a.h === (tpl.id === 'but' || tpl.id === 'neunde' ? '바쁘다' : '배고프다')) || as[0]); }
      const firstObj = slots.includes('O') && slots.indexOf('O') < slots.indexOf('CP');
      if (firstObj) { const cs = M.candidates(tpl, 'O', D.words, p.V1); p.O = old.O && cs.includes(old.O) ? old.O : cs[0]; }
      if (slots.includes('O2')) { const cs = M.candidates(tpl, 'O2', D.words, p.V2).filter(n => n !== p.O); p.O2 = old.O2 && cs.includes(old.O2) ? old.O2 : cs[0]; }
      else if (slots.includes('O')) { const cs = M.candidates(tpl, 'O', D.words, p.V2); p.O = old.O && cs.includes(old.O) ? old.O : cs[0]; }
      if (slots.includes('H')) { p.H = old.H || nounByH('시간'); p.V1 = old.V1 && old.V1.have ? old.V1 : verbByH(tpl.id === 'because_f' ? '없다' : '있다'); if (tpl.id === 'because_f' && !old.O) { p.V2 = verbByH('하다'); p.O = nounByH('운동'); } }
      if (slots.includes('D')) { p.D = old.D || nounByH('학교'); p.V1 = old.V1 && old.V1.move ? old.V1 : verbByH('가다'); }
    }
    const vf = slots.find(k => k.startsWith('VF:'));
    if (vf) { const vs = M.verbsFor(tpl, D.words, st.tense); p.V = old.V && vs.includes(old.V) ? old.V : (tpl.id === 'purpose' && verbByH('읽다')) || (tpl.id === 'because_n' && verbByH('가져가다')) || vs[0]; if (slots.includes('O')) { const cs = M.candidates(tpl, 'O', D.words, p.V); p.O = old.O && cs.includes(old.O) ? old.O : (tpl.id === 'purpose' && cs.find(n => n.h === '책')) || (tpl.id === 'because_n' && cs.find(n => n.h === '우산')) || cs[0]; } if (slots.includes('D')) p.D = old.D || old.L || nounByH(tpl.id === 'experience' ? '제주도' : '도서관') || nounByH('학교'); if (slots.includes('L')) p.L = old.L || old.D || nounByH('서울'); }
    if (tpl.id === 'because_n') { p.S = nounByH('비'); p.V1 = verbByH('오다'); p.O = nounByH('우산'); p.V = verbByH('가져가다'); }
    if (slots.some(k => k.startsWith('AUX:'))) p.AUX = verbByH(slots.find(k => k.startsWith('AUX:')).slice(4));
    if (slots.includes('REF')) { p.S = old.S && M.candidates(tpl, 'S', D.words).includes(old.S) ? old.S : nounByH('가방'); const rs = M.candidates(tpl, 'REF', D.words, null, p); p.REF = old.REF && rs.includes(old.REF) ? old.REF : rs.find(n => n.h === '의자') || rs[0]; p.POS = old.POS || nounByH('위'); p.V = old.V && old.V.exist ? old.V : verbByH('있다'); }
    if (slots.includes('QD')) { p.QD = nounByH('어디'); const vs = M.verbsFor(tpl, D.words, st.tense); p.V = old.V && vs.includes(old.V) ? old.V : verbByH('가다'); }
    if (slots.includes('QO')) { p.QO = nounByH('뭐'); const vs = M.verbsFor(tpl, D.words, st.tense); p.V = old.V && vs.includes(old.V) ? old.V : verbByH('먹다'); }
    if (slots.includes('D') && !two && !vf) { p.D = old.D || old.L || nounByH('학교'); p.V = M.verbsFor(tpl, D.words)[0]; }
    if (slots.includes('L') && !vf && tpl.id !== 'hon_exist') { p.L = old.L || old.D || (tpl.id === 'exist' ? nounByH('집') : tpl.id === 'live' ? nounByH('서울') : nounByH('카페')); if (tpl.id === 'live' && p.L && p.L.kind === 'place' && !/서울|한국|일본|부산|집/.test(p.L.h) && !old.L) p.L = nounByH('서울'); if (!slots.includes('O')) p.V = M.verbsFor(tpl, D.words)[0]; }
    if (tpl.id === 'hon_exist') { const sc = M.candidates(tpl, 'S', D.words); p.S = old.S && sc.includes(old.S) ? old.S : old.R && sc.includes(old.R) ? old.R : nounByH('할머니'); p.L = old.L || old.D || nounByH('집'); p.V = verbByH('계시다'); }
    if (tpl.id === 'hon_verb') { const sc = M.candidates(tpl, 'S', D.words); p.S = old.S && sc.includes(old.S) ? old.S : nounByH('할머니'); p.V = verbByH('드시다'); p.O = nounByH('진지'); }
    if (tpl.id === 'neunde') { p.S = nounByH('저'); p.A1 = D.words.adjectives.find(a => a.h === '바쁘다'); p.O = nounByH('친구'); p.V2 = verbByH('만나다'); }
    if (tpl.id === 'geodeun') { const sc = M.candidates(tpl, 'S', D.words); if (!sc.includes(p.S)) p.S = nounByH('저'); }
    if (tpl.id === 'notice') { const sc = M.candidates(tpl, 'S', D.words); p.S = old.O && sc.includes(old.O) ? old.O : old.S && sc.includes(old.S) ? old.S : nounByH('커피'); }
    if (slots.includes('A') || slots.some(k => k.startsWith('AF:'))) { let as = M.adjectivesFor(p.S, D.words, tpl); if (!as.length) { p.S = nounByH(tpl.id === 'notice' ? '커피' : '김치'); as = M.adjectivesFor(p.S, D.words, tpl); } p.A = old.A && as.includes(old.A) ? old.A : (tpl.id === 'geodeun' && as.find(a => a.h === '바쁘다')) || as[0]; }
    if (tpl.id === 'pref') { const hs = M.candidates(tpl, 'H', D.words); p.H = old.O && hs.includes(old.O) ? old.O : old.H && hs.includes(old.H) ? old.H : nounByH('커피'); if (!p.S || p.S.kind !== 'person') p.S = nounByH('저'); }
    if (tpl.id === 'like') { p.V = verbByH('좋아하다'); const cs = M.candidates(tpl, 'O', D.words, p.V); p.O = old.O && cs.includes(old.O) ? old.O : old.H && cs.includes(old.H) ? old.H : nounByH('커피'); }
    if (tpl.id === 'cant' && (!p.V || !p.V.takes)) { p.V = verbByH('마시다'); p.O = nounByH('술') || nounByH('커피'); }
    if (slots.includes('T')) { p.T = old.T || nounByH('주말'); if (!p.D) p.D = old.D || nounByH('공원'); p.V = old.V && old.V.move ? old.V : verbByH('가다'); }
    if (slots.includes('H') && !two && tpl.id !== 'pref') { p.H = old.H || (old.O && old.O.roles.includes('have') ? old.O : nounByH('시간')); p.V = old.V && old.V.have ? old.V : verbByH('있다'); if (p.S.kind !== 'person') p.S = nounByH('저'); }
    if (slots.includes('W')) { const ws = M.candidates(tpl, 'W', D.words, p.V, p); p.W = old.W && ws.includes(old.W) ? old.W : (ws[0] || nounByH('친구')); }
    if (slots.includes('R')) { const rs = M.candidates(tpl, 'R', D.words); p.R = old.R && rs.includes(old.R) ? old.R : (tpl.verbs === 'hongive' ? nounByH('할머니') : nounByH('친구')); const vs = M.verbsFor(tpl, D.words); p.V = vs.includes(old.V) ? old.V : vs[0]; const cs = M.candidates(tpl, 'O', D.words, p.V); p.O = cs.includes(old.O) ? old.O : cs[0]; }
    if (tpl.plain) p.S = nounByH('나');
    if ((tpl.q || tpl.no_first) && p.S && p.S.ga) p.S = nounByH('친구');
    if (tpl.id === 'neg' && (!p.V || !p.V.takes)) { p.V = verbByH('마시다'); p.O = nounByH('커피'); }
    if (tpl.id === 'exist' && p.S.h === '저') p.S = nounByH('고양이');
    if (tpl.id === 'want' && !p.S.ga) p.S = nounByH('저');
    const sc = slots.includes('S') ? M.candidates(tpl, 'S', D.words, p.V1 || p.V) : []; if (slots.includes('S') && !sc.includes(p.S) && !p.S.free) p.S = sc[0] || p.S;
    if (!slots.includes('S')) delete p.S;
    st.picks = p; if (!tpl.tenses.includes(st.tense)) st.tense = tpl.tenses[0];
    $('#frames').hidden = true; $('#frame-btn').setAttribute('aria-expanded', 'false'); renderBuilder();
  }
  function optionsFor(k) {
    if (k === 'S') return M.candidates(st.tpl, 'S', D.words, st.picks.V1 || st.picks.V);
    if (k === 'O' || k === 'O2') return M.candidates(st.tpl, k, D.words, verbFor(k));
    if (k === 'D') return M.candidates(st.tpl, 'D', D.words);
    if (k === 'L') return M.candidates(st.tpl, 'L', D.words);
    if (['T', 'H', 'W', 'R', 'REF', 'POS', 'QD', 'QO', 'A1'].includes(k)) return M.candidates(st.tpl, k, D.words, verbFor(k), st.picks);
    if (k === 'V' || k === 'VW' || k === 'NV' || k === 'HV' || k.startsWith('VF:')) return M.verbsFor(st.tpl, D.words, k === 'VW' ? 'want' : st.tense, undefined, st.picks.S);
    if (k === 'V1') return M.verbsFor(st.tpl, D.words, st.tense, 'V1', st.picks.S).filter(v => !v.to);
    if (k === 'V2' || k === 'NV2') return M.verbsFor(st.tpl, D.words, st.tense).filter(v => !v.to);
    if (k === 'A' || k.startsWith('AF:')) return M.adjectivesFor(st.picks.S, D.words, st.tpl);
    return [];
  }
  // every (object, verb) pair in the frame must be one the engine allows
  function objPairs() { return st.tpl.slots.filter(k => k === 'O' || k === 'O2').map(k => ({ o: k, v: M.verbKeyFor(st.tpl, k) })); }
  function badPair() { return objPairs().find(({ o, v }) => { const O = st.picks[o], V = st.picks[pickKey(v)]; return O && V && !M.compatible(V, O); }) || null; }
  function setPick(k, item) {
    const key = pickKey(k); if (!key) return;
    st.picks[key] = item;
    if (key === 'O') { clearP('OP'); if (!st.tpl.slots.includes('O2')) clearP('OP2'); }
    if (key === 'O2') clearP('OP2');
    if (key === 'S') {
      clearP('SP');
      if (item && item.preds) {
        if (st.picks.V1 && !item.preds.includes(st.picks.V1.h)) {
          const v1s = M.verbsFor(st.tpl, D.words, st.tense, 'V1', item).filter(v => !v.to);
          if (v1s.length) st.picks.V1 = v1s[0];
        }
        if (st.picks.V && !item.preds.includes(st.picks.V.h)) {
          const vs = M.verbsFor(st.tpl, D.words, st.tense, undefined, item);
          if (vs.length) st.picks.V = vs[0];
        }
      }
      if (st.tpl.slots.includes('A') || st.tpl.slots.some(k => k.startsWith('AF:'))) { const as = M.adjectivesFor(item, D.words, st.tpl); if (!as.includes(st.picks.A)) st.picks.A = as[0] || st.picks.A; }
      if (st.tpl.slots.includes('A1')) { const as = M.candidates(st.tpl, 'A1', D.words, null, st.picks); if (!as.includes(st.picks.A1)) st.picks.A1 = as[0] || st.picks.A1; }
    }
    if (['D', 'L', 'T', 'H', 'W', 'R', 'POS', 'QD', 'QO'].includes(key)) clearP(st.tpl.slots[st.tpl.slots.indexOf(key) + 1]);
    if (key === 'REF') { const ps = M.candidates(st.tpl, 'POS', D.words, null, st.picks); if (!ps.includes(st.picks.POS)) { st.picks.POS = ps[0]; clearP('OP'); } }
    st.incompat = !!badPair(); // the learner's word stays; the pair is explained, not silently replaced
    rejudge(); st.active = null; renderBuilder();
  }
  function clearP(pk) { delete st.judges[pk]; delete st.picks[pk]; }
  // Re-run every existing particle judgement against the current nouns/verb/frame so explanations never describe a previous choice.
  function rejudge() {
    for (const pk of particleSlots()) {
      const j = st.judges[pk]; if (!j) continue;
      const nounKey = st.tpl.slots[st.tpl.slots.indexOf(pk) - 1];
      const r = M.judgeP(st.tpl, pk, st.picks[nounKey], verbFor(nounKey), j.choice, WHY);
      st.judges[pk] = Object.assign({ choice: j.choice }, r); st.picks[pk] = r.grade === 'no' ? undefined : j.choice;
    }
  }
  function setParticle(pk, choice) {
    const slots = st.tpl.slots, nounKey = slots[slots.indexOf(pk) - 1];
    if (!st.picks[nounKey]) return;
    const j = M.judgeP(st.tpl, pk, st.picks[nounKey], verbFor(nounKey), choice, WHY);
    st.judges[pk] = Object.assign({ choice }, j);
    st.picks[pk] = j.grade === 'no' ? undefined : choice; // a wrong form never enters the sentence; the why line names the right one
    st.active = j.grade === 'no' ? pk : (particleSlots().find(x => !st.picks[x]) || null);
    renderBuilder();
  }
  const particleSlots = () => st.tpl.slots.filter(pk => isP(pk) && !(pk === 'SP' && st.tense === 'please'));
  const complete = () => !st.incompat && particleSlots().every(pk => st.picks[pk]) && (!st.tpl.slots.includes('S') || !!st.picks.S);
  function activeP() { return st.active || particleSlots().find(pk => !st.picks[pk]) || null; }

  function renderBuilder() {
    // frame menu + line
    const lv = $('#levels'); lv.innerHTML = '';
    Object.entries(D.templates.levels).forEach(([n, lab]) => { const b = el('button', 'chip' + (+n === st.level ? ' on' : ''), esc(lab[LANG] || lab.en)); b.type = 'button'; b.onclick = () => { st.level = +n; try { localStorage.setItem('munjang.level', n); } catch (e) {} if ((st.tpl.level || 1) !== st.level) setTemplate(D.templates.templates.find(x => (x.level || 1) === st.level)); renderBuilder(); }; lv.appendChild(b); });
    const fm = $('#frames'); fm.innerHTML = '';
    // the menu lists the selected level's frames only (Aiden 22:03Z); the level chips switch sets
    const lvLabel = D.templates.levels[String(st.level)]; fm.appendChild(el('div', 'fm-h', esc(lvLabel ? (lvLabel[LANG] || lvLabel.en) : 'Lv' + st.level)));
    D.templates.templates.filter(tp => (tp.level || 1) === st.level).forEach(tp => { const b = el('button', tp === st.tpl ? 'on' : '', `${esc(tp[LANG] || tp.en)}<small>${esc(tp.ex)}</small>`); b.type = 'button'; b.onclick = () => setTemplate(tp); fm.appendChild(b); });
    $('#frame-line').innerHTML = `<span class="num" aria-hidden="true">✎</span><span>${t('frame_of')}: <b>${esc(st.tpl[LANG] || st.tpl.en)}</b></span>`;
    const tenses = $('#tenses'); tenses.innerHTML = '';
    st.tpl.tenses.forEach(x => { const b = el('button', 'chip' + (x === st.tense ? ' on' : ''), t('tense_' + x)); b.type = 'button'; b.onclick = () => { st.tense = x; if (st.picks.V && !st.tpl.slots.some(k => k.startsWith('VF:')) && !M.verbForm(st.picks.V, x)) { const vs = M.verbsFor(st.tpl, D.words, x); st.picks.V = vs[0]; if (st.picks.O && !M.compatible(st.picks.V, st.picks.O)) st.picks.O = M.candidates(st.tpl, 'O', D.words, st.picks.V)[0]; rejudge(); } renderBuilder(); }; tenses.appendChild(b); });
    tenses.hidden = tenses.children.length < 2;
    // word head
    const wh = $('#wordhead'), w = st.word;
    if (w) {
      const syl = M.syllables(w.h).map(s => `<i>${s.ch} = ${s.cho}+${s.jung}${s.jong ? '+' + s.jong : ''}</i>`).join('');
      const autoBadge = w.gloss_auto ? ` <span class="badge-auto">${esc(t('gloss_auto_badge'))}</span>` : '';
      wh.innerHTML = `<div class="syl" aria-hidden="true">${esc(w.h[0])}</div><div><div class="wh" lang="ko">${esc(w.h)}</div><div class="wm">${esc(mean(w))}${autoBadge} <span class="wr">· ${esc(w.r)}</span></div><div class="ws">${syl}</div></div><button type="button" class="say" data-say="${esc(w.h)}" aria-label="${t('listen')}" title="${t('listen_hint')}">${SPEAKER}</button>`;
      wh.hidden = false;
    } else wh.hidden = true;
    // slots (word slot + its particle slot stay together)
    const row = $('#slots'); row.innerHTML = '';
    let pair = null; const act = activeP();
    const bad = badPair();
    st.tpl.slots.forEach((k, idx) => {
      if ((k === 'S' || k === 'SP') && st.tense === 'please') return; // request form has no subject
      const s = el('div', 'slot ' + (isP(k) ? 'slot-p' : 'slot-w'));
      if (isP(k)) {
        const j = st.judges[k];
        s.classList.add(j && st.picks[k] ? j.grade : 'empty'); if (k === act) s.classList.add('active');
        const lab = k === 'CP' ? t('slot_CP') : t('slot_SP');
        s.appendChild(el('span', 'slot-l', lab));
        const shown = st.picks[k] === '∅' ? t('none_label') : k === 'CP' ? connLab(st.picks[k]) : st.picks[k];
        const b = el('button', 'slot-v', `<b>${st.picks[k] ? esc(shown) : '?'}</b>`); b.type = 'button'; b.setAttribute('aria-label', lab); b.onclick = () => { st.active = k; renderBuilder(); };
        s.appendChild(b);
      } else {
        const key = pickKey(k), item = key ? st.picks[key] : null, isV = isVerbSlot(k) || k === 'A' || k === 'A1' || k.startsWith('AF:');
        const labKey = k === 'A1' || k.startsWith('AF:') ? 'A' : k === 'O2' ? 'O' : k === 'QD' || k === 'QO' ? 'Q' : isVerbSlot(k) ? 'V' : k;
        s.appendChild(el('span', 'slot-l', k.startsWith('FIX:') ? '' : t('slot_' + labKey)));
        let vf = '';
        if (item && isV) {
          if (k === 'V1' || k === 'A1') vf = st.picks.CP ? (item[st.picks.CP] || '—') : M.stemOf(item) + '-';
          else if (k.startsWith('VF:') || k.startsWith('AF:')) vf = M.verbForm(item, k.slice(3)) || '—';
          else vf = (k === 'NV' || k === 'NV2' ? '안 ' : k === 'MV' ? '못 ' : '') + (M.verbForm(item, k === 'VW' ? 'want' : st.tense) || '—');
        }
        if (bad && (pickKey(bad.v) === key || bad.o === key)) s.classList.add('bad');
        const fixed = k.startsWith('FIX:') || k.startsWith('AUX:') || k === 'QD' || k === 'QO';
        const b = el('button', 'slot-v' + (fixed ? ' fixed' : ''), k.startsWith('FIX:') ? `<b lang="ko">${esc(k.slice(4))}</b><small>${esc(t('fix_' + k.slice(4)))}</small>` : item ? `<b lang="ko">${esc(isV ? vf : item.h)}</b><small>${esc(mean(item).replace(/^to /, ''))}</small>` : t('pick'));
        b.type = 'button'; if (fixed) b.disabled = true; else b.onclick = () => openPicker(k, s);
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
      const d = el('div', 'why ' + j.grade, `<b>${esc(pk === 'CP' ? connLab(j.choice) : j.choice)}</b><span class="tag">${t(j.grade === 'ok' ? 'correct' : j.grade === 'soft' ? 'soft' : 'wrong')}</span><p>${esc(j.why)}</p>`);
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
    const bp = badPair();
    if (!st.incompat || !bp) { box.hidden = true; box.innerHTML = ''; return; }
    const o = st.picks[bp.o], vk = pickKey(bp.v), v = st.picks[vk];
    const verbs = M.verbsFor(st.tpl, D.words, st.tense, bp.v === 'V1' ? 'V1' : undefined).filter(x => M.compatible(x, o) && !x.to).slice(0, 5);
    box.innerHTML = `<div class="ph"><span>✗ ${t('incompat_h')}</span></div><p class="pn">${esc(t('incompat_p', { o: o.h, v: v.h }))}</p><div class="p-opts"></div><p class="pn">${esc(t('incompat_p2', { o: o.h, v: mean(v).replace(/^to /, '') }))}</p>`;
    const opts = $('.p-opts', box);
    verbs.forEach(x => { const b = el('button', 'p-opt', `${esc(M.verbForm(x, st.tense) || x.pres)}`); b.type = 'button'; b.onclick = () => setPick(vk, x); opts.appendChild(b); });
    if (!verbs.length) opts.remove();
    box.hidden = false;
  }
  // The particle panel asks for one slot at a time.
  function renderPanel(pk) {
    const pp = $('#ppanel');
    if (!pk || (!st.picks.S && st.tpl.slots.includes('S'))) { pp.hidden = true; pp.innerHTML = ''; return; }
    const slots = st.tpl.slots, nounKey = slots[slots.indexOf(pk) - 1], noun = st.picks[nounKey];
    const spec = M.pspec(st.tpl, pk), opts = spec.options, j = st.judges[pk];
    if (pk === 'CP') {
      // connective quiz: each option is a real ending; the small line under it shows the verb in that form
      pp.innerHTML = `<div class="ph"><span>${t('conn_h')}</span><small>${t('conn_hint')}</small></div><div class="p-opts conn"></div><p class="pn" lang="ko">${noun ? esc(M.stemOf(noun)) + '- + ?' : ''}</p>`;
      const box = $('.p-opts', pp);
      opts.forEach(c => { const b = el('button', 'p-opt' + (j && j.choice === c ? ' on ' + j.grade : ''), `${esc(connLab(c))}<small lang="ko">${noun && noun[c] ? esc(noun[c]) : ''}</small>`); b.type = 'button'; b.onclick = () => setParticle(pk, c); box.appendChild(b); });
      pp.hidden = false; return;
    }
    const hk = { time: 'particle_time_h', have: 'particle_have_h', with: 'particle_with_h', to: 'particle_to_h', to_hon: 'particle_to_h', qplace: 'particle_qplace_h', qobj: 'particle_qobj_h', like: 'particle_like_h', pref: 'particle_pref_h' }[spec.expect];
    const head = pk === 'SP' ? t('particle_topic_h') : hk ? t(hk, { w: noun ? noun.h : '' }) : t('particle_obj_h', { w: noun ? noun.h : '' });
    pp.innerHTML = `<div class="ph"><span>${head}</span><small>${pk === 'SP' ? t('particle_hint_topic') : hk ? '' : t('particle_hint_obj')}</small></div><div class="p-opts"></div><p class="pn" lang="ko">${noun ? esc(noun.h) + ' + ?' : ''}</p>`;
    const box = $('.p-opts', pp);
    opts.forEach(p => { const b = el('button', 'p-opt' + (j && j.choice === p ? ' on ' + j.grade : '') + (p === '∅' ? ' none' : ''), p === '∅' ? t('none_label') : p); b.type = 'button'; b.onclick = () => setParticle(pk, p); box.appendChild(b); });
    pp.hidden = false;
  }
  function renderPreview() {
    const pv = $('#preview');
    if (!st.picks.S && st.tpl.slots.includes('S')) { pv.className = 'preview'; pv.innerHTML = `<p class="cap">✦ ${t('taking_shape')}</p><p class="gloss">${t('two_particles')}</p>`; return; }
    const a = M.assemble(st.tpl, Object.assign({}, st.picks, { tense: st.tense }));
    const done = complete() && !a.incomplete;
    const unrev = Object.values(st.picks).some(x => x && x.free);
    const hasAuto = Object.values(st.picks).some(x => x && x.gloss_auto);
    const autoBadge = hasAuto ? ` <span class="badge-auto">${esc(t('gloss_auto_badge'))}</span>` : '';
    // Unchosen particles render as a blank so the sentence takes shape while the learner works.
    const html = a.chunks.map((c, i) => {
      const pkey = c.kind === 'S' ? 'SP' : NOUN_KEYS.includes(c.kind) ? st.tpl.slots[st.tpl.slots.indexOf(c.kind) + 1] : null;
      const blank = (pkey && st.picks[pkey] == null) || c.blank;
      const text = blank ? `${esc(c.blank ? M.stemOf(c.word) : c.word.h)}<u>&nbsp;&nbsp;</u>` : esc(c.text);
      return `${i ? (done ? '<span class="sp" aria-hidden="true">⎵</span>' : '<span class="sp" aria-hidden="true">&nbsp;</span>') : ''}<span class="ck ck-${c.kind}"><span lang="ko">${text}</span><small lang="${LANG}">${done && !c.tail ? esc(chunkGloss(c)) : '&nbsp;'}</small></span>`;
    }).join('') + (a.end ? `<span class="ck"><span>${a.end}</span><small>&nbsp;</small></span>` : '');
    pv.className = 'preview' + (done ? ' done' : '');
    pv.innerHTML = `<p class="cap">✦ ${done ? (unrev ? t('unreviewed') : t('done_line')) : t('taking_shape')}</p><p class="big">${html}</p>` +
      (done ? `<p class="gloss">${esc(gloss(a))}${autoBadge}</p><div class="acts"><button type="button" class="btn ghost" id="say">${SPEAKER} ${t('say')}</button><button type="button" class="btn" id="add">${t('add')}</button></div>` : `<p class="gloss">${t('two_particles')}</p>`);
    if (done) { $('#say').onclick = () => speak(a.text); $('#add').onclick = () => addToTray(a); if (st.tray.some(x => x.text === a.text)) { $('#add').textContent = t('added'); $('#add').disabled = true; } }
    renderReorder(done ? a : null);
  }
  // One-word meaning under each chunk: shows the SOV mapping without pretending to be a translation.
  function chunkGloss(c) {
    const w = c.word;
    if (!w) return c.kind === 'N' ? (LANG === 'ja' ? '（否定）' : LANG === 'vi' ? 'không' : 'not') : c.kind === 'M' ? (LANG === 'ja' ? '（不可能）' : LANG === 'vi' ? 'không thể' : "can't") : c.kind === 'X' ? t('fix_' + c.text) : '';
    const ctx = clauseCtx(c.kind === 'V' && st.tpl.slots.includes('V2') && w === st.picks.V2 ? 2 : 1);
    if (c.kind === 'V' || c.kind === 'A') {
      if (c.kind === 'V' && w === st.picks.AUX) return LANG === 'ja' ? '行きます' : LANG === 'vi' ? 'đi' : 'go';
      const vf = st.tpl.slots.find(k => k.startsWith('VF:'));
      if (vf && w === st.picks.V) return moodShort(vf.slice(3), w);
      const af = st.tpl.slots.find(k => k.startsWith('AF:'));
      if (c.kind === 'A' && af) { const adj = w.en_adj || M_EN(w); if (af === 'AF:geodeunyo') return LANG === 'ja' ? (w.ja_pres || '').split('／')[0].replace(/です$/, 'んです') + 'よ' : LANG === 'vi' ? M_VI(w) + ' mà' : 'am ' + adj + ', you see'; return LANG === 'ja' ? (w.ja_pres || '').split('／')[0] + 'ね' : LANG === 'vi' ? M_VI(w) + ' nhỉ' : 'is ' + adj + '!'; }
      return LANG === 'ja' ? (predJa(c.kind, w, true, ctx) || '') : LANG === 'vi' ? ((ctx.exist || w.honexist) && w.exist ? (w.h === '없다' ? 'không ở' : 'ở') : predVi(c.kind, w, ctx)) : predEn(c.kind, w, st.picks.S && st.tense !== 'please' ? M_EN(st.picks.S) : 'you', true, ctx);
    }
    if (c.kind === 'V1' || c.kind === 'A1') return connShort(c.kind === 'A1' ? 'A' : 'V', w);
    const base = (LANG === 'en' && w.en_g) || mean(w).replace(/ ?[（(].*?[)）]$/, '');
    if (c.kind === 'REF') return base;
    if (c.kind === 'POS') return LANG === 'ja' ? 'の' + w.ja + 'に' : LANG === 'vi' ? w.vi : w.en_g;
    if (c.kind === 'QD') return LANG === 'ja' ? 'どこ' + (c.particle === '에서' ? 'で' : 'に') : LANG === 'vi' ? (c.particle === '에서' ? 'ở đâu' : 'đâu') : 'where';
    if (c.kind === 'QO') return LANG === 'ja' ? '何を' : LANG === 'vi' ? 'gì' : 'what';
    if (c.particle === '도') return LANG === 'ja' ? base + 'も' : LANG === 'vi' ? (c.kind === 'S' ? base + ' cũng' : 'cả ' + base) : base + ' too';
    if (c.particle === '만') return LANG === 'ja' ? base + 'だけ' : LANG === 'vi' ? 'chỉ ' + base : 'only ' + base;
    if (c.particle === '이나' || c.particle === '나') return LANG === 'ja' ? base + 'か' : LANG === 'vi' ? base + ' hoặc' : base + ' or';
    if (LANG === 'vi') { const vp = { '에': c.kind === 'T' ? 'vào ' : c.kind === 'D' ? 'đến ' : 'ở ', '에서': 'ở ', '와': 'với ', '과': 'với ', '하고': 'với ', '에게': 'cho ', '한테': 'cho ', '께': 'cho ' }[c.particle] || ''; return (c.kind === 'T' && !c.particle ? '' : vp) + base; }
    if (LANG === 'ja') { const jp = { '은': 'は', '는': 'は', '이': 'が', '가': 'が', '께서': 'が', '을': '를', '를': '를', '에': 'に', '에서': 'で', '와': 'と', '과': 'と', '하고': 'と', '에게': 'に', '한테': 'に', '께': 'に' }[c.particle] || ''; const v = verbFor(c.kind); return base + ((c.kind === 'O' || c.kind === 'O2') && v && v.ja_p ? v.ja_p : jp); }
    if (c.kind === 'T') return c.particle ? ({ '아침': 'in the morning', '저녁': 'in the evening', '밤': 'at night', '점심': 'at lunch' }[w.h] || 'on ' + base) : base;
    if (c.kind === 'W') return 'with ' + base; if (c.kind === 'R') return 'to ' + base; if (c.kind === 'H') return base;
    return c.kind === 'D' ? (w.h === '집' ? 'home' : 'to ' + base) : c.kind === 'L' ? (st.tpl.id === 'live' || st.tpl.id === 'became' ? 'in ' : 'at ') + base : base;
  }
  // Clause context for the predicate helpers: which clause (1 = before the connective, 2 = after / the only one), its tense, negation, object.
  function clauseCtx(n) {
    const two = st.tpl.slots.includes('CP');
    const slots = st.tpl.slots, cut = slots.indexOf('CP');
    const inClause = k => !two || (n === 1 ? slots.indexOf(k) < cut : slots.indexOf(k) > cut);
    const O = inClause('O') ? st.picks.O : inClause('O2') ? st.picks.O2 : null;
    const isVFPlease = (two && n === 2 && slots.includes('VF:please')) || (!two && slots.includes('VF:please'));
    const tense = isVFPlease ? 'please' : st.tense;
    return { tense, neg: st.tpl.id === 'neg' || (n === 2 && slots.includes('NV2')), cant: st.tpl.id === 'cant', have: st.tpl.id === 'have' || (two && n === 1 && slots.includes('H')), pref: st.tpl.id === 'pref', exist: st.tpl.id === 'exist' || st.tpl.id === 'location', O };
  }
  // Japanese predicate: stored polite forms (ja_pres/ja_past/ja_want), never derived from the dictionary label.
  function predJa(kind, w, short, ctx) {
    ctx = ctx || clauseCtx(2);
    const isPast = ctx.tense === 'past' || ctx.tense === 'formal_past';
    if (w.h === '오다' && st.picks.S && st.picks.S.h === '비') return isPast ? '降りました' : '降ります';
    if (kind === 'A') return ctx.pref ? (isPast ? '好きでした' : '好きです') : isPast ? w.ja_past : w.ja_pres;
    if (ctx.neg) return isPast ? (w.ja_neg_past || null) : (w.ja_neg || null);
    if (ctx.cant) return isPast ? (w.ja_can ? w.ja_can.replace(/できます$/, 'できませんでした').replace(/ます$/, 'ませんでした') : null) : (w.ja_can ? w.ja_can.replace(/できます$/, 'できません').replace(/ます$/, 'ません') : null);
    if (ctx.have) return w.h === '없다' ? (isPast ? 'ありませんでした' : 'ありません') : (isPast ? 'ありました' : 'あります');
    if (w.honexist) return isPast ? 'いらっしゃいました' : 'いらっしゃいます';
    if (ctx.exist && (w.h === '있다' || w.h === '없다')) { const S = st.picks.S; const live = S && (S.kind === 'person' || S.kind === 'animal'); return w.h === '없다' ? (live ? 'いません' : 'ありません') : live ? (isPast ? 'いました' : 'います') : (isPast ? 'ありました' : 'あります'); }
    const map = { pres: w.ja_pres, formal: w.ja_pres, past: w.ja_past, formal_past: w.ja_past, want: w.ja_want, fut: w.ja_fut, can: w.ja_can, must: w.ja_must, please: w.ja_please };
    return map[ctx.tense] || null;
  }
  // Vietnamese predicate: no conjugation; tense/mood particles before the verb.
  function predVi(kind, w, ctx) {
    ctx = ctx || clauseCtx(2);
    const base = w.h === '가져가다' ? 'mang' : (w.vi || mean(w)).replace(/ \(.*\)$/, '').split(' / ')[0];
    const isPast = ctx.tense === 'past' || ctx.tense === 'formal_past';
    if (kind === 'A') return ctx.pref ? (isPast ? 'đã thích' : 'thích') : (isPast ? 'đã ' : '') + base;
    if (ctx.have) return w.h === '없다' ? 'không có' : 'có';
    if (ctx.cant) return (isPast ? 'đã ' : '') + 'không thể ' + base;
    if (ctx.exist || w.honexist) return (isPast ? 'đã ' : '') + (w.h === '없다' ? 'không' : ''); // the place phrase carries ở
    const neg = ctx.neg ? 'không ' : '';
    const pre = { pres: '', formal: '', past: 'đã ', formal_past: 'đã ', want: 'muốn ', fut: 'sẽ ', can: 'có thể ', must: 'phải ', please: 'hãy ' }[ctx.tense] || '';
    return pre + neg + base;
  }
  // English predicate with agreement, from stored en_base/en_3s/en_past.
  const PLURAL = /^(clothes|shoes|glasses|flowers|vegetables|eggs|strawberries|the news)$/;
  function enForms(w, O) {
    const doForms = w.h === '하다' && O && O.en_do ? O.en_do : null; // 운동을 해요 → exercise
    const base = doForms ? doForms[0] : (w.en_base || mean(w).replace(/^to /, ''));
    return { base, s3: doForms ? doForms[1] : (w.en_3s || base), past: doForms ? doForms[2] : (w.en_past || base), doForms };
  }
  const ing = b => b.replace(/^(\w+)/, v => /ee$/.test(v) ? v + 'ing' : /e$/.test(v) ? v.slice(0, -1) + 'ing' : /^(get|sit|run|swim|shop)$/.test(v) ? v + v.slice(-1) + 'ing' : v + 'ing');
  function predEn(kind, w, S, short, ctx) {
    ctx = ctx || clauseCtx(2);
    const isPast = ctx.tense === 'past' || ctx.tense === 'formal_past';
    const first = S === 'I' || S === 'we', plural = PLURAL.test(S) || S === 'we' || S === 'you';
    if (kind === 'A' && ctx.pref) return short ? 'like' : (isPast ? 'liked' : (first || plural ? 'like' : 'likes'));
    if (kind === 'A') { const be = isPast ? (first || !plural ? 'was' : 'were') : (first ? 'am' : plural ? 'are' : 'is'); return short ? (w.en_adj || mean(w).replace(/^to be /, '')) : `${be} ${w.en_adj || mean(w).replace(/^to be /, '')}`; }
    const { base, s3, past } = enForms(w, ctx.O);
    if (ctx.have && w.en_have) return isPast ? w.en_have[2] : (first || plural ? w.en_have[0] : w.en_have[1]);
    if (ctx.neg) return isPast ? "didn't " + base : (first || plural ? "don't " : "doesn't ") + base;
    if (ctx.cant) return (isPast ? "couldn't " : "can't ") + base;
    if (ctx.tense === 'want') return (first || plural ? 'want to ' : 'wants to ') + base;
    if (ctx.tense === 'fut') return 'will ' + base;
    if (ctx.tense === 'can') return 'can ' + base; if (ctx.tense === 'must') return (first || plural ? 'have to ' : 'has to ') + base; if (ctx.tense === 'please') return 'please ' + base;
    if (w.h === '있다' || w.h === '없다' || w.honexist) { const be = isPast ? (plural ? 'were' : 'was') : (first ? 'am' : plural ? 'are' : 'is'); return short ? (w.h === '없다' ? be + ' not at' : be + ' at') : (w.h === '없다' ? be + ' not' : be); }
    if (isPast) return past;
    return first || plural ? base : s3;
  }
  // ---- sentence-level gloss: one clause, two clauses joined by the chosen connective, or a mood frame (-(으)러 가요, -지 마세요 …) ----
  const M_EN = x => x ? ((LANG === 'en' && x.en_g) || mean(x)).replace(/^to /, '').replace(/ ?[（(].*?[)）]$/, '') : '';
  const M_VI = x => x ? (x.vi || mean(x)).replace(/ \(.*\)$/, '') : '';
  const M_JA = x => x ? mean(x).replace(/ ?[（(].*?[)）]$/, '').split(/[・／]/)[0] : '';
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const JA_TIME = { '아침': 'に', '저녁': 'に', '밤': 'に', '점심': 'に' };
  // nouns of a clause with their meaning-language particles; S handled by the caller
  function clauseNouns(lang, p, ctx) {
    const out = [];
    const V = p.V;
    if (lang === 'ja') {
      if (p.T) out.push(M_JA(p.T) + (p.T.tp === 'none' ? '' : 'に'));
      if (p.W) out.push(M_JA(p.W) + 'と'); if (p.R) out.push(M_JA(p.R) + 'に'); if (p.H) out.push(M_JA(p.H) + 'が');
      if (p.REF && p.POS) out.push(M_JA(p.REF) + 'の' + p.POS.ja + 'に');
      if (p.L) out.push(M_JA(p.L) + (V && V.locBoth ? 'に' : st.tpl.op === 'loc' || st.tpl.op2 === 'loc' ? 'で' : 'に'));
      if (p.D) out.push(M_JA(p.D) + 'に');
      if (p.QD) out.push('どこ' + (p.QP === '에서' ? 'で' : 'に')); if (p.QO) out.push('何を');
      if (p.O && !(V && V.h === '하다' && p.O.ja_do)) {
        if (st.tpl.id === 'or' && p.O2) out.push(M_JA(p.O) + 'か' + M_JA(p.O2) + (V && V.ja_p ? V.ja_p : 'を'));
        else out.push(M_JA(p.O) + (V && V.ja_p ? V.ja_p : 'を'));
      }
      return out;
    }
    if (lang === 'vi') {
      if (p.H) out.push(M_VI(p.H));
      if (p.O && !(V && V.h === '드시다' && p.O.h === '진지')) {
        if (st.tpl.id === 'or' && p.O2) out.push(M_VI(p.O) + ' hoặc ' + M_VI(p.O2));
        else if (V && V.h === '가져가다') out.push(M_VI(p.O) + ' theo');
        else out.push(M_VI(p.O));
      }
      if (p.QO) out.push('gì');
      if (p.R) out.push('cho ' + M_VI(p.R)); if (p.W) out.push('với ' + M_VI(p.W));
      if (p.D) out.push(p.D.h === '집' ? 'về nhà' : 'đến ' + M_VI(p.D)); if (p.QD) out.push(p.QP === '에서' || (V && (V.locBoth || V.at)) ? 'ở đâu' : 'đâu');
      if (p.REF && p.POS) out.push(M_VI(p.POS) + ' ' + M_VI(p.REF));
      if (p.L) out.push('ở ' + M_VI(p.L));
      if (p.T) out.push(p.T.tp === 'none' ? M_VI(p.T) : 'vào ' + M_VI(p.T));
      return out;
    }
    if (p.H) out.push(M_EN(p.H));
    if (p.O && !(V && V.h === '하다' && p.O.en_do)) {
      if (st.tpl.id === 'or' && p.O2) out.push(M_EN(p.O) + ' or ' + M_EN(p.O2));
      else out.push(M_EN(p.O));
    }
    if (p.R) out.push('to ' + M_EN(p.R)); if (p.W) out.push('with ' + M_EN(p.W));
    if (p.D) out.push(p.D.h === '집' ? 'home' : 'to ' + M_EN(p.D));
    if (p.REF && p.POS) out.push(p.POS.en_g + ' ' + M_EN(p.REF));
    if (p.L) out.push((st.tpl.id === 'live' || st.tpl.id === 'became' ? 'in ' : 'at ') + M_EN(p.L));
    if (p.T) out.push(p.T.tp === 'none' ? M_EN(p.T) : ({ '아침': 'in the morning', '저녁': 'in the evening', '밤': 'at night', '점심': 'at lunch' }[p.T.h] || 'on ' + M_EN(p.T)));
    return out;
  }
  // picks that belong to clause n (1 = before CP, 2 = after CP or the whole frame)
  function clausePicks(n) {
    const slots = st.tpl.slots, cut = slots.indexOf('CP'), p = {};
    for (const k of ['O', 'D', 'L', 'T', 'H', 'W', 'R', 'O2', 'REF', 'POS', 'QD', 'QO']) {
      if (!st.picks[k]) continue;
      if (cut < 0 || (n === 1 ? slots.indexOf(k) < cut : slots.indexOf(k) > cut)) {
        if (st.tpl.id === 'or' && k === 'O2') p.O2 = st.picks.O2;
        else p[k === 'O2' ? 'O' : k] = st.picks[k];
      }
    }
    p.QP = st.picks.QP;
    p.V = cut < 0 ? st.picks.V : n === 1 ? st.picks.V1 : (st.picks.V2 || st.picks.V);
    p.A = cut < 0 ? st.picks.A : n === 1 ? st.picks.A1 : null;
    return p;
  }
  const VI_DO = {
    '요리': 'nấu ăn',
    '태권도': 'tập taekwondo',
    '운동': 'tập thể thao',
    '수영': 'bơi lội',
    '야구': 'chơi bóng chày',
    '축구': 'chơi bóng đá',
    '게임': 'chơi trò chơi',
    '춤': 'nhảy múa',
    '숙제': 'làm bài tập về nhà',
    '여행': 'đi du lịch'
  };
  // "I drink coffee" / "私はコーヒーを飲みます" / "tôi uống cà phê" — one clause, optional subject, no final punctuation
  function clauseGloss(lang, n, withS) {
    const p = clausePicks(n), ctx = clauseCtx(n);
    const slots = st.tpl.slots, cut = slots.indexOf('CP');
    const isPlease = ctx.tense === 'please' || st.tense === 'please';
    let S = null;
    if (!isPlease && st.picks.S) {
      if (cut < 0) {
        S = st.picks.S;
      } else if (n === 1) {
        S = slots.indexOf('S') < cut ? st.picks.S : null;
      } else {
        const sInClause2 = slots.indexOf('S') > cut;
        if (sInClause2) S = st.picks.S;
        else if (st.picks.S.h !== '비' && !slots.includes('VF:please')) S = st.picks.S;
      }
    }
    const sp = st.picks.SP, op = st.picks.OP, aux = x => x === '도' || x === '만';
    if (aux(sp) || aux(op)) { // 도/만 frame: mark also/only on the subject or the object
      if (lang === 'ja') { const Sj = withS && S ? M_JA(S) + (sp === '도' ? 'も' : sp === '만' ? 'だけ' : 'は') : ''; const Oj = p.O ? M_JA(p.O) + (op === '도' ? 'も' : op === '만' ? 'だけ' : (p.V && p.V.ja_p ? p.V.ja_p : 'を')) : ''; return Sj + Oj + (predJa('V', p.V, false, ctx) || ''); }
      if (lang === 'vi') return [withS && S ? M_VI(S) : '', sp === '도' ? 'cũng' : sp === '만' || op === '만' ? 'chỉ' : '', predVi('V', p.V, ctx), op === '도' ? 'cả' : '', p.O ? M_VI(p.O) : ''].filter(Boolean).join(' ');
      const Se = S ? M_EN(S) : ''; const V = predEn('V', p.V, Se || 'you', false, ctx);
      return [withS ? Se : '', sp === '도' ? 'too' : '', sp === '만' ? 'alone' : '', V, op === '만' ? 'only' : '', p.O ? M_EN(p.O) : '', op === '도' ? 'too' : ''].filter(Boolean).join(' ').replace(/^(\S+) too /, '$1, too, ');
    }
    // C2: or + 하다 connects both activities idiomatically
    if (st.tpl.id === 'or' && p.V && p.V.h === '하다' && p.O && p.O2) {
      if (lang === 'ja') {
        const Sj = withS && S ? M_JA(S) + (st.judges.SP && st.judges.SP.choice && /^(이|가|께서)$/.test(st.judges.SP.choice) ? 'が' : 'は') : '';
        const d1 = (p.O.ja_do || (M_JA(p.O) + 'をする')).replace(/します$/, 'をする').replace(/ぎます$/, 'ぐ').replace(/ります$/, 'る');
        const isPast = ctx.tense === 'past' || ctx.tense === 'formal_past';
        const v2 = (p.O2.ja_do || (M_JA(p.O2) + 'をします')).replace(/します$/, isPast ? 'しました' : 'します').replace(/ぎます$/, isPast ? 'ぎました' : 'ぎます').replace(/ります$/, isPast ? 'りました' : 'ります');
        return Sj + d1 + 'か' + v2;
      }
      if (lang === 'vi') {
        const Sv = withS && S ? M_VI(S) : '';
        const isPast = ctx.tense === 'past' || ctx.tense === 'formal_past';
        const v1 = (isPast ? 'đã ' : '') + (VI_DO[p.O.h] || M_VI(p.O));
        const v2 = VI_DO[p.O2.h] || M_VI(p.O2);
        return [Sv, v1, 'hoặc', v2].filter(Boolean).join(' ');
      }
      const Se = S ? M_EN(S) : '';
      const isPast = ctx.tense === 'past' || ctx.tense === 'formal_past';
      const first = Se === 'I' || Se === 'we', plural = PLURAL.test(Se) || Se === 'we' || Se === 'you';
      const s3 = !first && !plural && Boolean(Se);
      const f1 = enForms(p.V, p.O), f2 = enForms(p.V, p.O2);
      const v1 = isPast ? f1.past : (s3 ? f1.s3 : f1.base);
      const v2 = isPast ? f2.past : (s3 ? f2.s3 : f2.base);
      return [withS ? Se : '', v1, 'or', v2].filter(Boolean).join(' ');
    }
    if (lang === 'ja') {
      const V = p.A ? predJa('A', p.A, false, ctx) : (p.V ? predJa('V', p.V, false, ctx) : '');
      if (V === null) return null;
      const jaDo = p.V && p.V.h === '하다' && p.O && p.O.ja_do && ctx.tense === 'pres' && !ctx.neg;
      const Sj = withS && S ? M_JA(S) + (st.judges.SP && st.judges.SP.choice && /^(이|가|께서)$/.test(st.judges.SP.choice) ? 'が' : 'は') : '';
      return Sj + clauseNouns('ja', p, ctx).join('') + (jaDo ? p.O.ja_do : V);
    }
    if (lang === 'vi') {
      if (withS && S && S.h === '비' && p.V && p.V.h === '오다') return 'trời mưa';
      const V = p.A ? predVi('A', p.A, ctx) : (p.V ? predVi('V', p.V, ctx) : '');
      return [withS && S ? M_VI(S) : '', V, ...clauseNouns('vi', p, ctx)].filter(Boolean).join(' ');
    }
    if (withS && S && S.h === '비' && p.V && p.V.h === '오다') {
      return (ctx.tense === 'past' || ctx.tense === 'formal_past') ? "it rained" : "it's raining";
    }
    const Se = S ? M_EN(S) : '';
    const V = p.A ? predEn('A', p.A, Se, false, ctx) : (p.V ? predEn('V', p.V, Se || 'you', false, ctx) : '');
    return [withS ? Se : '', V, ...clauseNouns('en', p, ctx)].filter(Boolean).join(' ');
  }
  // Japanese predicate classes: verb / i-adjective / na-adjective / ない — plain-form morphology differs per class, so never derive
  // conditionals from the て form blindly (きれいで → きれいだったら, 忙しくて → 忙しかったら, なくて → なかったら).
  const jaClass = w => { const d = (w.ja_dict || '').split('／')[0]; return /ない$/.test(d) ? 'nai' : /だ$/.test(d) ? 'na' : (w.fits && /い$/.test(d)) ? 'i' : 'v'; };
  const jaTa = (w) => { const d = (w.ja_dict || '').split('／')[0], te = (w.ja_te || '').split('／')[0]; const k = jaClass(w);
    return k === 'nai' ? d.replace(/ない$/, 'なかった') : k === 'na' ? d.replace(/だ$/, 'だった') : k === 'i' ? d.replace(/이$/, 'かった') : te.replace(/て$/, 'た').replace(/で$/, 'だ'); };
  const jaAttr = (w) => { const d = (w.ja_dict || '').split('／')[0]; return jaClass(w) === 'na' ? d.replace(/だ$/, 'な') : d; }; // 好きな / 食べる / 忙しい / ない
  // predicate in the connective form, per language (for the V1/A1 chunk line and the two-clause gloss)
  function connPred(lang, kind, w, conn) {
    if (lang === 'ja') {
      if (w.h === '오다' && st.picks.S && st.picks.S.h === '비') {
        return { go: '降って', eoseo: '降るので', nika: '降るから', jiman: '降るが', neunde: '降るけれど', myeon: '降ったら', lttae: '降るとき' }[conn] || '降る';
      }
      const d = (w.ja_dict || w.ja || '').split('／')[0], te = (w.ja_te || '').split('／')[0], stem = (w.ja_stem || '').split('／')[0], pres = (w.ja_pres || '').split('／')[0], at = jaAttr(w);
      return { go: te, eoseo: at + 'ので', nika: at + 'から', jiman: pres + 'が', neunde: (kind === 'A' ? pres + 'が' : at + 'けれど'), myeon: jaTa(w) + 'ら', lttae: at + 'とき', gi_jeone: d + '前に', n_hue: jaTa(w) + '後で', myeonseo: stem + 'ながら', ttaemun: at + 'ので' }[conn] || d;
    }
    if (lang === 'vi') return kind === 'A' ? M_VI(w) : M_VI(w);
    return kind === 'A' ? (w.en_adj || M_EN(w)) : enForms(w, null).base;
  }
  function connShort(kind, w) {
    const c = st.picks.CP; if (!c) return '';
    if (LANG === 'ja') return connPred('ja', kind, w, c);
    const base = connPred(LANG, kind, w, c);
    if (LANG === 'vi') return ({ go: base + ' rồi', eoseo: base + ' nên', nika: 'vì ' + base + ' nên', jiman: base + ' nhưng', neunde: base + ' nhưng', myeon: 'nếu ' + base, lttae: 'khi ' + base, gi_jeone: 'trước khi ' + base, n_hue: 'sau khi ' + base, myeonseo: 'vừa ' + base, ttaemun: 'vì ' + base })[c] || base;
    return ({ go: base + ' and', eoseo: base + ', so', nika: 'since … ' + base, jiman: base + ', but', neunde: base + ', but', myeon: 'if … ' + base, lttae: 'when … ' + base, gi_jeone: 'before ' + ing(base), n_hue: 'after ' + ing(base), myeonseo: 'while ' + ing(base), ttaemun: 'because … ' + base })[c] || base;
  }
  // short gloss for a mood-ending predicate chunk (-(으)러 · -지 마세요 · -(으)ㄹ까요? …)
  function moodShort(key, w) {
    const b = enForms(w, st.picks.O).base;
    if (LANG === 'ja') { const d = (w.ja_dict || '').split('／')[0], te = (w.ja_te || '').split('／')[0], stem = (w.ja_stem || '').split('／')[0], nai = w.ja_nai || ''; return { janayo: d.replace(/だ$/, '') + 'じゃないですか', reo: stem + 'に', jimaseyo: nai + 'でください', kkayo: stem + 'ましょうか', bwasseoyo: te + 'みました', jeok: jaTa(w) + 'ことがあります', geotgatayo: jaAttr(w) + 'ようです', plain: d, ryeogo: d + 'つもりです', giro: d + 'ことにしました', yagesseoyo: nai + 'といけませんね', gedoeda: d + 'ことになりました' }[key] || d; }
    const v = M_VI(w).split(' / ')[0];
    if (LANG === 'vi') return { janayo: v + ' mà', reo: 'để ' + v, jimaseyo: 'đừng ' + v, kkayo: v + ' nhé?', bwasseoyo: 'đã thử ' + v, jeok: 'đã từng ' + v, geotgatayo: 'hình như ' + v, plain: v, ryeogo: 'định ' + v, giro: 'đã quyết định ' + v, yagesseoyo: 'phải ' + v + ' thôi', gedoeda: 'đã chuyển sang ' + v }[key] || v;
    return { janayo: b + ', you know', reo: 'to ' + b, jimaseyo: "don't " + b, kkayo: 'shall we ' + b + '?', bwasseoyo: 'have tried ' + ing(b), jeok: 'have been', geotgatayo: 'seem(s) to ' + b, plain: b + ' (written)', ryeogo: 'intend to ' + b, giro: 'decided to ' + b, yagesseoyo: "'d better " + b, gedoeda: 'ended up ' + ing(b) }[key] || b;
  }
  function gloss(a) {
    const p = st.picks, S = p.S && st.tense !== 'please' ? p.S : null, tpl = st.tpl;
    const end = tpl.q ? '?' : '.', jend = tpl.q ? 'か。' : '。';
    const Sen = S ? M_EN(S) : '', first = Sen === 'I', plural = PLURAL.test(Sen);
    const s3 = !first && !plural;
    // two clauses
    if (tpl.slots.includes('CP')) {
      const c = p.CP; if (!c) return '';
      const k1 = p.A1 ? 'A' : 'V', w1 = p.A1 || p.V1;
      if (LANG === 'ja') {
        const c1 = clauseGloss('ja', 1, true), c2 = clauseGloss('ja', 2, false); if (c1 == null || c2 == null) return '';
        const pred1 = p.A1 ? predJa('A', p.A1, false, clauseCtx(1)) : predJa('V', p.V1, false, clauseCtx(1));
        return c1.replace(new RegExp(esc(pred1) + '$'), connPred('ja', k1, w1, c)) + c2 + '。';
      }
      if (LANG === 'vi') {
        const c1s = clauseGloss('vi', 1, true), c1 = clauseGloss('vi', 1, false), c2s = clauseGloss('vi', 2, true), c2 = clauseGloss('vi', 2, false);
        const out = { go: c1s + ' rồi ' + c2, eoseo: c1s + ' nên ' + c2, nika: 'vì ' + c1s + ' nên ' + (c2s || c2), jiman: c1s + ' nhưng ' + c2, neunde: c1s + ' nhưng ' + (c2s || c2), myeon: 'nếu ' + c1 + ', ' + c2s, lttae: 'khi ' + c1 + ', ' + c2s, gi_jeone: 'trước khi ' + c1 + ', ' + c2s, n_hue: 'sau khi ' + c1 + ', ' + c2s, myeonseo: (S ? M_VI(S) + ' ' : '') + 'vừa ' + c1 + ' vừa ' + c2, ttaemun: 'vì ' + c1 + ' nên ' + c2s }[c];
        return cap(out) + '.';
      }
      const c1s = clauseGloss('en', 1, true), c1 = clauseGloss('en', 1, false), c2s = clauseGloss('en', 2, true), c2 = clauseGloss('en', 2, false);
      const g1 = c1.replace(/^(\S+)/, v => ing(v)); // "eating rice"
      const out = { go: c1s + ' and ' + c2, eoseo: c1s + ', so ' + c2s, nika: 'because ' + c1s + ', ' + (c2s || c2), jiman: c1s + ', but ' + c2s, neunde: c1s + ', but ' + c2s, myeon: 'if ' + c1s + ', ' + c2s, lttae: 'when ' + c1s + ', ' + c2s, gi_jeone: 'before ' + g1 + ', ' + c2s, n_hue: 'after ' + g1 + ', ' + c2s, myeonseo: c2s + ' while ' + g1, ttaemun: 'because ' + c1s + ', ' + c2s }[c];
      return cap(out) + '.';
    }
    const af = tpl.slots.find(k => k.startsWith('AF:'));
    if (af === 'AF:geodeunyo' && p.A) { // -거든요: reason the listener didn't know
      if (LANG === 'ja') return M_JA(S) + 'は' + (p.A.ja_pres || '').split('／')[0].replace(/です$/, 'んです') + 'よ。';
      if (LANG === 'vi') return cap(M_VI(S) + ' ' + M_VI(p.A) + ' mà.');
      const be = Sen === 'I' ? 'am' : PLURAL.test(Sen) ? 'are' : 'is'; return cap(Sen + ' ' + be + ' ' + (p.A.en_adj || M_EN(p.A)) + ', you see.');
    }
    if (af && p.A) { // -네요: noticing — S가 A네요
      if (LANG === 'ja') return M_JA(S) + 'が' + (p.A.ja_pres || '').split('／')[0] + 'ね。';
      if (LANG === 'vi') return cap(M_VI(S) + ' ' + M_VI(p.A) + ' nhỉ!');
      const be = PLURAL.test(Sen) ? 'are' : 'is'; return 'Oh, ' + (/^(a|an|the|my) /.test(Sen) ? Sen.replace(/^(a|an) /, 'the ') : 'the ' + Sen) + ' ' + be + ' ' + (p.A.en_adj || M_EN(p.A)) + '!';
    }
    const vf = tpl.slots.find(k => k.startsWith('VF:'));
    if (vf || tpl.q || tpl.id === 'location') {
      const key = vf ? vf.slice(3) : null, V = p.V, O = p.O, D = p.D, L = p.L;
      if (LANG === 'ja') {
        const Sj = S ? M_JA(S) + 'は' : '', Oj = O ? M_JA(O) + (V && V.ja_p ? V.ja_p : 'を') : '', Dj = D ? M_JA(D) + 'に' : '', Lj = L ? M_JA(L) + 'に' : '';
        const pred = V ? moodShort(key, V) : '';
        if (tpl.id === 'location') { const live = S && (S.kind === 'person' || S.kind === 'animal'); return Sj + M_JA(p.REF) + 'の' + p.POS.ja + 'に' + (V.h === '없다' ? (live ? 'いません' : 'ありません') : live ? (st.tense === 'past' ? 'いました' : 'います') : (st.tense === 'past' ? 'ありました' : 'あります')) + '。'; }
        if (tpl.q && !key) { const c = clauseGloss('ja', 2, true); return c == null ? '' : c + 'か。'; }
        if (key === 'reo') return Sj + Dj + Oj + pred + (st.tense === 'past' ? '行きました' : '行きます') + '。';
        if (key === 'kkayo') return '一緒に' + Oj + pred + '。';
        if (key === 'jimaseyo') return Oj + pred + '。';
        if (key === 'gedoeda') return Sj + Lj + pred + '。';
        if (key === 'jeok') return Sj + Dj + pred + '。';
        if (key === 'janayo') return Sj + (O ? M_JA(O) + (V.h === '좋아하다' ? 'が' : (V.ja_p || 'を')) : '') + pred + '。';
        return Sj + Oj + pred + '。';
      }
      if (LANG === 'vi') {
        const Sv = S ? M_VI(S) : '', v = V ? M_VI(V) : '', Ov = O ? M_VI(O) : '', Dv = D ? (D.h === '집' ? 'về nhà' : 'đến ' + M_VI(D)) : '', Lv = L ? 'ở ' + M_VI(L) : '';
        let out;
        if (tpl.id === 'location') out = [Sv, V.h === '없다' ? 'không ở' : 'ở', M_VI(p.POS), M_VI(p.REF)].join(' ');
        else if (tpl.q && !key) out = clauseGloss('vi', 2, true);
        else out = { janayo: [Sv, v, Ov, 'mà'].join(' '), reo: [Sv, 'đi', Dv, 'để', v, Ov].join(' '), jimaseyo: ['xin đừng', v, Ov].join(' '), kkayo: ['chúng ta cùng', v, Ov, 'nhé'].join(' '), bwasseoyo: [Sv, 'đã thử', v, Ov].join(' '), jeok: [Sv, 'đã từng', Dv].join(' '), geotgatayo: ['hình như', Sv, v, Ov].join(' '), plain: [Sv, v, Ov].join(' ') + ' (văn viết)', ryeogo: [Sv, 'định', v, Ov].join(' '), giro: [Sv, 'đã quyết định', v, Ov].join(' '), yagesseoyo: [Sv, 'phải', v, Ov, 'thôi'].join(' '), gedoeda: [Sv, 'đã chuyển sang', v, Lv].join(' ') }[key];
        return cap(out.replace(/\s+/g, ' ').trim()) + end;
      }
      const f = V ? enForms(V, O) : { base: '', s3: '', past: '' }, b = f.base, Oe = O && !f.doForms ? M_EN(O) : '', De = D ? (D.h === '집' ? 'home' : 'to ' + M_EN(D)) : '', Le = L ? 'in ' + M_EN(L) : '';
      const has = s3 ? 'has' : 'have', go = st.tense === 'past' ? 'went' : s3 ? 'goes' : 'go', dos = st.tense === 'past' ? 'did' : s3 ? 'does' : 'do';
      let out;
      if (tpl.id === 'location') { const be = st.tense === 'past' ? (plural ? 'were' : 'was') : (plural ? 'are' : 'is'); out = [Sen, V.h === '없다' ? be + ' not' : be, p.POS.en_g, M_EN(p.REF)].join(' '); }
      else if (tpl.id === 'q_where') out = ['where', dos, Sen, b].join(' ');
      else if (tpl.id === 'q_what') out = ['what', dos, Sen, b].join(' ');
      else out = { janayo: [Sen, s3 ? f.s3 : b, Oe].join(' ') + ', you know', reo: [Sen, go, De, 'to', b, Oe].join(' '), jimaseyo: ["please don't", b, Oe].join(' '), kkayo: ['shall we', b, Oe, 'together'].join(' '), bwasseoyo: [Sen, has, 'tried', ing(b), Oe].join(' '), jeok: [Sen, has, 'been', De].join(' '), geotgatayo: [Sen, s3 ? 'seems' : 'seem', 'to', b, Oe].join(' '), plain: [Sen, s3 ? f.s3 : b, Oe].join(' ') + ' (written style)', ryeogo: [Sen, s3 ? 'intends' : 'intend', 'to', b, Oe].join(' '), giro: [Sen, 'decided to', b, Oe].join(' '), yagesseoyo: [Sen, 'had better', b, Oe].join(' '), gedoeda: [Sen, 'ended up', ing(b), Le].join(' ') }[key];
      return cap(out.replace(/\s+/g, ' ').trim()) + end;
    }
    if (LANG === 'ja') { const c = clauseGloss('ja', 2, true); return c == null ? '' : c + jend; }
    if (LANG === 'vi') return cap(clauseGloss('vi', 2, true)) + end;
    return cap(clauseGloss('en', 2, true)) + end;
  }
  // ---------- reorder quiz: same words, different order — which one still means the same? ----------
  // Korean marks roles with particles, so moving a chunk keeps the meaning; swapping the WORDS under the particles changes it,
  // and the predicate still has to come last. Three options, one is right.
  function reorderOptions(a) {
    const ch = a.chunks.filter(c => !c.tail).map(c => c); if (st.tense === 'please') return null;
    const groups = []; // REF + POS travel together
    for (let i = 0; i < a.chunks.length; i++) { const c = a.chunks[i]; if (c.tail) { groups[groups.length - 1].push(c); continue; } if (c.kind === 'POS' && groups.length && groups[groups.length - 1][0].kind === 'REF') { groups[groups.length - 1].push(c); continue; } groups.push([c]); }
    const isPred = g => ['V', 'A', 'N', 'V1', 'A1', 'X'].includes(g[0].kind);
    const nounGroups = groups.filter(g => !isPred(g)), preds = groups.filter(isPred);
    const sIdx = groups.findIndex(g => g[0].kind === 'S');
    if (sIdx < 0 || nounGroups.length < 2 || st.tpl.slots.includes('CP') || st.tpl.q || st.tpl.slots.some(k => k.startsWith('VF:')) || st.tpl.id === 'or') return null;
    const txt = gs => gs.map(g => g.map(c => c.text).join(' ')).join(' ') + a.end;
    // moved: a non-subject chunk first (기본 어순 앞으로) — same meaning
    const mv = nounGroups.find(g => ['T', 'D', 'L', 'W', 'R', 'O', 'REF'].includes(g[0].kind) && groups.indexOf(g) > 0); if (!mv) return null;
    // same-meaning option: put the subject first when it is not (주말에 저는 → 저는 주말에), otherwise front the chunk after it
    const moved = sIdx > 0 ? [groups[sIdx], ...groups.filter((g, i) => i !== sIdx)] : [mv, ...groups.filter(g => g !== mv)];
    // swapped: the words under S and the moved chunk's noun trade places, particles recomputed — different meaning
    const sWord = groups[sIdx][0].word, oWord = mv[0].word, mvKey = mv[0].kind;
    if (!sWord || !oWord || sWord.h === oWord.h) return null;
    // the swap must stay grammatical Korean: each noun has to be a real candidate for the other's slot (그 자리에 올 수 있는 말)
    const vk = M.verbKeyFor(st.tpl, mvKey), gv = st.picks[pickKey(vk)];
    const canS = M.candidates(st.tpl, 'S', D.words, gv).includes(oWord), canMv = M.candidates(st.tpl, mvKey, D.words, gv, Object.assign({}, st.picks, { S: oWord })).includes(sWord);
    const swapOk = canS && canMv; // otherwise the quiz keeps only the two order options (moved ✓ / predicate first ✗)
    const sFam = M.familyOf(groups[sIdx][0].particle) || st.tpl.sp;
    const reP = c => c.kind === 'REF' || c.particle === '' ? '' : (M.familyOf(c.particle) ? M.form(sWord, M.familyOf(c.particle)) : c.particle);
    const swapped = groups.map(g => g === groups[sIdx] ? [{ text: M.chunk(oWord, M.form(oWord, sFam)) }] : g === mv ? g.map((c, i) => i === 0 ? { text: M.chunk(sWord, reP(c)) } : c) : g);
    // verb first: predicate not last — not standard word order
    const vfirst = [...preds, ...groups.filter(g => !isPred(g))];
    const opts = [{ text: txt(moved), ok: true, why: t('reorder_moved') }, { text: txt(vfirst), ok: false, why: t('reorder_verb_last') }];
    if (swapOk) opts.push({ text: txt(swapped), ok: false, why: t('reorder_swapped', { a: oWord.h, b: sWord.h }) });
    if (new Set(opts.map(o => o.text)).size < opts.length || opts.some(o => o.text === a.text)) return null;
    return pickN(opts, opts.length);
  }
  const reorder = { key: '', opts: null, picked: null };
  function renderReorder(a) {
    let box = $('#reorder');
    if (!box) { box = el('div', 'ppanel reorder'); box.id = 'reorder'; $('#preview').insertAdjacentElement('afterend', box); }
    if (!a) { box.hidden = true; box.innerHTML = ''; reorder.key = ''; return; }
    if (reorder.key !== a.text) { reorder.key = a.text; reorder.opts = reorderOptions(a); reorder.picked = null; }
    if (!reorder.opts) { box.hidden = true; box.innerHTML = ''; return; }
    box.innerHTML = `<div class="ph"><span>${t('reorder_h')}</span><small>${t('reorder_p')}</small></div><div class="r-opts"></div><div class="why" hidden></div>`;
    const list = $('.r-opts', box);
    reorder.opts.forEach((o, i) => { const b = el('button', 'r-opt' + (reorder.picked === i ? (o.ok ? ' ok' : ' no') : ''), `<span lang="ko">${esc(o.text)}</span>`); b.type = 'button'; b.onclick = () => { reorder.picked = i; renderReorder(a); }; list.appendChild(b); });
    if (reorder.picked != null) { const o = reorder.opts[reorder.picked]; const w = $('.why', box); w.hidden = false; w.className = 'why ' + (o.ok ? 'ok' : 'no'); w.innerHTML = `<span class="tag">${t(o.ok ? 'correct' : 'wrong')}</span><p>${esc(o.why)}</p>`; }
    box.hidden = false;
  }
  // word picker
  function openPicker(k, anchor) {
    closePicker();
    const opts = optionsFor(k); if (!opts.length) return;
    const sh = el('div', 'picker'); sh.id = 'picker';
    const isV = isVerbSlot(k) || k === 'A' || k === 'A1' || k.startsWith('AF:');
    const shown = o => !isV ? o.h : (k === 'V1' || k === 'A1') ? (st.picks.CP ? (o[st.picks.CP] || o.pres) : o.pres) : k.startsWith('VF:') || k.startsWith('AF:') ? (M.verbForm(o, k.slice(3)) || o.pres) : (k === 'NV' || k === 'NV2' ? '안 ' : k === 'MV' ? '못 ' : '') + (M.verbForm(o, k === 'VW' ? 'want' : st.tense) || o.pres);

    const searchWrap = el('div', 'picker-search');
    const searchInp = el('input', 'picker-search-input');
    searchInp.type = 'search';
    searchInp.placeholder = t('picker_search_ph');
    searchInp.setAttribute('aria-label', t('picker_search_ph'));
    searchInp.autocomplete = 'off';
    searchWrap.appendChild(searchInp);
    sh.appendChild(searchWrap);

    if (opts.some(o => o.gloss_auto)) {
      const notice = el('div', 'picker-notice', esc(t('picker_auto_notice')));
      sh.appendChild(notice);
    }

    const list = el('div', 'picker-list');
    sh.appendChild(list);

    const minL = Math.min(...opts.map(o => o.level || 1));
    let curLevel = Math.max(st.tpl.level || 1, minL);

    function alignPicker() {
      if (window.innerWidth <= 480) {
        sh.style.left = '';
        sh.style.right = '';
        sh.style.top = '';
        sh.style.bottom = '';
        return;
      }
      sh.style.left = '0';
      sh.style.right = 'auto';
      const rect = sh.getBoundingClientRect();
      if (rect.right > window.innerWidth - 12) {
        sh.style.left = 'auto';
        sh.style.right = '0';
        const r2 = sh.getBoundingClientRect();
        if (r2.left < 12) {
          const anchorRect = anchor.getBoundingClientRect();
          sh.style.right = 'auto';
          sh.style.left = `${Math.max(12 - anchorRect.left, 0)}px`;
        }
      }
    }

    function renderList() {
      list.innerHTML = '';
      const q = searchInp.value.trim().toLowerCase();
      let matched;
      if (q) {
        matched = opts.filter(o => {
          if (o.h && o.h.toLowerCase().includes(q)) return true;
          if (o.r && o.r.toLowerCase().includes(q)) return true;
          if (o.en && o.en.toLowerCase().includes(q)) return true;
          if (o.ja && o.ja.includes(q)) return true;
          if (o.vi && o.vi.toLowerCase().includes(q)) return true;
          if (o.alias_en && o.alias_en.some(a => a.toLowerCase().includes(q))) return true;
          if (o.alias_ja && o.alias_ja.some(a => a.includes(q))) return true;
          const m = mean(o);
          if (m && m.toLowerCase().includes(q)) return true;
          const shw = shown(o);
          if (shw && shw.toLowerCase().includes(q)) return true;
          return false;
        });
      } else {
        matched = opts.filter(o => (o.level || 1) <= curLevel);
      }

      if (!matched.length) {
        const emp = el('div', 'picker-empty', esc(t('error_unknown')));
        list.appendChild(emp);
      } else {
        matched.forEach(o => {
          const b = el('button', 'pk', `<b lang="ko">${esc(shown(o))}</b><small>${esc(mean(o))}</small>`);
          b.type = 'button';
          b.onclick = () => { setPick(k, o); closePicker(); };
          list.appendChild(b);
        });
      }

      if (!q) {
        const higherLevels = opts.map(o => o.level || 1).filter(l => l > curLevel);
        if (higherLevels.length) {
          const moreBtn = el('button', 'picker-more', esc(t('picker_more')));
          moreBtn.type = 'button';
          moreBtn.onclick = e => {
            e.stopPropagation();
            curLevel = Math.min(...higherLevels);
            renderList();
          };
          list.appendChild(moreBtn);
        }
      }
      alignPicker();
    }

    searchInp.oninput = () => renderList();
    searchInp.onkeydown = e => { if (e.key === 'Enter') e.preventDefault(); };

    renderList();
    anchor.appendChild(sh);
    alignPicker();
    if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
      setTimeout(() => searchInp.focus(), 0);
    }
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
      const slotFor = { O: 'obj', O2: 'obj', H: 'have', D: 'dest', L: 'loc', R: 'to', W: 'with', T: 'time', S: 'subj', REF: 'ref' };
      const order = st.tpl.id === 'with' && (n.kind === 'person') ? ['W', 'O', 'H', 'D', 'L', 'R', 'T', 'S'] : ['O', 'O2', 'H', 'D', 'L', 'R', 'W', 'T', 'REF', 'S'];
      const eligible = x => st.tpl.slots.includes(x) && (x === 'W' ? n.kind === 'person' && !n.ga : n.roles.includes(slotFor[x]));
      const k = order.find(x => eligible(x) && !st.picks[x]) || order.find(eligible);
      if (!k) { hint.textContent = t('free_hint_unknown', { w: n.h }); return; }
      if ((k === 'O' || k === 'O2') && verbFor(k) && !M.compatible(verbFor(k), n) && !n.free) { const vk = pickKey(M.verbKeyFor(st.tpl, k)); const v = M.verbsFor(st.tpl, D.words, st.tense, vk === 'V1' ? 'V1' : undefined).find(v => M.compatible(v, n) && !v.to); if (v) st.picks[vk] = v; else { hint.textContent = t('free_hint_unknown', { w: n.h }); return; } }
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
    } else if (pk === 'CP') {
      // ending drill: three other verbs in this frame, same question (which ending joins the clauses)
      const slots = st.tpl.slots, key = slots[slots.indexOf(pk) - 1];
      pickN(optionsFor(key).filter(v => v !== st.picks[key]), 3).forEach(v => {
        const picks = Object.assign({}, st.picks, { [key]: v, tense: st.tense });
        const a = M.assemble(st.tpl, picks); const idx = a.chunks.findIndex(c => c.kind === key);
        items.push({ noun: { h: M.stemOf(v) + '-' }, before: a.chunks.slice(0, idx).map(c => c.text).join(' '), after: a.chunks.slice(idx + (a.chunks.filter(c => c.kind === key).length)).map(c => c.text).join(' ') + a.end, opts: M.pspec(st.tpl, pk).options, labels: connLab, judge: c => M.judgeCP(st.tpl, v, c, WHY) });
      });
    } else if (M.pspec(st.tpl, pk).expect === 'qplace') {
      // 어디에 vs 어디에서: the verb decides, so vary the verb
      pickN(M.verbsFor(st.tpl, D.words, st.tense).filter(v => v !== st.picks.V), 3).forEach(v => {
        const picks = Object.assign({}, st.picks, { V: v, QP: '에', tense: st.tense });
        const a = M.assemble(st.tpl, picks); const idx = a.chunks.findIndex(c => c.kind === 'QD');
        items.push({ noun: st.picks.QD, before: a.chunks.slice(0, idx).map(c => c.text).join(' '), after: a.chunks.slice(idx + 1).map(c => c.text).join(' ') + a.end, opts: ['에', '에서'], judge: c => M.judgeP(st.tpl, pk, st.picks.QD, v, c, WHY) });
      });
    } else if (!['obj', 'dest', 'loc'].includes(M.pspec(st.tpl, pk).expect)) {
      // same-family drill (time / have / with / to): three fresh nouns in this frame
      const slots = st.tpl.slots, key = slots[slots.indexOf(pk) - 1], spec = M.pspec(st.tpl, pk);
      pickN(M.candidates(st.tpl, key, D.words, verbFor(key), st.picks).filter(n => n !== st.picks[key]), 3).forEach(n => {
        const picks = Object.assign({}, st.picks, { [key]: n, [pk]: M.form(n, spec.expect) || '∅', tense: st.tense });
        const a = M.assemble(st.tpl, picks); const idx = a.chunks.findIndex(c => c.kind === key);
        items.push({ noun: n, before: a.chunks.slice(0, idx).map(c => c.text).join(' '), after: a.chunks.slice(idx + 1).map(c => c.text).join(' ') + (a.end || '.'), opts: spec.options, judge: c => M.judgeP(st.tpl, pk, n, verbFor(key), c, WHY) });
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
    if (drill.i >= drill.items.length) { box.innerHTML = `<div class="ph"><span>${t('drill_h')}</span></div><p class="drill-done">${t('drill_done', { n: drill.score }).replace(/3/, drill.items.length)}</p><div class="acts"><button type="button" class="btn ghost" id="drill-again">${t('drill_again')}</button><button type="button" class="btn" id="drill-close">${t('drill_close')}</button></div>`;
      $('#drill-again').onclick = () => startDrill(drill.pk, drill.j); $('#drill-close').onclick = () => { drill.items = []; renderDrill(); }; return; }
    const it = drill.items[drill.i];
    box.innerHTML = `<div class="ph"><span>${t('drill_h')}</span><small>${t('drill_q', { i: drill.i + 1 }).replace(/3/, drill.items.length)}</small></div><p class="drill-s" lang="ko">${esc(it.before)} <b>${esc(it.noun.h)}<u>&nbsp;&nbsp;</u></b> ${esc(it.after)}</p><div class="p-opts"></div><div class="why" hidden></div>`;
    const opts = $('.p-opts', box);
    it.opts.forEach(o => { const b = el('button', 'p-opt' + (o === '∅' ? ' none' : ''), o === '∅' ? t('none_label') : it.labels ? it.labels(o) : o); b.type = 'button'; b.onclick = () => {
      const r = it.judge(o); $$('.p-opt', box).forEach(x => x.className = 'p-opt'); b.classList.add('on', r.grade);
      const w = $('.why', box); w.hidden = false; w.className = 'why ' + r.grade; w.innerHTML = `<span class="tag">${t(r.grade === 'ok' ? 'correct' : r.grade === 'soft' ? 'soft' : 'wrong')}</span><p>${esc(r.why)}</p><button type="button" class="link" id="drill-next">${drill.i + 1 < drill.items.length ? t('drill_q', { i: drill.i + 2 }).replace(/3/, drill.items.length) + ' →' : t('drill_done', { n: drill.score + (r.grade === 'ok' ? 1 : 0) }).replace(/3/, drill.items.length)}</button>`;
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

  // debug hook for the gloss snapshot QA (?debug=1): set a frame + picks, read sentence and gloss
  if (/debug=1/.test(location.search)) window.MJ_DEBUG = { st, setTemplate, setPick, tplById, nounByH, verbByH, adjByH: h => D.words.adjectives.find(a => a.h === h), render: renderBuilder, out: () => { const a = M.assemble(st.tpl, Object.assign({}, st.picks, { tense: st.tense })); return { text: a.text, gloss: gloss(a), chunks: a.chunks.map(c => [c.text, chunkGloss(c)]) }; } };
  // ---------- boot ----------
  renderJamo();
  $('#batchim').onchange = e => { st.batchim = e.target.checked; renderWords(); };
  $('#frame-btn').onclick = () => { const y = window.scrollY; const open = $('#frames').hidden; $('#frames').hidden = !open; $('#frame-btn').setAttribute('aria-expanded', String(open)); requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'auto' })); };
  $('#roman').onchange = e => { document.documentElement.classList.toggle('roman', e.target.checked); try { localStorage.setItem('munjang.roman', e.target.checked ? '1' : ''); } catch (x) {} };
  try { if (localStorage.getItem('munjang.roman')) { $('#roman').checked = true; document.documentElement.classList.add('roman'); } } catch (x) {}
  initTray(); initFree(); renderBuilder();
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('w') && nounByH(h.get('w'))) { const n = nounByH(h.get('w')); st.jamo = M.syllables(n.h)[0].cho; leaveLanding(); renderJamo(); renderWords(); pickWord(n); }
  else if (h.get('j') && [...M.BASIC_CONSONANTS, ...M.BASIC_VOWELS].includes(h.get('j'))) pickJamo(h.get('j'));
})();
