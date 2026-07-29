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
  ou si la cible est un stub : `club.html` (sans version EN) et `en/contact.html` (dont le pendant
  FR est une redirection en `noindex`) n'ont donc volontairement pas de hreflang.
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
