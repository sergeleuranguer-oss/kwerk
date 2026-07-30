# Notes techniques — Kwerk

Détail des mécaniques internes et des diagnostics rencontrés. **Ce fichier ne se lit pas en entier** :
le `CLAUDE.md` à la racine contient les règles à respecter et renvoie ici quand on a besoin du détail.

Sommaire :
- [Cache-busting : mécanique interne](#cache-busting--mécanique-interne)
- [Vidéos : recette d'encodage complète](#vidéos--recette-dencodage-complète)
- [CSS : pièges secondaires](#css--pièges-secondaires)
- [Supprimer une image : les deux angles morts](#supprimer-une-image--les-deux-angles-morts)
- [Mesurer la duplication galerie/content](#mesurer-la-duplication-galeriecontent)
- [Pages orphelines : méthode de détection](#pages-orphelines--méthode-de-détection)
- [Audit avant une promotion](#audit-avant-une-promotion)

---

## Cache-busting : mécanique interne

Deux tampons cohabitent dans `build/inject_partials.py` :

| Fonction | Cible | Déclencheur |
|---|---|---|
| `stamp_versions` | le corps d'un **partial** | marqueur `{{ASSET}}…?v=auto` |
| `stamp_page_versions` | la **page entière**, après injection | n'importe quelle valeur après `?v=` |

Le second re-tamponne **quelle que soit la valeur trouvée**, et c'est nécessaire : une page est
réécrite en place, donc son marqueur `?v=auto` ne survit pas au premier build. Dépendre du marqueur
ne marcherait qu'une fois. L'opération est **idempotente** — repasser sur une zone `KW:` déjà
tamponnée recalcule le même hash, donc aucun bruit dans le diff.

Le hash est un `sha1` des **octets du fichier**, tronqué à 8 caractères (`asset_ver`). Un fichier
absent laisse le `?v=` intact plutôt que d'écrire `None`.

**Le trou** : `PAGE_VER_RE` exige un `?v=` déjà présent. Un `href="css/x.css"` **sans aucun `?v=`**
ne matche jamais et n'est jamais tamponné, en silence. Au 30/07/2026, 16 pages sont dans ce cas
(`espaces.css`, `event.css`, `legal.css`, `maison-kwerk.css`, `notre-histoire.css`,
`restaurant-dana.css`, `en-event.css`, `en-maison-kwerk.css`). Sans effet tant qu'on ne les modifie
pas ; le jour où on en touche un, les visiteurs récurrents gardent l'ancienne version.

```bash
# Contrôle : css/js appelés sans cache-busting
grep -rnoE '(href|src)="(\.\./)*(css|js)/[^"?]+\.(css|js)"' --include=*.html .
```

---

## Vidéos : recette d'encodage complète

Le hero de la home a deux fichiers, choisis au chargement par le script inliné dans `index.html` /
`en.html` : `kwerk-hero-desktop.mp4` (16:9) et `kwerk-hero-mobile-v6.mp4` (9:16, 720×1280, 4,3 Mo).

```bash
ffmpeg -i master.mp4 -map 0:v:0 -map 0:a:0 \
  -vf "scale=720:1280:flags=lanczos" \
  -c:v libx264 -preset slow -crf 28 -profile:v high -pix_fmt yuv420p -g 50 \
  -movflags +faststart \
  -c:a aac -b:a 96k -ac 2 \
  sortie.mp4
```

**Le CRF fait le travail, pas la résolution.** Mesuré le 30/07/2026 sur ce montage (ciel en dégradé,
treillis de la tour Eiffel, panoramiques lents) — tous les candidats partent du même master 80 Mbps :

| Encodage | Taille | SSIM vs master |
|---|---|---|
| fichier alors en ligne (1080×1920) | 8,6 Mo | 0,9470 |
| 1080×1920 CRF 26 | 16,5 Mo | — |
| 720×1280 CRF 24 | 9,8 Mo | — |
| 1080×1920 CRF 30 | 6,3 Mo | 0,9436 |
| **720×1280 CRF 28** ← retenu | **4,3 Mo** | 0,9420 |
| 720×1280 CRF 30 | 3,4 Mo | 0,9386 |

Les trois premiers réglages testés étaient **plus lourds** que le fichier déjà en ligne : descendre
en résolution n'allège pas mécaniquement. Toujours mesurer.

**Contrôles après encodage :**
- `moov` doit précéder `mdat`, sinon la lecture attend le fichier entier. `+faststart` s'en charge ;
  vérifier en listant les atomes de premier niveau.
- **Garder la piste audio** : le bouton son du hero en dépend.
- Décodage intégral sans erreur : `ffmpeg -v error -i sortie.mp4 -f null -`.

**Poster** : le tirer de la **frame 0 du fichier final**, pas du master. Le master est grainé, et ce
grain fait doubler le JPEG (283 Ko contre 72 Ko) tout en introduisant un écart visible au démarrage
de la lecture. Le mettre à la résolution de la vidéo. Contrôle : un RMS faible (< 2) entre le poster
et la frame 0 garantit l'absence de saut visuel.

**Comparer deux encodages :**

```bash
ffmpeg -i a.mp4 -i b.mp4 -filter_complex \
  "[0:v]scale=1080:1920,setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];[a][b]ssim=stats_file=ssim.log" \
  -f null -
```

Un SSIM moyen ~0,99 **sans décrochage local** prouve que c'est le même montage : un logo incrusté ou
un plan différent ferait tomber les frames concernées à 0,6-0,8. ⚠️ Le SSIM **pénalise le
débruitage** — un 720p qui lisse le grain du master perd des points tout en étant plus propre à
l'œil. Ne pas trancher sur le seul chiffre, regarder un crop 100 %.

**Géométrie à l'affichage** : une vidéo 9:16 (ratio 1,778) sur un écran de téléphone moderne
(19,5:9, soit 2,16) est recadrée sur les côtés si elle remplit la hauteur — environ 9 % par bord.
C'est inévitable, ce n'est pas un défaut du fichier.

---

## CSS : pièges secondaires

Les deux pièges majeurs (`!important` dans un CSS mutualisé, `dvh` vs `lvh`) sont dans le
`CLAUDE.md`. Voici les autres, rencontrés le 30/07/2026 :

**Un bloc mobile qui redéfinit une classe n'hérite pas de ce qu'il omet — il hérite du desktop.**
`.sticky-navbar` était redéclarée dans le bloc `max-width:900px` sans `padding` : elle gardait donc
le `padding: 50px 40px` de la règle globale. Avec `box-sizing: border-box` et `height: 60px`, un
padding vertical de 100 px l'emporte sur la hauteur déclarée → la barre passait de **60 à 100 px**
au scroll, et le logo sautait d'une dizaine de pixels. Vérifier que l'état sticky a la **même
géométrie** que l'état repos.

**Transitionner `top` pendant un passage `absolute` → `fixed` ne marche pas.** Le référentiel change
au même instant, l'animation part de travers. N'animer que ce qui reste dans le même référentiel —
ici le `background`.

**Dans un `<style>` de page, les `url()` sont relatives à la page**, pas au fichier CSS. C'est
l'inverse d'un `.css` externe, où elles sont relatives au CSS. Attention en déplaçant une règle de
l'un vers l'autre.

**`:has()` permet de scoper une règle à un type de page sans JS.** `body:has(.hero--fullscreen)`
évite de poser une classe au chargement — un `classList.add()` en JS laisse l'élément apparaître une
fraction de seconde avant de disparaître. Dégradation propre : un navigateur sans `:has()` ignore la
règle entière et garde le comportement par défaut.

---

## Supprimer une image : les deux angles morts

**1. Un `grep` du nom ne prouve rien.** La galerie liste ses images dans un objet JSON inliné qui
échappe les accents : `SALLEDERÉUNION…` dans la page, `SALLEDERÉUNION…` sur le disque. Une image
réellement utilisée a été supprimée comme ça le 28/07/2026. Tester **toutes les écritures** du nom :
littéral, `\uXXXX`, `%XX`, espaces encodés, `+`. Et faire porter le contrôle sur `src`/`href`,
**`url()` du CSS**, **`data-hero-slides`** et **le JSON de la galerie** (dont les chemins commencent
par `/` ou `#`).

**2. Le contrôle d'intégrité ne saute pas les commentaires HTML.** Les 8 `<img>` du carrousel commenté
d'`index.html` remontent en « cible manquante » alors qu'aucun navigateur ne les charge. Une alerte
peut donc désigner du **code mort** : regarder le contexte avant d'agir.

Autre faux positif classique : une regex `url\(([^)]+)\)` casse sur `images/LOBBY(1)-2.jpg`, où la
parenthèse fait partie du nom de fichier.

Originaux archivés dans `/data/backups/kwerk/` (`images-orphelines-*`, `images-png-*`,
`images-jpg-resize-*`, `logos-*`) — restaurer de là plutôt que de fouiller l'historique git.

---

## Mesurer la duplication galerie/content

Rappel : **ne pas dédupliquer**, les copies sont volontaires (voir `CLAUDE.md`). Si on veut malgré
tout mesurer :

- Un **hash d'octets ne voit que les copies exactes**. `galerie/madeleine/LobbyMad3.png` et
  `content/Lobby_Mad_3.jpg` sont la même photo à deux encodages → invisibles au SHA1. Il faut une
  comparaison **perceptuelle** (vignette 32×32 normalisée) pour les apparier.
- Le jumeau n'est pas forcément le fichier le plus lourd : ici le `content/` était **plus grand**
  (1369×903 contre 1000×660) et **5× plus léger**.

Sur 46 images de galerie : 25 ont un jumeau ailleurs dans `images/`, 21 sont propres à la galerie.

---

## Pages orphelines : méthode de détection

`club.html` a vécu des mois sans qu'aucun lien du site n'y mène — ni menu, ni footer, ni page — tout
en restant indexable (pas de `noindex`, canonical auto-référente). Supprimée le 30/07/2026.

```bash
# liens entrants réels, en excluant la page elle-même
grep -rn "club\.html" --include=*.html --include=*.js --include=*.css . | grep -v "^\./club.html:"
```

L'exclusion est indispensable : le sélecteur de langue d'une page pointe sur elle-même et fausse le
compte.

Il n'y a **ni `sitemap.xml` ni `robots.txt` dans le dépôt** ; celui de la prod n'autorise ni
n'interdit quoi que ce soit page par page.

---

## Audit avant une promotion

Contrôles passés le 30/07/2026 sur 36 pages et 1 953 références, tous à zéro : cibles manquantes
(`src`/`href`/`poster`/`url()`/`data-hero-slides` + JSON galerie), chemins absolus, `?v=` incohérent,
canonical en doublon, images > 1920 px, pages en erreur en ligne. **15 paires hreflang réciproques**,
blocs identiques des deux côtés. Build idempotent. C'est la ligne de base : un écart signale une
régression.

Points de méthode :
- Retirer les commentaires HTML avant l'analyse, mais **préserver les marqueurs `KW:`**.
- Normaliser les chemins avant de comparer les `alt=` : ils sont relatifs à la page, donc
  `en/espaces.html` → `alt="../espaces.html"` est bien réciproque avec `espaces.html`.
- Les deux seules exceptions hreflang attendues sont `en/contact.html` (pendant FR en `noindex`) et
  toute page sans équivalent dans l'autre langue.
- L'audit **ne couvre pas le rendu visuel** : il n'y a pas de navigateur sur la machine de build.
