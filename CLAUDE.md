# Kwerk — site vitrine (consignes d'édition)

Site **statique** (HTML/CSS/JS, sans framework), repo **public**, hébergé sur **GitHub Pages**.
Aucun outil à installer, **aucun Cloudflare**. Prévisualisation locale : `python3 -m http.server`.

> Le détail des mécaniques internes et des diagnostics est dans **`docs/notes-techniques.md`**.
> Ne l'ouvrir qu'en cas de besoin précis : encoder une vidéo, comprendre le tampon `?v=`, débusquer
> une image faussement orpheline, préparer une promotion.

## ⛔ Les six règles à ne jamais enfreindre

1. **Ne rien éditer à l'intérieur d'une zone `<!-- KW:… -->`** — c'est généré, ce sera écrasé.
2. **Aucun lien absolu commençant par `/`** — tout est relatif (`css/…`, `../images/…`).
3. **Ne jamais bumper un `?v=` à la main** — le build le calcule ; modifier le fichier suffit.
4. **Aucune image > 1920 px** — vérifier les **dimensions**, pas le poids.
5. **Ne jamais proposer ni déclencher la mise en prod** — ce n'est pas notre périmètre.
6. **Ne pas supprimer une image « inutilisée » sur la foi d'un `grep`** — voir plus bas.

## Déploiement — TROIS environnements, ne pas les confondre

1. Branche **`preprod`** → servie par GitHub Pages (`demo-site2026.github.io/kwerk/`) =
   **environnement de travail**. On y pousse librement ; **ce n'est PAS la prod**.
2. Branche **`gh-pages`** = **versions validées** (promotion manuelle depuis `preprod`).
3. Un **dev** récupère `gh-pages` et déploie sur le vrai serveur (`www.kwerk.fr`, racine du domaine).
   ⛔ Cette étape ne nous appartient pas.

Le site doit marcher **à la fois** sous `/kwerk/` ET à la racine — d'où la règle du tout-relatif.

⚠️ **Les pages EN sont un cran plus profond** (`en/…`) : un chemin relatif y vaut `../`. Le HTML et
le CSS le gèrent déjà, mais **tout JS qui construit un chemin d'asset** doit en tenir compte, sinon
ça ne casse qu'en EN. Cas réel : `js/galerie.js` produisait `/images/…` → `en/images/…` (404).
Parade : préfixer `../` si `location.pathname.includes('/en/')`.

## ⚠️ Règle d'or : header / nav / menu / footer / scripts sont MUTUALISÉS

Ces blocs sont **générés** à partir de `partials/` et délimités dans chaque page par des marqueurs :

```html
<!-- KW:head ... -->   …généré…   <!-- /KW:head -->
<!-- KW:nav ... -->    …généré…   <!-- /KW:nav -->
<!-- KW:menu -->       …généré…   <!-- /KW:menu -->
<!-- KW:footer -->     …généré…   <!-- /KW:footer -->
<!-- KW:scripts -->    …généré…   <!-- /KW:scripts -->
```

- Pour modifier le menu, le footer, etc. → **éditer le fichier dans `partials/`**.
- **Toute modif à l'intérieur d'une zone `KW:` sera ÉCRASÉE** au prochain push (la CI régénère).
- Le **contenu propre à une page** (sections, textes, images) se modifie normalement, **hors** zones.

## Les partials : où ils sont, comment ils marchent

```
partials/
  head.html        scripts.html          # communs FR + EN
  fr/  nav.html  nav-galerie.html  menu.html  footer.html
  en/  nav.html  nav-galerie.html  menu.html  footer.html
```

Les liens y utilisent des **placeholders** résolus par page (ne pas les retirer) :

| Placeholder | Résout vers |
|---|---|
| `{{ASSET}}` | la racine du repo (css/js/images) |
| `{{LINK}}` | la racine de la langue (liens entre pages) |
| `{{SELF}}` | la page courante (lien de langue) |
| `{{ALT}}` | la page équivalente dans l'autre langue |
| `{{NAVCSS}}` | `navbar.css` ou `navbar_galerie.css` selon la variante |
| `{{CANONICAL}}` | l'URL **absolue de production** de la page |
| `{{HREFLANG}}` | le bloc `fr` / `en` / `x-default`, en URLs absolues |

`{{CANONICAL}}` est la **seule exception à la règle du tout-relatif** : une canonical relative n'a
pas de sens hors du domaine final. Elle pointe volontairement vers la prod même servie depuis la
preprod, pour que la preprod ne s'indexe pas à sa place. La home se déclare sur la racine nue
(`https://www.kwerk.fr/`), pas sur `/index.html`.

`{{HREFLANG}}` est **déduit de l'`alt="…"` du marqueur `KW:nav`** — c'est la seule source
d'appairage, il n'y a pas de seconde table. Le bloc doit être **identique sur les deux pages** de la
paire pour que Google le prenne en compte, et n'est pas émis si l'appairage n'est pas réciproque.
→ **Un `alt="…"` faux casse le hreflang silencieusement.** État de référence au 30/07/2026 :
**15 paires réciproques**, blocs identiques.

## Marqueurs : variante et langue

- Page « galerie » (nav noire) : `<!-- KW:head variant=galerie -->` et
  `<!-- KW:nav variant=galerie alt="…" -->`.
- `alt="…"` = l'URL de **l'autre langue** pour CETTE page (ex. `alt="en/espaces.html"`).
  C'est le **seul** réglage par page ; le reste vient du partial.
- La langue est déduite du chemin (`en/…` = EN).

## Régénération

- **Automatique** : à chaque push sur `preprod`, GitHub Actions lance `build/inject_partials.py`
  (workflow `.github/workflows/gtm-check.yml`) et recommite les pages régénérées.
- **Manuel**, avant de committer : `python3 build/inject_partials.py`.

## Ajouter une nouvelle page

1. **Copier une page existante du même type** (standard ou galerie) pour garder les marqueurs `KW:`.
2. Mettre à jour le contenu (hors zones `KW:`), le `<title>` et la `<meta description>`.
3. Régler `alt="…"` sur `<!-- KW:nav … -->` vers l'équivalent dans l'autre langue
   (ou `en.html` / `index.html` s'il n'y en a pas).
4. Pousser : la CI remplit les zones `KW:`.

## Cache-busting des CSS/JS : AUTOMATIQUE

Le build remplace le `?v=` par le **hash du contenu** du fichier (`styles.css?v=6691d2a6`). Un
fichier modifié change de hash et est re-téléchargé ; les autres restent en cache.

- **Pour casser le cache, il suffit de modifier le CSS/JS.** Ne pas éditer la valeur après `?v=`
  (elle est écrasée), ne pas retirer le `?v=auto` d'un partial.
- **Nouveau css/js appelé depuis une page** : l'écrire `?v=auto`, le build fait le reste.
- ⚠️ **Un css/js écrit sans aucun `?v=` n'est jamais tamponné**, en silence. 16 pages sont dans ce
  cas aujourd'hui. Sans effet tant qu'on ne les modifie pas — mais si vous touchez un CSS de page,
  **vérifiez qu'il a bien un `?v=`**.
- Le cache-busting **ne couvre que les css/js**. Pour une image ou une vidéo dont le contenu change,
  **renommer le fichier** (`-v6`), sinon les visiteurs récurrents gardent l'ancien.

## Images

Le dossier est passé de 266 à 91 Mo lors d'une passe d'allègement. Pour ne pas le regonfler :

- **Aucune image > 1920 px.** Le navigateur décode en `largeur × hauteur × 4 octets`, **quelle que
  soit la compression** : un logo de 115 Ko en 5434 px, c'est 56 Mo de RAM sur chaque page.
  Un audit trié par poids ne le voit pas — **vérifier les dimensions**.
- **Photos → JPEG** (qualité 82-85, `optimize`, `progressive`). Jamais de PNG pour une photo.
- **PNG réservé** aux visuels à transparence réelle (tester le canal alpha, pas le mode : un RGBA
  peut être opaque) et aux pictos/logos — qu'on redimensionne sans changer de format.
- Le **hero** d'une page est une vraie `<img>` (pas un `background-image`) avec
  `<link rel="preload" as="image">` **placé avant `<!-- KW:head -->`** et `fetchpriority="high"`.
- Images de contenu : `loading="lazy" decoding="async"` — **sauf le hero et le logo du loader**
  (un hero en lazy annule le bénéfice du preload). ⚠️ Ces `<img>` n'ont pas de `width`/`height` :
  surveiller les sauts de mise en page.

### ⚠️ Avant de supprimer une image « non utilisée »

**Un `grep` du nom ne prouve rien** : la galerie liste ses images dans un JSON inliné qui échappe
les accents. Une image réellement utilisée a été supprimée comme ça. Tester toutes les écritures du
nom et porter le contrôle sur `src`/`href`, `url()` du CSS, `data-hero-slides` **et** le JSON de la
galerie. À l'inverse, une alerte « cible manquante » peut désigner du **code mort** : le contrôle ne
saute pas les commentaires HTML. → méthode complète dans `docs/notes-techniques.md`.

### ⛔ Ne PAS dédupliquer `images/galerie/` ↔ `images/content/`

Les copies sont **volontaires** : la galerie reprend les images de contenu quand elles existent et
ajoute ses propres prises. **Les deux exemplaires sont réellement référencés**, par des pages
différentes. Fusionner pour gagner ~7 Mo casserait le dispositif.

## Vidéos

Le hero de la home a deux fichiers choisis au chargement : `kwerk-hero-desktop.mp4` (16:9) et
`kwerk-hero-mobile-v6.mp4` (9:16). Pour en réencoder un depuis un master :

- **C'est le CRF qui allège, pas la résolution.** Descendre en résolution peut produire un fichier
  **plus lourd** — c'est arrivé. Toujours mesurer plusieurs réglages avant de choisir.
- **Garder la piste audio** (le bouton son en dépend) et `-movflags +faststart`.
- **Le poster se tire de la frame 0 du fichier final**, pas du master, à la résolution de la vidéo.
- **Renommer le fichier** à chaque nouvelle version : aucun cache-busting sur les `.mp4`.

→ Recette ffmpeg, tableau de mesures et méthode de comparaison SSIM dans `docs/notes-techniques.md`.

## CSS : les deux pièges qui coûtent le plus cher

Réflexe général : **quand une propriété « ne prend pas », chercher `!important` dans les CSS
mutualisés avant de suspecter le contenu, l'asset ou le JS.**

- **Une règle générique en `!important` bat une déclaration de page plus spécifique.** `navbar.css`
  imposait `.hero { height: 45vh !important }` sous 900 px, ce qui écrasait le hero plein écran de
  la home déclaré dans le `<style>` de la page. Symptôme trompeur : la vidéo paraissait rognée alors
  que **le fichier était intact**. Parade : scoper la règle générique
  (`.hero:not(.hero--fullscreen)`) plutôt que surenchérir en `!important`.
- **`dvh` ≠ `lvh` pour un hero plein écran.** `100dvh` se redimensionne en continu quand la barre
  d'URL mobile se rétracte : le hero s'étire pendant le scroll et décale tout le contenu.
  → **Utiliser `100lvh`**, fixe pour un appareil donné. Un élément ancré en `bottom:` passera sous
  la barre d'URL à l'arrivée : le remonter de `calc(100lvh - 100svh)`, qui vaut **0 sur desktop**.

→ Pièges secondaires (padding hérité en sticky, transition `top` sur `absolute`→`fixed`, `url()`
dans un `<style>` de page, scoping en `:has()`) dans `docs/notes-techniques.md`.

## À ne pas toucher

- Les **IDs analytics** (GTM `GTM-MK4BS4GL`, HubSpot `26225487`, Axeptio) — gérés par le workflow.
- Le script Cloudflare **`email-decode.min.js`** et le dossier `cdn-cgi/` sur `cgu.html` /
  `mentions-legales.html` (déchiffrent les emails obfusqués — déjà hors des zones `KW:`).
- CSS des pages légales : `css/legal.css`.

## Pages sans chrome partagé (ne reçoivent pas les blocs KW)

`contact.html`, `en/index.html`, `kwerk_bandeau.html`.
