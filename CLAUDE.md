# Kwerk — site vitrine (consignes d'édition)

Site **statique** (HTML/CSS/JS, sans framework), repo **public**, hébergé sur **GitHub Pages**.
Aucun outil à installer, **aucun Cloudflare**. Pour prévisualiser en local : `python3 -m http.server`.

## Déploiement — TROIS environnements, ne pas les confondre
1. Branche **`preprod`** → servie par GitHub Pages (`demo-site2026.github.io/kwerk/`) =
   **environnement de travail**. On y pousse librement ; **ce n'est PAS la prod**.
2. Branche **`gh-pages`** = **versions validées** (promotion manuelle depuis `preprod`).
3. Un **dev** récupère `gh-pages` et déploie sur le **vrai serveur** (`www.kwerk.fr`, racine du domaine).
   ⛔ Cette dernière étape ne nous appartient pas — **ne jamais la proposer ni la déclencher**.
- Le site doit donc marcher **à la fois** sous `/kwerk/` ET à la racine → **tous les liens sont RELATIFS**
  (`css/…`, `../images/…`). **Ne jamais écrire de lien absolu** commençant par `/` (ça casse sous `/kwerk/`).
- ⚠️ **Pages EN = un cran plus profond** (`en/…`) : un chemin relatif y vaut `../`. Le HTML/CSS le gère
  déjà. Mais **tout JS qui construit un chemin d'asset** doit en tenir compte, sinon ça casse en EN
  seulement. Ex. réel : `js/galerie.js` rendait `/images/…` relatif → `en/images/…` (404) ; parade =
  préfixe `../` si `location.pathname.includes('/en/')`, + bump du `?v=` sur les pages galerie (cache).

## Cache-busting des CSS/JS : AUTOMATIQUE (rien à bumper à la main)
En prod le fichier garde son URL → les navigateurs servent l'ancienne version en cache. Parade = un
`?v=` sur l'URL des assets. **C'est géré tout seul par le build**, ne rien bumper manuellement :
- Dans les partials (`head.html`, `scripts.html`), les CSS/JS mutualisés portent un marqueur `?v=auto`.
- Au build (`inject_partials.py` → `stamp_versions`), `auto` est remplacé par le **hash du contenu**
  du fichier (`styles.css?v=6691d2a6`). Un fichier modifié → hash différent → re-téléchargement ;
  les autres gardent leur hash donc restent en cache. Profondeur `/en/` gérée (`../css/…`).
- **Donc** : pour casser le cache, il suffit de **modifier le CSS/JS** — le `?v=` se met à jour seul.
  Ne pas éditer la valeur après `?v=` à la main (elle est écrasée), et ne pas retirer le `?v=auto`.
- **Plus aucune exception** (depuis le 29/07/2026) : un css/js référencé **en dur dans une page**,
  hors partials et hors zones `KW:`, est tamponné lui aussi. C'était le cas de `js/galerie.js` dans
  `galerie.html` / `en/galerie.html`, seul fichier à bumper à la main — il ne l'est plus.
  Deux tampons cohabitent dans `inject_partials.py` : `stamp_versions` (marqueur `{{ASSET}}…?v=auto`
  dans un partial) et `stamp_page_versions` (page entière, après injection). Le second re-tamponne
  **quelle que soit la valeur trouvée** : une page est réécrite en place, donc son marqueur `?v=auto`
  ne survit pas au premier build — d'où la nécessité de ne pas dépendre du marqueur. C'est idempotent
  (repasser sur une zone `KW:` déjà tamponnée recalcule le même hash).
  → Pour un nouveau css/js appelé depuis une page : l'écrire `?v=auto`, le build fait le reste.
- ⚠️ **Le seul trou restant** (constaté le 30/07/2026) : un css/js écrit **sans aucun `?v=`** n'est
  jamais tamponné. `PAGE_VER_RE` exige un `?v=` déjà présent pour le recalculer — pas de `?v=`, pas
  de match, silence total. **16 pages** sont dans ce cas (`espaces.css`, `event.css`, `legal.css`,
  `club.css`, `maison-kwerk.css`, `notre-histoire.css`, `restaurant-dana.css`, `en-event.css`,
  `en-maison-kwerk.css`). Tant qu'on ne les modifie pas c'est sans effet ; le jour où on en touche
  un, les visiteurs récurrents gardent l'ancienne version. Parade = y écrire `?v=auto` une fois.
  Contrôle : chercher `href="css/…\.css"` sans `?v=` dans les pages.

## Images : règles établies le 28/07/2026 (passe d'allègement)
Le dossier est passé de **266 à 91 Mo**. Pour ne pas le regonfler :
- **Aucune image > 1920 px.** C'est la règle qui compte le plus, et elle ne se voit pas dans un audit
  trié par poids : le navigateur décode en `largeur × hauteur × 4 octets`, **quelle que soit la
  compression**. Un logo de 115 Ko en 5434 px, c'est **56 Mo de RAM** sur chaque page qui l'affiche.
  Vérifier les **dimensions**, pas le poids du fichier.
- **Photos → JPEG** (qualité 82-85, `optimize`, `progressive`). Pas de PNG pour une photo : q100 est
  inutile (double le poids pour un écart de ~43 dB, invisible à l'œil).
- **PNG réservé** aux visuels à **transparence réelle** (tester le canal alpha, pas le mode : un RGBA
  peut être opaque) et aux pictos/logos — qu'on **redimensionne** sans changer de format.
- Le **hero** de chaque page est une vraie `<img>` (pas un `background-image`) avec
  `<link rel="preload" as="image">` **placé avant `<!-- KW:head -->`** et `fetchpriority="high"`.
  Le diaporama (`data-hero-slides` + `js/script.js`) change son `src`.
- Images de contenu : `loading="lazy" decoding="async"` — **sauf le hero et le logo du loader**
  (un hero en lazy annule tout le bénéfice du preload). Fait sur `espaces.html` + `en/espaces.html`,
  à étendre. ⚠️ Ces `<img>` n'ont pas de `width`/`height` : surveiller les sauts de mise en page.
- Originaux archivés dans `/data/backups/kwerk/` (`images-orphelines-*`, `images-png-*`,
  `images-jpg-resize-*`, `logos-*`) — restaurer de là plutôt que de fouiller l'historique git.

### ⚠️ Avant de supprimer une image « non utilisée »
Un `grep` du nom **ne prouve rien** : la galerie liste ses images dans un **objet JSON inliné** qui
échappe les accents (`SALLEDERÉUNION…` sur une page, `SALLEDERÉUNION…` sur le disque). Une image
utilisée a été supprimée comme ça le 28/07. Tester **toutes les écritures** du nom (littéral, `\uXXXX`,
`%XX`, espaces encodés), et faire porter le contrôle d'intégrité sur `src`/`href`, **`url()` du CSS**,
**`data-hero-slides`** et **le JSON de la galerie** (dont les chemins commencent par `/` ou `#`).

Le contrôle d'intégrité a l'angle mort inverse : il **ne saute pas les commentaires HTML**. Les 8
`<img>` du carrousel de `index.html` (bloc commenté, lignes ~413-459) remontent en « cible
manquante » alors qu'aucun navigateur ne les charge. Une alerte peut donc désigner du **code mort** :
regarder le contexte avant d'agir.

### ⛔ Ne PAS dédupliquer `images/galerie/` ↔ `images/content/`
Les copies sont **volontaires**. Sur les 46 images de galerie, **25 ont un jumeau** ailleurs dans
`images/` et **21 sont propres à la galerie** : la galerie reprend les images de contenu quand elles
existent, et ajoute ses propres prises. Aucun des deux exemplaires n'est orphelin — **les deux sont
réellement référencés**, par des pages différentes. Fusionner les fichiers pour gagner ~7 Mo casserait
ce dispositif.

Deux pièges si on cherche quand même à mesurer la duplication :
- un **hash d'octets** ne voit que les copies exactes. `galerie/madeleine/LobbyMad3.png` et
  `content/Lobby_Mad_3.jpg` sont la **même photo** à deux encodages → invisibles au SHA1. Il faut une
  comparaison **perceptuelle** (vignette 32×32 normalisée) pour les apparier.
- le jumeau n'est pas forcément le fichier le plus lourd : ici le `content/` était **plus grand**
  (1369×903 contre 1000×660) et **5× plus léger**.

## Vidéos : réencoder un master pour le web (30/07/2026)
Le hero de la home a deux fichiers, `kwerk-hero-desktop.mp4` (16:9) et `kwerk-hero-mobile-v6.mp4`
(9:16), choisis au chargement par le script inliné dans `index.html` / `en.html`.
- **Baisser la résolution ne suffit pas à alléger, c'est le CRF qui travaille.** Sur ce montage
  (ciel en dégradé, treillis de la tour Eiffel, panoramiques lents), 720×1280 en CRF 24 pesait
  **plus lourd** que le fichier 1080×1920 déjà en ligne. Le bon réglage était 720×1280 **CRF 28** :
  8,6 → 4,3 Mo. Toujours mesurer, jamais présumer qu'un downscale allège.
- Recette : `-c:v libx264 -preset slow -crf 28 -profile:v high -pix_fmt yuv420p -g 50
  -movflags +faststart -c:a aac -b:a 96k`. Vérifier ensuite que `moov` précède `mdat`
  (sinon la lecture attend le fichier entier) et **garder la piste audio** : le bouton son en dépend.
- **Le poster se tire de la frame 0 du fichier final**, pas du master : le master est grainé, son
  grain fait doubler le JPEG (283 Ko contre 72 Ko) et introduit un écart visible au démarrage.
  Le mettre à la résolution de la vidéo.
- **Le cache-busting ne couvre pas les `.mp4`** (uniquement css/js). À contenu changé et nom
  identique, les visiteurs récurrents gardent l'ancien fichier → **changer le nom** (`-v6`) et
  mettre à jour les deux pages.
- Comparer deux encodages avec `ffmpeg … -filter_complex ssim` : un SSIM moyen ~0,99 et **sans
  décrochage local** prouve que c'est le même montage. Un logo incrusté ou un plan différent ferait
  tomber les frames concernées à 0,6-0,8. Attention, le SSIM **pénalise le débruitage** : un 720p
  qui lisse le grain du master perd des points tout en étant plus propre à l'œil.

## CSS : pièges de cascade et de viewport (30/07/2026)
Trois bugs de la même famille en une session : **le symptôme visible ne désignait pas la cause**.
Réflexe général — quand une propriété « ne prend pas », chercher `!important` dans les CSS mutualisés
**avant** de suspecter le contenu, l'asset ou le JS.

- **Une règle générique en `!important` bat une déclaration de page plus spécifique.**
  `navbar.css` imposait `.hero { height: 45vh !important }` sous 900 px. Le hero plein écran de la
  home, déclaré `100svh` dans le `<style>` de la page, était donc écrasé : la vidéo verticale
  n'occupait que la moitié de l'écran et `object-fit: cover` la rognait haut/bas — **le fichier vidéo
  était intact**, on a d'abord cru à un mauvais encodage. Parade : scoper la règle générique en
  `.hero:not(.hero--fullscreen)` plutôt que surenchérir en `!important`.
- **Un bloc mobile qui redéfinit une classe n'hérite pas de ce qu'il omet — il hérite du desktop.**
  `.sticky-navbar` était redéclarée dans le bloc `max-width:900px` sans `padding` : elle gardait le
  `padding: 50px 40px` de la règle globale. Avec `box-sizing: border-box` et `height: 60px`, un
  padding vertical de 100 px l'emporte → la barre passait de **60 à 100 px** au scroll, d'où un saut
  du logo. Vérifier que l'état sticky a la **même géométrie** que l'état repos.
- **`dvh` ≠ `lvh` pour un hero plein écran.** `100dvh` se redimensionne en continu quand la barre
  d'URL mobile se rétracte : le hero s'étire pendant le scroll et décale tout le contenu.
  → **Utiliser `100lvh`**, valeur fixe pour un appareil donné. Le hero déborde un peu sous la barre
  à l'arrivée, sans conséquence en `object-fit: cover`. Conséquence à traiter : un élément ancré en
  `bottom:` passe sous la barre → le remonter de `calc(100lvh - 100svh)`, qui vaut **0 sur desktop**.
  (`100svh` donne l'effet inverse : un trou en bas dès que la barre disparaît.)
- **Un `style="…"` inline ne se surcharge pas en CSS** sans `!important`. Le fond de repli du hero
  était inline sur le `<header>` et servait le poster desktop 16:9 même sur mobile. Plutôt qu'un
  `!important`, sortir la déclaration vers le `<style>` de la page — la variante mobile devient une
  règle normale. ⚠️ Dans un `<style>` de page, les `url()` sont relatives à **la page**, pas au CSS.
- **Transitionner `top` pendant un passage `absolute` → `fixed` ne marche pas** : le référentiel
  change au même instant, l'animation part de travers. N'animer que ce qui reste dans le même
  référentiel (ici le `background`).

## Pages orphelines : vérifier les liens entrants, pas l'existence
`club.html` a vécu des mois sans qu'aucun lien du site n'y mène (ni menu, ni footer, ni page), tout
en restant indexable — supprimée le 30/07/2026. Pour détecter ce cas : `grep -rn "page\.html"` en
excluant la page elle-même (son propre sélecteur de langue s'auto-référence et fausse le compte).
⚠️ Une page orpheline **peut exister en prod** (`www.kwerk.fr/club.html` répondait 200) : la
supprimer crée un 404 sur une URL publique → prévoir une **redirection côté dev**
(liste dans `~/inbox/kwerk-redirections-galerie.xlsx`). Il n'y a **ni `sitemap.xml` ni `robots.txt`
dans le dépôt** ; celui de la prod n'autorise/interdit rien par page.

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
- `{{CANONICAL}}` → l'URL **absolue de production** de la page (`https://www.kwerk.fr/…`), pour la
  balise `<link rel="canonical">`. **Seule exception à la règle du tout-relatif** : une canonical
  relative n'a pas de sens hors du domaine final. Elle pointe volontairement vers la prod même
  quand la page est servie depuis la preprod, pour que la preprod ne s'indexe pas à sa place.
  La home se déclare sur la racine nue (`https://www.kwerk.fr/`), pas sur `/index.html`.
- `{{HREFLANG}}` → le bloc `fr` / `en` / `x-default` (x-default = le FR), en URLs absolues.
  **Déduit de l'`alt="…"` du marqueur `KW:nav`** : c'est la seule source d'appairage, il n'y a pas
  de seconde table. Le bloc est **identique sur les deux pages** de la paire — c'est la condition
  pour que Google le prenne en compte. Il n'est **pas** émis si l'appairage n'est pas réciproque
  ou si la cible est un stub : `en/contact.html` (dont le pendant FR est une redirection en
  `noindex`) n'a donc volontairement pas de hreflang. Au 30/07/2026 : **15 paires réciproques,
  blocs identiques des deux côtés** — c'est l'état de référence à retrouver après un ajout de page.
  → Conséquence : **un `alt="…"` faux casse le hreflang silencieusement**. Le vérifier en ajoutant
  une page.

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
