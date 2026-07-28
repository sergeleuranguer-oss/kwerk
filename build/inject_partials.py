#!/usr/bin/env python3
"""Injecte les partials communs kwerk dans les pages HTML.

Principe : chaque page borne ses zones mutualisées par des marqueurs
    <!-- KW:head variant=galerie --> ... <!-- /KW:head -->
    <!-- KW:menu --> ... <!-- /KW:menu -->
    <!-- KW:footer --> ... <!-- /KW:footer -->
    <!-- KW:scripts --> ... <!-- /KW:scripts -->
Le script remplace l'intérieur de chaque zone par le partial correspondant, en
résolvant les chemins RELATIFS (le site doit tourner sous /kwerk/ ET à la racine) :
    {{ASSET}}  -> préfixe vers la racine du repo (css/js/images)
    {{LINK}}   -> préfixe vers la racine de la langue (liens inter-pages)
    {{NAVCSS}} -> navbar.css | navbar_galerie.css selon variant

Idempotent. Usage :
    python3 build/inject_partials.py                # toutes les pages
    python3 build/inject_partials.py index.html ... # pages ciblées
"""
import os, re, sys, glob, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHARED = {"head", "scripts"}          # mêmes partials pour FR et EN
PER_LANG = {"nav", "menu", "footer"}  # contenu propre à chaque langue

REQUIRED = {                          # marqueurs attendus sur une page « complète »
    "head": True, "nav": True, "menu": True, "footer": True, "scripts": True,
}

MARKER_RE = re.compile(
    r"<!--\s*KW:(?P<name>[a-z]+)(?P<attrs>[^>]*?)-->.*?<!--\s*/KW:(?P=name)\s*-->",
    re.DOTALL,
)
_partials = {}

# Cache-busting AUTOMATIQUE. On garde la logique posée dans les partials
# (?v= sur chaque css/js mutualisé) mais la VALEUR est calculée ici = hash du
# CONTENU du fichier. Donc : plus rien à bumper à la main, aucun oubli possible,
# et seul un fichier réellement modifié voit son URL changer (les autres restent
# en cache). Le ?v= écrit dans le partial (?v=auto) n'est qu'un marqueur remplacé.
VER_RE = re.compile(r"(\{\{ASSET\}\}((?:css|js)/[^\"'?\s]+?\.(?:css|js)))\?v=[^\"'\s]*")
_asset_ver = {}


def asset_ver(rel_url):
    if rel_url not in _asset_ver:
        try:
            with open(os.path.join(ROOT, rel_url), "rb") as f:
                _asset_ver[rel_url] = hashlib.sha1(f.read()).hexdigest()[:8]
        except OSError:
            _asset_ver[rel_url] = None       # asset absent : on laisse le ?v= tel quel
    return _asset_ver[rel_url]


def stamp_versions(text):
    def sub(m):
        ver = asset_ver(m.group(2))
        return f"{m.group(1)}?v={ver}" if ver else m.group(0)
    return VER_RE.sub(sub, text)


def page_lang(rel):
    return "en" if rel == "en.html" or rel.startswith("en/") else "fr"


def asset_prefix(rel):
    return "../" * rel.count("/")


def link_prefix(rel):
    depth = rel.count("/")
    if page_lang(rel) == "en":
        if rel == "en.html":
            return "en/"
        return "../" * (depth - 1)
    return "../" * depth


def load(name):
    if name not in _partials:
        with open(os.path.join(ROOT, "partials", name), encoding="utf-8") as f:
            _partials[name] = f.read().rstrip("\n")
    return _partials[name]


def partial_for(name, lang, variant):
    if name in SHARED:
        return load(f"{name}.html")
    fname = "nav-galerie" if (name == "nav" and variant == "galerie") else name
    return load(f"{lang}/{fname}.html")


def parse_attrs(s):
    return dict(re.findall(r"(\w+)=[\"']?([^\"'\s]+)", s or ""))


def inject(rel):
    path = os.path.join(ROOT, rel)
    with open(path, encoding="utf-8") as f:
        html = f.read()
    lang, asset, link = page_lang(rel), asset_prefix(rel), link_prefix(rel)
    seen = set()

    def repl(m):
        name, raw_attrs = m.group("name"), m.group("attrs")
        seen.add(name)
        attrs = parse_attrs(raw_attrs)
        variant = attrs.get("variant", "standard")
        navcss = "navbar_galerie.css" if variant == "galerie" else "navbar.css"
        body = partial_for(name, lang, variant).replace("{{NAVCSS}}", navcss)
        body = stamp_versions(body)          # {{ASSET}}css/x.css?v=… -> hash(x.css)
        body = (
            body
            .replace("{{ASSET}}", asset)
            .replace("{{LINK}}", link)
            .replace("{{SELF}}", os.path.basename(rel))
            .replace("{{ALT}}", attrs.get("alt", ""))
        )
        return f"<!-- KW:{name}{raw_attrs}-->\n{body}\n<!-- /KW:{name} -->"

    new = MARKER_RE.sub(repl, html)
    missing = [k for k in REQUIRED if k not in seen]
    if new != html:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new)
    return new != html, missing


def main():
    SKIP = ("partials/", "cdn-cgi", "ROOFTOP_MESSINE")
    STUBS = {"contact.html", "en/index.html", "kwerk_bandeau.html"}
    targets = sys.argv[1:] or [
        rel
        for p in glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)
        if not any(s in p for s in SKIP)
        for rel in [os.path.relpath(p, ROOT)]
        if rel not in STUBS
    ]
    changed = warned = 0
    for rel in targets:
        did, missing = inject(rel)
        if did:
            changed += 1
            print(f"  maj   {rel}")
        if missing:
            warned += 1
            print(f"  ⚠ {rel} : marqueurs absents {missing}")
    print(f"\n{changed} page(s) régénérée(s), {warned} avec marqueur(s) manquant(s).")


if __name__ == "__main__":
    main()
