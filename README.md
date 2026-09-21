# HangulSteps (formerly Munjang)

Build your first Korean sentences: Hangul letter → beginner words → a sentence with the right particles (은/는·이/가·을/를·에·에서, judged and explained) → 원고지 practice sheet. EN at `/`, JA at `/ja/`.

- `data/words.json` — reviewed beginner nouns/verbs/adjectives with EN/JA meanings, roles and verb compatibility
- `data/templates.json` — 7 sentence frames + the why-lines (EN/JA)
- `static/munjang.js` — engine (Hangul decomposition, particle forms, judgments, assembly); `scripts/test_munjang.mjs`
- `static/app.js` — builder UI · `static/print.js` — 원고지 sheet · `static/quiz.js` — guide quizzes
- `scripts/build.py` — Jinja2 static build into `dist/` (`python scripts/build.py --base / --origin https://…`)

Design ported from a ChatGPT Sites concept (2026-09-22). Sentences are never randomly combined.
