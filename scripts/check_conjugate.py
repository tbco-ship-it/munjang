#!/usr/bin/env python3
"""Compare Korean verb/adjective 3-form conjugations (-아/어, -(으)니, -는) between
the baseline generator and the KRDict JSON dump活用형.

Produces data/wip/conj_mismatch.json capturing irregular verbs and contraction mismatches:
  - ㄷ 불규칙 (듣다 -> 들어, 들으니)
  - ㅂ 불규칙 (춥다 -> 추워, 추우니)
  - ㄹ 탈락 (살다 -> 사니, 사는)
  - 르 불규칙 (부르다 -> 불러)
  - ㅅ 불규칙 (짓다 -> 지어, 지으니)
  - ㅎ 불규칙 (하얗다 -> 하얘, 하야니)
  - 우 불규칙 (푸다 -> 퍼)
  - 으 탈락 (크다 -> 커; 바쁘다 -> 바빠)
  - 모음 축약/탈락 (건너다 -> 건너, 켜다 -> 켜)
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'


def dec(ch):
    i = ord(ch) - 0xAC00
    return CHO[i // 588], JUNG[(i % 588) // 28], JONG[i % 28].strip()


def comp(c, j, g=''):
    return chr(0xAC00 + CHO.index(c) * 588 + JUNG.index(j) * 28 + (JONG.index(g) if g else 0))


def batchim(s):
    return dec(s[-1])[2]


def baseline_conj_3forms(h, pos):
    """Generate basic regular 3 forms (-아/어, -(으)니, -는) without irregular rules."""
    st = h[:-1]
    bat = batchim(st)
    c, j, g = dec(st[-1])

    # 1. -(으)니
    ni = st + ('으니' if bat else '니')

    # 2. -는 (verbs only)
    neun = (st + '는') if pos == '동사' else None

    # 3. -아/어 (basic regular vowel harmony)
    if h == '하다' or st.endswith('하'):
        eo = st[:-1] + '하여'
    elif j in ('ㅏ', 'ㅗ') and not bat:
        eo = st if j == 'ㅏ' else (st + '아')
    elif bat:
        eo = st + ('아' if j in ('ㅏ', 'ㅗ') else '어')
    else:
        eo = st + '어'

    return {'eo': eo, 'ni': ni, 'neun': neun}


def classify_mismatch_reason(h, pos, diffs):
    """Classify the linguistic reason for the conjugation mismatch."""
    st = h[:-1]
    bat = batchim(st)
    c, j, g = dec(st[-1])

    diff_str = json.dumps(diffs, ensure_ascii=False)

    if bat == 'ㄹ':
        return 'ㄹ 탈락'
    if bat == 'ㄷ' and any(k in diff_str for k in ['들', '걸', '물', '실']):
        return 'ㄷ 불규칙'
    if bat == 'ㅂ' and any(k in diff_str for k in ['워', '와', '우니']):
        return 'ㅂ 불규칙'
    if bat == 'ㅅ' and any(k in diff_str for k in ['지어', '나아', '지으', '나으', '부어', '그어']):
        return 'ㅅ 불규칙'
    if bat == 'ㅎ' and pos == '형용사':
        return 'ㅎ 불규칙'
    if h == '푸르다':
        return '러 불규칙'
    if st.endswith('르'):
        return '르 불규칙'
    if h == '푸다':
        return '우 불규칙'
    if j == 'ㅡ' and not bat:
        return '으 탈락'
    return '모음 축약/탈락 (동모음·단모음)'


def run_check(input_path=None, out_path=None):
    if input_path is None:
        input_path = ROOT / 'data/wip/verbs_krdict.json'
    else:
        input_path = Path(input_path)

    if out_path is None:
        out_path = ROOT / 'data/wip/conj_mismatch.json'
    else:
        out_path = Path(out_path)

    with open(input_path, 'r', encoding='utf-8') as f:
        entries = json.load(f)

    mismatches = []
    reason_counts = {}

    for x in entries:
        conjs = x.get('conj', [])
        if not conjs:
            continue
        h = x.get('h')
        if not h:
            continue
        pos = x.get('pos')

        gen = baseline_conj_3forms(h, pos)

        # Extract dump target forms
        dump_ni = next((f for f in conjs if f.endswith('니')), None)
        dump_neun = next((f for f in conjs if f.endswith('는')), None)
        dump_eo_cands = [
            f for f in conjs
            if not any(f.endswith(sfx) for sfx in ['니', '는', '습니다', 'ㅂ니다', '니다', '은', 'ㄴ'])
        ]

        diffs = {}
        if dump_ni and gen['ni'] != dump_ni:
            diffs['ni'] = {'expected': dump_ni, 'gen': gen['ni']}
        if dump_neun and gen['neun'] and gen['neun'] != dump_neun:
            diffs['neun'] = {'expected': dump_neun, 'gen': gen['neun']}
        if dump_eo_cands:
            # Check if generated eo matches any valid dump candidate
            if not any(cand == gen['eo'] for cand in dump_eo_cands):
                diffs['eo'] = {'expected': dump_eo_cands, 'gen': gen['eo']}

        if diffs:
            reason = classify_mismatch_reason(h, pos, diffs)
            reason_counts[reason] = reason_counts.get(reason, 0) + 1
            mismatches.append({
                'id': x['id'],
                'h': h,
                'pos': pos,
                'reason': reason,
                'diffs': diffs,
                'dump_conj': conjs,
            })

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(mismatches, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Recorded {len(mismatches)} mismatches to {out_path}')

    print('\n=== 불일치 원인 분류 통계 ===')
    print(f'{"불일치 원인":<28} | {"개수":>5}')
    print('-' * 38)
    for r, cnt in sorted(reason_counts.items(), key=lambda x: -x[1]):
        print(f'{r:<28} | {cnt:>5}개')
    print(f'{"합계":<28} | {len(mismatches):>5}개')

    print('\n=== 불일치 상위 20 예시 ===')
    for i, m in enumerate(mismatches[:20], 1):
        diff_summary = []
        for k, v in m['diffs'].items():
            diff_summary.append(f"{k}: 생성({v['gen']}) vs 덤프({v['expected']})")
        print(f"{i:2d}. {m['h']} ({m['pos']}) [{m['reason']}]: {', '.join(diff_summary)}")

    return mismatches


def main():
    parser = argparse.ArgumentParser(description='Check 3-form conjugations against krdict dump.')
    parser.add_argument('--input', default=None, help='Path to verbs_krdict.json')
    parser.add_argument('--out', default=None, help='Output path for conj_mismatch.json')
    args = parser.parse_args()

    run_check(args.input, args.out)


if __name__ == '__main__':
    main()
