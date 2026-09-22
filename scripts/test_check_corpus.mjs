// node scripts/test_check_corpus.mjs — 24-sentence learner error corpus fixture (Popo 2026-09-22)
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const M = require('../static/munjang.js');
const W = JSON.parse(fs.readFileSync(new URL('../data/words.json', import.meta.url)));
const T = JSON.parse(fs.readFileSync(new URL('../data/templates.json', import.meta.url)));
const WHY = { ...T.why.en, _lang: 'en' };

export const CORPUS = [
  { id: 1, raw: '초급 밖에 못해요.', corrected: '초급밖에 못 해요.', rule: 'R1', expectedNote: 'chk_mot_space' },
  { id: 2, raw: '못 이해요.', corrected: '이해를 못해요.', rule: 'R1', expectedNote: 'chk_mot_space' },
  { id: 3, raw: '개를 두 마리를 키우고 있어.', corrected: '개를 두 마리 키우고 있어.', rule: 'R4', expectedNote: 'chk_double_obj' },
  { id: 4, raw: '개가 두 마리 똑똑해요.', corrected: '개 두 마리가 똑똑해요.', rule: 'R7', expectedVerdict: 'partial' },
  { id: 5, raw: '할아버지는 댁에 있어요.', corrected: '할아버지께서는 댁에 계세요.', rule: 'R2', expectedNote: 'chk_honorific' },
  { id: 6, raw: '할아버지가 밥을 먹었어요.', corrected: '할아버지께서 진지를 드셨어요.', rule: 'R2', expectedNote: 'chk_honorific' },
  { id: 7, raw: '집', corrected: '댁', malformed: true },
  { id: 8, raw: '오늘은 날씨 좋네요.', corrected: '오늘 날씨가 좋네요.', expectedVerdictNotOk: true },
  { id: 9, raw: '사전을 위키라고 해요.', corrected: '사전을 위키라고 불러요.', rule: 'R7', expectedVerdict: 'partial' },
  { id: 10, raw: '지금 집종해 시간이에요.', corrected: '지금 집중할 시간이에요.', rule: 'R5', expectedNote: 'chk_typo' },
  { id: 11, raw: '저 공원도 가고 싶어요.', corrected: '저 공원에도 가고 싶어요.', rule: 'R3', expectedNote: 'chk_edo' },
  { id: 12, raw: '저는 미국 사럼입니다.', corrected: '저는 미국 사람입니다.', rule: 'R5', expectedNote: 'chk_typo' },
  { id: 13, raw: '제 취미는 독사입니다.', corrected: '제 취미는 독서입니다.', rule: 'R5', expectedNote: 'chk_typo' },
  { id: 14, raw: '제 직업은 도사관보조입니다.', corrected: '제 직업은 도서관 보조입니다.', rule: 'R5', expectedNote: 'chk_typo' },
  { id: 15, raw: '제 이름은 스타크켈리이고 미국 사람입니다. 제 취미는 독서이고 직업은 도서관보조입니다.', corrected: '저는 책 읽는 것이 취미이고 도서관 보조로 일하고 있습니다.', rule: 'R7', expectedVerdict: 'partial' },
  { id: 16, raw: '저는 친구보다 펜이 두 개 더 있어요.', corrected: '저는 친구보다 펜 두 개가 더 있어요.', rule: 'R4', expectedNote: 'chk_counter_particle' },
  { id: 17, raw: '저의 여동생은 지난 주보다 이번 주에 책을 두 권 더 읽었어요.', corrected: '제 여동생은 지난주보다 이번 주에 책 두 권을 더 읽었어요.', rule: 'R7', expectedVerdict: 'partial' },
  { id: 18, raw: '바쁘라고 했어 왜 전화는데?', corrected: '내가 바쁘다고 했는데 왜 전화했어?', rule: 'R7', expectedVerdict: 'partial' },
  { id: 19, raw: '주말인데 한국어를 공부할 수도 있어요.', corrected: '주말이지만 한국어를 공부할 수도 있어요.', rule: 'R7', expectedVerdict: 'partial' },
  { id: 20, raw: '슈퍼에 가는데 야채랑 과일을 사요.', corrected: '슈퍼에 가서 야채랑 과일을 샀어요.', rule: 'R7', expectedVerdict: 'partial' },
  { id: 21, raw: '나도 너랑 친구라고 생각했었는데 너 너무해요.', corrected: '난 너랑 친구라고 생각했는데 너 너무해.', rule: 'R7', expectedVerdict: 'partial' },
  { id: 22, raw: '그런거 할 수도 것같아요.', corrected: '그런 거라면 할 수도 있을 것 같아요.', rule: 'R7', expectedVerdict: 'partial' },
  { id: 23, raw: '않는', corrected: '않을', malformed: true },
  { id: 24, raw: '저는 커피를 좋아해요', corrected: '저', malformed: true }
];

let fails = 0;

for (const item of CORPUS) {
  const r = M.checkSentence(item.raw, W, WHY);
  if (item.malformed) {
    console.log(`[#${item.id} MALFORMED EXCLUDED] "${item.raw}"`);
    continue;
  }

  // 1. None of the valid 21 sentences may be plain 'ok'
  if (r.verdict === 'ok') {
    fails++;
    console.log(`FAIL #${item.id}: plain 'ok' on error sentence: "${item.raw}"`);
  }

  // 2. R1-R6 designated note keys must appear
  if (item.expectedNote) {
    const hasNote = r.notes.some(n => n.key === item.expectedNote);
    if (!hasNote) {
      fails++;
      console.log(`FAIL #${item.id}: expected note key '${item.expectedNote}', got: ${JSON.stringify(r.notes.map(n => n.key))}`);
    }
  }

  // 3. R7 expected partial
  if (item.expectedVerdict === 'partial' && r.verdict !== 'partial') {
    fails++;
    console.log(`FAIL #${item.id}: expected verdict 'partial', got '${r.verdict}'`);
  }
}

// R6 parser check: '않는' should not be parsed as noun + 은/는 particle
const r23 = M.checkSentence('않는', W, WHY);
if (r23.notes.some(n => n.key === 'batchim_yes' || n.key === 'batchim_no')) {
  fails++;
  console.log(`FAIL R6: '않는' still parsed as noun + particle with batchim error: ${JSON.stringify(r23.notes)}`);
}

// #1 check: chk_an_space should NOT fire for '못'
const r1 = M.checkSentence('초급 밖에 못해요.', W, WHY);
if (r1.notes.some(n => n.key === 'chk_an_space')) {
  fails++;
  console.log(`FAIL #1: chk_an_space fired for '못해요' (false flag)`);
}

console.log(fails ? `--- ${fails} FAILED ---` : '--- ALL 21 CORPUS CHECKS PASSED ---');
process.exit(fails ? 1 : 0);
