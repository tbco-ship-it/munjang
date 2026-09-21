// 문장 engine — pure functions, no DOM. Loaded by app.js in the browser and by scripts/test_munjang.mjs in node.
// Hangul syllables decompose into 초성·중성·종성 by Unicode arithmetic; the 받침 rule (final consonant present → 은/이/을)
// is what decides the particle FORM. The particle FAMILY (은/는 topic vs 이/가 subject, 을/를 vs 에 vs 에서) comes from the
// template: each frame declares which family is natural, and the judge explains the difference instead of just saying "wrong".
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Munjang = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
  const JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
  const BASIC_CONSONANTS = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'.split('');
  const BASIC_VOWELS = 'ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ'.split('');
  // Compound 받침/vowels contain basic jamo: ㄳ has ㄱ+ㅅ, ㅘ has ㅗ+ㅏ — used so tapping ㅅ also finds 없다-type words later.
  const PARTS = { 'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ', 'ㄽ': 'ㄹㅅ', 'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ',
    'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ', 'ㅐ': 'ㅏㅣ', 'ㅒ': 'ㅑㅣ', 'ㅔ': 'ㅓㅣ', 'ㅖ': 'ㅕㅣ', 'ㅘ': 'ㅗㅏ', 'ㅙ': 'ㅗㅐ', 'ㅚ': 'ㅗㅣ', 'ㅝ': 'ㅜㅓ', 'ㅞ': 'ㅜㅔ', 'ㅟ': 'ㅜㅣ', 'ㅢ': 'ㅡㅣ' };

  function isSyllable(ch) { const c = ch.charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3; }
  function decompose(ch) {
    if (!isSyllable(ch)) return null;
    const i = ch.charCodeAt(0) - 0xAC00;
    return { cho: CHO[Math.floor(i / 588)], jung: JUNG[Math.floor((i % 588) / 28)], jong: JONG[i % 28].trim() };
  }
  function compose(cho, jung, jong) {
    const c = CHO.indexOf(cho), j = JUNG.indexOf(jung), g = jong ? JONG.indexOf(jong) : 0;
    if (c < 0 || j < 0 || g < 0) return null;
    return String.fromCharCode(0xAC00 + c * 588 + j * 28 + g);
  }
  function syllables(word) { return [...word].filter(isSyllable).map(ch => ({ ch, ...decompose(ch) })); }
  function batchim(word) { const s = syllables(word); return s.length ? s[s.length - 1].jong : ''; }
  function hasBatchim(word) { return batchim(word) !== ''; }
  // Does `word` contain basic jamo `j` in any position (compounds count through their parts)?
  function hasJamo(word, j) {
    return syllables(word).some(s => [s.cho, s.jung, s.jong].some(x => x === j || (PARTS[x] || '').includes(j)));
  }
  function jamoPositions(word, j) {
    const out = [];
    syllables(word).forEach((s, i) => {
      if (s.cho === j || (PARTS[s.cho] || '').includes(j)) out.push({ i, pos: 'cho' });
      if (s.jung === j || (PARTS[s.jung] || '').includes(j)) out.push({ i, pos: 'jung' });
      if (s.jong && (s.jong === j || (PARTS[s.jong] || '').includes(j))) out.push({ i, pos: 'jong' });
    });
    return out;
  }

  // Particle forms by family. 'subject' on 저/나 uses the irregular 제가/내가 (word.ga).
  const FAMILY = {
    topic: { yes: '은', no: '는' },
    subject: { yes: '이', no: '가' },
    obj: { yes: '을', no: '를' },
    dest: { yes: '에', no: '에' },
    loc: { yes: '에서', no: '에서' }
  };
  const SP_OPTIONS = ['은', '는', '이', '가'];
  const OP_OPTIONS = ['을', '를', '에', '에서'];
  function familyOf(p) { for (const f in FAMILY) if (FAMILY[f].yes === p || FAMILY[f].no === p) return f; return null; }
  function form(word, family) { return FAMILY[family][hasBatchim(word.h || word) ? 'yes' : 'no']; }
  // The written chunk: word + particle, with 저+가 → 제가.
  function chunk(word, particle) {
    if (word.ga && (particle === '가' || particle === '이')) return word.ga;
    return (word.h || word) + particle;
  }

  function fill(t, vars) { return t.replace(/\{(\w+)\}/g, (_, k) => vars[k] == null ? '' : vars[k]); }

  // Judge the subject/topic particle. Returns {grade: 'ok'|'soft'|'no', why, correct}
  function judgeSP(tpl, word, choice, why) {
    const fam = familyOf(choice);
    const natural = tpl.sp; // 'topic' | 'subject'
    const correctForm = form(word, natural);
    const bat = batchim(word.h);
    const w = word.h;
    if (word.ga && (choice === '가' || choice === '이')) {
      // 저 + 이/가: only 제가 exists. Family judgement still applies.
      if (natural === 'subject') return { grade: 'ok', why: fill(why.jeo_ga, { w }), correct: correctForm, chunk: word.ga };
      return { grade: 'soft', why: fill(why.topic_contrast, { w }) + ' ' + fill(why.jeo_ga, { w }), correct: correctForm, chunk: word.ga };
    }
    const formOk = FAMILY[fam][bat ? 'yes' : 'no'] === choice;
    if (!formOk) {
      return { grade: 'no', why: fill(bat ? why.batchim_yes : why.batchim_no, { w, f: bat, p: FAMILY[fam][bat ? 'yes' : 'no'] }), correct: correctForm };
    }
    if (fam === natural) {
      const key = natural === 'topic' ? 'topic_ok' : (tpl.id === 'exist' ? 'exist_ok' : 'subject_ok');
      return { grade: 'ok', why: fill(why[key], { w }), correct: correctForm };
    }
    return { grade: 'soft', why: fill(natural === 'topic' ? why.topic_contrast : why.subject_contrast, { w }), correct: correctForm };
  }

  // Judge the object/place particle for slot expecting family `expect` ('obj'|'dest'|'loc').
  function judgeOP(tpl, expect, word, verb, choice, why) {
    const fam = familyOf(choice);
    const w = word.h, v = verb ? verb.pres : '';
    const bat = batchim(w);
    const correctForm = form(word, expect);
    if (fam === expect) {
      if (expect === 'obj' && FAMILY.obj[bat ? 'yes' : 'no'] !== choice) {
        return { grade: 'no', why: fill(bat ? why.batchim_yes : why.batchim_no, { w, f: bat, p: correctForm }), correct: correctForm };
      }
      const key = expect === 'obj' ? 'obj_ok' : expect === 'dest' ? (tpl.id === 'exist' ? 'exist_ok' : 'dest_ok') : 'loc_ok';
      return { grade: 'ok', why: fill(why[key], { w, v: verbLabel(verb, why) }), correct: correctForm };
    }
    const key = expect === 'obj' ? (fam === 'dest' ? 'obj_wrong_dest' : 'obj_wrong_loc')
      : expect === 'dest' ? (fam === 'loc' ? (tpl.id === 'exist' ? 'exist_wrong_loc' : 'dest_wrong_loc') : 'dest_wrong_obj')
      : (fam === 'dest' ? 'loc_wrong_dest' : 'loc_wrong_obj');
    return { grade: 'no', why: fill(why[key], { w, v: verbLabel(verb, why) }), correct: correctForm };
  }
  // In the why-lines {v} reads as the verb's meaning in the UI language, e.g. "what you drink" / "飲む".
  function verbLabel(verb, why) {
    if (!verb) return '';
    return why === undefined ? verb.h : (why._lang === 'ja' ? (verb.ja || verb.h) : (verb.en || verb.h).replace(/^to /, ''));
  }

  // Which nouns fit a slot of the template given the chosen verb (for suggestion lists).
  function candidates(tpl, slotKey, words, verb) {
    const nouns = words.nouns;
    if (slotKey === 'S') return nouns.filter(n => n.roles.includes('subj') && (tpl.sp !== 'subject' || tpl.id === 'exist' ? true : n.kind !== 'person' || true));
    if (slotKey === 'O') {
      let list = nouns.filter(n => n.roles.includes('obj'));
      if (verb && verb.takes) list = list.filter(n => verb.takes.includes(n.kind) || (verb.takes.includes('read') && n.read) || (verb.takes.includes('write') && n.write));
      return list;
    }
    if (slotKey === 'D') return nouns.filter(n => n.roles.includes('dest'));
    if (slotKey === 'L') return nouns.filter(n => n.roles.includes('loc'));
    return nouns;
  }
  function verbsFor(tpl, words) {
    if (tpl.verbs === 'transitive') return words.verbs.filter(v => v.takes);
    if (tpl.verbs === 'move') return words.verbs.filter(v => v.move);
    if (tpl.verbs === 'exist') return words.verbs.filter(v => v.exist);
    if (tpl.verbs === 'at') return words.verbs.filter(v => v.at);
    return [];
  }
  function adjectivesFor(subject, words) {
    return words.adjectives.filter(a => !subject || a.fits.includes(subject.kind));
  }
  function compatible(verb, noun) {
    if (!verb || !noun || !verb.takes) return true;
    return verb.takes.includes(noun.kind) || (verb.takes.includes('read') && !!noun.read) || (verb.takes.includes('write') && !!noun.write);
  }
  function verbForm(verb, tense) {
    if (!verb) return '';
    if (tense === 'want') return verb.want || verb.pres;
    return verb[tense] || verb.pres;
  }

  // Assemble the sentence from picks: {S, SP, O, OP, D, L, OP2, V, A, tense}. Returns chunks (spaces between chunks).
  function assemble(tpl, picks) {
    const chunks = [];
    const slots = tpl.slots;
    for (let i = 0; i < slots.length; i++) {
      const k = slots[i];
      if (k === 'S') { const p = picks.SP || form(picks.S, tpl.sp); chunks.push({ kind: 'S', text: chunk(picks.S, p), word: picks.S, particle: p }); }
      else if (k === 'O' || k === 'D' || k === 'L') {
        const pk = slots[i + 1];
        const expect = pk === 'OP2' ? tpl.op2 : tpl.op; // the template decides 을/를 · 에 · 에서 for this slot (있어요 takes 에, 살아요 takes 에서)
        const p = picks[pk] || form(picks[k], expect);
        chunks.push({ kind: k, text: chunk(picks[k], p), word: picks[k], particle: p });
      }
      else if (k === 'V' || k === 'VW') {
        const f = verbForm(picks.V, k === 'VW' ? 'want' : (picks.tense || 'pres'));
        f.split(' ').forEach((part, j) => chunks.push({ kind: 'V', text: part, word: picks.V, tail: j > 0 }));
      }
      else if (k === 'A') { chunks.push({ kind: 'A', text: verbForm(picks.A, picks.tense || 'pres'), word: picks.A }); }
    }
    return { chunks, text: chunks.map(c => c.text).join(' ') + '.' };
  }

  // Cells for the 원고지 sheet: one syllable per cell, one blank cell per space, punctuation in its own cell.
  function cells(text, perRow) {
    const out = [];
    for (const ch of text) out.push(ch === ' ' ? '' : ch);
    if (perRow) while (out.length % perRow) out.push('');
    return out;
  }


  // ---------- sentence checker (rule-based, honest about its limits) ----------
  // Splits the learner's sentence into 어절, recognises noun+particle / verb chunks from the word list, and applies only the
  // rules it can be sure of: particle FORM after 받침, particle FAMILY vs a recognised verb (에/에서/을·를), spacing of particles,
  // -고 싶어요 and 안, verb-last order, polite ending. Everything else is reported as "can't judge" — never guessed.
  const PARTICLES = ['에서', '에게', '한테', '으로', '부터', '까지', '은', '는', '이', '가', '을', '를', '에', '도', '의', '와', '과', '로', '하고'];
  const PAIRS = { '은': '는', '는': '은', '이': '가', '가': '이', '을': '를', '를': '을', '와': '과', '과': '와', '으로': '로', '로': '으로' };
  function wantsBatchim(p) { return ['은', '이', '을', '과', '으로'].includes(p); }
  function checkSentence(text, words, why) {
    const raw = text.trim().replace(/\s+/g, ' ');
    const notes = [], chunks = [];
    if (!raw) return { chunks, notes, verdict: 'empty' };
    const body = raw.replace(/[.!?。！？]+$/, '');
    const tokens = body.split(' ');
    const allVerbs = [...words.verbs, ...words.adjectives];
    const verbForms = new Map();
    for (const v of allVerbs) for (const k of ['pres', 'past', 'want']) if (v[k]) verbForms.set(v[k], { v, tense: k });
    const nounByH = h => words.nouns.find(n => n.h === h);
    let verbAt = -1, verb = null;
    tokens.forEach((tok, i) => {
      const c = { text: tok, kind: 'unknown', status: 'unknown' };
      if (!syllables(tok).length) { c.kind = 'other'; c.status = 'skip'; chunks.push(c); return; }
      // bare particle = spacing error
      if (PARTICLES.includes(tok)) { c.kind = 'particle'; c.status = 'no'; notes.push({ grade: 'no', key: 'chk_space_particle', vars: { p: tok, prev: tokens[i - 1] || '' } }); chunks.push(c); return; }
      // 안 glued: 안먹어요
      if (tok.length > 1 && tok.startsWith('안') && verbForms.has(tok.slice(1))) { c.kind = 'verb'; c.status = 'no'; notes.push({ grade: 'no', key: 'chk_an_space', vars: { v: tok.slice(1) } }); chunks.push(c); return; }
      // verb forms (also -고 싶어요 written together / split)
      if (verbForms.has(tok)) { const f = verbForms.get(tok); c.kind = 'verb'; c.status = 'ok'; c.word = f.v; c.tense = f.tense; verbAt = i; verb = f.v; chunks.push(c); return; }
      if (tok.endsWith('고싶어요') && verbForms.has(tok.replace('고싶어요', '고 싶어요'))) { c.kind = 'verb'; c.status = 'no'; notes.push({ grade: 'no', key: 'chk_want_space', vars: { v: tok.replace('고싶어요', '고 싶어요') } }); verbAt = i; verb = verbForms.get(tok.replace('고싶어요', '고 싶어요')).v; chunks.push(c); return; }
      if (tok.endsWith('고') && i + 1 < tokens.length && tokens[i + 1] === '싶어요' && verbForms.has(tok + ' 싶어요')) { const f = verbForms.get(tok + ' 싶어요'); c.kind = 'verb'; c.status = 'ok'; c.word = f.v; c.tense = 'want'; verbAt = i; verb = f.v; chunks.push(c); return; }
      if (tok === '싶어요' && i > 0 && tokens[i - 1].endsWith('고')) { c.kind = 'verb'; c.status = 'ok'; chunks.push(c); return; }
      // whole token is a known noun (no particle)
      if (nounByH(tok)) { c.kind = 'noun'; c.status = 'bare'; c.word = nounByH(tok); chunks.push(c); return; }
      // noun + particle
      let hit = null;
      for (const p of PARTICLES) {
        if (tok.length > p.length && tok.endsWith(p)) {
          const stem = tok.slice(0, -p.length);
          const n = nounByH(stem) || (stem === '제' && p === '가' ? nounByH('저') : null);
          if (n) { hit = { p, stem, n, known: true }; break; }
          if (!hit && /^[가-힣]+$/.test(stem)) hit = { p, stem, n: null, known: false };
        }
      }
      if (hit) {
        c.kind = 'noun'; c.particle = hit.p; c.stem = hit.stem; c.word = hit.n; c.known = hit.known;
        if (hit.stem === '제' && hit.p === '가') { c.status = 'ok'; chunks.push(c); return; }
        if (hit.stem === '저' && (hit.p === '가' || hit.p === '이')) { c.status = 'no'; notes.push({ grade: 'no', key: 'jeo_ga', vars: { w: '저' } }); chunks.push(c); return; }
        if (PAIRS[hit.p]) {
          const need = hasBatchim(hit.stem) ? (wantsBatchim(hit.p) ? hit.p : PAIRS[hit.p]) : (wantsBatchim(hit.p) ? PAIRS[hit.p] : hit.p);
          if (need !== hit.p) { c.status = 'no'; notes.push({ grade: 'no', key: hasBatchim(hit.stem) ? 'batchim_yes' : 'batchim_no', vars: { w: hit.stem, f: batchim(hit.stem), p: need }, fix: hit.stem + need, unknown: !hit.known }); chunks.push(c); return; }
        }
        c.status = hit.known ? 'ok' : 'maybe';
        chunks.push(c); return;
      }
      chunks.push(c);
    });
    // verb-last + polite ending
    const last = tokens[tokens.length - 1];
    if (verbAt >= 0 && verbAt < tokens.length - 1 && !(tokens[verbAt].endsWith('고') && tokens[verbAt + 1] === '싶어요' && verbAt + 1 === tokens.length - 1)) notes.push({ grade: 'no', key: 'chk_verb_last', vars: { v: tokens[verbAt] } });
    if (verbAt < 0 && !/(요|습니다|ㅂ니다|다)$/.test(last)) notes.push({ grade: 'maybe', key: 'chk_ending', vars: { w: last } });
    else if (!/요$/.test(last) && /(습니다|다)$/.test(last)) notes.push({ grade: 'info', key: 'chk_formal', vars: { w: last } });
    // particle family vs recognised verb
    if (verb) {
      for (const c of chunks) {
        if (c.kind !== 'noun' || !c.particle) continue;
        const isPlace = c.word && c.word.kind === 'place';
        if (verb.move && c.particle === '에서' && isPlace) notes.push({ grade: 'no', key: 'dest_wrong_loc', vars: { w: c.stem, v: verbLabel(verb, why) }, fix: c.stem + '에' });
        if (verb.move && (c.particle === '을' || c.particle === '를') && isPlace) notes.push({ grade: 'no', key: 'dest_wrong_obj', vars: { w: c.stem, v: verbLabel(verb, why) }, fix: c.stem + '에' });
        if (verb.exist && c.particle === '에서' && isPlace) notes.push({ grade: 'no', key: 'exist_wrong_loc', vars: { w: c.stem }, fix: c.stem + '에' });
        if ((verb.takes || verb.at) && c.particle === '에' && isPlace && !verb.exist) notes.push({ grade: 'no', key: 'loc_wrong_dest', vars: { w: c.stem, v: verbLabel(verb, why) }, fix: c.stem + '에서' });
        if (verb.takes && (c.particle === '에' || c.particle === '에서') && c.word && !isPlace) notes.push({ grade: 'no', key: c.particle === '에' ? 'obj_wrong_dest' : 'obj_wrong_loc', vars: { w: c.stem }, fix: c.stem + form(c.word, 'obj') });
        if (verb.takes && (c.particle === '을' || c.particle === '를') && c.word && !compatible(verb, c.word) && c.word.kind !== 'unknown') notes.push({ grade: 'maybe', key: 'chk_pair', vars: { w: c.stem, v: verb.h } });
      }
    }
    const unknown = chunks.filter(c => c.status === 'unknown' || c.status === 'maybe').length;
    const bad = notes.some(n => n.grade === 'no');
    return { chunks, notes, verb, verdict: bad ? 'no' : unknown ? 'partial' : 'ok', unknown };
  }

  return { PARTICLES, checkSentence, CHO, JUNG, JONG, BASIC_CONSONANTS, BASIC_VOWELS, decompose, compose, syllables, batchim, hasBatchim, hasJamo, jamoPositions,
    FAMILY, SP_OPTIONS, OP_OPTIONS, familyOf, form, chunk, judgeSP, judgeOP, candidates, verbsFor, adjectivesFor, compatible, verbForm, assemble, cells };
});
