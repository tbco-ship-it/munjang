#!/usr/bin/env python3
"""Import beginner verbs and adjectives from National Institute of Korean Language (KRDict) JSON dump.

Extracts all beginner verbs (동사) and adjectives (형용사) into data/wip/verbs_krdict.json.
Fields per row:
  - id: krdict entry id
  - homonym_number: homonym number (필수)
  - h: lemma written form
  - pos: '동사' or '형용사'
  - level: '초급'
  - semanticCategory: semantic category
  - en, ja, vi: first lemma before semicolon from Sense 1
  - syntacticPattern: syntactic patterns from Sense 1
  - kinds_auto: automatic estimation based on syntacticPattern
  - kinds: None (left empty for manual review)
  - conj: conjugation written forms from WordForm
  - definition: Korean definition from Sense 1
"""
import argparse
import glob
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def extract_lemma(e):
    """Extract lemma writtenForm handling dict or list representation."""
    lemma = e.get('Lemma')
    if isinstance(lemma, list):
        for l in lemma:
            if isinstance(l, dict) and 'feat' in l:
                f = l['feat']
                if isinstance(f, dict) and f.get('att') == 'writtenForm':
                    return f.get('val')
                elif isinstance(f, list):
                    for item in f:
                        if item.get('att') == 'writtenForm':
                            return item.get('val')
    elif isinstance(lemma, dict) and 'feat' in lemma:
        f = lemma['feat']
        if isinstance(f, dict) and f.get('att') == 'writtenForm':
            return f.get('val')
        elif isinstance(f, list):
            for item in f:
                if item.get('att') == 'writtenForm':
                    return item.get('val')
    return None


def classify_kinds_auto(pats, cat, h, pos):
    """Classify kinds_auto based on syntacticPattern and semanticCategory.

    Rules:
      - 1이 2에/에게 3을 -> to+takes
      - 1이 2를 -> takes
      - 1이 (2와) -> with
      - 1이 2가 -> have/exist
      - 1이 2에 + 이동 의미범주 -> move
      - 1이 2에서 -> at
      - 1이 만 -> intransitive
      - other -> other
    """
    if not pats:
        return 'other'
    h = h or ''

    # 1. to+takes: 1이 2에/에게 3을
    has_to_takes = any(
        (('3을' in p or '3를' in p) and ('2에' in p or '2에게' in p or '2로' in p))
        for p in pats
    )
    if has_to_takes:
        return 'to+takes'

    # 2. takes: 1이 2를
    has_takes = any(('2를' in p or '2을' in p or '3을' in p or '3를' in p) for p in pats)
    if has_takes:
        return 'takes'

    # 3. with: 1이 (2와)
    has_with = any(('(2와)' in p or '2와' in p or '2과' in p) for p in pats)
    if has_with:
        return 'with'

    # 4. have/exist: 1이 2가
    has_have_exist = any(('2가' in p or '2이' in p) for p in pats)
    if has_have_exist:
        return 'have/exist'

    # 5. move: 1이 2에 + 이동 의미범주
    motion_verbs = (
        '가다', '오다', '다니다', '출발하다', '도착하다', '출근하다',
        '퇴근하다', '출퇴근하다', '떠나다', '이사하다', '들르다'
    )
    is_motion = (
        (cat and any(k in cat for k in ['위치 및 방향', '교통 이용 행위']))
        or any(h.endswith(mv) for mv in motion_verbs)
    )
    has_2e = any(('2에' in p or '2로' in p) for p in pats)
    if pos == '동사' and has_2e and is_motion:
        return 'move'

    # 6. at: 1이 2에서
    has_at = any('2에서' in p for p in pats)
    if has_at:
        return 'at'

    # 7. intransitive: 1이 만
    is_intransitive = all(
        p.strip().startswith('1이 ') and not any(f'{i}' in p for i in [2, 3, 4])
        for p in pats
    )
    if is_intransitive:
        return 'intransitive'

    return 'other'


def parse_dump_files(dump_path):
    """Find and sort all dump json files."""
    p = Path(dump_path)
    if p.is_file():
        return [p]
    elif p.is_dir():
        # Match only the numbered dump partition files like 1_5000_20260919.json
        files = sorted(
            [f for f in p.glob('*_*.json') if f.name.split('_')[0].isdigit()],
            key=lambda x: int(x.name.split('_')[0])
        )
        if not files:
            files = sorted(p.glob('*.json'))
        return files
    raise FileNotFoundError(f'Dump path not found: {dump_path}')


def import_krdict(dump_path, out_path=None):
    if out_path is None:
        out_path = ROOT / 'data/wip/verbs_krdict.json'
    else:
        out_path = Path(out_path)

    files = parse_dump_files(dump_path)
    print(f'Loading {len(files)} dump files from {dump_path}...')

    entries = []
    for fpath in files:
        with open(fpath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        lex_entries = data.get('LexicalResource', {}).get('Lexicon', {}).get('LexicalEntry', [])
        for e in lex_entries:
            entry_feats = {}
            raw_feats = e.get('feat', [])
            if isinstance(raw_feats, dict):
                raw_feats = [raw_feats]
            for f_item in raw_feats:
                if isinstance(f_item, dict) and 'att' in f_item:
                    entry_feats[f_item['att']] = f_item.get('val')

            pos = entry_feats.get('partOfSpeech')
            level = entry_feats.get('vocabularyLevel')
            if level == '초급' and pos in ('동사', '형용사'):
                kid = str(e.get('val'))
                hom = entry_feats.get('homonym_number', '0')
                cat = entry_feats.get('semanticCategory')
                h = extract_lemma(e)

                senses = e.get('Sense', [])
                if isinstance(senses, dict):
                    senses = [senses]
                s0 = senses[0] if senses else {}
                s0_feats = s0.get('feat', [])
                if isinstance(s0_feats, dict):
                    s0_feats = [s0_feats]
                pats = [
                    x.get('val')
                    for x in s0_feats
                    if isinstance(x, dict) and x.get('att') == 'syntacticPattern'
                ]
                defn = next(
                    (x.get('val') for x in s0_feats if isinstance(x, dict) and x.get('att') == 'definition'),
                    ''
                )

                eqs = s0.get('Equivalent', [])
                if isinstance(eqs, dict):
                    eqs = [eqs]
                en, ja, vi = '', '', ''
                for eq in eqs:
                    f_list = eq.get('feat', [])
                    if isinstance(f_list, dict):
                        f_list = [f_list]
                    f_map = {x.get('att'): x.get('val') for x in f_list if isinstance(x, dict)}
                    lang = f_map.get('language')
                    lem = (f_map.get('lemma') or '').split(';')[0].strip()
                    if lang == '영어':
                        en = lem
                    elif lang == '일본어':
                        ja = lem
                    elif lang == '베트남어':
                        vi = lem

                conjs = []
                word_forms = e.get('WordForm', [])
                if isinstance(word_forms, dict):
                    word_forms = [word_forms]
                for wf in word_forms:
                    wf_feats = wf.get('feat', [])
                    if isinstance(wf_feats, dict):
                        wf_feats = [wf_feats]
                    f_map = {x.get('att'): x.get('val') for x in wf_feats if isinstance(x, dict)}
                    if f_map.get('type') == '활용':
                        wform = f_map.get('writtenForm')
                        if wform and wform not in conjs:
                            conjs.append(wform)
                    fr = wf.get('FormRepresentation')
                    if fr and isinstance(fr, dict):
                        fr_feats = fr.get('feat', [])
                        if isinstance(fr_feats, dict):
                            fr_feats = [fr_feats]
                        fr_map = {x.get('att'): x.get('val') for x in fr_feats if isinstance(x, dict)}
                        if fr_map.get('type') == '준말':
                            wform = fr_map.get('writtenForm')
                            if wform and wform not in conjs:
                                conjs.append(wform)

                kinds_auto = classify_kinds_auto(pats, cat, h, pos)
                entries.append({
                    'id': kid,
                    'homonym_number': hom,
                    'h': h,
                    'pos': pos,
                    'level': level,
                    'semanticCategory': cat,
                    'en': en,
                    'ja': ja,
                    'vi': vi,
                    'syntacticPattern': pats,
                    'kinds_auto': kinds_auto,
                    'kinds': None,
                    'conj': conjs,
                    'definition': defn,
                })

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Successfully imported {len(entries)} entries to {out_path}')

    # Summary counts and kinds_auto distribution
    v_count = sum(1 for x in entries if x['pos'] == '동사')
    a_count = sum(1 for x in entries if x['pos'] == '형용사')
    print(f'Breakdown: {v_count} 동사, {a_count} 형용사')

    counts = {}
    for x in entries:
        k = x['kinds_auto']
        counts[k] = counts.get(k, 0) + 1

    print('\n=== kinds_auto 분포표 (패턴별 개수) ===')
    print(f'{"패턴 (kinds_auto)":<18} | {"개수":>5} | {"비율":>7}')
    print('-' * 36)
    total = len(entries)
    for k, v in sorted(counts.items(), key=lambda x: -x[1]):
        print(f'{k:<18} | {v:>5} | {v/total*100:>6.1f}%')
    print(f'{"Total":<18} | {total:>5} | 100.0%')
    return entries


def main():
    parser = argparse.ArgumentParser(description='Import beginner verbs and adjectives from krdict JSON dump.')
    parser.add_argument('dump_path', nargs='?', default=None, help='Path to krdict JSON dump directory or file')
    parser.add_argument('--out', default=None, help='Output path (default: data/wip/verbs_krdict.json)')
    args = parser.parse_args()

    dump_path = args.dump_path
    if not dump_path:
        # Default fallback locations
        candidates = [
            ROOT / '../../.scratch/ori/krdict',
            Path('/Users/aiden/.buzz-dev/.scratch/ori/krdict'),
        ]
        for c in candidates:
            if c.exists():
                dump_path = str(c)
                break
    if not dump_path:
        print('Error: please specify dump_path', file=sys.stderr)
        sys.exit(1)

    import_krdict(dump_path, args.out)


if __name__ == '__main__':
    main()
