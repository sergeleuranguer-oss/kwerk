#!/usr/bin/env python3
"""Garantit la présence de GTM + HubSpot + Axeptio sur TOUTES les pages éligibles.

Insertion par ancres (<meta charset>/<head>, <body>, </body>, </head>), idempotente :
chaque snippet n'est ajouté que s'il est absent → relançable sans rien doubler.
Remplace l'ancien bloc « added files only » de gtm-check : ça comble notamment le trou Axeptio.

Usage : python3 build/inject_analytics.py   (CI ou local). Stdlib only.
"""
import os, re, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = ("partials/", "cdn-cgi", "ROOFTOP_MESSINE")
STUBS = {"contact.html", "en/index.html", "kwerk_bandeau.html"}

GTM_ID = "GTM-MK4BS4GL"
HS_ID = "hs-script-loader"
HS_SRC = "https://js-eu1.hs-scripts.com/26225487.js"
AX_MARKER = "axept.io"

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

HS_SNIPPET = """    <!-- Start of HubSpot Embed Code -->
    <script type="text/javascript" id="hs-script-loader" async defer src="https://js-eu1.hs-scripts.com/26225487.js"></script>
    <!-- End of HubSpot Embed Code -->"""

AXEPTIO_SNIPPET = """    <!-- Axeptio -->
    <script>
    window.axeptioSettings = { clientId: "67b4575ea6e9c7674834e1e1", cookiesVersion: "custom_Cp" };
    (function(d, s) {
      var t = d.getElementsByTagName(s)[0], e = d.createElement(s);
      e.async = true; e.src = "//static.axept.io/sdk.js";
      t.parentNode.insertBefore(e, t);
    })(document, "script");
    </script>
    <!-- End Axeptio -->"""


def eligible():
    out = []
    for p in glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True):
        if any(s in p for s in SKIP):
            continue
        rel = os.path.relpath(p, ROOT)
        if rel in STUBS:
            continue
        out.append(rel)
    return sorted(out)


def insert_after(content, pattern, snippet):
    m = re.search(pattern, content, re.IGNORECASE)
    if not m:
        return content, False
    return content[:m.end()] + "\n" + snippet + content[m.end():], True


def insert_before(content, pattern, snippet):
    m = re.search(pattern, content, re.IGNORECASE)
    if not m:
        return content, False
    return content[:m.start()] + snippet + "\n" + content[m.start():], True


def process(rel):
    path = os.path.join(ROOT, rel)
    with open(path, encoding="utf-8", errors="replace") as f:
        content = original = f.read()
    notes = []

    if GTM_ID not in content:
        c2, ok = insert_after(content, r"<meta\s+charset[^>]*>", HEAD_SNIPPET)
        if not ok:
            c2, ok = insert_after(content, r"<head[^>]*>", HEAD_SNIPPET)
        content = c2
        content, _ = insert_after(content, r"<body[^>]*>", BODY_SNIPPET)
        notes.append("GTM+")

    if HS_ID not in content:
        content, _ = insert_before(content, r"</body>", HS_SNIPPET)
        notes.append("HubSpot+")

    if AX_MARKER not in content:
        content, ok = insert_before(content, r"</head>", AXEPTIO_SNIPPET)
        if ok:
            notes.append("Axeptio+")

    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
    return notes


def main():
    changed = 0
    for rel in eligible():
        notes = process(rel)
        if notes:
            changed += 1
            print(f"  {rel}: {' '.join(notes)}")
    print(f"\n{changed} page(s) modifiée(s).")


if __name__ == "__main__":
    main()
