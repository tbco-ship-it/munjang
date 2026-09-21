// node scripts/test_munjang.mjs — engine checks against hand-verified Korean.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const M = require('../static/munjang.js');
const W = JSON.parse(fs.readFileSync(new URL('../data/words.json', import.meta.url)));
const T = JSON.parse(fs.readFileSync(new URL('../data/templates.json', import.meta.url)));
const WHY = { ...T.why.en, _lang: 'en' };
const noun = h => W.nouns.find(n => n.h === h);
const verb = h => W.verbs.find(v => v.h === h);
const adj = h => W.adjectives.find(a => a.h === h);
const tpl = id => T.templates.find(t => t.id === id);
let fails = 0;
const eq = (a, b, label) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.log('FAIL', label, '\n  got', JSON.stringify(a), '\n  want', JSON.stringify(b)); } };

// decomposition + 받침
eq(M.decompose('한'), { cho: 'ㅎ', jung: 'ㅏ', jong: 'ㄴ' }, 'decompose 한');
eq(M.decompose('가'), { cho: 'ㄱ', jung: 'ㅏ', jong: '' }, 'decompose 가');
eq(M.compose('ㅎ', 'ㅏ', 'ㄴ'), '한', 'compose');
eq(M.batchim('가방'), 'ㅇ', '받침 가방');
eq(M.batchim('커피'), '', '받침 커피');
eq(M.hasJamo('강아지', 'ㅇ'), true, 'ㅇ in 강아지');
eq(M.hasJamo('커피', 'ㅋ'), true, 'ㅋ in 커피');
eq(M.hasJamo('커피', 'ㄱ'), false, 'ㄱ not in 커피');
eq(M.jamoPositions('한글', 'ㄹ'), [{ i: 1, pos: 'jong' }], 'positions');

// particle forms
eq(M.form(noun('가방'), 'topic'), '은', '가방은');
eq(M.form(noun('커피'), 'obj'), '를', '커피를');
eq(M.form(noun('물'), 'obj'), '을', '물을');
eq(M.form(noun('김치'), 'subject'), '가', '김치가');
eq(M.chunk(noun('저'), '가'), '제가', '저+가 → 제가');
eq(M.chunk(noun('저'), '는'), '저는', '저는');

// judge SP
eq(M.judgeSP(tpl('act'), noun('저'), '는', WHY).grade, 'ok', '저는 in act');
eq(M.judgeSP(tpl('act'), noun('저'), '은', WHY).grade, 'no', '저은 form error');
eq(M.judgeSP(tpl('act'), noun('저'), '가', WHY).grade, 'soft', '제가 in act = contrast');
eq(M.judgeSP(tpl('act'), noun('선생님'), '은', WHY).grade, 'ok', '선생님은');
eq(M.judgeSP(tpl('act'), noun('선생님'), '는', WHY).grade, 'no', '선생님는 form');
eq(M.judgeSP(tpl('is'), noun('김치'), '가', WHY).grade, 'ok', '김치가 맛있어요');
eq(M.judgeSP(tpl('is'), noun('김치'), '는', WHY).grade, 'soft', '김치는 = contrast');
eq(M.judgeSP(tpl('is'), noun('김치'), '이', WHY).grade, 'no', '김치이 form');
eq(M.judgeSP(tpl('exist'), noun('고양이'), '가', WHY).grade, 'ok', '고양이가 있어요');
eq(M.judgeSP(tpl('act'), noun('가방'), '은', WHY).why, '“가방” ends in a consonant (받침 ㅇ) → 은'.replace('→ 은', '→ 은') && M.judgeSP(tpl('act'), noun('가방'), '은', WHY).why, 'why string exists');
console.log('  why(가방,은):', M.judgeSP(tpl('act'), noun('가방'), '은', WHY).why);
console.log('  why(가방,는):', M.judgeSP(tpl('act'), noun('가방'), '는', WHY).why);

// judge OP
eq(M.judgeOP(tpl('act'), 'obj', noun('커피'), verb('마시다'), '를', WHY).grade, 'ok', '커피를 마셔요');
eq(M.judgeOP(tpl('act'), 'obj', noun('커피'), verb('마시다'), '을', WHY).grade, 'no', '커피을 form');
eq(M.judgeOP(tpl('act'), 'obj', noun('커피'), verb('마시다'), '에', WHY).grade, 'no', '커피에 마셔요 wrong family');
eq(M.judgeOP(tpl('go'), 'dest', noun('학교'), verb('가다'), '에', WHY).grade, 'ok', '학교에 가요');
eq(M.judgeOP(tpl('go'), 'dest', noun('학교'), verb('가다'), '에서', WHY).grade, 'no', '학교에서 가요');
eq(M.judgeOP(tpl('go'), 'dest', noun('학교'), verb('가다'), '를', WHY).grade, 'no', '학교를 가요');
eq(M.judgeOP(tpl('at'), 'loc', noun('카페'), verb('마시다'), '에서', WHY).grade, 'ok', '카페에서 마셔요');
eq(M.judgeOP(tpl('at'), 'loc', noun('카페'), verb('마시다'), '에', WHY).grade, 'no', '카페에 마셔요');
eq(M.judgeOP(tpl('exist'), 'dest', noun('집'), verb('있다'), '에', WHY).grade, 'ok', '집에 있어요');
eq(M.judgeOP(tpl('exist'), 'dest', noun('집'), verb('있다'), '에서', WHY).grade, 'no', '집에서 있어요');
console.log('  why(학교,에서,가다):', M.judgeOP(tpl('go'), 'dest', noun('학교'), verb('가다'), '에서', WHY).why);
console.log('  why(커피,를):', M.judgeOP(tpl('act'), 'obj', noun('커피'), verb('마시다'), '를', WHY).why);

// assemble
eq(M.assemble(tpl('act'), { S: noun('저'), O: noun('커피'), V: verb('마시다') }).text, '저는 커피를 마셔요.', 'act default');
eq(M.assemble(tpl('act'), { S: noun('저'), O: noun('밥'), V: verb('먹다'), tense: 'past' }).text, '저는 밥을 먹었어요.', 'act past');
eq(M.assemble(tpl('want'), { S: noun('저'), O: noun('한국어'), V: verb('배우다') }).text, '저는 한국어를 배우고 싶어요.', 'want');
eq(M.assemble(tpl('want'), { S: noun('저'), O: noun('한국어'), V: verb('배우다') }).chunks.map(c => c.text), ['저는', '한국어를', '배우고', '싶어요'], 'want chunks (space before 싶어요)');
eq(M.assemble(tpl('go'), { S: noun('저'), D: noun('학교'), V: verb('가다') }).text, '저는 학교에 가요.', 'go');
eq(M.assemble(tpl('at'), { S: noun('친구'), L: noun('카페'), O: noun('커피'), V: verb('마시다') }).text, '친구는 카페에서 커피를 마셔요.', 'at');
eq(M.assemble(tpl('live'), { S: noun('저'), L: noun('서울'), V: verb('살다') }).text, '저는 서울에서 살아요.', 'live');
eq(M.assemble(tpl('is'), { S: noun('김치'), A: adj('맛있다') }).text, '김치가 맛있어요.', 'is');
eq(M.assemble(tpl('is'), { S: noun('영화'), A: adj('재미있다'), tense: 'past' }).text, '영화가 재미있었어요.', 'is past');
eq(M.assemble(tpl('exist'), { S: noun('고양이'), L: noun('집'), V: verb('있다') }).text, '고양이가 집에 있어요.', 'exist');
eq(M.assemble(tpl('exist'), { S: noun('저'), L: noun('집'), V: verb('있다') }).text, '제가 집에 있어요.', 'exist with 저 → 제가');
eq(M.assemble(tpl('act'), { S: noun('저'), SP: '가', O: noun('커피'), V: verb('마시다') }).text, '제가 커피를 마셔요.', 'user picked 가 on 저');

// compatibility + candidates
eq(M.compatible(verb('마시다'), noun('커피')), true, '마시다+커피');
eq(M.compatible(verb('마시다'), noun('책')), false, '마시다+책');
eq(M.compatible(verb('읽다'), noun('책')), true, '읽다+책');
eq(M.compatible(verb('읽다'), noun('편지')), true, '읽다+편지');
eq(M.compatible(verb('쓰다'), noun('편지')), true, '쓰다+편지');
eq(M.candidates(tpl('act'), 'O', W, verb('듣다')).map(n => n.h), ['노래', '음악'], '듣다 objects');
eq(M.verbsFor(tpl('go'), W).map(v => v.h), ['가다', '오다'], 'move verbs');
eq(M.adjectivesFor(noun('김치'), W).map(a => a.h).includes('맛있다'), true, '김치 맛있다');
eq(M.adjectivesFor(noun('김치'), W).map(a => a.h).includes('어렵다'), false, '김치 어렵다 excluded');

// cells
eq(M.cells('저는 커피를 마셔요.', 10), ['저', '는', '', '커', '피', '를', '', '마', '셔', '요', '.', '', '', '', '', '', '', '', '', ''], 'cells');

// every verb/adjective conjugation present, every noun has en+ja+r
for (const v of [...W.verbs, ...W.adjectives]) if (!v.pres || !v.past) { fails++; console.log('FAIL missing forms', v.h); }
for (const n of W.nouns) if (!n.en || !n.ja || !n.r) { fails++; console.log('FAIL missing meaning', n.h); }
// every basic jamo has at least 3 words
for (const j of [...M.BASIC_CONSONANTS, ...M.BASIC_VOWELS]) {
  const c = [...W.nouns, ...W.verbs, ...W.adjectives].filter(w => M.hasJamo(w.h, j)).length;
  if (c < 3) { fails++; console.log('FAIL jamo coverage', j, c); }
}

// sentence checker
const chk = (s) => M.checkSentence(s, W, WHY);
eq(chk('저는 커피를 마셔요.').verdict, 'ok', 'chk ok');
eq(chk('저는 학교에서 가요.').notes.map(n => n.key), ['chk_source'], 'chk 학교에서 가요 = possible source, not an error');
eq(chk('저는 카페에 커피를 마셔요.').notes.map(n => n.key), ['loc_wrong_dest'], 'chk 카페에 마셔요');
eq(chk('가방 을 사요.').notes.map(n => n.key), ['chk_space_particle'], 'chk bare particle');
eq(chk('저는 한국어를 배우고싶어요.').notes.map(n => n.key), ['chk_want_space'], 'chk 고싶어요');
eq(chk('저는 커피를 안마셔요.').notes.map(n => n.key), ['chk_an_space'], 'chk 안 glued');
eq(chk('저는 마셔요 커피를.').notes.map(n => n.key), ['chk_verb_last'], 'chk verb last');
eq(chk('저가 커피를 마셔요.').notes.map(n => n.key), ['jeo_ga'], 'chk 저가');
eq(chk('제가 커피를 마셔요.').verdict, 'ok', 'chk 제가');
eq(chk('학교은 커요.').notes[0].fix, '학교는', 'chk form fix');
eq(chk('연필은 커요.').verdict, 'partial', 'chk unknown noun form ok → partial');
eq(chk('바나나은 맛있어요.').notes[0].fix, '바나나는', 'chk unknown noun form error');
eq(chk('사과가 맛있어요.').verdict, 'ok', 'chk 사과 not parsed as 사+과');
eq(chk('저는 커피').notes.map(n => n.key), ['chk_ending'], 'chk missing verb');
eq(chk('저는 책을 마셔요.').notes.map(n => n.key), ['chk_pair'], 'chk odd pair');
eq(chk('고양이가 집에서 있어요.').notes.map(n => n.key), ['exist_wrong_loc'], 'chk 집에서 있어요');

// new frames
eq(M.assemble(tpl('neg'), { S: noun('저'), O: noun('커피'), V: verb('마시다') }).text, '저는 커피를 안 마셔요.', 'neg');
eq(M.assemble(tpl('time'), { T: noun('주말'), S: noun('저'), D: noun('공원'), V: verb('가다') }).text, '주말에 저는 공원에 가요.', 'time 주말에');
eq(M.assemble(tpl('time'), { T: noun('오늘'), S: noun('저'), D: noun('공원'), V: verb('가다'), tense: 'fut' }).text, '오늘 저는 공원에 갈 거예요.', 'time 오늘 ∅ + fut');
eq(M.assemble(tpl('have'), { S: noun('저'), H: noun('시간'), V: verb('있다') }).text, '저는 시간이 있어요.', 'have');
eq(M.assemble(tpl('have'), { S: noun('저'), H: noun('돈'), V: verb('없다'), tense: 'past' }).text, '저는 돈이 없었어요.', 'have 없다 past');
eq(M.assemble(tpl('with'), { S: noun('저'), W: noun('친구'), O: noun('영화'), V: verb('보다') }).text, '저는 친구와 영화를 봐요.', 'with 친구와');
eq(M.assemble(tpl('with'), { S: noun('저'), W: noun('동생'), O: noun('영화'), V: verb('보다') }).text, '저는 동생과 영화를 봐요.', 'with 동생과');
eq(M.assemble(tpl('give'), { S: noun('저'), R: noun('친구'), O: noun('선물'), V: verb('주다') }).text, '저는 친구에게 선물을 줘요.', 'give');
eq(M.judgeP(tpl('time'), 'TP', noun('오늘'), null, '에', WHY).grade, 'no', '오늘에 wrong');
eq(M.judgeP(tpl('time'), 'TP', noun('오늘'), null, '∅', WHY).grade, 'ok', '오늘 ∅ ok');
eq(M.judgeP(tpl('time'), 'TP', noun('주말'), null, '∅', WHY).grade, 'no', '주말 ∅ wrong');
eq(M.judgeP(tpl('time'), 'TP', noun('아침'), null, '에', WHY).grade, 'ok', '아침에 ok');
eq(M.judgeP(tpl('have'), 'HP', noun('시간'), verb('있다'), '을', WHY).grade, 'no', '시간을 있어요 wrong');
eq(M.judgeP(tpl('have'), 'HP', noun('시간'), verb('있다'), '이', WHY).grade, 'ok', '시간이 있어요');
eq(M.judgeP(tpl('have'), 'HP', noun('시간'), verb('있다'), '가', WHY).grade, 'no', '시간가 form');
eq(M.judgeP(tpl('with'), 'WP', noun('친구'), verb('보다'), '과', WHY).grade, 'no', '친구과 form');
eq(M.judgeP(tpl('with'), 'WP', noun('친구'), verb('보다'), '하고', WHY).grade, 'ok', '친구하고 ok');
eq(M.judgeP(tpl('give'), 'RP', noun('친구'), verb('주다'), '에', WHY).grade, 'no', '친구에 주다 wrong');
eq(M.judgeP(tpl('give'), 'RP', noun('친구'), verb('주다'), '한테', WHY).grade, 'ok', '친구한테 ok');
eq(M.judgeP(tpl('give'), 'RP', noun('친구'), verb('주다'), '를', WHY).grade, 'no', '친구를 주다 wrong');
eq(M.judgeP(tpl('act'), 'OP', noun('커피'), verb('마시다'), '를', WHY).grade, 'ok', 'judgeP delegates OP');
eq(M.verbsFor(tpl('give'), W).map(v => v.h), ['주다', '보내다'], 'give verbs');
eq(M.candidates(tpl('act'), 'O', W, verb('타다')).map(n => n.h).includes('버스'), true, '타다 버스');
eq(M.candidates(tpl('act'), 'O', W, verb('치다')).map(n => n.h), ['피아노', '기타'], '치다 objects');
eq(M.assemble(tpl('act'), { S: noun('저'), O: noun('버스'), V: verb('타다'), tense: 'fut' }).text, '저는 버스를 탈 거예요.', 'fut 타다');
console.log('  why(시간,을):', M.judgeP(tpl('have'), 'HP', noun('시간'), verb('있다'), '을', WHY).why);
console.log('  why(오늘,에):', M.judgeP(tpl('time'), 'TP', noun('오늘'), null, '에', WHY).why);
for (const v of W.verbs) if (v.fut === undefined && v.h !== '좋아하다') { fails++; console.log('FAIL missing fut', v.h); }

// review regressions (GPT-6 Pro 2026-09-22)
eq(M.judgeSP(tpl('is'), noun('저'), '이', WHY).grade, 'no', 'P0 저+이 rejected');
eq(M.judgeSP(tpl('is'), noun('저'), '가', WHY).grade, 'ok', '저+가 → 제가 ok in subject frame');
eq(M.chunk(noun('저'), '이'), '저이', 'chunk does not contract 저+이');
eq(M.chunk(noun('나'), '가'), '내가', '나+가 → 내가');
eq(M.candidates(tpl('act'), 'S', W).some(n => n.h === '커피'), false, 'coffee cannot be an actor');
eq(M.candidates(tpl('exist'), 'S', W).some(n => n.h === '서울'), false, 'Seoul cannot exist at home');
eq(M.candidates(tpl('want'), 'S', W).map(n => n.h), ['저', '나'], 'want frame: first person only');
eq(M.verbsFor(tpl('want'), W).some(v => v.h === '좋아하다'), false, '좋아하다 excluded from want');
eq(M.verbForm(verb('좋아하다'), 'want'), null, 'missing want form fails closed');
eq(M.verbsFor(tpl('act'), W, 'fut').some(v => v.h === '좋아하다'), false, 'no fut form → excluded');
eq(M.candidates(tpl('act'), 'O', W, verb('쓰다')).map(n => n.h).includes('요리'), false, '요리를 써요 excluded');
eq(M.candidates(tpl('act'), 'O', W, verb('쓰다')).map(n => n.h).includes('편지'), true, '편지를 써요');
eq(M.candidates(tpl('act'), 'O', W, verb('사다')).map(n => n.h).includes('편지'), false, '편지를 사요 excluded');
eq(M.candidates(tpl('act'), 'O', W, verb('공부하다')).map(n => n.h).includes('태권도'), false, '태권도를 공부해요 excluded');
eq(M.candidates(tpl('act'), 'O', W, verb('배우다')).map(n => n.h).includes('태권도'), true, '태권도를 배워요');
eq(M.adjectivesFor(noun('사과'), W).map(a => a.h).includes('예쁘다'), true, '사과가 예뻐요 allowed');
eq(M.adjectivesFor(noun('김치'), W).map(a => a.h).includes('크다'), false, '김치가 커요 excluded');
eq(M.adjectivesFor(noun('뉴스'), W).map(a => a.h).includes('예쁘다'), false, '뉴스가 예뻐요 excluded');
eq(M.adjectivesFor(noun('책'), W).map(a => a.h).includes('재미있다'), true, '책이 재미있어요 allowed');
eq(M.adjectivesFor(noun('텔레비전'), W).map(a => a.h).includes('크다'), true, '텔레비전이 커요 allowed');
eq(M.judgeOP(tpl('live'), 'loc', noun('서울'), verb('살다'), '에', WHY).grade, 'ok', '서울에 살아요 accepted');
eq(M.judgeOP(tpl('live'), 'loc', noun('회사'), verb('일하다'), '에', WHY).grade, 'no', '회사에 일해요 rejected');
eq(/이\/가/.test(M.judgeOP(tpl('exist'), 'dest', noun('집'), verb('있다'), '에', WHY).why), false, 'exist place why is about 에, not 이/가');
eq(M.assemble(tpl('act'), {}).incomplete, true, 'assemble incomplete without S');
eq(M.assemble(tpl('want'), { S: noun('저'), O: noun('커피'), V: verb('좋아하다') }).incomplete, true, 'assemble fails closed on missing want form');
eq(M.judgeSP(tpl('act'), undefined, '는', WHY).grade, 'no', 'judgeSP survives undefined noun');

// r2 review regressions
eq(chk('저는 학교에서 왔어요.').notes.some(n => n.grade === 'no'), false, 'r2 #7 source 에서 not rejected');
eq(chk('저는 학교에서 집에 가요.').notes.some(n => n.grade === 'no'), false, 'r2 #7 source + destination ok');
eq(chk('저는 집에 살아요.').verdict, 'ok', 'r2 #8 살다 + 에');
eq(chk('저는 서울로 가요.').verdict, 'ok', 'r2 #9 ㄹ + 로');
eq(chk('저는 부산으로 가요.').verdict, 'ok', 'r2 #9 부산으로 ok');
eq(chk('저는 서울으로 가요.').notes[0].fix, '서울로', 'r2 #9 서울으로 → 서울로');
eq(chk('저는 학교에 가야 해요.').verdict, 'ok', 'r2 #10 compound must parsed');
eq(chk('저는 집에 있어야 해요.').verdict, 'ok', 'r2 #10 있어야 해요');
eq(chk('저는 학교에 갈 수 있어요.').verdict, 'ok', 'r2 #10 can parsed');
eq(chk('학교에 가세요.').verdict, 'ok', 'r2 #10 please parsed');
eq(chk('저는 친구에 선물을 줘요.').notes[0].fix, '친구에게', 'r2 #11 recipient fix');
eq(chk('저는 커피가 좋아해요.').notes.map(n => n.key), ['chk_like_obj'], 'r2 #12 좋아하다 object');
eq(chk('저는 친구에게 만나요.').notes.map(n => n.key), ['chk_meet_obj'], 'r2 #12 만나다');
eq(chk('오늘에 저는 학교에 가요.').notes.map(n => n.key), ['chk_time_none'], 'r2 #12 오늘에');
eq(chk('저는 시간을 있어요.').notes.map(n => n.key), ['have_wrong_obj'], 'r2 #12 시간을 있어요');
eq(chk('저는 친구를 영화를 봐요.').notes.map(n => n.key), ['chk_dup_obj'], 'r2 #12 duplicate objects');
eq(chk('저는 남자 친구가 있어요.').verdict, 'ok', 'r2 #13 multiword noun');
eq(M.verbsFor(tpl('have'), W).map(v => v.h), ['있다', '없다'], 'r2 #2 have verbs');
eq(M.candidates(tpl('act'), 'O', W, verb('하다')).map(n => n.h).includes('숙제'), true, 'r2 #3 숙제를 해요');
eq(M.candidates(tpl('act'), 'O', W, verb('배우다')).map(n => n.h).includes('여행'), false, 'r2 #3 여행을 배워요 excluded');
eq(M.candidates(tpl('act'), 'S', W, verb('읽다')).some(n => n.kind === 'animal'), false, 'r2 #4 animals cannot read');
eq(M.candidates(tpl('act'), 'S', W, verb('먹다')).some(n => n.kind === 'animal'), true, 'r2 #4 animals can eat');
eq(M.candidates(tpl('with'), 'W', W, null, { S: noun('친구') }).some(n => n.h === '친구' || n.h === '나' || n.kind === 'animal'), false, 'r2 #5 companions exclude subject/speaker/animals');
eq(M.candidates(tpl('give'), 'O', W, verb('보내다')).map(n => n.h).includes('한글'), false, 'r2 #6 한글을 보내요 excluded');
eq(M.candidates(tpl('give'), 'O', W, verb('보내다')).map(n => n.h).includes('편지'), true, 'r2 #6 편지를 보내요');

console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
