#!/usr/bin/env python3
"""Fill connective / ending forms for every verb and adjective in data/words.json.
Rules cover regular stems plus ㄷ·ㅂ·ㄹ·으 irregulars; OVERRIDES win. Run after editing words.json: python scripts/conjugate.py
Forms (key → pattern):
  go 고 · eoseo 아/어서 · jiman 지만 · myeon (으)면 · lttae (으)ㄹ 때 · reo (으)러 · kkayo (으)ㄹ까요? · juseyo 아/어 주세요 · jimaseyo 지 마세요
  bwasseoyo 아/어 봤어요 · jeok (으)ㄴ 적이 있어요 · ttaemun 기 때문에 · geotgatayo 는/(으)ㄴ 것 같아요 · myeonseo (으)면서 · gi_jeone 기 전에
  n_hue (으)ㄴ 후에 · neyo 네요 · janayo 잖아요 · geodeunyo 거든요 · plain ㄴ/는다 · ryeogo (으)려고 해요 · giro 기로 했어요 · yagesseoyo 아/어야겠어요 · gedoeda 게 됐어요
"""
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


def stem_of(h):
    return h[:-1]  # drop 다


def batchim(s):
    return dec(s[-1])[2]


def drop_l(stem):  # 살 → 사 (ㄹ 탈락)
    c, j, g = dec(stem[-1])
    return stem[:-1] + comp(c, j)


def d_irr(stem):  # 듣 → 들 (ㄷ 불규칙)
    c, j, g = dec(stem[-1])
    return stem[:-1] + comp(c, j, 'ㄹ')


def b_irr(stem):  # 춥 → 추우 (ㅂ 불규칙)
    c, j, g = dec(stem[-1])
    return stem[:-1] + comp(c, j) + '우'


def s_irr(stem):  # 짓 → 지 (ㅅ 불규칙)
    c, j, g = dec(stem[-1])
    return stem[:-1] + comp(c, j)


def h_irr(stem):  # 그렇 → 그러 (ㅎ 불규칙)
    c, j, g = dec(stem[-1])
    return stem[:-1] + comp(c, j)


def reu_irr(stem):  # 부르 → 불러, 빠르 → 빨라 (르 불규칙)
    c, j, g = dec(stem[-1])
    if len(stem) > 1:
        c0, j0, g0 = dec(stem[-2])
        p = comp(c0, j0, 'ㄹ')
        v = '라' if j0 in ('ㅏ', 'ㅗ') else '러'
        return stem[:-2] + p + v
    return '러'


def eu_drop(stem):  # 크 → 커, 쓰 → 써, 바쁘 → 바빠 (으 탈락)
    c, j, g = dec(stem[-1])
    if len(stem) > 1:
        c0, j0, g0 = dec(stem[-2])
        v = 'ㅏ' if j0 in ('ㅏ', 'ㅗ') else 'ㅓ'
    else:
        v = 'ㅓ'
    return stem[:-1] + comp(c, v)


def u_irr(stem):  # 푸 → 퍼 (우 불규칙)
    c, j, g = dec(stem[-1])
    return stem[:-1] + comp(c, 'ㅓ')


IRR = {
    # ㄷ 불규칙
    '듣다': 'd', '걷다': 'd', '묻다': 'd', '싣다': 'd',
    # ㄹ 탈락
    '살다': 'l', '멀다': 'l', '만들다': 'l', '알다': 'l', '열다': 'l', '놀다': 'l', '걸다': 'l',
    '울다': 'l', '돌다': 'l', '밀다': 'l', '팔다': 'l', '풀다': 'l', '틀다': 'l', '흔들다': 'l',
    '힘들다': 'l', '가늘다': 'l', '길다': 'l', '달다': 'l',
    # ㅂ 불규칙
    '춥다': 'b', '덥다': 'b', '가깝다': 'b', '귀엽다': 'b', '어렵다': 'b', '쉽다': 'b',
    '가볍다': 'b', '무겁다': 'b', '고맙다': 'b', '반갑다': 'b', '아름답다': 'b', '즐겁다': 'b',
    '부끄럽다': 'b', '외롭다': 'b', '더럽다': 'b', '어둡다': 'b', '뜨겁다': 'b', '차갑다': 'b',
    '맵다': 'b', '싱겁다': 'b', '그립다': 'b', '돕다': 'b', '눕다': 'b', '굽다': 'b',
    # 르 불규칙
    '부르다': 'reu', '빠르다': 'reu', '모르다': 'reu', '다르다': 'reu', '고르다': 'reu',
    '자르다': 'reu', '흐르다': 'reu', '마르다': 'reu', '기르다': 'reu', '나르다': 'reu',
    '게으르다': 'reu', '배부르다': 'reu', '서투르다': 'reu', '어지르다': 'reu', '지르다': 'reu',
    '오르다': 'reu', '누르다': 'reu',
    # ㅅ 불규칙
    '짓다': 's', '낫다': 's', '붓다': 's',
    # ㅎ 불규칙
    '하얗다': 'h', '그렇다': 'h', '빨갛다': 'h', '파랗다': 'h', '노랗다': 'h', '까맣다': 'h',
    '이렇다': 'h', '저렇다': 'h', '어떻다': 'h',
    # 으 탈락
    '크다': 'eu', '쓰다': 'eu', '뜨다': 'eu', '끄다': 'eu', '트다': 'eu', '바쁘다': 'eu',
    '예쁘다': 'eu', '슬프다': 'eu', '아프다': 'eu', '기쁘다': 'eu', '나쁘다': 'eu', '배고프다': 'eu',
    # 우 불규칙 / 러 불규칙
    '푸다': 'u', '푸르다': 'reo',
}


def derive_eo(h, pos='동사', irr=None):
    """Derive -아/어 stem from dictionary form h and part of speech."""
    st = stem_of(h)
    if irr is None:
        irr = IRR.get(h)
    c, j, g = dec(st[-1])

    if h == '하다' or st.endswith('하'):
        return st[:-1] + '해'
    if irr == 'd':
        return comp(c, j, 'ㄹ') + ('아' if j in ('ㅏ', 'ㅗ') else '어')
    if irr == 'b':
        if h == '돕다':
            return st[:-1] + '도와'
        return st[:-1] + comp(c, j) + '워'
    if irr == 's':
        return comp(c, j) + ('아' if j in ('ㅏ', 'ㅗ') else '어')
    if irr == 'h':
        if j == 'ㅑ':
            return st[:-1] + comp(c, 'ㅒ')
        return st[:-1] + comp(c, 'ㅐ')
    if irr == 'reu' or st.endswith('르'):
        return reu_irr(st)
    if irr == 'reo' or h == '푸르다':
        return st + '러'
    if irr == 'u' or h == '푸다':
        return u_irr(st)
    if irr == 'eu' or (j == 'ㅡ' and not g):
        return eu_drop(st)
    if not g:
        if j == 'ㅏ': return st
        if j == 'ㅓ': return st
        if j == 'ㅕ': return st
        if j == 'ㅗ': return st[:-1] + comp(c, 'ㅘ')
        if j == 'ㅜ': return st[:-1] + comp(c, 'ㅝ')
        if j == 'ㅣ': return st[:-1] + comp(c, 'ㅕ')
        if j == 'ㅐ': return st
        if j == 'ㅔ': return st
        if j == 'ㅚ': return st[:-1] + comp(c, 'ㅙ')
    return st + ('아' if j in ('ㅏ', 'ㅗ') else '어')


def forms(h, pres='', past='', adj=False):
    st = stem_of(h)
    irr = IRR.get(h)
    bat = batchim(st)
    if not irr and bat == 'ㄹ':
        irr = 'l'
    # stems for vowel-initial endings (으-endings)
    st_eu = d_irr(st) if irr == 'd' else st  # 들으면
    st_l = drop_l(st) if irr == 'l' else st  # 사네요, 사는
    eo = pres[:-1] if pres else derive_eo(h, '형용사' if adj else '동사', irr)

    def eu(e_bat, e_vow):
        if irr == 'b':
            return b_irr(st) + e_vow
        if irr == 'l':
            return st_l + e_vow if e_vow.startswith('ㄹ') is False else st_l + e_vow
        if irr == 's':
            return s_irr(st) + e_bat
        if irr == 'h':
            return h_irr(st) + e_vow
        return (st_eu + e_bat) if bat else (st + e_vow)

    def l_ending(tail):  # (으)ㄹ + tail
        if irr == 'l':
            return st + tail  # 살 때
        if irr == 'b':
            return b_irr(st)[:-1] + comp(*dec(b_irr(st)[-1])[:2], 'ㄹ') + tail  # 추울 때
        if irr == 's':
            return s_irr(st) + '을' + tail
        if irr == 'h':
            c, j, g = dec(h_irr(st)[-1])
            return h_irr(st)[:-1] + comp(c, j, 'ㄹ') + tail
        if bat:
            return st_eu + '을' + tail  # 먹을 때, 들을 때
        c, j, g = dec(st[-1])
        return st[:-1] + comp(c, j, 'ㄹ') + tail  # 볼 때

    def n_ending(tail):  # (으)ㄴ + tail
        if irr == 'l':
            return drop_l(st)[:-1] + comp(*dec(st_l[-1])[:2], 'ㄴ') + tail  # 산 후에
        if irr == 'b':
            b = b_irr(st); c, j, g = dec(b[-1]); return b[:-1] + comp(c, j, 'ㄴ') + tail  # 추운
        if irr == 's':
            return s_irr(st) + '은' + tail
        if irr == 'h':
            c, j, g = dec(h_irr(st)[-1])
            return h_irr(st)[:-1] + comp(c, j, 'ㄴ') + tail
        if bat:
            return st_eu + '은' + tail
        c, j, g = dec(st[-1])
        return st[:-1] + comp(c, j, 'ㄴ') + tail

    # formal (-ㅂ니다/습니다, -습니까?)
    if irr == 'l':
        c, j, g = dec(st_l[-1])
        formal = st_l[:-1] + comp(c, j, 'ㅂ') + '니다'
        formal_q = st_l[:-1] + comp(c, j, 'ㅂ') + '니까?'
    elif irr == 'h':
        formal = st + '습니다'
        formal_q = st + '습니까?'
    elif bat:
        formal = st + '습니다'
        formal_q = st + '습니까?'
    else:
        c, j, g = dec(st[-1])
        formal = st[:-1] + comp(c, j, 'ㅂ') + '니다'
        formal_q = st[:-1] + comp(c, j, 'ㅂ') + '니까?'
    formal_past = (past[:-2] + '습니다') if past else ''
    formal_past_q = (past[:-2] + '습니까?') if past else ''

    # hon_pres / hon_past (-(으)세요, -(으)셨어요)
    if not adj:
        if irr == 'l':
            hon_pres = st_l + '세요'
            hon_past = st_l + '셨어요'
        elif irr == 'd':
            hon_pres = d_irr(st) + '으세요'
            hon_past = d_irr(st) + '으셨어요'
        elif irr == 's':
            hon_pres = s_irr(st) + '으세요'
            hon_past = s_irr(st) + '으셨어요'
        elif bat:
            hon_pres = st + '으세요'
            hon_past = st + '으셨어요'
        else:
            hon_pres = st + '세요'
            hon_past = st + '셨어요'
    else:
        hon_pres = None
        hon_past = None

    # modifiers (관형사형)
    if not adj:
        mod_pres = (st_l if irr == 'l' else st) + '는'
        mod_past = n_ending('')
        mod_fut = l_ending('')
        mod = None
    else:
        mod_pres = None
        mod_past = None
        mod = (st + '는') if (h.endswith('있다') or h.endswith('없다')) else n_ending('')
        mod_fut = l_ending('')

    # nika (-(으)니까)
    if irr == 'l':
        nika = st_l + '니까'
    elif irr == 'b':
        nika = b_irr(st) + '니까'
    elif irr == 'd':
        nika = d_irr(st) + '으니까'
    elif irr == 's':
        nika = s_irr(st) + '으니까'
    elif irr == 'h':
        nika = h_irr(st) + '니까'
    elif bat:
        nika = st + '으니까'
    else:
        nika = st + '니까'

    # neunde (-는데 / -(으)ㄴ데)
    if not adj:
        neunde = (st_l if irr == 'l' else st) + '는데'
    else:
        if h.endswith('있다') or h.endswith('없다'):
            neunde = st + '는데'
        elif irr == 'l':
            c, j, g = dec(st_l[-1])
            neunde = st_l[:-1] + comp(c, j, 'ㄴ') + '데'
        elif irr == 'b':
            b = b_irr(st); c, j, g = dec(b[-1]); neunde = b[:-1] + comp(c, j, 'ㄴ') + '데'
        elif irr == 'h':
            c, j, g = dec(h_irr(st)[-1])
            neunde = h_irr(st)[:-1] + comp(c, j, 'ㄴ') + '데'
        elif bat:
            neunde = st + '은데'
        else:
            c, j, g = dec(st[-1])
            neunde = st[:-1] + comp(c, j, 'ㄴ') + '데'

    out = {
        'go': st + '고',
        'eoseo': eo + '서',
        'jiman': st + '지만',
        'myeon': eu('으면', '면'),
        'lttae': l_ending(' 때'),
        'ttaemun': st + '기 때문에',
        'gi_jeone': st + '기 전에',
        'neyo': st_l + '네요',
        'myeonseo': eu('으면서', '면서'),
        'giro': st + '기로 했어요',
        'gedoeda': st + '게 됐어요',
        'yagesseoyo': eo + '야겠어요',
        'janayo': st + '잖아요',
        'geodeunyo': st + '거든요',
        'formal': formal,
        'formal_past': formal_past,
        'formal_past_q': formal_past_q,
        'formal_q': formal_q,
        'nika': nika,
        'neunde': neunde,
        'hon_pres': hon_pres,
        'hon_past': hon_past,
        'mod_pres': mod_pres,
        'mod_past': mod_past,
        'mod_fut': mod_fut,
        'mod': mod,
    }
    if not adj:
        out.update({
            'reo': eu('으러', '러'),
            'kkayo': l_ending('까요?'),
            'juseyo': eo + ' 주세요',
            'jimaseyo': st + '지 마세요',
            'bwasseoyo': eo + ' 봤어요',
            'jeok': n_ending(' 적이 있어요'),
            'n_hue': n_ending(' 후에'),
            'geotgatayo': st_l + '는 것 같아요',
            'plain': (st + '는다') if bat and irr != 'l' else (st_l[:-1] + comp(*dec(st_l[-1])[:2], 'ㄴ') + '다'),
            'ryeogo': eu('으려고 해요', '려고 해요'),
        })
    else:  # adjectives: -기로 했어요 / -게 됐어요 / -아/어야겠어요 / -(으)려고 need a controllable action → not offered
        out.update({'geotgatayo': n_ending(' 것 같아요'), 'plain': h, 'giro': None, 'gedoeda': None, 'yagesseoyo': None})
    if irr == 'l':  # ㄹ stems: 살면/살면서/살려고 (no 으), 사네요
        out['myeon'] = st + '면'; out['myeonseo'] = st + '면서'; out['ryeogo'] = st + '려고 해요' if not adj else out.get('ryeogo')
        if not adj: out['reo'] = st + '러'
    return out


# None = the form is unnatural or not offered in any frame; verbForm() fails closed on null.
NONE = lambda *ks: {k: None for k in ks}
OVERRIDES = {
    '먹다': {'hon_pres': None, 'hon_past': None},
    '자다': {'hon_pres': None, 'hon_past': None},
    '있다': {'plain': '있다', 'kkayo': '있을까요?', 'geotgatayo': '있는 것 같아요', 'mod_past': None, 'hon_pres': None, 'hon_past': None, **NONE('reo', 'bwasseoyo', 'jeok', 'ryeogo', 'giro', 'yagesseoyo', 'gedoeda', 'juseyo', 'jimaseyo', 'n_hue')},  # 있은 후에 is not taught
    '없다': {'plain': '없다', 'geotgatayo': '없는 것 같아요', 'kkayo': '없을까요?', 'mod_past': None, 'hon_pres': None, 'hon_past': None, **NONE('reo', 'bwasseoyo', 'jeok', 'ryeogo', 'giro', 'yagesseoyo', 'gedoeda', 'juseyo', 'jimaseyo', 'n_hue')},  # 없은 후에 is wrong
    '좋아하다': NONE('kkayo', 'reo', 'bwasseoyo', 'ryeogo', 'giro', 'yagesseoyo', 'juseyo', 'jimaseyo'),  # 좋아한 적이 있어요 · 좋아하게 됐어요 stay (valid Korean); 좋아하지 마세요 is odd as a request frame
    '전화하다': {'bwasseoyo': '전화해 봤어요'},
    '계시다': {'eoseo': '계셔서', 'myeon': '계시면', 'lttae': '계실 때', 'myeonseo': '계시면서', 'neyo': '계시네요', 'n_hue': '계신 후에', 'hon_pres': '계세요', 'hon_past': '계셨어요', **NONE('reo', 'kkayo', 'juseyo', 'jimaseyo', 'bwasseoyo', 'jeok', 'ryeogo', 'giro', 'yagesseoyo', 'gedoeda', 'plain', 'geotgatayo')},
    '주다': {'juseyo': '주세요'},
    '드리다': {'hon_pres': None, 'hon_past': None},
    '오다': {'jeok': '온 적이 있어요', 'n_hue': '온 후에'},
    '쓰다': {'eoseo': '써서', 'bwasseoyo': '써 봤어요', 'juseyo': '써 주세요', 'yagesseoyo': '써야겠어요'},
    '듣다': {'jeok': '들은 적이 있어요', 'n_hue': '들은 후에', 'plain': '듣는다', 'geotgatayo': '듣는 것 같아요', 'ttaemun': '듣기 때문에', 'gi_jeone': '듣기 전에', 'jimaseyo': '듣지 마세요', 'neyo': '듣네요', 'go': '듣고', 'jiman': '듣지만', 'giro': '듣기로 했어요', 'gedoeda': '듣게 됐어요'},
    '살다': {'plain': '산다', 'geotgatayo': '사는 것 같아요', 'neyo': '사네요', 'jeok': '산 적이 있어요', 'n_hue': '산 후에', 'kkayo': '살까요?', 'lttae': '살 때', 'ryeogo': '살려고 해요', 'reo': '살러'},
    '멀다': {'plain': '멀다', 'geotgatayo': '먼 것 같아요', 'neyo': '머네요', 'lttae': '멀 때', 'myeon': '멀면', 'myeonseo': '멀면서'},
    '춥다': {'geotgatayo': '추운 것 같아요'}, '덥다': {'geotgatayo': '더운 것 같아요'}, '가깝다': {'geotgatayo': '가까운 것 같아요'}, '귀엽다': {'geotgatayo': '귀여운 것 같아요'}, '어렵다': {'geotgatayo': '어려운 것 같아요'}, '쉽다': {'geotgatayo': '쉬운 것 같아요'},
    '배고프다': {'eoseo': '배고파서'},
    '드시다': {'eoseo': '드셔서', 'hon_pres': '드세요', 'hon_past': '드셨어요'},
    '주무시다': {'eoseo': '주무셔서', 'hon_pres': '주무세요', 'hon_past': '주무셨어요'},
    '바쁘다': {'eoseo': '바빠서'}, '예쁘다': {'eoseo': '예뻐서'}, '크다': {'eoseo': '커서'}, '싸다': {'eoseo': '싸서'}, '비싸다': {'eoseo': '비싸서'},
    '좋다': {'geotgatayo': '좋은 것 같아요'}, '많다': {'geotgatayo': '많은 것 같아요'}, '작다': {'geotgatayo': '작은 것 같아요'}, '맛있다': {'geotgatayo': '맛있는 것 같아요', 'plain': '맛있다'}, '재미있다': {'geotgatayo': '재미있는 것 같아요', 'plain': '재미있다'},
    '친절하다': {'geotgatayo': '친절한 것 같아요'}, '조용하다': {'geotgatayo': '조용한 것 같아요'},
}


def main():
    w = json.loads((ROOT / 'data/words.json').read_text())
    for v in w['verbs']:
        f = forms(v['h'], v['pres'], v.get('past', '')); f.update(OVERRIDES.get(v['h'], {})); v.update(f)
    for a in w['adjectives']:
        f = forms(a['h'], a['pres'], a.get('past', ''), adj=True); f.update(OVERRIDES.get(a['h'], {})); a.update(f)
    (ROOT / 'data/words.json').write_text(json.dumps(w, ensure_ascii=False, indent=1))
    for v in w['verbs']:
        print(v['h'], v['go'], v['eoseo'], v['myeon'], v['lttae'], v['reo'], v['kkayo'], v['jeok'], v['geotgatayo'], v['plain'], v['ryeogo'], sep=' | ')
    print('---')
    for a in w['adjectives']:
        print(a['h'], a['go'], a['eoseo'], a['myeon'], a['lttae'], a['geotgatayo'], a['neyo'], sep=' | ')


if __name__ == '__main__':
    main()
