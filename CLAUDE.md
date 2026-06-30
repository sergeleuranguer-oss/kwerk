# Kwerk — site vitrine (consignes d'édition)

Site **statique** (HTML/CSS/JS, sans framework), repo **public**, hébergé sur **GitHub Pages**.
Aucun outil à installer, **aucun Cloudflare**. Pour prévisualiser en local : `python3 -m http.server`.

## Déploiement (à connaître)
- Branche **`preprod`** → servie par GitHub Pages (`…/kwerk/`) = **aperçu de validation**.
- Une fois validé → on promeut vers **`gh-pages`** → copié sur le **serveur de prod** (racine du domaine).
- Le site doit donc marcher **à la fois** sous `/kwerk/` ET à la racine → **tous les liens sont RELATIFS**
  (`css/…`, `../images/…`). **Ne jamais écrire de lien absolu** commençant par `/` (ça casse sous `/kwerk/`).
- ⚠️ **Pages EN = un cran plus profond** (`en/…`) : un chemin relatif y vaut `../`. Le HTML/CSS le gère
  déjà. Mais **tout JS qui construit un chemin d'asset** doit en tenir compte, sinon ça casse en EN
  seulement. Ex. réel : `js/galerie.js` rendait `/images/…` relatif → `en/images/…` (404) ; parade =
  préfixe `../` si `location.pathname.includes('/en/')`, + bump du `?v=` sur les pages galerie (cache).

## ⚠️ Règle d'or : header / nav / menu / footer / scripts sont MUTUALISÉS
Ces blocs ne sont **pas** à éditer dans les pages : ils sont **générés** à partir de `partials/`.
Dans chaque page ils sont entourés de marqueurs :

```html
<!-- KW:head ... -->   …généré…   <!-- /KW:head -->
<!-- KW:nav ... -->    …généré…   <!-- /KW:nav -->
<!-- KW:menu -->       …généré…   <!-- /KW:menu -->
<!-- KW:footer -->     …généré…   <!-- /KW:footer -->
<!-- KW:scripts -->    …généré…   <!-- /KW:scripts -->
```

- **Pour modifier le menu, le footer, etc. → éditer le fichier dans `partials/`**, jamais l'intérieur
  d'une zone `KW:` dans une page.
- **Toute modif faite à l'intérieur d'une zone `KW:` sera ÉCRASÉE** au prochain push (la CI régénère).
- **Le contenu propre à une page** (sections, textes, images) se modifie normalement, **hors** des zones `KW:`.

## Où se trouvent les partials
```
partials/
  head.html        scripts.html          # communs FR + EN
  fr/  nav.html  nav-galerie.html  menu.html  footer.html
  en/  nav.html  nav-galerie.html  menu.html  footer.html
```
Les liens dans les partials utilisent des **placeholders** résolus par page (ne pas les retirer) :
- `{{ASSET}}` → vers la racine du repo (css/js/images) · `{{LINK}}` → vers la racine de la langue (liens entre pages)
- `{{SELF}}` → la page courante (lien de langue) · `{{ALT}}` → la page équivalente dans l'autre langue
- `{{NAVCSS}}` → `navbar.css` ou `navbar_galerie.css` selon la variante

## Marqueurs : variante et langue
- Page « galerie » (nav noire) : `<!-- KW:head variant=galerie -->` et `<!-- KW:nav variant=galerie alt="…" -->`.
- `alt="…"` sur `KW:nav` = l'URL de **l'autre langue** pour CETTE page (ex. `alt="en/espaces.html"`).
  C'est le **seul** réglage par page ; le reste vient du partial.
- La langue est déduite du chemin (`en/…` = EN).

## Régénération
- **Automatique** : à chaque push sur `preprod`, GitHub Actions lance `build/inject_partials.py`
  (workflow `.github/workflows/gtm-check.yml`) et recommite les pages régénérées.
- **Manuel** (avant de committer, pour vérifier) : `python3 build/inject_partials.py`.

## Ajouter une nouvelle page
1. **Copier une page existante du même type** (standard ou galerie) pour garder les marqueurs `KW:`.
2. Mettre à jour le **contenu** (hors zones `KW:`), le `<title>` et la `<meta description>`.
3. Régler `alt="…"` sur `<!-- KW:nav … -->` vers l'équivalent dans l'autre langue
   (ou `en.html` / `index.html` si pas d'équivalent).
4. Pousser : la CI remplit les zones `KW:`.

## À ne pas toucher
- Les **IDs analytics** (GTM `GTM-MK4BS4GL`, HubSpot `26225487`, Axeptio) — gérés par le workflow.
- Le script Cloudflare **`email-decode.min.js`** + le dossier `cdn-cgi/` sur `cgu.html` / `mentions-legales.html`
  (déchiffre les emails obfusqués — déjà hors des zones `KW:`).
- CSS des pages légales : `css/legal.css`.

## Pages sans chrome partagé (ne reçoivent pas les blocs KW)
`contact.html`, `en/index.html`, `kwerk_bandeau.html`.
