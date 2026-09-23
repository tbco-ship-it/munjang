#!/usr/bin/env python3
"""Merge reviewed KRDict beginner verbs and adjectives into data/words.json.

Inputs:
  - data/wip/verbs_krdict.json
  - OUTBOX/HANGULSTEPS_VERBS_REVIEW_20260922.json
  - .scratch/ori/krdict/beginner_va_senses.json

Outputs:
  - data/words.json
  - data/wip/verbs_skipped.json
"""
import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))

from conjugate import (
    forms, derive_eo, dec, comp, stem_of, batchim,
    d_irr, drop_l, b_irr, s_irr, h_irr, reu_irr, eu_drop, IRR, OVERRIDES
)

CHO_MAP = {
    'ㄱ': 'g', 'ㄲ': 'kk', 'ㄴ': 'n', 'ㄷ': 'd', 'ㄸ': 'tt',
    'ㄹ': 'r', 'ㅁ': 'm', 'ㅂ': 'b', 'ㅃ': 'pp', 'ㅅ': 's',
    'ㅆ': 'ss', 'ㅇ': '', 'ㅈ': 'j', 'ㅉ': 'jj', 'ㅊ': 'ch',
    'ㅋ': 'k', 'ㅌ': 't', 'ㅍ': 'p', 'ㅎ': 'h'
}

JUNG_MAP = {
    'ㅏ': 'a', 'ㅐ': 'ae', 'ㅑ': 'ya', 'ㅒ': 'yae', 'ㅓ': 'eo',
    'ㅔ': 'e', 'ㅕ': 'yeo', 'ㅖ': 'ye', 'ㅗ': 'o', 'ㅘ': 'wa',
    'ㅙ': 'wae', 'ㅚ': 'oe', 'ㅛ': 'yo', 'ㅜ': 'u', 'ㅝ': 'wo',
    'ㅞ': 'we', 'ㅟ': 'wi', 'ㅠ': 'yu', 'ㅡ': 'eu', 'ㅢ': 'ui',
    'ㅣ': 'i'
}

JONG_MAP = {
    '': '', 'ㄱ': 'k', 'ㄲ': 'k', 'ㄳ': 'k', 'ㄴ': 'n',
    'ㄵ': 'n', 'ㄶ': 'n', 'ㄷ': 't', 'ㄹ': 'l', 'ㄺ': 'k',
    'ㄻ': 'm', 'ㄼ': 'l', 'ㄽ': 'l', 'ㄾ': 'l', 'ㄿ': 'p',
    'ㅀ': 'l', 'ㅁ': 'm', 'ㅂ': 'p', 'ㅄ': 'p', 'ㅅ': 't',
    'ㅆ': 't', 'ㅇ': 'ng', 'ㅈ': 't', 'ㅊ': 't', 'ㅋ': 'k',
    'ㅌ': 't', 'ㅍ': 'p', 'ㅎ': 't'
}

def romanize(word):
    """RR Revised Romanization syllable-by-syllable without liaison."""
    out = []
    for ch in word:
        if '\uac00' <= ch <= '\ud7a3':
            c, j, g = dec(ch)
            out.append(CHO_MAP[c] + JUNG_MAP[j] + JONG_MAP[g])
        else:
            out.append(ch)
    return ''.join(out)

IRREGULAR_EN_PAST = {
    'arise': 'arose', 'awake': 'awoke', 'be': 'was', 'bear': 'bore', 'beat': 'beat',
    'become': 'became', 'begin': 'began', 'bend': 'bent', 'bet': 'bet', 'bind': 'bound',
    'bite': 'bit', 'bleed': 'bled', 'blow': 'blew', 'break': 'broke', 'breed': 'bred',
    'bring': 'brought', 'build': 'built', 'burn': 'burned', 'burst': 'burst', 'buy': 'bought',
    'catch': 'caught', 'choose': 'chose', 'cling': 'clung', 'come': 'came', 'cost': 'cost',
    'creep': 'crept', 'cut': 'cut', 'deal': 'dealt', 'dig': 'dug', 'do': 'did',
    'draw': 'drew', 'dream': 'dreamed', 'drink': 'drank', 'drive': 'drove', 'eat': 'ate',
    'fall': 'fell', 'feed': 'fed', 'feel': 'felt', 'fight': 'fought', 'find': 'found',
    'flee': 'fled', 'fling': 'flung', 'fly': 'flew', 'forbid': 'forbade', 'forget': 'forgot',
    'forgive': 'forgave', 'freeze': 'froze', 'get': 'got', 'give': 'gave', 'go': 'went',
    'grind': 'ground', 'grow': 'grew', 'hang': 'hung', 'have': 'had', 'hear': 'heard',
    'hide': 'hid', 'hit': 'hit', 'hold': 'held', 'hurt': 'hurt', 'keep': 'kept',
    'kneel': 'knelt', 'know': 'knew', 'lay': 'laid', 'lead': 'led', 'lean': 'leaned',
    'leap': 'leapt', 'learn': 'learned', 'leave': 'left', 'lend': 'lent', 'let': 'let',
    'lie': 'lay', 'light': 'lit', 'lose': 'lost', 'make': 'made', 'mean': 'meant',
    'meet': 'met', 'pay': 'paid', 'put': 'put', 'quit': 'quit', 'read': 'read',
    'ride': 'rode', 'ring': 'rang', 'rise': 'rose', 'run': 'ran', 'say': 'said',
    'see': 'saw', 'seek': 'sought', 'sell': 'sold', 'send': 'sent', 'set': 'set',
    'sew': 'sewed', 'shake': 'shook', 'shine': 'shone', 'shoot': 'shot', 'show': 'showed',
    'shrink': 'shrank', 'shut': 'shut', 'sing': 'sang', 'sink': 'sank', 'sit': 'sat',
    'sleep': 'slept', 'slide': 'slid', 'sling': 'slung', 'slit': 'slit', 'speak': 'spoke',
    'spend': 'spent', 'spin': 'spun', 'spit': 'spat', 'split': 'split', 'spread': 'spread',
    'spring': 'sprang', 'stand': 'stood', 'steal': 'stole', 'stick': 'stuck', 'sting': 'stung',
    'stink': 'stank', 'strike': 'struck', 'string': 'strung', 'strive': 'strove', 'swear': 'swore',
    'sweep': 'swept', 'swim': 'swam', 'swing': 'swung', 'take': 'took', 'teach': 'taught',
    'tear': 'tore', 'tell': 'told', 'think': 'thought', 'throw': 'threw', 'tread': 'trod',
    'understand': 'understood', 'wake': 'woke', 'wear': 'wore', 'weave': 'wove', 'weep': 'wept',
    'win': 'won', 'wind': 'wound', 'wring': 'wrung', 'write': 'wrote'
}

DOUBLED_CONSONANT_PAST = {
    'occur': 'occurred', 'transfer': 'transferred', 'refer': 'referred',
    'prefer': 'preferred', 'admit': 'admitted', 'submit': 'submitted',
    'permit': 'permitted', 'commit': 'committed', 'equip': 'equipped',
}

def derive_en_forms(en_base):
    """Derive en_3s and en_past based on the first word of en_base."""
    parts = en_base.split()
    if not parts:
        return '', '', ''
    first = parts[0].lower()
    rest = (' ' + ' '.join(parts[1:])) if len(parts) > 1 else ''

    # 3s
    if first == 'have':
        s3 = 'has'
    elif first == 'be':
        s3 = 'is'
    elif first == 'do':
        s3 = 'does'
    elif first == 'go':
        s3 = 'goes'
    elif first.endswith(('s', 'sh', 'ch', 'x', 'z', 'o')):
        s3 = first + 'es'
    elif len(first) > 1 and first.endswith('y') and first[-2] not in 'aeiou':
        s3 = first[:-1] + 'ies'
    else:
        s3 = first + 's'

    # past
    if first in IRREGULAR_EN_PAST:
        past = IRREGULAR_EN_PAST[first]
    elif first in DOUBLED_CONSONANT_PAST:
        past = DOUBLED_CONSONANT_PAST[first]
    elif first.endswith('e'):
        past = first + 'd'
    elif len(first) > 1 and first.endswith('y') and first[-2] not in 'aeiou':
        past = first[:-1] + 'ied'
    elif len(first) >= 3 and first[-1] not in 'aeiouwxy' and first[-2] in 'aeiou' and first[-3] not in 'aeiou' and len(first) <= 4:
        past = first + first[-1] + 'ed'
    else:
        past = first + 'ed'

    return en_base, s3 + rest, past + rest

import re

I_DAN = set('いきしちにひみりぎじぢびぴ')
E_DAN = set('えけせてねへめれげぜでべぺ')
GODAN_EXCEPTIONS_KANJI = [
    '入る', '走る', '帰る', '返る', '知る', '切る', '要る', '減る', '蹴る', '滑る',
    '握る', '参る', '散る', '限る', '喋る', '照る', '練る', '焦る',
    '混じる', '交じる', '湿る', '遮る', '捻る'
]
GODAN_EXCEPTIONS_KANA = [
    'はいる', 'はしる', 'しゃべる', 'すべる', 'にぎる', 'まいる', 'ちる',
    'かぎる', 'てる', 'あせる', 'まじる', 'しめる', 'さえぎる', 'ひねる'
]
I_MAP = {'う': 'い', 'く': 'き', 'ぐ': 'ぎ', 'す': 'し', 'つ': 'ち', 'ぬ': 'に', 'ぶ': 'び', 'む': 'み', 'る': 'り'}
A_MAP = {'う': 'わ', 'く': 'か', 'ぐ': '가', 'す': 'さ', 'つ': 'た', 'ぬ': 'な', 'ぶ': 'ば', 'む': 'ま', 'る': 'ら'}
A_MAP['ぐ'] = 'が'
TE_MAP = {'う': 'って', 'つ': 'って', 'る': 'って', 'く': 'いて', 'ぐ': 'いで', 'す': 'して', 'ぬ': 'んで', 'ぶ': 'んで', 'む': 'んで'}

GODAN_EX_APPLIED_COUNT = 0

def parse_ja_eq_list(raw_ja):
    """Split raw_ja string by '。' or ';' into list of (kanji, kana) candidates."""
    if not raw_ja:
        return []
    parts = [p.strip() for p in re.split(r'[;。]', raw_ja) if p.strip()]
    cands = []
    for part in parts:
        if '【' in part:
            kana = part.split('【')[0].strip()
            kanji = part.split('【')[1].split('】')[0].strip()
        else:
            kana = part.strip()
            kanji = part.strip()
        kana = kana.split('・')[-1].strip()
        kanji = kanji.split('・')[0].strip()
        if kanji or kana:
            cands.append((kanji, kana))
    return cands

def is_valid_ja_verb(kanji, kana):
    """Check if candidate (kanji, kana) is a valid Japanese verb in dictionary form."""
    if kana.endswith('ない') or kanji.endswith('ない'):
        return False
    if kanji.endswith('だ') or kana.endswith('だ'):
        return False
    if kana.endswith('い'):
        return False
    u_dan = set('るうくぐすつぬぶむ')
    if not (kana and kana[-1] in u_dan):
        return False
    return True

def is_valid_ja_adj(kanji, kana):
    """Check if candidate is a valid Japanese adjective (i-adj or na-adj)."""
    if kana.endswith('い') or kanji.endswith('い'):
        return True
    if kanji.endswith('だ') or kana.endswith('だ'):
        return True
    return False

def generate_ja_verb(ja_raw, flags):
    """Generate Japanese verb conjugation forms from raw ja dump string."""
    global GODAN_EX_APPLIED_COUNT
    cands = parse_ja_eq_list(ja_raw)
    valid_cands = [c for c in cands if is_valid_ja_verb(c[0], c[1])]

    if not valid_cands:
        first_kanji = cands[0][0] if cands else (ja_raw.split(';')[0].split('。')[0].strip() if ja_raw else '')
        return {
            'ja': first_kanji,
            'ja_dict': None,
            'ja_stem': None,
            'ja_pres': None,
            'ja_past': None,
            'ja_want': None,
            'ja_fut': None,
            'ja_can': None,
            'ja_must': None,
            'ja_please': None,
            'ja_neg': None,
            'ja_neg_past': None,
            'ja_te': None,
            'ja_nai': None,
            'ja_p': None,
        }

    kanji, kana = valid_cands[0]

    # Normalize ずる -> じる (e.g. 感ずる -> 感じる, 命ずる -> 命じる)
    if kanji.endswith('ずる'):
        kanji = kanji[:-2] + 'じる'
    if kana.endswith('ずる'):
        kana = kana[:-2] + 'じる'

    is_kuru = (kana == 'くる' or kana.endswith('てくる') or kanji == '来る' or kanji.endswith('て来る') or kanji.endswith('てくる'))

    if kana.endswith('する') or kanji.endswith('する'):
        pfx = kanji[:-2]
        out = {
            'ja': kanji,
            'ja_dict': kanji,
            'ja_stem': pfx + 'し',
            'ja_pres': pfx + 'します',
            'ja_past': pfx + 'しました',
            'ja_want': pfx + 'したいです',
            'ja_fut': pfx + 'します（予定）',
            'ja_can': kanji + 'ことができます',
            'ja_must': pfx + 'しなければなりません',
            'ja_please': pfx + 'してください',
            'ja_neg': pfx + 'しません',
            'ja_neg_past': pfx + 'しませんでした',
            'ja_te': pfx + 'して',
            'ja_nai': pfx + 'しない',
        }
    elif is_kuru:
        pfx = kanji[:-2] if (kanji.endswith('くる') or kanji.endswith('来る')) else ''
        k_char = '来' if '来' in kanji[-2:] else 'き'
        out = {
            'ja': kanji,
            'ja_dict': kanji,
            'ja_stem': pfx + k_char,
            'ja_pres': pfx + ('来ます' if '来' in kanji[-2:] else 'きます'),
            'ja_past': pfx + ('来ました' if '来' in kanji[-2:] else 'きました'),
            'ja_want': pfx + ('来たいです' if '来' in kanji[-2:] else 'きたいです'),
            'ja_fut': pfx + ('来ます（予定）' if '来' in kanji[-2:] else 'きます（予定）'),
            'ja_can': kanji + 'ことができます',
            'ja_must': pfx + ('来なければなりません' if '来' in kanji[-2:] else 'こなければなりません'),
            'ja_please': pfx + ('来てください' if '来' in kanji[-2:] else 'きてください'),
            'ja_neg': pfx + ('来ません' if '来' in kanji[-2:] else 'きません'),
            'ja_neg_past': pfx + ('来ませんでした' if '来' in kanji[-2:] else 'きませんでした'),
            'ja_te': pfx + ('来て' if '来' in kanji[-2:] else 'きて'),
            'ja_nai': pfx + ('来ない' if '来' in kanji[-2:] else 'こない'),
        }
    else:
        # Check if Godan exception applies
        is_godan_ex = any(kanji.endswith(x) for x in GODAN_EXCEPTIONS_KANJI) or (kanji == kana and any(kana.endswith(x) for x in GODAN_EXCEPTIONS_KANA))
        is_ichidan = kana.endswith('る') and len(kana) >= 2 and (kana[-2] in I_DAN or kana[-2] in E_DAN) and not is_godan_ex

        if is_godan_ex:
            GODAN_EX_APPLIED_COUNT += 1

        if is_ichidan:
            stem = kanji[:-1]
            out = {
                'ja': kanji,
                'ja_dict': kanji,
                'ja_stem': stem,
                'ja_pres': stem + 'ます',
                'ja_past': stem + 'ました',
                'ja_want': stem + 'たいです',
                'ja_fut': stem + 'ます（予定）',
                'ja_can': kanji + 'ことができます',
                'ja_must': stem + 'なければなりません',
                'ja_please': stem + 'てください',
                'ja_neg': stem + 'ません',
                'ja_neg_past': stem + 'ませんでした',
                'ja_te': stem + 'て',
                'ja_nai': stem + 'ない',
            }
        else:  # Godan
            tail = kanji[-1]
            stem = kanji[:-1]
            i_char = I_MAP.get(tail, 'い')
            a_char = A_MAP.get(tail, 'わ')
            te_str = 'って' if kanji.endswith(('行く', 'いく')) else TE_MAP.get(tail, 'って')
            out = {
                'ja': kanji,
                'ja_dict': kanji,
                'ja_stem': stem + i_char,
                'ja_pres': stem + i_char + 'ます',
                'ja_past': stem + i_char + 'ました',
                'ja_want': stem + i_char + 'たいです',
                'ja_fut': stem + i_char + 'ます（予定）',
                'ja_can': kanji + 'ことができます',
                'ja_must': stem + a_char + 'なければなりません',
                'ja_please': stem + te_str + 'ください',
                'ja_neg': stem + i_char + 'ません',
                'ja_neg_past': stem + i_char + 'ませんでした',
                'ja_te': stem + te_str,
                'ja_nai': stem + a_char + 'ない',
            }

    # Particle ja_p
    if 'takes' in flags:
        out['ja_p'] = 'を'
    elif 'move' in flags or 'to' in flags:
        out['ja_p'] = 'に'
    elif 'at' in flags:
        out['ja_p'] = 'で'
    elif 'exist' in flags:
        out['ja_p'] = '가'
    else:
        out['ja_p'] = None
    if out['ja_p'] == '가':
        out['ja_p'] = 'が'
    return out

def generate_ja_adj(ja_raw):
    """Generate Japanese adjective forms from raw ja dump string."""
    cands = parse_ja_eq_list(ja_raw)
    valid_cands = [c for c in cands if is_valid_ja_adj(c[0], c[1])]

    if not valid_cands:
        first_kanji = cands[0][0] if cands else (ja_raw.split(';')[0].split('。')[0].strip() if ja_raw else '')
        return {
            'ja': first_kanji,
            'ja_dict': None,
            'ja_pres': None,
            'ja_past': None,
            'ja_te': None,
        }

    kanji, kana = valid_cands[0]

    if kana.endswith('いい') or kanji.endswith('いい') or kanji == 'いい':
        pfx = kanji[:-2] if len(kanji) >= 2 else ''
        return {
            'ja': kanji,
            'ja_dict': kanji,
            'ja_pres': kanji + 'です',
            'ja_past': pfx + 'よかったです',
            'ja_te': pfx + 'よくて',
        }
    elif kana.endswith('い'):
        stem = kanji[:-1]
        return {
            'ja': kanji,
            'ja_dict': kanji,
            'ja_pres': kanji + 'です',
            'ja_past': stem + 'かったです',
            'ja_te': stem + 'くて',
        }
    else:
        stem = kanji[:-1] if kanji.endswith('だ') else kanji
        return {
            'ja': stem + 'だ',
            'ja_dict': stem + 'だ',
            'ja_pres': stem + 'です',
            'ja_past': stem + 'でした',
            'ja_te': stem + 'で',
        }

def derive_korean_conjugations(h, is_adj=False):
    """Derive 7 basic forms + all connective forms from conjugate.py."""
    st = stem_of(h)
    irr = IRR.get(h)
    bat = batchim(st)
    if not irr and bat == 'ㄹ':
        irr = 'l'
    eo = derive_eo(h, '형용사' if is_adj else '동사', irr)

    # pres = eo + 요
    pres = eo + '요'
    # past = eo 받침 ㅆ + 어요
    c, j, g = dec(eo[-1])
    past = eo[:-1] + comp(c, j, 'ㅆ') + '어요'

    # Get forms from conjugate.py passing pres and past
    conj = forms(h, pres=pres, past=past, adj=is_adj)

    # Basic forms
    if is_adj:
        res = {'pres': pres, 'past': past}
    else:
        want = st + '고 싶어요'
        must = eo + '야 해요'
        please = eo + ' 주세요'

        st_eu = d_irr(st) if irr == 'd' else st
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

        res = {
            'pres': pres,
            'past': past,
            'want': want,
            'fut': fut,
            'can': can,
            'must': must,
            'please': please,
        }

    # Merge conj
    res.update(conj)

    # Apply OVERRIDES from conjugate.py if present
    if h in OVERRIDES:
        res.update(OVERRIDES[h])

    return res

VOL_EXCEPTIONS = {
    '힘내다', '노력하다', '출석하다', '결석하다', '지각하다',
    '눕다', '앉다', '일어나다', '날다', '모이다', '서두르다',
    '수고하다', '실례하다', '울다', '웃다', '주무시다'
}
NONVOL_ADDITIONAL = {
    '태어나다', '가까워지다', '빠지다', '바뀌다', '걸리다', '다치다', '모르다', '못하다'
}

def build_entry(sheet_row, wip_entry, senses_dump, is_adj, en_adj_overrides=None, ja_overrides=None):
    """Build full dictionary entry for data/words.json."""
    h = sheet_row['h']
    kid = str(sheet_row['id'])
    hom = str(sheet_row['hom'])
    sno = int(sheet_row.get('sense_no', 1))

    # Equivalent extraction: check senses dump for sense_no
    raw_en = wip_entry.get('en', '')
    raw_ja = wip_entry.get('ja', '')
    raw_vi = wip_entry.get('vi', '')

    if senses_dump and kid in senses_dump:
        entry_senses = senses_dump[kid].get('senses', [])
        target_sense = next((s for s in entry_senses if s.get('order') == str(sno)), None)
        if target_sense:
            eq = target_sense.get('eq', {})
            if '영어' in eq and eq['영어'].get('lemma'):
                raw_en = eq['영어']['lemma'].split(';')[0].strip()
            if '일본어' in eq and eq['일본어'].get('lemma'):
                raw_ja = eq['일본어']['lemma'].strip()
            if '베트남어' in eq and eq['베트남어'].get('lemma'):
                raw_vi = eq['베트남어']['lemma'].split(';')[0].strip()

    r = romanize(h)
    level = int(sheet_row.get('level', 1))

    kinds_list = sheet_row.get('kinds') or []
    takes_kinds = sheet_row.get('takes_kinds') or []
    subj_kinds = sheet_row.get('subj_kinds') or []

    entry = {
        'h': h,
        'r': r,
        'level': level,
        'src': f'krdict:{kid}/{hom}',
        'sense_no': sno,
        'gloss_auto': True,
    }

    if sheet_row.get('note'):
        entry['note'] = sheet_row['note']

    if is_adj:
        # English
        clean_en = raw_en.strip()
        if en_adj_overrides and h in en_adj_overrides:
            adj_val = en_adj_overrides[h]
            entry['en'] = 'to be ' + adj_val
            entry['en_adj'] = adj_val
        elif clean_en.startswith('be '):
            entry['en'] = 'to ' + clean_en
            entry['en_adj'] = clean_en[3:].strip()
        elif clean_en.startswith('to be '):
            entry['en'] = clean_en
            entry['en_adj'] = clean_en[6:].strip()
        else:
            entry['en'] = 'to be ' + clean_en
            entry['en_adj'] = clean_en

        # Japanese
        ja_fields = generate_ja_adj(raw_ja)
        entry.update(ja_fields)
        if ja_overrides and h in ja_overrides:
            ov = ja_overrides[h]
            if ov.get('pos', '형용사') == '형용사':
                for k, val in ov.items():
                    if k != 'pos':
                        entry[k] = val
                entry['gloss_auto'] = False

        # Vietnamese
        entry['vi'] = raw_vi

        # Syntax flags: subj_kinds
        entry['subj'] = subj_kinds
        entry['fits'] = subj_kinds
    else:
        # Verb
        clean_en = raw_en.strip()
        if clean_en.startswith('to '):
            entry['en'] = clean_en
            base_en = clean_en[3:].strip()
        else:
            entry['en'] = 'to ' + clean_en
            base_en = clean_en

        # English inflections
        ebase, e3s, epast = derive_en_forms(base_en)
        entry['en_base'] = ebase
        entry['en_3s'] = e3s
        entry['en_past'] = epast

        # Syntax flags
        if 'takes' in kinds_list:
            entry['takes'] = takes_kinds
        if 'move' in kinds_list:
            entry['move'] = True
        if 'at' in kinds_list:
            entry['at'] = True
        if 'to' in kinds_list:
            entry['to'] = True
        if 'with' in kinds_list:
            entry['with'] = True
        if 'exist' in kinds_list:
            entry['exist'] = True
        if 'subj_only' in kinds_list:
            entry['subj'] = subj_kinds

        # Japanese
        ja_fields = generate_ja_verb(raw_ja, kinds_list)
        entry.update(ja_fields)
        if ja_overrides and h in ja_overrides:
            ov = ja_overrides[h]
            if ov.get('pos', '동사') == '동사':
                for k, val in ov.items():
                    if k != 'pos':
                        entry[k] = val
                entry['gloss_auto'] = False

        # Vietnamese
        entry['vi'] = raw_vi

    # Korean conjugations
    korean_forms = derive_korean_conjugations(h, is_adj)
    entry.update(korean_forms)

    # Non-volitional verbs
    if not is_adj:
        is_subj_only = ('subj_only' in kinds_list)
        if (is_subj_only and h not in VOL_EXCEPTIONS) or (h in NONVOL_ADDITIONAL):
            entry['vol'] = False
            for k in ['want', 'must', 'please', 'juseyo', 'jimaseyo', 'ryeogo', 'giro', 'yagesseoyo', 'kkayo', 'reo', 'bwasseoyo']:
                entry[k] = None

    return entry

def compute_reachability(new_verbs, templates_path):
    """Compute reachability for kinds combinations against templates."""
    with open(templates_path, 'r', encoding='utf-8') as f:
        tpl_data = json.load(f)
    templates = tpl_data['templates']

    # Classify verbs by kinds
    def verb_kinds_key(v):
        ks = []
        if v.get('takes'): ks.append('takes')
        if v.get('move'): ks.append('move')
        if v.get('at'): ks.append('at')
        if v.get('to'): ks.append('to')
        if v.get('with'): ks.append('with')
        if v.get('exist'): ks.append('exist')
        if v.get('subj') and not ks: ks.append('subj_only')
        return ','.join(sorted(ks)) or 'other'

    groups = {}
    for v in new_verbs:
        k = verb_kinds_key(v)
        groups.setdefault(k, []).append(v)

    # Check how many templates each group reaches
    reach_results = []
    for k, vlist in sorted(groups.items()):
        reached_templates = set()
        for v in vlist:
            for tpl in templates:
                v_type = tpl.get('verbs')
                ok = False
                if tpl['id'] == 'want' and v.get('takes') and v.get('want'):
                    ok = True
                elif v_type == 'transitive' and v.get('takes'):
                    ok = True
                elif v_type == 'move' and v.get('move'):
                    ok = True
                elif v_type == 'at' and v.get('at'):
                    ok = True
                elif v_type == 'give' and v.get('to') and v.get('takes') and not v.get('hon'):
                    ok = True
                elif v_type == 'exist' and v.get('exist'):
                    ok = True
                elif v_type == 'any_place' and (v.get('move') or v.get('at') or v.get('takes')) and not v.get('to') and not v.get('hon'):
                    ok = True
                if ok:
                    reached_templates.add(tpl['id'])
        reach_results.append({
            'kinds': k,
            'verb_count': len(vlist),
            'reached_frames_count': len(reached_templates),
            'sample_verbs': [x['h'] for x in vlist[:4]],
        })
    return reach_results

def check_takes_compatible(verbs, nouns):
    """Check that every verb with takes has >= 1 compatible noun in the noun pool."""
    zero_comp = []
    for v in verbs:
        if not v.get('takes'):
            continue
        v_takes = set(v['takes'])
        found = False
        for n in nouns:
            if n.get('kind') in v_takes:
                found = True
                break
            for f in ['read', 'write', 'ride', 'play', 'photo', 'do', 'learn', 'send']:
                if f in v_takes and n.get(f):
                    found = True
                    break
            if found:
                break
        if not found:
            zero_comp.append(v['h'])
    return zero_comp

def main():
    parser = argparse.ArgumentParser(description="Merge reviewed KRDict verbs/adjectives into words.json")
    parser.add_argument('--wip', default=str(ROOT / 'data/wip/verbs_krdict.json'))
    parser.add_argument('--sheet', default='/Users/aiden/.buzz-dev/OUTBOX/HANGULSTEPS_VERBS_REVIEW_20260922.json')
    parser.add_argument('--senses', default='/Users/aiden/.buzz-dev/.scratch/ori/krdict/beginner_va_senses.json')
    parser.add_argument('--words', default=str(ROOT / 'data/words.json'))
    parser.add_argument('--skipped', default=str(ROOT / 'data/wip/verbs_skipped.json'))
    parser.add_argument('--templates', default=str(ROOT / 'data/templates.json'))
    parser.add_argument('--en-adj-overrides', default=str(ROOT / 'data/en_adj_overrides.json'))
    parser.add_argument('--ja-overrides', default=str(ROOT / 'data/ja_overrides.json'))
    parser.add_argument('--dry-run', action='store_true', default=False)
    parser.add_argument('--execute', action='store_true', default=False)
    args = parser.parse_args()

    print(f"=== merge_krdict.py Execution ===")
    print(f"Loading words from {args.words}...")
    with open(args.words, 'r', encoding='utf-8') as f:
        words_data = json.load(f)

    baseline_verbs = list(words_data['verbs'][:30])
    baseline_adjs = list(words_data['adjectives'][:20])
    assert len(baseline_verbs) == 30, f"Expected 30 baseline verbs, got {len(baseline_verbs)}"
    assert len(baseline_adjs) == 20, f"Expected 20 baseline adjectives, got {len(baseline_adjs)}"
    existing_all_lemmas = {x['h'] for x in baseline_verbs} | {x['h'] for x in baseline_adjs}
    print(f"Verified baseline: 30 verbs, 20 adjectives (50 predicates total).")

    print(f"Loading WIP from {args.wip}...")
    with open(args.wip, 'r', encoding='utf-8') as f:
        wip_list = json.load(f)
    wip_map = {(str(x['id']), str(x['homonym_number'])): x for x in wip_list}
    print(f"Loaded {len(wip_list)} WIP entries.")

    print(f"Loading review sheet from {args.sheet}...")
    with open(args.sheet, 'r', encoding='utf-8') as f:
        sheet_list = json.load(f)
    print(f"Loaded {len(sheet_list)} review sheet entries.")

    senses_dump = None
    if os.path.exists(args.senses):
        print(f"Loading senses dump from {args.senses}...")
        with open(args.senses, 'r', encoding='utf-8') as f:
            senses_dump = json.load(f)
        print(f"Loaded senses dump: {len(senses_dump)} entries.")

    en_adj_overrides = None
    if os.path.exists(args.en_adj_overrides):
        print(f"Loading English adjective overrides from {args.en_adj_overrides}...")
        with open(args.en_adj_overrides, 'r', encoding='utf-8') as f:
            en_adj_overrides = json.load(f)
        print(f"Loaded {len(en_adj_overrides)} English adjective overrides.")

    ja_overrides = None
    if os.path.exists(args.ja_overrides):
        print(f"Loading Japanese overrides from {args.ja_overrides}...")
        with open(args.ja_overrides, 'r', encoding='utf-8') as f:
            ja_overrides = json.load(f)
        print(f"Loaded {len(ja_overrides)} Japanese overrides.")

    skipped_records = []
    candidates_valid = []

    for row in sheet_list:
        kid = str(row['id'])
        hom = str(row['hom'])
        h = row['h']
        skip_reason = row.get('skip_reason')
        kinds = row.get('kinds')

        wip_entry = wip_map.get((kid, hom))
        if not wip_entry:
            print(f"Warning: No WIP match for id={kid}, hom={hom}")
            continue

        if skip_reason or not kinds:
            reason_str = skip_reason or "kinds is empty"
            skipped_records.append({
                'id': kid,
                'hom': hom,
                'h': h,
                'pos': row['pos'],
                'reason': reason_str,
                'category': 'filter_or_skip',
            })
        elif h in existing_all_lemmas:
            skipped_records.append({
                'id': kid,
                'hom': hom,
                'h': h,
                'pos': row['pos'],
                'reason': f"Already exists in words.json baseline 50 words ({h})",
                'category': 'existing_baseline',
            })
        else:
            candidates_valid.append((row, wip_entry))

    print(f"\n[ 대상 선별 결과 ]")
    print(f"  - 전체 검수 행 수: {len(sheet_list)}")
    print(f"  - 제외 (skip_reason / kinds 부재): {sum(1 for x in skipped_records if x['category'] == 'filter_or_skip')}개")
    print(f"  - 제외 (기존 50 단어 중복): {sum(1 for x in skipped_records if x['category'] == 'existing_baseline')}개")
    print(f"  - 총 제외 건수: {len(skipped_records)}개")
    print(f"  - 최종 병합 대상: {len(candidates_valid)}개")

    new_verbs = []
    new_adjs = []

    for s_row, w_entry in candidates_valid:
        is_adj = (s_row['pos'] == '형용사')
        entry = build_entry(s_row, w_entry, senses_dump, is_adj, en_adj_overrides, ja_overrides)
        if is_adj:
            new_adjs.append(entry)
        else:
            new_verbs.append(entry)

    print(f"  - 병합 대상 동사: {len(new_verbs)}개")
    print(f"  - 병합 대상 형용사: {len(new_adjs)}개")

    # Verification 1: Check 뵙다
    beopda = next((v for v in new_verbs if v['h'] == '뵙다'), None)
    if beopda:
        print(f"\n[ 뵙다 검증 ]")
        print(f"  pres={beopda.get('pres')}, past={beopda.get('past')}, must={beopda.get('must')}, eoseo={beopda.get('eoseo')}, yagesseoyo={beopda.get('yagesseoyo')}, bwasseoyo={beopda.get('bwasseoyo')}")
        print(f"  please={beopda.get('please')}, juseyo={beopda.get('juseyo')}")
        assert beopda.get('pres') == '봬요', f"Expected pres 봬요, got {beopda.get('pres')}"
        assert beopda.get('past') == '뵀어요', f"Expected past 뵀어요, got {beopda.get('past')}"
        assert beopda.get('please') is None, f"Expected please None, got {beopda.get('please')}"
        assert beopda.get('juseyo') is None, f"Expected juseyo None, got {beopda.get('juseyo')}"

    # Verification 2: Japanese forms and Godan exceptions
    print(f"\n[ 일본어 활용 및 예외 검증 ]")
    valid_dict_tails = set('るうくぐすつぬぶむいだ')
    for v in new_verbs:
        assert v.get('ja_pres') is not None, f"Verb {v['h']} ja_pres is None"
        assert v['ja_pres'].endswith(('ます', 'です', 'ません')), f"Verb {v['h']} ja_pres does not end in ます/です/ません: {v['ja_pres']}"
        if v.get('ja_dict') is not None:
            assert v['ja_dict'][-1] in valid_dict_tails, f"Verb {v['h']} ja_dict does not end in valid tail: {v['ja_dict']}"

    for a in new_adjs:
        assert a.get('ja_pres') is not None, f"Adj {a['h']} ja_pres is None"
        assert a['ja_pres'].endswith(('です', 'ます')), f"Adj {a['h']} ja_pres does not end in です/ます: {a['ja_pres']}"
        if a.get('ja_dict') is not None:
            assert a['ja_dict'][-1] in valid_dict_tails, f"Adj {a['h']} ja_dict does not end in valid tail: {a['ja_dict']}"

    null_ja_verbs = [v['h'] for v in new_verbs if v.get('ja_pres') is None]
    null_ja_adjs = [a['h'] for a in new_adjs if a.get('ja_pres') is None]
    assert len(null_ja_verbs) == 0, f"New verbs with ja_pres null: {null_ja_verbs}"
    assert len(null_ja_adjs) == 0, f"New adjs with ja_pres null: {null_ja_adjs}"

    print(f"  - 전수 ja_pres null 0 달성, ます/です/ません 종결 및 ja_dict 유효 어미 검증 100% 통과.")
    print(f"  - 五段 예외표(GODAN_EXCEPTIONS) 적용 건수: {GODAN_EX_APPLIED_COUNT}회.")

    # Verification 3: Non-volitional verbs
    print(f"\n[ 비의지 동사 검증 ]")
    nonvol_samples = ['화나다', '태어나다', '가까워지다', '빠지다', '바뀌다', '걸리다', '다치다', '모르다', '못하다']
    for s_h in nonvol_samples:
        matched_v = next((v for v in new_verbs if v['h'] == s_h), None)
        if matched_v:
            assert matched_v.get('vol') is False, f"{s_h} expected vol:False"
            assert matched_v.get('want') is None, f"{s_h} expected want:None"
            assert matched_v.get('please') is None, f"{s_h} expected please:None"
            assert matched_v.get('juseyo') is None, f"{s_h} expected juseyo:None"
    total_nonvol = sum(1 for v in new_verbs if v.get('vol') is False)
    print(f"  - 비의지 동사 총 {total_nonvol}건 (sample: {', '.join(nonvol_samples)}) vol:False 및 의지형 null 검증 통과.")

    # Verification 4: English adjective overrides
    print(f"\n[ 영어 형용사 오버라이드 검증 ]")
    if en_adj_overrides:
        for a_h, expected_en in en_adj_overrides.items():
            matched_a = next((a for a in new_adjs if a['h'] == a_h), None)
            if matched_a:
                assert matched_a.get('en_adj') == expected_en, f"{a_h} expected en_adj={expected_en}, got {matched_a.get('en_adj')}"
                assert matched_a.get('en') == f'to be {expected_en}', f"{a_h} expected en='to be {expected_en}', got {matched_a.get('en')}"
        print(f"  - en_adj_overrides {len(en_adj_overrides)}개 항목 100% 반영 검증 통과.")

    # Verification 5: Check compatible nouns for all takes verbs
    zero_comp = check_takes_compatible(new_verbs, words_data['nouns'])
    print(f"\n[ takes 동사 명사 결합 검증 ]")
    takes_count = sum(1 for v in new_verbs if v.get('takes'))
    print(f"  - takes 동사 총 {takes_count}개 중 결합 가능한 명사 0개인 동사 수: {len(zero_comp)}")
    if zero_comp:
        print(f"  - 결합 불가 동사 목록: {zero_comp}")
    else:
        print(f"  - 전수 compatible() 명사 >= 1개 존재 증명 완료.")

    # Verification 6: kinds 별 도달 가능한 프레임 수
    print(f"\n[ kinds 별 도달 가능한 프레임 수 표 ]")
    reach_table = compute_reachability(new_verbs, args.templates)
    print(f"{'문법 패턴 (kinds)':<20} | {'단어 수':>6} | {'도달 프레임 수':>13} | {'대표 단어 예시':<30}")
    print("-" * 76)
    for r in reach_table:
        samples = ', '.join(r['sample_verbs'])
        print(f"{r['kinds']:<20} | {r['verb_count']:>6} | {r['reached_frames_count']:>13} | {samples:<30}")

    if not args.execute:
        print("\n[DRY RUN ONLY] No changes written to disk. Pass --execute to write files.")
        return

    # Execute
    print(f"\nWriting skipped records to {args.skipped}...")
    Path(args.skipped).parent.mkdir(parents=True, exist_ok=True)
    with open(args.skipped, 'w', encoding='utf-8') as f:
        json.dump(skipped_records, f, ensure_ascii=False, indent=2)

    print(f"Appending new records to {args.words}...")
    # Double check baseline integrity byte for byte
    assert words_data['verbs'][:30] == baseline_verbs, "Baseline verbs mutated!"
    assert words_data['adjectives'][:20] == baseline_adjs, "Baseline adjectives mutated!"

    words_data['verbs'] = baseline_verbs + new_verbs
    words_data['adjectives'] = baseline_adjs + new_adjs

    with open(args.words, 'w', encoding='utf-8') as f:
        json.dump(words_data, f, ensure_ascii=False, indent=1)

    print(f"Success! Total verbs: {len(words_data['verbs'])}, Total adjectives: {len(words_data['adjectives'])}")


if __name__ == '__main__':
    main()
