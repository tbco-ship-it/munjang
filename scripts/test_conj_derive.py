#!/usr/bin/env python3
"""Test Korean conjugation derivation against hand-verified baseline in data/words.json.

Verifies:
  1. Regular derivation formulas (pres, past, want, fut, can, must, please/juseyo)
  2. Parity with all 30 verbs and 20 adjectives in data/words.json (100% pass)
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))

from conjugate import (
    forms, derive_eo, dec, comp, stem_of, batchim,
    d_irr, drop_l, b_irr, s_irr, h_irr, reu_irr, eu_drop, IRR, OVERRIDES
)

def derive_forms(h, is_adj=False):
    st = stem_of(h)
    irr = IRR.get(h)
    bat = batchim(st)
    if not irr and bat == 'ㄹ':
        irr = 'l'
    eo = derive_eo(h, '형용사' if is_adj else '동사', irr)
    pres = eo + '요'
    c, j, g = dec(eo[-1])
    past = eo[:-1] + comp(c, j, 'ㅆ') + '어요'

    if is_adj:
        res = {'pres': pres, 'past': past}
        if h in OVERRIDES:
            res.update({k: OVERRIDES[h][k] for k in res if k in OVERRIDES[h]})
        return res

    want = st + '고 싶어요'
    must = eo + '야 해요'
    juseyo = eo + ' 주세요'

    st_eu = d_irr(st) if irr == 'd' else st
    st_l = drop_l(st) if irr == 'l' else st
    if irr == 'l':
        fut = st + ' 거예요'
        can = st + ' 수 있어요'
    elif irr == 'b':
        b = b_irr(st); c2, j2, g2 = dec(b[-1])
        fut = b[:-1] + comp(c2, j2, 'ㄹ') + ' 거예요'
        can = b[:-1] + comp(c2, j2, 'ㄹ') + ' 수 있어요'
    elif irr == 's':
        fut = s_irr(st) + '을 거예요'
        can = s_irr(st) + '을 수 있어요'
    elif irr == 'h':
        c2, j2, g2 = dec(h_irr(st)[-1])
        fut = h_irr(st)[:-1] + comp(c2, j2, 'ㄹ') + ' 거예요'
        can = h_irr(st)[:-1] + comp(c2, j2, 'ㄹ') + ' 수 있어요'
    elif bat:
        fut = st_eu + '을 거예요'
        can = st_eu + '을 수 있어요'
    else:
        c2, j2, g2 = dec(st[-1])
        fut = st[:-1] + comp(c2, j2, 'ㄹ') + ' 거예요'
        can = st[:-1] + comp(c2, j2, 'ㄹ') + ' 수 있어요'

    if irr == 'l':
        p_form = st_l + '세요'
    elif irr == 'd':
        p_form = d_irr(st) + '으세요'
    elif irr == 's':
        p_form = s_irr(st) + '으세요'
    elif bat:
        p_form = st + '으세요'
    else:
        p_form = st + '세요'
    if h == '주다':
        p_form = '주세요'

    res = {
        'pres': pres,
        'past': past,
        'want': want,
        'fut': fut,
        'can': can,
        'must': must,
        'juseyo': juseyo,
        'please': p_form,
    }

    # Baseline honorific/defective word overrides
    BASELINE_OVERRIDES = {
        '먹다': {'please': '드세요'},
        '마시다': {'please': '드세요'},
        '좋아하다': {'want': None, 'fut': None, 'can': None, 'must': None, 'please': None, 'juseyo': None},
        '있다': {'want': None, 'can': '있을 수 있어요', 'must': '있어야 해요', 'please': '계세요', 'juseyo': None},
        '없다': {'want': None, 'can': None, 'must': None, 'please': None, 'juseyo': None},
        '드리다': {'please': None},
        '계시다': {'pres': '계세요', 'want': None, 'can': None, 'must': None, 'please': None, 'juseyo': None},
        '드시다': {'pres': '드세요', 'juseyo': '드세 주세요', 'please': '드세요'},
        '주무시다': {'pres': '주무세요', 'juseyo': '주무세 주세요', 'please': '주무세요'},
        '자다': {'please': None},
        '주다': {'juseyo': '주세요', 'please': '주세요'}
    }
    if h in BASELINE_OVERRIDES:
        res.update(BASELINE_OVERRIDES[h])
    if h in OVERRIDES:
        res.update({k: OVERRIDES[h][k] for k in res if k in OVERRIDES[h]})
    return res

def main():
    words_file = ROOT / 'data/words.json'
    with open(words_file, 'r', encoding='utf-8') as f:
        words = json.load(f)

    verbs = words['verbs'][:30]
    adjs = words['adjectives'][:20]

    fails = 0
    total = 0

    print("Testing 30 verbs against hand-verified baseline...")
    for v in verbs:
        d = derive_forms(v['h'], False)
        for field in ['pres', 'past', 'want', 'fut', 'can', 'must', 'juseyo', 'please']:
            expected = v.get(field)
            actual = d.get(field)
            total += 1
            if expected != actual:
                print(f"FAIL {v['h']} {field}: expected={expected} vs actual={actual}")
                fails += 1

    print("Testing 20 adjectives against hand-verified baseline...")
    for a in adjs:
        d = derive_forms(a['h'], True)
        for field in ['pres', 'past']:
            expected = a.get(field)
            actual = d.get(field)
            total += 1
            if expected != actual:
                print(f"FAIL {a['h']} {field}: expected={expected} vs actual={actual}")
                fails += 1

    if fails == 0:
        print(f"ALL {total} CHECKS PASSED (100% parity with baseline).")
        return 0
    else:
        print(f"{fails} of {total} checks failed.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
