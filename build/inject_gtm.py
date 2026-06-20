#!/usr/bin/env python3
"""Garantit la présence du conteneur Google Tag Manager sur les pages éligibles.

GTM est le SEUL tracker géré inline par page : HubSpot vient du partial `scripts`,
et Axeptio est chargé PAR GTM (ne jamais l'inliner -> sinon double-chargement).
Insertion par ancre, idempotente (n'ajoute que si GTM absent) -> filet de sécurité
pour une éventuelle page sans le snippet. Stdlib only.
"""
import os, re, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = ("partials/", "cdn-cgi", "ROOFTOP_MESSINE")
STUBS = {"contact.html", "en/index.html", "kwerk_bandeau.html"}
GTM_ID = "GTM-MK4BS4GL"

HEAD_SNIPPET = """    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-MK4BS4GL');</script>
    <!-- End Google Tag Manager -->"""

BODY_SNIPPET = """    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MK4BS4GL"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->"""


def eligible():
    out = []
    for p in glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True):
        if any(s in p for s in SKIP):
            continue
        rel = os.path.relpath(p, ROOT)
        if rel not in STUBS:
            out.append(rel)
    return sorted(out)


def process(rel):
    path = os.path.join(ROOT, rel)
    with open(path, encoding="utf-8", errors="replace") as f:
        content = original = f.read()
    if GTM_ID in content:
        return False
    m = re.search(r"<meta\s+charset[^>]*>", content, re.IGNORECASE) or re.search(r"<head[^>]*>", content, re.IGNORECASE)
    if m:
        content = content[:m.end()] + "\n" + HEAD_SNIPPET + content[m.end():]
    b = re.search(r"<body[^>]*>", content, re.IGNORECASE)
    if b:
        content = content[:b.end()] + "\n" + BODY_SNIPPET + content[b.end():]
    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False


def main():
    n = sum(process(rel) for rel in eligible())
    print(f"{n} page(s) sans GTM corrigée(s).")


if __name__ == "__main__":
    main()
