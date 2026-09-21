#!/usr/bin/env python3
"""Generate the static Munjang site into dist/. Two locales (en at /, ja at /ja/) share templates; data ships as static/data.js."""
import argparse
import datetime as dt
import hashlib
import json
import shutil
from pathlib import Path
from xml.sax.saxutils import escape

from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
LOCALES = ["en", "ja"]
PAGES = [  # (template, path, slug for title lookup)
    ("index.html", "", "home"),
    ("guide_particles.html", "guide/particles/", "particles"),
    ("guide_word-order.html", "guide/word-order/", "order"),
    ("guide_spacing.html", "guide/spacing/", "spacing"),
    ("print.html", "print/", "print"),
    ("check.html", "check/", "check"),
    ("about.html", "about/", "about"),
    ("privacy.html", "privacy/", "privacy"),
    ("contact.html", "contact/", "contact"),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="/")
    ap.add_argument("--origin", default="https://munjanglab.com")
    ap.add_argument("--cname", default="")
    ap.add_argument("--adsense", default="")
    a = ap.parse_args()
    base = a.base if a.base.endswith("/") else a.base + "/"

    words = json.loads((ROOT / "data/words.json").read_text())
    templates = json.loads((ROOT / "data/templates.json").read_text())
    ui = json.loads((ROOT / "data/ui.json").read_text())
    jamo_pages = json.loads((ROOT / "data/jamo.json").read_text()) if (ROOT / "data/jamo.json").exists() else {}

    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / "static").mkdir(parents=True)
    for f in (ROOT / "static").iterdir():
        if f.is_file():
            shutil.copy(f, DIST / "static" / f.name)
    data_js = "window.MJ_DATA=" + json.dumps({"words": words, "templates": templates}, ensure_ascii=False, separators=(",", ":")) + ";"
    (DIST / "static/data.js").write_text(data_js)
    v = hashlib.sha1(b"".join(sorted(p.read_bytes() for p in (DIST / "static").iterdir()))).hexdigest()[:8]

    env = Environment(loader=FileSystemLoader(ROOT / "templates"), autoescape=select_autoescape(["html"]))
    today = dt.date.today().isoformat()
    urls = []
    counts = {"nouns": len(words["nouns"]), "verbs": len(words["verbs"]), "adjectives": len(words["adjectives"]), "frames": len(templates["templates"])}
    for lang in LOCALES:
        u = ui[lang]
        prefix = u["dir"]  # "" or "ja/"
        for tpl_name, path, slug in PAGES:
            full = prefix + path
            alt = {l: a.origin + base + ui[l]["dir"] + path for l in LOCALES}
            html = env.get_template(tpl_name).render(
                lang=lang, ui=u, base=base, origin=a.origin, path=full, v=v, today=today, counts=counts,
                words=words, frames=templates["templates"], alt=alt, adsense_pub=a.adsense, slug=slug,
                consonants=list("ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ"), vowels=list("ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ"),
            )
            out = DIST / full / "index.html"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(html)
            urls.append((a.origin + base + full, alt))

    (DIST / "404.html").write_text(env.get_template("404.html").render(lang="en", ui=ui["en"], base=base, origin=a.origin, path="404", v=v, alt={}, adsense_pub="", counts=counts))
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for loc, alt in urls:
        sm.append(f"  <url><loc>{escape(loc)}</loc><lastmod>{today}</lastmod>" + "".join(f'<xhtml:link rel="alternate" hreflang="{l}" href="{escape(h)}"/>' for l, h in alt.items()) + "</url>")
    sm.append("</urlset>")
    (DIST / "sitemap.xml").write_text("\n".join(sm))
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {a.origin}{base}sitemap.xml\n")
    if a.cname:
        (DIST / "CNAME").write_text(a.cname + "\n")
    (DIST / ".nojekyll").write_text("")
    print(f"built {len(urls)} pages → {DIST} (v={v})")


if __name__ == "__main__":
    main()
