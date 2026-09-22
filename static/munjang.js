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
    loc: { yes: '에서', no: '에서' },
    have: { yes: '이', no: '가' },
    time: { yes: '에', no: '에' },
    with: { yes: '과', no: '와' },
    to: { yes: '에게', no: '에게' },
    to_hon: { yes: '께', no: '께' },
    qplace: { yes: '에', no: '에' },
    like: { yes: '을', no: '를' },
    pref: { yes: '이', no: '가' },
    qobj: { yes: '', no: '' },
    or: { yes: '이나', no: '나' }
  };
  const DEFAULT_P = { SP: ['은', '는', '이', '가'], OP: ['을', '를', '에', '에서'], OP2: ['을', '를', '에', '에서'] };
  // particle slot spec: expected family + options (templates may override via tpl.p)
  function pspec(tpl, pk) {
    const o = tpl.p && tpl.p[pk];
    if (o) return o;
    if (pk === 'CP') return { expect: 'conn', options: tpl.conns || [tpl.conn], correct: tpl.conn };
    if (pk === 'SP') return { expect: tpl.sp, options: DEFAULT_P.SP };
    if (pk === 'OP2') return { expect: tpl.op2, options: DEFAULT_P.OP2 };
    return { expect: tpl.op, options: DEFAULT_P.OP };
  }
  const isPKey = k => /^(SP|OP|OP2|TP|HP|WP|RP|QP|CP)$/.test(k);
  const SP_OPTIONS = ['은', '는', '이', '가'];
  const OP_OPTIONS = ['을', '를', '에', '에서'];
  function familyOf(p) { if (p === '에') return 'dest'; if (p === '하고') return 'with'; if (p === '한테') return 'to'; if (p === '께') return 'to_hon'; if (p === '이나' || p === '나') return 'or'; for (const f of ['topic', 'subject', 'obj', 'loc', 'with', 'to', 'or']) if (FAMILY[f] && (FAMILY[f].yes === p || FAMILY[f].no === p)) return f; return null; }
  function form(word, family) {
    if (!word) return '';
    if (family === 'time') return word.tp === 'none' ? '' : '에';
    if (!FAMILY[family]) return '';
    return FAMILY[family][hasBatchim(word.h || word) ? 'yes' : 'no'];
  }
  // The written chunk: word + particle, with 저+가 → 제가.
  function chunk(word, particle) {
    if (word.ga && particle === '가') return word.ga;
    if (word.reul && particle === '를') return word.reul; // 뭐 + 를 → 뭘
    if (particle === '∅') particle = '';
    return (word.h || word) + particle;
  }

  function fill(t, vars) { return t.replace(/\{(\w+)\}/g, (_, k) => vars[k] == null ? '' : vars[k]); }

  // Judge the subject/topic particle. Returns {grade: 'ok'|'soft'|'no', why, correct}
  function judgeSP(tpl, word, choice, why) {
    if (choice === '께서') { // honorific subject particle: only for elders, and only where the frame offers it
      if (!word) return { grade: 'no', why: '', correct: '께서' };
      return word.elder ? { grade: 'ok', why: fill(why.hon_subj_ok, { w: word.h }), correct: '께서' } : { grade: 'no', why: fill(why.hon_subj_wrong, { w: word.h }), correct: form(word, 'subject') };
    }
    const fam = familyOf(choice);
    const natural = tpl.sp; // 'topic' | 'subject'
    const correctForm = form(word, natural);
    const bat = word ? batchim(word.h) : '';
    const w = word ? word.h : '';
    if (!word || !choice) return { grade: 'no', why: '', correct: correctForm };
    const formOk = FAMILY[fam][bat ? 'yes' : 'no'] === choice;
    if (word.ga && formOk && choice === '가') {
      // 저 + 가 → 제가 (나 + 가 → 내가). 저 + 이 is a form error and falls through to the ordinary check.
      if (natural === 'subject') return { grade: 'ok', why: fill(why.jeo_ga, { w }), correct: correctForm, chunk: word.ga };
      return { grade: 'soft', why: fill(why.topic_contrast, { w }) + ' ' + fill(why.jeo_ga, { w }), correct: correctForm, chunk: word.ga };
    }
    if (!formOk) {
      return { grade: 'no', why: fill(bat ? why.batchim_yes : why.batchim_no, { w, f: bat, p: FAMILY[fam][bat ? 'yes' : 'no'] }), correct: correctForm };
    }
    if (fam === natural) {
      if ((tpl.id === 'hon_exist' || tpl.id === 'hon_verb') && word.elder) return { grade: 'soft', why: fill(why.hon_subj_soft, { w }), correct: '께서' };
      const key = natural === 'topic' ? 'topic_ok' : (tpl.id === 'exist' ? 'exist_subject_ok' : 'subject_ok');
      return { grade: 'ok', why: fill(why[key], { w }), correct: correctForm };
    }
    return { grade: 'soft', why: fill(natural === 'topic' ? why.topic_contrast : why.subject_contrast, { w }), correct: correctForm };
  }

  // Judge the object/place particle for slot expecting family `expect` ('obj'|'dest'|'loc').
  function judgeOP(tpl, expect, word, verb, choice, why) {
    if (!word || !choice) return { grade: 'no', why: '', correct: '' };
    const fam = familyOf(choice);
    const w = word.h, v = verb ? verb.pres : '';
    const bat = batchim(w);
    const correctForm = form(word, expect);
    if (fam === expect) {
      if (expect === 'obj' && FAMILY.obj[bat ? 'yes' : 'no'] !== choice) {
        return { grade: 'no', why: fill(bat ? why.batchim_yes : why.batchim_no, { w, f: bat, p: correctForm }), correct: correctForm };
      }
      const key = expect === 'obj' ? 'obj_ok' : expect === 'dest' ? (tpl.id === 'exist' || tpl.id === 'hon_exist' ? 'exist_place_ok' : tpl.id === 'location' ? 'location_ok' : 'dest_ok') : 'loc_ok';
      return { grade: 'ok', why: fill(why[key], { w, v: verb ? verb.h : '' }), correct: correctForm };
    }
    if (expect === 'loc' && fam === 'dest' && verb && verb.locBoth) return { grade: 'ok', why: fill(why.live_both, { w, v: verb.h }), correct: '에서' };
    const key = expect === 'obj' ? (fam === 'dest' ? 'obj_wrong_dest' : 'obj_wrong_loc')
      : expect === 'dest' ? (fam === 'loc' ? (tpl.id === 'exist' || tpl.id === 'location' || tpl.id === 'hon_exist' ? 'exist_wrong_loc' : 'dest_wrong_loc') : 'dest_wrong_obj')
      : (fam === 'dest' ? 'loc_wrong_dest' : 'loc_wrong_obj');
    return { grade: 'no', why: fill(why[key], { w, v: verbLabel(verb, why) }), correct: correctForm };
  }
  // Judge the newer particle families (time 에/∅, have 이/가, with 와/과/하고, to 에게/한테).
  function judgeX(tpl, expect, word, verb, choice, why) {
    if (!word || !choice) return { grade: 'no', why: '', correct: '' };
    const w = word.h, bat = batchim(w);
    if (expect === 'time') {
      const none = word.tp === 'none';
      if (choice === '∅') return none ? { grade: 'ok', why: fill(why.time_none_ok, { w }), correct: '' } : { grade: 'no', why: fill(why.time_wrong_e, { w }), correct: '에' };
      return none ? { grade: 'no', why: fill(why.time_wrong_none, { w }), correct: '' } : { grade: 'ok', why: fill(why.time_ok, { w }), correct: '에' };
    }
    if (expect === 'have') {
      const need = form(word, 'have');
      if (choice === '을' || choice === '를') return { grade: 'no', why: fill(why.have_wrong_obj, { w, p: need }), correct: need };
      if (choice !== need) return { grade: 'no', why: fill(bat ? why.batchim_yes : why.batchim_no, { w, f: bat, p: need }), correct: need };
      return { grade: 'ok', why: fill(why.have_ok, { w }), correct: need };
    }
    if (expect === 'with') {
      const need = form(word, 'with');
      if (choice === '하고') return { grade: 'ok', why: fill(why.with_hago, { w }), correct: need };
      if (choice !== need) return { grade: 'no', why: fill(bat ? why.batchim_yes : why.batchim_no, { w, f: bat, p: need }), correct: need };
      return { grade: 'ok', why: fill(why.with_ok, { w }), correct: need };
    }
    if (expect === 'to') {
      if (choice === '에게' || choice === '한테') return { grade: 'ok', why: fill(why.to_ok, { w }), correct: '에게' };
      if (choice === '에') return { grade: 'no', why: fill(why.to_wrong_e, { w }), correct: '에게' };
      return { grade: 'no', why: fill(why.to_wrong_obj, { w }), correct: '에게' };
    }
    if (expect === 'to_hon') { // 께 for an elder; 에게/한테 are grammatical but not what 드리다 expects
      if (choice === '께') return { grade: 'ok', why: fill(why.to_hon_ok, { w }), correct: '께' };
      if (choice === '에게' || choice === '한테') return { grade: 'soft', why: fill(why.to_hon_soft, { w }), correct: '께' };
      if (choice === '에') return { grade: 'no', why: fill(why.to_wrong_e, { w }), correct: '께' };
      return { grade: 'no', why: fill(why.to_wrong_obj, { w }), correct: '께' };
    }
    if (expect === 'qplace') { // 어디에 가요? (destination) vs 어디에서 먹어요? (where it happens); 살다 takes both
      const move = !!(verb && verb.move), both = !!(verb && verb.locBoth);
      if (both && (choice === '에' || choice === '에서')) return { grade: 'ok', why: fill(why.qplace_both, { w, v: verb.h }), correct: choice };
      if (choice === '에') return move ? { grade: 'ok', why: fill(why.qplace_ok, { w }), correct: '에' } : { grade: 'no', why: fill(why.qplace_wrong_e, { w }), correct: '에서' };
      if (choice === '에서') return !move ? { grade: 'ok', why: fill(why.qplace_ok, { w }), correct: '에서' } : { grade: 'no', why: fill(why.qplace_wrong_eseo, { w }), correct: '에' };
      return { grade: 'no', why: fill(why.qplace_wrong_e, { w }), correct: move ? '에' : '에서' };
    }
    if (expect === 'like') { // 좋아하다 (verb) takes 을/를; 이/가 belongs to the adjective 좋다
      const need = form(word, 'obj');
      if (choice === '이' || choice === '가') return { grade: 'no', why: fill(why.like_wrong_ga, { w, p: need, s: form(word, 'subject') }), correct: need };
      if (choice !== need) return { grade: 'no', why: fill(bat ? why.batchim_yes : why.batchim_no, { w, f: bat, p: need }), correct: need };
      return { grade: 'ok', why: fill(why.like_ok, { w, p: need }), correct: need };
    }
    if (expect === 'pref') { // 좋다 (adjective): the liked thing takes 이/가, never 을/를
      const need = form(word, 'subject');
      if (choice === '을' || choice === '를') return { grade: 'no', why: fill(why.pref_wrong_obj, { w, p: need, q: form(word, 'obj') }), correct: need };
      if (choice !== need) return { grade: 'no', why: fill(bat ? why.batchim_yes : why.batchim_no, { w, f: bat, p: need }), correct: need };
      return { grade: 'ok', why: fill(why.pref_ok, { w, p: need }), correct: need };
    }
    if (expect === 'qobj') { // 뭐 먹어요? / 뭘 먹어요? — both fine
      if (choice === '∅') return { grade: 'ok', why: fill(why.qobj_none, { w }), correct: '' };
      if (choice === '를') return { grade: 'ok', why: fill(why.qobj_reul, { w }), correct: '' };
      return { grade: 'no', why: fill(why.batchim_no, { w, f: '', p: '를' }), correct: '' };
    }
    if (expect === 'or') { // (이)나
      const need = form(word, 'or');
      if (choice !== need) return { grade: 'no', why: fill(bat ? why.batchim_yes : why.batchim_no, { w, f: bat, p: need }), correct: need };
      return { grade: 'ok', why: fill(why.or_ok, { w, p: need }), correct: need };
    }
    return judgeOP(tpl, expect, word, verb, choice, why);
  }
  // One entry point: SP → judgeSP, obj/dest/loc → judgeOP, the rest → judgeX
  // Connective quiz: the frame practises one ending (tpl.conn); the others are real endings with a different meaning.
  function judgeCP(tpl, word, choice, why) {
    const C = why._conn || {}, L = why._lang || 'en';
    const lab = k => (C[k] && C[k].lab) || k, m = k => (C[k] && (C[k][L] || C[k].en)) || '';
    if (!word || !choice) return { grade: 'no', why: '', correct: tpl.conn };
    if (choice === tpl.conn) return { grade: 'ok', why: fill(why.conn_ok, { lab: lab(choice), m: m(choice) }), correct: tpl.conn };
    if (tpl.conn === 'nika' && choice === 'eoseo' && why.conn_nika_vs_eoseo) return { grade: 'no', why: fill(why.conn_nika_vs_eoseo, { lab: lab(choice), m: m(choice) }), correct: tpl.conn };
    if (tpl.conn === 'eoseo' && choice === 'nika' && why.conn_eoseo_vs_nika) return { grade: 'no', why: fill(why.conn_eoseo_vs_nika, { lab: lab(choice), m: m(choice) }), correct: tpl.conn };
    return { grade: 'no', why: fill(why.conn_wrong, { lab: lab(choice), m: m(choice), elab: lab(tpl.conn), em: m(tpl.conn) }), correct: tpl.conn };
  }
  function judgeP(tpl, pk, word, verb, choice, why) {
    const spec = pspec(tpl, pk);
    if (choice === '도' || choice === '만') { // auxiliary particles replace the case particle (only offered where the frame lists them)
      if (!word) return { grade: 'no', why: '', correct: choice };
      return { grade: 'ok', why: fill(choice === '도' ? why.aux_do : why.aux_man, { w: word.h }), correct: choice };
    }
    if (pk === 'SP') return judgeSP(tpl, word, choice, why);
    if (pk === 'CP') return judgeCP(tpl, word, choice, why);
    if (['obj', 'dest', 'loc'].includes(spec.expect)) return judgeOP(tpl, spec.expect, word, verb, choice, why);
    return judgeX(tpl, spec.expect, word, verb, choice, why);
  }
  // In the why-lines {v} reads as the verb's meaning in the UI language, e.g. "what you drink" / "飲む".
  function verbLabel(verb, why) {
    if (!verb) return '';
    return why === undefined ? verb.h : (why._lang === 'ja' ? (verb.ja || verb.h) : (verb.en || verb.h).replace(/^to /, ''));
  }

  // Which nouns fit a slot of the template given the chosen verb (for suggestion lists).
  function candidates(tpl, slotKey, words, verb, picks) {
    const nouns = words.nouns;
    if (slotKey === 'S') {
      const subj = nouns.filter(n => n.roles.includes('subj'));
      if (tpl.id === 'is' || tpl.id === 'notice') return subj.filter(n => words.adjectives.some(a => a.fits.some(f => (n.feat || []).includes(f)) && (!tpl.slots.some(k => k.startsWith('AF:')) || !!a[tpl.slots.find(k => k.startsWith('AF:')).slice(3)])));
      if (tpl.id === 'exist') return subj.filter(n => ['person', 'animal', 'item', 'text'].includes(n.kind));
      if (tpl.id === 'want') return subj.filter(n => !!n.ga); // -고 싶어요 declaratives: first person only
      if (tpl.id === 'have' || tpl.id === 'pref') return subj.filter(n => n.kind === 'person');
      if (tpl.id === 'hon_exist' || tpl.id === 'hon_verb') return subj.filter(n => n.elder);
      if (tpl.id === 'because_n') return subj.filter(n => n.h === '비' || n.kind === 'person');
      if (tpl.person) return subj.filter(n => n.kind === 'person');
      if (tpl.id === 'location') return subj.filter(n => ['item', 'animal', 'person'].includes(n.kind) && n.h !== '저' && n.h !== '나');
      if (tpl.plain) return subj.filter(n => n.h === '나'); // 나는 …ㄴ/는다: the written style never takes 저
      if (tpl.q || tpl.no_first) return subj.filter(n => n.kind === 'person' && !n.ga); // questions / -는 것 같아요 are about someone else
      // actors: people always; animals only for predicates that allow them (먹다·마시다·살다·가다…)
      return subj.filter(n => n.kind === 'person' || (n.kind === 'animal' && (!verb || verb.animal)));
    }
    if (slotKey === 'O' || slotKey === 'O2') {
      let list = nouns.filter(n => n.roles.includes('obj'));
      if (verb && verb.takes) list = list.filter(n => compatible(verb, n));
      return list;
    }
    if (slotKey === 'REF') return nouns.filter(n => n.roles.includes('ref') && !(picks && picks.S && picks.S.h === n.h));
    if (slotKey === 'POS') { // 안/밖 need a container; animals and people only have a front, back and side
      const ref = picks && picks.REF; const pos = nouns.filter(n => n.kind === 'pos');
      if (!ref) return pos;
      if (ref.container) return pos;
      if (ref.kind === 'animal' || ref.kind === 'person') return pos.filter(n => ['앞', '뒤', '옆'].includes(n.h));
      return pos.filter(n => n.h !== '안' && n.h !== '밖');
    }
    if (slotKey === 'QD') return nouns.filter(n => n.roles.includes('qd'));
    if (slotKey === 'QO') return nouns.filter(n => n.roles.includes('qo'));
    if (slotKey === 'A1') return words.adjectives.filter(a => (!picks || !picks.S || a.fits.some(f => (picks.S.feat || []).includes(f))) && (tpl.conns || [tpl.conn]).every(k => !!a[k]));
    if (slotKey === 'D') return nouns.filter(n => n.roles.includes('dest'));
    if (slotKey === 'L') return nouns.filter(n => n.roles.includes('loc'));
    if (slotKey === 'T') return nouns.filter(n => n.roles.includes('time'));
    if (slotKey === 'H') return tpl.id === 'pref' ? nouns.filter(n => n.roles.includes('obj') && compatible(words.verbs.find(v => v.h === '좋아하다'), n)) : nouns.filter(n => n.roles.includes('have'));
    if (slotKey === 'W') { const S = picks && picks.S; return nouns.filter(n => n.kind === 'person' && !n.ga && (!S || n.h !== S.h)); } // companions: people, never the subject itself or the speaker
    if (slotKey === 'R') return tpl.verbs === 'hongive' ? nouns.filter(n => n.roles.includes('to') && n.elder) : nouns.filter(n => n.roles.includes('to'));
    return nouns;
  }
  // Which verb slot governs a noun slot: the next predicate slot in order; a destination in a purpose frame belongs to the 가다 auxiliary.
  function verbKeyFor(tpl, nounKey) {
    const slots = tpl.slots, i = slots.indexOf(nounKey);
    if ((nounKey === 'D' || nounKey === 'L') && slots.some(k => k.startsWith('AUX:'))) return slots.find(k => k.startsWith('AUX:'));
    for (let j = i + 1; j < slots.length; j++) if (/^(V|VW|NV|HV|MV|V1|V2|NV2|VF:|AUX:)/.test(slots[j])) return slots[j];
    return slots.find(k => /^(V|VW|NV|HV|MV|V1|V2|NV2|VF:)/.test(k)) || 'V';
  }
  // Verbs for a predicate slot. `which` = 'V1' uses tpl.verbs1 (first clause); VF:key frames need that ending form; connective frames need every quiz ending.
  function verbsFor(tpl, words, tense, which) {
    const has = v => !tense || tense === 'pres' || tense === 'past' || !!v[tense];
    const kind = which === 'V1' && tpl.verbs1 ? tpl.verbs1 : tpl.verbs;
    let list;
    if (tpl.id === 'want') list = words.verbs.filter(v => v.takes && v.want);
    else if (kind === 'transitive') list = words.verbs.filter(v => v.takes && has(v));
    else if (kind === 'move') list = words.verbs.filter(v => v.move && has(v));
    else if (kind === 'exist') list = words.verbs.filter(v => v.exist);
    else if (kind === 'at') list = words.verbs.filter(v => v.at && has(v));
    else if (kind === 'give') list = words.verbs.filter(v => v.to && v.takes && !v.hon && has(v));
    else if (kind === 'hongive') list = words.verbs.filter(v => v.hon && v.to && has(v));
    else if (kind === 'have') list = words.verbs.filter(v => v.have);
    else if (kind === 'like') list = words.verbs.filter(v => v.h === '좋아하다');
    else if (kind === 'honexist') list = words.verbs.filter(v => v.honexist);
    else if (kind === 'hon_verb') list = words.verbs.filter(v => (v.hon || v.please) && has(v));
    else if (kind === 'any_place') list = words.verbs.filter(v => (v.move || v.at || v.takes) && !v.to && !v.hon && has(v));
    else list = [];
    const vf = tpl.slots.find(k => k.startsWith('VF:'));
    if (vf && (!which || which === 'V')) list = list.filter(v => !!v[vf.slice(3)]);
    if (which === 'V1' && tpl.conn) list = list.filter(v => (tpl.conns || [tpl.conn]).every(k => !!v[k]));
    return list;
  }
  function adjectivesFor(subject, words, tpl) {
    if (tpl && tpl.adjs) return words.adjectives.filter(a => tpl.adjs.includes(a.h));
    const af = tpl && tpl.slots.find(k => k.startsWith('AF:'));
    return words.adjectives.filter(a => (!subject || a.fits.some(f => (subject.feat || []).includes(f))) && (!af || !!a[af.slice(3)]));
  }
  function compatible(verb, noun) {
    if (!verb || !noun || !verb.takes) return true;
    return verb.takes.includes(noun.kind) || ['read', 'write', 'ride', 'play', 'photo', 'do', 'learn', 'send'].some(f => verb.takes.includes(f) && !!noun[f]);
  }
  function verbForm(verb, tense, tpl) {
    if (!verb) return '';
    if (tpl && tpl.id === 'hon_verb' && verb.h === '가다') {
      return tense === 'past' ? '가셨어요' : '가세요';
    }
    if (tpl && tpl.id === 'formal') {
      if (tense === 'past' || tense === 'formal_past') return verb.formal_past || verb.past;
      return verb.formal || verb.pres;
    }
    if (tense === 'formal') {
      return tpl && tpl.q ? (verb.formal_q || verb.formal) : (verb.formal || verb.pres);
    }
    if (tense === 'formal_past') {
      return verb.formal_past || verb.past;
    }
    if (tense !== 'pres' && tense !== 'past') return verb[tense] || null; // fail closed: never substitute the present tense for a missing form (moods, connectives)
    return verb[tense] || verb.pres;
  }

  // Assemble the sentence from picks: {S, SP, O, OP, D, L, OP2, V, A, tense, V1, CP, V2, O2, A1, REF, POS, QD, QO, AUX}. Returns chunks (spaces between chunks).
  // Slot kinds: noun+particle pairs · REF bare noun · V1/A1 + CP (verb/adjective with the chosen connective ending) · V2/NV2 final predicate ·
  // VF:key fixed ending form · AUX:verb fixed auxiliary (가다 after -(으)러) · FIX:text literal · QD/QO question words.
  const NOUN_SLOTS = ['O', 'D', 'L', 'T', 'H', 'W', 'R', 'O2', 'POS', 'QD', 'QO'];
  function stemOf(word) { return (word.h || '').replace(/다$/, ''); }
  function assemble(tpl, picks) {
    const chunks = [];
    const slots = tpl.slots;
    const hasS = slots.includes('S');
    if (!picks || (hasS && !picks.S)) return { chunks, text: '', incomplete: true };
    let incomplete = false;
    const pushV = (kind, f, word) => f.split(' ').forEach((part, j) => chunks.push({ kind, text: part, word, tail: j > 0 }));
    for (let i = 0; i < slots.length; i++) {
      const k = slots[i];
      if (k === 'S') { if (picks.tense === 'please') continue; const p = picks.SP || (tpl.id === 'hon_exist' || tpl.id === 'hon_verb' ? '께서' : form(picks.S, tpl.sp)); chunks.push({ kind: 'S', text: chunk(picks.S, p), word: picks.S, particle: p }); } // -(으)세요 is a request to the listener: no subject
      else if (NOUN_SLOTS.includes(k)) {
        if (!picks[k]) return { chunks, text: '', incomplete: true };
        const pk = slots[i + 1], spec = pspec(tpl, pk);
        const p = picks[pk] != null ? picks[pk] : form(picks[k], spec.expect);
        chunks.push({ kind: k, text: chunk(picks[k], p), word: picks[k], particle: p === '∅' ? '' : p });
      }
      else if (k === 'REF') { if (!picks.REF) return { chunks, text: '', incomplete: true }; chunks.push({ kind: 'REF', text: picks.REF.h, word: picks.REF, particle: '' }); }
      else if (k === 'V' || k === 'VW' || k === 'HV') {
        const f = verbForm(picks.V, k === 'VW' ? 'want' : (picks.tense || 'pres'), tpl);
        if (!f) return { chunks, text: '', incomplete: true };
        pushV('V', f, picks.V);
      }
      else if (k === 'MV') { chunks.push({ kind: 'M', text: '못', word: null }); const f = verbForm(picks.V, picks.tense || 'pres', tpl); if (!f) return { chunks, text: '', incomplete: true }; pushV('V', f, picks.V); }
      else if (k === 'NV' || k === 'NV2') {
        const v = k === 'NV2' ? picks.V2 : picks.V;
        chunks.push({ kind: 'N', text: '안', word: null });
        const f = verbForm(v, picks.tense || 'pres', tpl);
        if (!f) return { chunks, text: '', incomplete: true };
        pushV('V', f, v);
      }
      else if (k === 'V2') { const f = verbForm(picks.V2, picks.tense || 'pres', tpl); if (!f) return { chunks, text: '', incomplete: true }; pushV('V', f, picks.V2); }
      else if (k === 'V1' || k === 'A1') {
        const w = picks[k]; if (!w) return { chunks, text: '', incomplete: true };
        const f = picks.CP ? w[picks.CP] : null;
        if (f) pushV(k, f, w); else { chunks.push({ kind: k, text: stemOf(w) + '-', word: w, blank: true }); incomplete = true; }
      }
      else if (k === 'CP') continue;
      else if (k.startsWith('VF:')) { const f = verbForm(picks.V, k.slice(3), tpl); if (!f) return { chunks, text: '', incomplete: true }; pushV('V', f, picks.V); }
      else if (k.startsWith('AUX:')) { const f = verbForm(picks.AUX, picks.tense || 'pres', tpl); if (!f) return { chunks, text: '', incomplete: true }; pushV('V', f, picks.AUX); }
      else if (k.startsWith('FIX:')) chunks.push({ kind: 'X', text: k.slice(4), word: null });
      else if (k === 'A') { if (!picks.A) return { chunks, text: '', incomplete: true }; chunks.push({ kind: 'A', text: verbForm(picks.A, picks.tense || 'pres', tpl), word: picks.A }); }
      else if (k.startsWith('AF:')) { const f = verbForm(picks.A, k.slice(3), tpl); if (!f) return { chunks, text: '', incomplete: true }; pushV('A', f, picks.A); }
    }
    const lastText = chunks.length ? chunks[chunks.length - 1].text : '';
    const end = /[?]$/.test(lastText) ? '' : (tpl.q ? '?' : tpl.excl ? '!' : '.');
    if (incomplete) return { chunks, text: '', incomplete: true, end };
    return { chunks, text: chunks.map(c => c.text).join(' ') + end, end };
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
  const PARTICLES = ['께서는', '께서', '에서', '에게', '한테', '으로', '부터', '까지', '은', '는', '이', '가', '을', '를', '에도', '에', '도', '의', '와', '과', '로', '하고', '만', '께', '이나', '나'];
  const PAIRS = { '은': '는', '는': '은', '이': '가', '가': '이', '을': '를', '를': '을', '와': '과', '과': '와', '으로': '로', '로': '으로', '이나': '나', '나': '이나' };
  const ADVERBS = ['같이', '함께', '지금', '아주', '정말', '너무', '잘', '많이', '조금', '빨리', '자주', '아직', '벌써', '다시', '꼭', '오늘', '내일', '어제', '매일', '항상', '가끔', '먼저', '천천히', '열심히'];
  const COUNTERS = ['명', '개', '마리', '권', '잔', '병', '시', '분'];
  const NUMERALS = ['한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열한', '열두', '열세', '열네', '열다섯', '열여섯', '열일곱', '열여덟', '열아홉', '스무', '스물', '서른', '마흔', '쉰', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const POS_NOUNS = ['위', '아래', '앞', '뒤', '옆', '안', '밖', '밑'];
  const MODIFIERS = ['않는', '않은', '있는', '있은', '없는', '없은'];

  function parseCount(str, counters) {
    const activeCounters = counters || COUNTERS;
    const numRegex = new RegExp("^(" + [...NUMERALS].sort((a, b) => b.length - a.length).join('|') + "|\\d+)\\s*(.*)$");
    const m = str.match(numRegex);
    if (!m) return null;
    const num = m[1];
    const rest = m[2];
    if (!rest) return null;
    for (const cnt of activeCounters) {
      if (rest === cnt) {
        return { num, counter: cnt, particle: null, stem: num + ' ' + cnt };
      }
      for (const p of PARTICLES) {
        if (rest === cnt + p) {
          return { num, counter: cnt, particle: p, stem: num + ' ' + cnt };
        }
      }
    }
    return null;
  }

  function toJamo(str) {
    let res = '';
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      if (c >= 0xAC00 && c <= 0xD7A3) {
        const idx = c - 0xAC00;
        res += CHO[Math.floor(idx / 588)];
        res += JUNG[Math.floor((idx % 588) / 28)];
        const j = JONG[idx % 28].trim();
        if (j) res += j;
      } else {
        res += str[i];
      }
    }
    return res;
  }

  function jamoDistance(a, b) {
    const ja = toJamo(a), jb = toJamo(b);
    const dp = Array.from({ length: ja.length + 1 }, () => new Array(jb.length + 1).fill(0));
    for (let i = 0; i <= ja.length; i++) dp[i][0] = i;
    for (let j = 0; j <= jb.length; j++) dp[0][j] = j;
    for (let i = 1; i <= ja.length; i++) {
      for (let j = 1; j <= jb.length; j++) {
        const cost = ja[i - 1] === jb[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[ja.length][jb.length];
  }

  function isModifierToken(t, verbs) {
    if (MODIFIERS.includes(t)) return true;
    if (t.endsWith('는') || t.endsWith('은')) {
      const s = t.slice(0, -1);
      if (verbs.some(v => stemOf(v) === s || v.h.slice(0, -1) === s)) return true;
    }
    return false;
  }

  function wantsBatchim(p) { return ['은', '이', '을', '과', '으로'].includes(p); }
  // 로/으로: 로 after a vowel or ㄹ, 으로 after other consonants
  function needRo(stem) { const b = batchim(stem); return !b || b === 'ㄹ' ? '로' : '으로'; }
  function checkSentence(text, words, why) {
    const raw = text.trim().replace(/\s+/g, ' ');
    const notes = [], chunks = [];
    if (!raw) return { chunks, notes, verdict: 'empty' };
    const body = raw.replace(/[.!?。！？]+$/, '');
    // Longest-match multiword nouns (남자 친구, 한국 사람) before whitespace tokenisation
    const multi = words.nouns.filter(n => n.h.includes(' ')).map(n => n.h).sort((a, b) => b.length - a.length);
    let joined = body; for (const m of multi) joined = joined.split(m).join(m.replace(/ /g, ' '));
    let tokens = joined.split(' ').map(x => x.replace(/ /g, ' '));
    const allVerbs = [...words.verbs.filter(v => v.hon || v.honexist), ...words.verbs.filter(v => !v.hon && !v.honexist), ...words.adjectives];
    const verbForms = new Map();
    for (const v of allVerbs) for (const k of ['pres', 'past', 'want', 'fut', 'can', 'must', 'please', 'kkayo', 'juseyo', 'jimaseyo', 'bwasseoyo', 'jeok', 'geotgatayo', 'plain', 'ryeogo', 'giro', 'yagesseoyo', 'gedoeda', 'neyo', 'janayo', 'geodeunyo', 'formal', 'formal_past', 'formal_q']) if (v[k] && !verbForms.has(v[k].replace(/\?$/, ''))) verbForms.set(v[k].replace(/\?$/, ''), { v, tense: k });
    // connective forms (먹고 · 먹어서 · 먹으면 · 먹을 때 · 먹으러 …) are recognised as a first clause, not as the final predicate
    const connForms = new Map();
    for (const v of allVerbs) for (const k of ['go', 'eoseo', 'jiman', 'myeon', 'lttae', 'reo', 'ttaemun', 'myeonseo', 'gi_jeone', 'n_hue', 'nika', 'neunde']) if (v[k] && !connForms.has(v[k])) connForms.set(v[k], { v, conn: k });
    // Merge multiword predicate forms (갈 거예요 · 갈 수 있어요 · 가야 해요 · 배우고 싶어요) into one token before anything else
    const merged = [];
    for (let i = 0; i < tokens.length; i++) {
      let hit = null;
      for (let len = 3; len >= 2; len--) { const cand = tokens.slice(i, i + len).join(' '); if (verbForms.has(cand) || connForms.has(cand)) { hit = { cand, len }; break; } }
      if (hit) { merged.push(hit.cand); i += hit.len - 1; } else merged.push(tokens[i]);
    }
    tokens = merged;
    // Merge numeral + counter (두 권 · 두 명 · 세 마리 · 2 개) into one token
    const mergedCounts = [];
    for (let i = 0; i < tokens.length; i++) {
      if (i + 1 < tokens.length && (NUMERALS.includes(tokens[i]) || /^\d+$/.test(tokens[i]))) {
        const next = tokens[i + 1];
        const activeCounters = words.counters || COUNTERS;
        if (activeCounters.some(cnt => next === cnt || next.startsWith(cnt))) {
          mergedCounts.push(tokens[i] + ' ' + next);
          i++;
          continue;
        }
      }
      mergedCounts.push(tokens[i]);
    }
    tokens = mergedCounts;
    const nounByH = h => words.nouns.find(n => n.h === h);
    let verbAt = -1, verb = null, verbTense = null;
    tokens.forEach((tok, i) => {
      const c = { text: tok, kind: 'unknown', status: 'unknown' };
      if (!syllables(tok).length) { c.kind = 'other'; c.status = 'skip'; chunks.push(c); return; }
      const cntInfo = parseCount(tok, words.counters);
      if (cntInfo) {
        c.kind = 'count';
        c.status = 'ok';
        c.num = cntInfo.num;
        c.counter = cntInfo.counter;
        c.particle = cntInfo.particle;
        c.stem = cntInfo.stem;
        chunks.push(c);
        return;
      }
      if (tok.endsWith('입니다') && tok.length > 3) {
        const stem = tok.slice(0, -3);
        const n = nounByH(stem);
        if (n) {
          c.kind = 'noun';
          c.status = 'ok';
          c.particle = '입니다';
          c.stem = stem;
          c.word = n;
          c.known = true;
          verbAt = i;
          chunks.push(c);
          return;
        }
      }
      if (PARTICLES.includes(tok)) { c.kind = 'particle'; c.status = 'no'; notes.push({ grade: 'no', key: 'chk_space_particle', vars: { p: tok, prev: tokens[i - 1] || '' } }); chunks.push(c); return; }
      if (tok.length > 1 && tok.startsWith('안') && verbForms.has(tok.slice(1))) { c.kind = 'verb'; c.status = 'no'; notes.push({ grade: 'no', key: 'chk_an_space', vars: { v: tok.slice(1) } }); chunks.push(c); return; }
      if (verbForms.has(tok)) { const f = verbForms.get(tok); c.kind = 'verb'; c.status = 'ok'; c.word = f.v; c.tense = f.tense; verbAt = i; verb = f.v; verbTense = f.tense; chunks.push(c); return; }
      if (connForms.has(tok)) { const f = connForms.get(tok); c.kind = 'conn'; c.status = 'ok'; c.word = f.v; c.conn = f.conn; chunks.push(c); return; }
      if (tok.endsWith('고싶어요') && verbForms.has(tok.replace('고싶어요', '고 싶어요'))) { c.kind = 'verb'; c.status = 'no'; notes.push({ grade: 'no', key: 'chk_want_space', vars: { v: tok.replace('고싶어요', '고 싶어요') } }); verbAt = i; verb = verbForms.get(tok.replace('고싶어요', '고 싶어요')).v; chunks.push(c); return; }
      if (tok === '안' || tok === '못' || ADVERBS.includes(tok)) { c.kind = 'adv'; c.status = 'ok'; chunks.push(c); return; }
      // R1: 못 + verb
      if (tok === '못해요' || tok === '못했어요') {
        const prevChunk = chunks[chunks.length - 1];
        const hasObj = prevChunk && prevChunk.kind === 'noun' && (prevChunk.particle === '을' || prevChunk.particle === '를');
        if (hasObj) {
          c.kind = 'verb'; c.status = 'ok';
          verbAt = i; verb = words.verbs.find(v => v.h === '하다'); verbTense = tok === '못했어요' ? 'past' : 'pres';
          chunks.push(c); return;
        } else {
          c.kind = 'verb'; c.status = 'maybe';
          notes.push({ grade: 'soft', key: 'chk_mot_space', vars: { v: tok.slice(1) }, fix: '못 ' + tok.slice(1) });
          verbAt = i; verb = words.verbs.find(v => v.h === '하다');
          chunks.push(c); return;
        }
      } else if (tok.length > 1 && tok.startsWith('못') && (verbForms.has(tok.slice(1)) || tok.slice(1) === '해요')) {
        c.kind = 'verb'; c.status = 'maybe';
        notes.push({ grade: 'soft', key: 'chk_mot_space', vars: { v: tok.slice(1) }, fix: '못 ' + tok.slice(1) });
        verbAt = i; verb = verbForms.get(tok.slice(1)) ? verbForms.get(tok.slice(1)).v : null;
        chunks.push(c); return;
      }
      // R1: X못해요
      if (tok.endsWith('못해요') && tok.length > 3) {
        const nstem = tok.slice(0, -3);
        if (nounByH(nstem) || nstem === '이해' || nstem === '공부' || nstem === '운동') {
          c.kind = 'verb'; c.status = 'maybe';
          notes.push({ grade: 'soft', key: 'chk_mot_space', vars: { w: nstem, v: '해요' }, fix: `${nstem}를 못 해요` });
          verbAt = i; chunks.push(c); return;
        }
      }
      // R1: '못' followed by verb/noun-yo (e.g. 못 이해요)
      if (i > 0 && (tokens[i - 1] === '못' || tokens[i - 1] === '안')) {
        const isAn = tokens[i - 1] === '안';
        const cand1 = tok.replace(/요$/, '');
        const cand2 = tok.replace(/해요$/, '');
        const stripped = [cand2, cand1].find(s => s && (nounByH(s) || s === '이해' || s === '공부' || s === '운동'));
        if (stripped) {
          c.kind = 'verb'; c.status = isAn ? 'no' : 'maybe';
          if (isAn) {
            notes.push({ grade: 'no', key: 'chk_an_space', vars: { v: tok }, fix: `${stripped} 안 해요` });
          } else {
            notes.push({ grade: 'soft', key: 'chk_mot_space', vars: { w: stripped, v: '해요' }, fix: `${stripped}를 못 해요` });
          }
          verbAt = i; chunks.push(c); return;
        }
      }
      if (nounByH(tok)) {
        c.kind = 'noun'; c.word = nounByH(tok);
        const isQ = c.word.kind === 'question' || c.word.kind === 'qword';
        const nextTok = tokens[i + 1] || '';
        const isBeforePos = POS_NOUNS.some(p => nextTok === p || nextTok.startsWith(p));
        if (isQ || isBeforePos) {
          c.status = 'bare';
        } else {
          c.status = 'maybe';
        }
        chunks.push(c); return;
      }
      let hit = null;
      for (const p of PARTICLES) {
        if (tok.length > p.length && tok.endsWith(p)) {
          const stem = tok.slice(0, -p.length);
          const n = nounByH(stem) || (stem === '제' && p === '가' ? nounByH('저') : null) || (stem === '내' && p === '가' ? nounByH('나') : null);
          if (n) { hit = { p, stem, n, known: true }; break; }
          if (!hit && /^[가-힣 ]+$/.test(stem)) {
            if ((p === '는' || p === '은') && isModifierToken(tok, allVerbs)) {
              continue;
            }
            hit = { p, stem, n: null, known: false };
          }
        }
      }
      if (hit) {
        c.kind = 'noun'; c.particle = hit.p; c.stem = hit.stem; c.word = hit.n; c.known = hit.known;
        if ((hit.stem === '제' || hit.stem === '내') && hit.p === '가') { c.status = 'ok'; chunks.push(c); return; }
        if ((hit.stem === '저' || hit.stem === '나') && (hit.p === '가' || hit.p === '이')) { c.status = 'no'; notes.push({ grade: 'no', key: 'jeo_ga', vars: { w: hit.stem }, fix: hit.stem === '저' ? '제가' : '내가' }); chunks.push(c); return; }
        if (hit.p === '로' || hit.p === '으로') {
          const need = needRo(hit.stem);
          if (need !== hit.p) { c.status = 'no'; notes.push({ grade: 'no', key: 'chk_ro', vars: { w: hit.stem, p: need }, fix: hit.stem + need, unknown: !hit.known }); chunks.push(c); return; }
        } else if (PAIRS[hit.p]) {
          const need = hasBatchim(hit.stem) ? (wantsBatchim(hit.p) ? hit.p : PAIRS[hit.p]) : (wantsBatchim(hit.p) ? PAIRS[hit.p] : hit.p);
          if (need !== hit.p) { c.status = 'no'; notes.push({ grade: 'no', key: hasBatchim(hit.stem) ? 'batchim_yes' : 'batchim_no', vars: { w: hit.stem, f: batchim(hit.stem), p: need }, fix: hit.stem + need, unknown: !hit.known }); chunks.push(c); return; }
        }
        if (hit.known && hit.n.kind === 'time' && hit.n.tp === 'none' && hit.p === '에') { c.status = 'no'; notes.push({ grade: 'no', key: 'chk_time_none', vars: { w: hit.stem }, fix: hit.stem }); chunks.push(c); return; }
        c.status = hit.known ? 'ok' : 'maybe';
        chunks.push(c); return;
      }
      chunks.push(c);
    });
    const last = tokens[tokens.length - 1];
    if (verbAt >= 0 && verbAt < tokens.length - 1) notes.push({ grade: 'maybe', key: 'chk_verb_last', vars: { v: tokens[verbAt] } });
    if (verbAt < 0 && !/(요|습니다|ㅂ니다|다)$/.test(last)) notes.push({ grade: 'maybe', key: 'chk_ending', vars: { w: last } });
    else if (verbAt < 0 && /(습니다|다)$/.test(last)) notes.push({ grade: 'info', key: 'chk_formal', vars: { w: last } });
    // A connective form closes its clause: the nouns before 먹고 / 가기 전에 belong to that predicate, the rest to the final one.
    const clauses = [{ verb: null, nouns: [] }];
    for (const c of chunks) {
      if (c.kind === 'conn') {
        const cur = clauses[clauses.length - 1]; cur.verb = c.word; const next = { verb: null, nouns: [] };
        if (c.conn === 'reo') { next.nouns = cur.nouns.filter(n => n.particle === '에' && n.word && n.word.kind === 'place'); cur.nouns = cur.nouns.filter(n => !next.nouns.includes(n)); } // 도서관에 책을 읽으러 가요: the destination belongs to 가다
        clauses.push(next);
      }
      else if (c.kind === 'noun') clauses[clauses.length - 1].nouns.push(c);
    }
    clauses[clauses.length - 1].verb = verb;
    const lastChunk = chunks[chunks.length - 1];
    if (chunks.some(c => c.kind === 'conn') && (!verb || (lastChunk && lastChunk.kind !== 'verb'))) notes.push({ grade: 'no', key: 'chk_incomplete', vars: { v: (chunks.filter(c => c.kind === 'conn').pop() || {}).text || '' } });

    // R4: N를 + count를
    for (let i = 0; i < chunks.length - 1; i++) {
      const c1 = chunks[i];
      if (c1.kind === 'noun' && (c1.particle === '을' || c1.particle === '를')) {
        let cntChunk = null;
        if (i + 1 < chunks.length && chunks[i + 1].kind === 'count') {
          cntChunk = chunks[i + 1];
        } else if (i + 2 < chunks.length && chunks[i + 2].kind === 'count') {
          cntChunk = chunks[i + 2];
        }
        if (cntChunk && (cntChunk.particle === '을' || cntChunk.particle === '를' || cntChunk.text.endsWith('을') || cntChunk.text.endsWith('를'))) {
          notes.push({
            grade: 'soft',
            key: 'chk_double_obj',
            vars: { n: c1.stem || c1.text, c: (cntChunk.stem || cntChunk.text).replace(/[을를]$/, '') },
            fix: `${c1.text} ${(cntChunk.stem || cntChunk.text).replace(/[을를]$/, '')}`
          });
        }
      }
    }

    for (const cl of clauses) {
      const verb = cl.verb; if (!verb) continue;
      // R2: Honorific subject agreement
      const honPairs = words.honorificPairs || {
        nouns: { '집': '댁', '밥': '진지' },
        verbs: { '있다': '계시다', '먹다': '드시다', '자다': '주무시다', '주다': '드리다' }
      };
      const honVerbMap = honPairs.verbs || {};
      const honNounMap = honPairs.nouns || {};
      const plainHonVerbs = Object.keys(honVerbMap);

      const subj = cl.nouns.find(c => c.word && (c.particle === '이' || c.particle === '가' || c.particle === '은' || c.particle === '는' || c.particle === '께서' || c.particle === '께서는'));
      const isElderSubj = subj && (subj.word.elder || subj.stem === '부모님' || subj.stem === '할아버지' || subj.stem === '할머니' || subj.stem === '선생님');
      const gkeso = cl.nouns.find(c => c.particle === '께서' || c.particle === '께서는');

      if ((isElderSubj || gkeso) && plainHonVerbs.includes(verb.h)) {
        const honVerbHead = honVerbMap[verb.h];
        const honVerbObj = words.verbs.find(v => v.h === honVerbHead);
        const tense = verbTense || 'pres';
        const fixedVerb = honVerbObj ? (honVerbObj[tense] || honVerbObj.pres) : verb.h;
        const sStem = subj ? subj.stem : (gkeso ? gkeso.stem : '');
        const fixedSubj = sStem ? `${sStem}께서` : '';

        const midChunks = [];
        for (const c of cl.nouns) {
          if (c === subj || c === gkeso) continue;
          let stem = c.stem || c.text;
          let p = c.particle || '';
          if (honNounMap[stem]) {
            const newStem = honNounMap[stem];
            if (p && PAIRS[p]) {
              const needP = hasBatchim(newStem) ? (wantsBatchim(p) ? p : PAIRS[p]) : (wantsBatchim(p) ? PAIRS[p] : p);
              p = needP;
            }
            stem = newStem;
          }
          midChunks.push(stem + p);
        }

        const fixParts = [];
        if (fixedSubj) fixParts.push(fixedSubj);
        if (midChunks.length) fixParts.push(...midChunks);
        if (fixedVerb) fixParts.push(fixedVerb);
        const fixSentence = fixParts.join(' ') + '.';

        notes.push({
          grade: 'soft',
          key: 'chk_honorific',
          vars: { s: sStem, v: verb.h },
          fix: fixSentence
        });
      }

      // R3: 에+도 with movement verb
      for (const c of cl.nouns) {
        if (c.particle === '도' && c.word && c.word.kind === 'place' && verb.move) {
          notes.push({
            grade: 'soft',
            key: 'chk_edo',
            vars: { w: c.stem },
            fix: c.stem + '에도'
          });
        }
      }

      const objs = cl.nouns.filter(c => (c.particle === '을' || c.particle === '를'));
      if (objs.length > 1 && !(verb.to)) notes.push({ grade: 'maybe', key: 'chk_dup_obj', vars: {} });
      for (const c of cl.nouns) {
        if (!c.particle || !c.word) continue;
        const w = c.word, isPlace = w.kind === 'place', isPerson = w.kind === 'person';
        // recipients first: 친구에 주다 → 친구에게 (never "친구를")
        if (verb.to && isPerson && c.particle === '에') { notes.push({ grade: 'no', key: 'chk_to_person', vars: { w: c.stem }, fix: c.stem + '에게' }); c.status = 'no'; continue; }
        if (verb.h === '만나다' && isPerson && (c.particle === '에게' || c.particle === '한테')) { notes.push({ grade: 'no', key: 'chk_meet_obj', vars: { w: c.stem, p: form(w, 'obj') }, fix: c.stem + form(w, 'obj') }); c.status = 'no'; continue; }
        if (verb.h === '좋아하다' && !isPlace && (c.particle === '이' || c.particle === '가') && chunks.some(x => x !== c && x.kind === 'noun' && /^(은|는)$/.test(x.particle || ''))) { notes.push({ grade: 'no', key: 'chk_like_obj', vars: { w: c.stem, p: form(w, 'obj') }, fix: c.stem + form(w, 'obj') }); c.status = 'no'; continue; }
        if (verb.have && (c.particle === '을' || c.particle === '를') && chunks.some(x => x !== c && x.kind === 'noun' && /^(은|는)$/.test(x.particle || ''))) { notes.push({ grade: 'no', key: 'have_wrong_obj', vars: { w: c.stem, p: form(w, 'have') }, fix: c.stem + form(w, 'have') }); c.status = 'no'; continue; }
        if (verb.exist && !verb.have && (c.particle === '을' || c.particle === '를') && !isPlace) { notes.push({ grade: 'no', key: 'exist_subject_ok', vars: { w: c.stem }, fix: c.stem + form(w, 'subject') }); c.status = 'no'; continue; }
        if (verb.move && c.particle === '에서' && isPlace) { notes.push({ grade: 'maybe', key: 'chk_source', vars: { w: c.stem } }); continue; }
        if (verb.move && (c.particle === '을' || c.particle === '를') && isPlace) { notes.push({ grade: 'maybe', key: 'dest_wrong_obj', vars: { w: c.stem, v: verb.h }, fix: c.stem + '에' }); continue; }
        if (verb.exist && c.particle === '에서' && isPlace) { notes.push({ grade: 'no', key: 'exist_wrong_loc', vars: { w: c.stem }, fix: c.stem + '에' }); c.status = 'no'; continue; }
        if ((verb.takes || verb.at) && c.particle === '에' && isPlace && !verb.exist && !verb.locBoth) { notes.push({ grade: 'no', key: 'loc_wrong_dest', vars: { w: c.stem, v: verb.h }, fix: c.stem + '에서' }); c.status = 'no'; continue; }
        if (verb.takes && (c.particle === '에' || c.particle === '에서') && !isPlace && !isPerson && w.kind !== 'time') { notes.push({ grade: 'no', key: c.particle === '에' ? 'obj_wrong_dest' : 'obj_wrong_loc', vars: { w: c.stem }, fix: c.stem + form(w, 'obj') }); c.status = 'no'; continue; }
        if (verb.takes && (c.particle === '을' || c.particle === '를') && !compatible(verb, w) && w.kind !== 'unknown') notes.push({ grade: 'maybe', key: 'chk_pair', vars: { w: c.stem, v: verb.h } });
      }
    }

    // R5: Typo check for unknown chunks
    const allHeadwords = [
      ...words.nouns.map(n => n.h),
      ...allVerbs.map(v => v.h),
      ...allVerbs.map(v => stemOf(v)),
      ...(words.adjectives || []).map(a => a.h)
    ];

    for (const c of chunks) {
      if (c.status === 'unknown' || c.status === 'maybe' || !c.word) {
        const tok = c.text;
        const candSlices = [tok];
        for (const end of ['입니다', '이에요', '예요', '해요', '해', '보조입니다']) {
          if (tok.endsWith(end) && tok.length > end.length) candSlices.push(tok.slice(0, -end.length));
        }
        for (const p of PARTICLES) {
          if (tok.endsWith(p) && tok.length > p.length) candSlices.push(tok.slice(0, -p.length));
        }
        let matched = null;
        for (const cand of candSlices) {
          if (cand.length < 2) continue;
          for (const hw of allHeadwords) {
            if (hw.length >= 2 && jamoDistance(cand, hw) === 1) {
              matched = { cand, hw };
              break;
            }
          }
          if (matched) break;
        }
        if (matched) {
          const fixed = tok.replace(matched.cand, matched.hw);
          notes.push({
            grade: 'soft',
            key: 'chk_typo',
            vars: { fix: fixed, orig: tok, w: matched.hw },
            fix: fixed
          });
        }
      }
    }

    // R7: Headline honesty
    const knownCount = chunks.filter(c => (c.status === 'ok' || c.status === 'bare') && c.kind !== 'unknown' && c.known !== false).length;
    const totalCount = chunks.filter(c => c.status !== 'skip').length;
    const mostlyUnknown = totalCount > 0 && knownCount < totalCount / 2;

    const unknown = chunks.filter(c => c.status === 'unknown' || c.status === 'maybe').length;
    if (chunks.length && (lastChunk.kind === 'conn' || (lastChunk.kind === 'noun' && verbAt < 0 && chunks.some(c => c.kind === 'conn')))) { /* handled above */ }
    const bad = notes.some(n => n.grade === 'no');
    const hasSoft = notes.some(n => n.grade === 'soft' || n.grade === 'maybe');
    let verdict = bad ? 'no' : (unknown > 0 || mostlyUnknown) ? 'partial' : hasSoft ? 'soft' : 'ok';
    return { chunks, notes, verb, verbTense, verdict, unknown, mostlyUnknown };
  }
  return { PARTICLES, checkSentence, needRo, pspec, isPKey, judgeX, judgeP, judgeCP, verbKeyFor, NOUN_SLOTS, stemOf, DEFAULT_P, CHO, JUNG, JONG, BASIC_CONSONANTS, BASIC_VOWELS, decompose, compose, syllables, batchim, hasBatchim, hasJamo, jamoPositions,
    FAMILY, SP_OPTIONS, OP_OPTIONS, familyOf, form, chunk, judgeSP, judgeOP, candidates, verbsFor, adjectivesFor, compatible, verbForm, assemble, cells };
});
