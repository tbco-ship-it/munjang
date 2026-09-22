// node scripts/test_check_corpus.mjs — 24-sentence learner error corpus fixture (Popo 2026-09-22)
// Refactored per Round 4 C4: 3-group split (must_reject, acceptable_variant, must_ok)
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const M = require('../static/munjang.js');
const W = JSON.parse(fs.readFileSync(new URL('../data/words.json', import.meta.url)));
const T = JSON.parse(fs.readFileSync(new URL('../data/templates.json', import.meta.url)));
const WHY = { ...T.why.en, _lang: 'en' };

// 1. Group: must_reject (errors that must not evaluate to plain 'ok')
export const MUST_REJECT = [
  { id: 1, raw: '초급 밖에 못해요.', corrected: '초급밖에 못 해요.', rule: 'R1', expectedNote: 'chk_mot_space' },
  { id: 2, raw: '못 이해요.', corrected: '이해를 못 해요.', rule: 'R1', expectedNote: 'chk_mot_space' },
  { id: 3, raw: '개를 두 마리를 키우고 있어.', corrected: '개를 두 마리 키우고 있어.', rule: 'R4', expectedNote: 'chk_double_obj' },
  { id: 4, raw: '개가 두 마리 똑똑해요.', corrected: '개 두 마리가 똑똑해요.', rule: 'R7', expectedVerdict: 'partial' },
  { id: 9, raw: '사전을 위키라고 해요.', corrected: '사전을 위키라고 불러요.', rule: 'R7', expectedVerdict: 'partial' },
  { id: 10, raw: '지금 집종해 시간이에요.', corrected: '지금 집중할 시간이에요.', rule: 'R5', expectedNote: 'chk_typo' },
  { id: 12, raw: '저는 미국 사럼입니다.', corrected: '저는 미국 사람입니다.', rule: 'R5', expectedNote: 'chk_typo' },
  { id: 13, raw: '제 취미는 독사입니다.', corrected: '제 취미는 독서입니다.', rule: 'R5', expectedNote: 'chk_typo' },
  { id: 14, raw: '제 직업은 도사관보조입니다.', corrected: '제 직업은 도서관 보조입니다.', rule: 'R5', expectedNote: 'chk_typo' },
  { id: 15, raw: '제 이름은 스타크켈리이고 미국 사람입니다. 제 취미는 독서이고 직업은 도서관보조입니다.', corrected: '저는 책 읽는 것이 취미이고 도서관 보조로 일하고 있습니다.', rule: 'R7', expectedVerdict: 'partial' },
  { id: 16, raw: '저는 친구보다 펜이 두 개 더 있어요.', corrected: '저는 친구보다 펜 두 개가 더 있어요.', rule: 'R4', expectedVerdict: 'partial' },
  { id: 17, raw: '저의 여동생은 지난 주보다 이번 주에 책을 두 권 더 읽었어요.', corrected: '제 여동생은 지난주보다 이번 주에 책 두 권을 더 읽었어요.', rule: 'R7', expectedVerdict: 'partial' },
  { id: 18, raw: '바쁘라고 했어 왜 전화는데?', corrected: '내가 바쁘다고 했는데 왜 전화했어?', rule: 'R7', expectedVerdict: 'partial' },
  { id: 21, raw: '나도 너랑 친구라고 생각했었는데 너 너무해요.', corrected: '난 너랑 친구라고 생각했는데 너 너무해.', rule: 'R7', expectedVerdict: 'partial' },
  { id: 22, raw: '그런거 할 수도 것같아요.', corrected: '그런 거라면 할 수도 있을 것 같아요.', rule: 'R7', expectedVerdict: 'partial' },
  // R4 negative regressions
  { id: 'neg1', raw: '선생님께서 학교에 가요.', rule: 'hon_verb', expectedNote: 'chk_honorific' },
  { id: 'neg2', raw: '친구가 두 명을 있어요.', rule: 'exist_subject', expectedNote: 'exist_subject_ok' },
  { id: 'neg3', raw: '책 두 권를 읽었어요.', rule: 'counter_particle', expectedNote: 'batchim_yes' },
  { id: 'neg4', raw: '저는 밥을 멱어요.', rule: 'typo', expectedNote: 'chk_typo' }
];

// 2. Group: acceptable_variant (natural or acceptable colloquial variants)
export const ACCEPTABLE_VARIANTS = [
  { id: 8, raw: '오늘은 날씨 좋네요.', desc: 'particle dropping in spoken Korean' },
  { id: 11, raw: '저 공원도 가고 싶어요.', expectedNote: 'chk_edo', desc: '도 with movement destination is natural Korean' },
  { id: 19, raw: '주말인데 한국어를 공부할 수도 있어요.', desc: 'background premise with -는데' },
  { id: 20, raw: '슈퍼에 가는데 야채랑 과일을 사요.', desc: 'background action with -는데' }
];

// 3. Group: must_ok (positive sentences that must evaluate to verdict 'ok' with 0 error notes)
export const MUST_OK = [
  { id: 24, raw: '저는 커피를 좋아해요' },
  { id: 'pos1', raw: '저는 밥을 안 먹어요.' },
  { id: 'pos2', raw: '저는 운동을 못 해요.' },
  { id: 'pos3', raw: '할아버지께서 댁에 계세요.' },
  { id: 'pos4', raw: '할아버지께서 진지를 드셨어요.' },
  { id: 'pos5', raw: '저는 공원에도 가요.' },
  { id: 'pos6', raw: '저는 공원에 가요.' },
  { id: 'pos7', raw: '친구가 두 명 있어요.' },
  { id: 'pos8', raw: '저는 책을 두 권 읽었어요.' },
  { id: 'pos9', raw: '저는 사과 한 개를 먹었어요.' },
  { id: 'pos10', raw: '저는 친구가 없어요.' },
  { id: 'pos11', raw: '선생님께서 학교에 가세요.' },
  { id: 'pos12', raw: '할머니께서 진지를 드세요.' }
];

// Honorific soft checks (#5, #6: info note with fix)
export const SOFT_HONORIFICS = [
  { id: 5, raw: '할아버지는 댁에 있어요.', expectedNote: 'chk_honorific' },
  { id: 6, raw: '할아버지가 밥을 먹었어요.', expectedNote: 'chk_honorific' }
];

let fails = 0;

// Test Group 1: must_reject
for (const item of MUST_REJECT) {
  const r = M.checkSentence(item.raw, W, WHY);
  if (r.verdict === 'ok') {
    fails++;
    console.log(`FAIL must_reject #${item.id}: plain 'ok' on error sentence: "${item.raw}"`);
  }
  if (item.expectedNote) {
    const hasNote = r.notes.some(n => n.key === item.expectedNote);
    if (!hasNote) {
      fails++;
      console.log(`FAIL must_reject #${item.id}: expected note key '${item.expectedNote}', got: ${JSON.stringify(r.notes.map(n => n.key))}`);
    }
  }
  if (item.expectedVerdict && r.verdict !== item.expectedVerdict) {
    fails++;
    console.log(`FAIL must_reject #${item.id}: expected verdict '${item.expectedVerdict}', got '${r.verdict}'`);
  }
  if (item.id === 16 && r.notes.some(n => n.key === 'chk_double_obj')) {
    fails++;
    console.log(`FAIL #16: chk_double_obj fired unexpectedly`);
  }
}

// Test Group 2: acceptable_variants
for (const item of ACCEPTABLE_VARIANTS) {
  const r = M.checkSentence(item.raw, W, WHY);
  if (r.verdict === 'no') {
    fails++;
    console.log(`FAIL acceptable_variant #${item.id}: hard rejected as 'no': "${item.raw}"`);
  }
  if (item.expectedNote) {
    const hasNote = r.notes.some(n => n.key === item.expectedNote);
    if (!hasNote) {
      fails++;
      console.log(`FAIL acceptable_variant #${item.id}: expected note '${item.expectedNote}', got: ${JSON.stringify(r.notes.map(n => n.key))}`);
    }
  }
}

// Test Group 3: must_ok
for (const item of MUST_OK) {
  const r = M.checkSentence(item.raw, W, WHY);
  if (r.verdict !== 'ok' || r.notes.length > 0) {
    fails++;
    console.log(`FAIL must_ok #${item.id}: "${item.raw}" expected ok with 0 notes, got '${r.verdict}' with [${r.notes.map(n => n.key).join(', ')}]`);
  }
}

// Test Soft Honorifics (#5, #6) and Roundtrip Fixes
for (const item of SOFT_HONORIFICS) {
  const r = M.checkSentence(item.raw, W, WHY);
  const honNote = r.notes.find(n => n.key === item.expectedNote);
  if (!honNote) {
    fails++;
    console.log(`FAIL soft honorific #${item.id}: missing ${item.expectedNote}`);
  } else if (!honNote.fix) {
    fails++;
    console.log(`FAIL soft honorific #${item.id}: missing fix on ${item.expectedNote}`);
  } else {
    const rf = M.checkSentence(honNote.fix, W, WHY);
    if (rf.verdict !== 'ok' || rf.notes.length > 0) {
      fails++;
      console.log(`FAIL soft honorific #${item.id} roundtrip: fix "${honNote.fix}" expected ok with 0 notes, got '${rf.verdict}' [${rf.notes.map(n => n.key).join(', ')}]`);
    }
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

console.log(fails ? `--- ${fails} FAILED ---` : '--- ALL CORPUS 3-GROUP CHECKS PASSED ---');
process.exit(fails ? 1 : 0);
