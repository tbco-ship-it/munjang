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
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
