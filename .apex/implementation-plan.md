# Plan d'exécution — Chantier maintenabilité kwerk

> Niveau Apex : **N3** (refactor transverse). Branche de travail : `chantier-archi`.
> Backup à date : `/data/backups/kwerk/…-20260620-1045` (vérifié).
> **Ne jamais committer d'état intermédiaire sur `preprod`** (publié en direct = aperçu de validation direction).

## 1. Besoin
Supprimer la duplication header / nav / footer (~6 600 lignes copiées sur ~45 pages) pour qu'une
modif de menu/footer se fasse **en un seul endroit**, sans casser le rendu démo GitHub Pages ni la prod.

## 2. Contraintes structurantes (vérifiées)
- Pipeline : **`preprod`** → GitHub Pages `/kwerk/` (validation direction) → promotion vers **`gh-pages`**
  → copie sur **serveur prod (racine `/`)**.
- Le site marche sur les **deux bases** (`/kwerk/` et `/`) uniquement parce que **tous les liens sont
  relatifs**. ⇒ **invariant absolu : la sortie reste en liens relatifs.**
- Repo public ⇒ GitHub Actions gratuit illimité.
- Pattern déjà en place : `.github/workflows/gtm-check.yml` réécrit le HTML au push (garde-fou
  `if: github.actor != 'github-actions[bot]'`).

## 3. Décision d'architecture
**Injection au build via script Python en CI** (extension du pattern existant), **pas 11ty**
(son `pathPrefix` casserait la prod racine + bascule Pages en Actions + deux builds). Détail du
raisonnement : mémoire projet `kwerk-chantier-archi`.

## 4. Le point technique clé — deux préfixes relatifs
Les partials contiennent des liens vers des **assets** (à la racine du repo) ET vers d'**autres pages**
(propres à chaque langue). Le script calcule, **par page**, deux préfixes et les substitue :

| Placeholder | Pointe vers | racine FR | `en/` | `adresses/` | `en/adresses/` |
|---|---|---|---|---|---|
| `{{ASSET}}` | racine repo (css, js, images) | `` | `../` | `../` | `../../` |
| `{{LINK}}` | racine de la langue (liens inter-pages) | `` | `` | `../` | `../` |

Exemple dans `partials/fr/footer.html` : `<img src="{{ASSET}}images/logo-kwerk-noir.png">` et
`<a href="{{LINK}}espaces.html">BUREAUX</a>`. Le script résout selon le chemin du fichier.

## 5. Partials à créer (source unique)
```
partials/
  fr/  head.html  nav.html  nav-galerie.html  footer.html  scripts.html
  en/  head.html  nav.html  nav-galerie.html  footer.html  scripts.html
```
- `head.html` : meta viewport/charset commun, fonts, AOS, favicon, liens CSS communs
  (`styles.css`, `footer.css`, navbar selon variante), snippets GTM/HubSpot/Axeptio.
  ⚠️ `<title>` et `<meta description>` **restent dans la page** (spécifiques) — hors zone INCLUDE.
- `nav.html` / `nav-galerie.html` : navbar + side-menu (variante standard blanche vs galerie noire :
  logo + burger + classe). Différence minime → 2 fichiers pour rester lisible.
- `footer.html` : footer mutualisé. **EN harmonisé sur la structure FR** (`.footer-col`,
  `footer-nav--3col`) — corrige la divergence `.footer-nav-col`. Vérifier que `js/footer.js` reste
  cohérent après harmonisation.
- `scripts.html` : bloc de `<script>` de fin de body (AOS.init, HubSpot, sticky/contact/form/footer/script/loader).

> **DÉCISION ANALYTICS = A (harmoniser).** GTM + Axeptio dans `head.html`, HubSpot dans `scripts.html`
> (+ le `<noscript>` GTM en début de body). État vérifié 20/06 : GTM/HubSpot sur 44/45, **Axeptio sur 2/45**
> seulement (les 43 autres n'ont jamais reçu le bandeau de consentement → ⚠️ exposition RGPD à confirmer
> côté client). Mutualiser corrige le trou → 45 pages cohérentes. Le workflow `gtm-check.yml` devient
> redondant → à **retirer** une fois les partials en place. `contact.html` n'a ni GTM ni HubSpot — à traiter.

## 6. Marqueurs dans les pages
Zones remplacées par le script, bornées par des commentaires explicites :
```html
<!-- KW:head -->            ...généré...    <!-- /KW:head -->
<!-- KW:nav variant=galerie --> ...généré... <!-- /KW:nav -->
<!-- KW:footer -->          ...généré...    <!-- /KW:footer -->
<!-- KW:scripts -->         ...généré...    <!-- /KW:scripts -->
```
`variant=galerie` optionnel (défaut = standard). La langue est déduite du chemin (`en/` → partials/en).

## 7. Phasage

### Phase 1 — Nettoyage (indépendant du moteur, sûr, réversible)
1. Choisir LA version canonique de chaque bloc (prendre `index.html` comme référence FR, `en/espaces.html` comme référence EN).
2. Créer les partials FR + EN avec `{{ASSET}}`/`{{LINK}}`.
3. **Harmoniser le footer EN** sur la structure FR.
4. **Sortir le CSS inline** (`<style>`) vers des fichiers : factoriser les copies exactes
   (`espaces`≡`nos-services` → 1 fichier commun ; `cgu`≡`mentions-legales` → 1 fichier commun) ;
   le reste vers des CSS dédiés (`maison-kwerk.css`, `club.css`, `notre-histoire.css`, `event.css`…).
5. Insérer les marqueurs `<!-- KW:* -->` dans les pages (peut être semi-automatisé).
6. **Arbitrage à confirmer** : menu FR (7 items) vs EN (4 items) — aligner ou volontaire ?

### Phase 2 — Injecteur + CI
7. Écrire `build/inject_partials.py` : lit les partials, résout `{{ASSET}}`/`{{LINK}}` par page,
   remplace chaque zone entre marqueurs, réécrit le fichier. Idempotent.
8. Intégrer au workflow : **étendre `gtm-check.yml`** (ou job sœur) pour lancer l'injection au push
   `preprod`, en gardant `if: github.actor != 'github-actions[bot]'` (anti-boucle).
9. (Option) Permettre un lancement local : `python3 build/inject_partials.py` avant commit.

### Phase 3 — Consignes (faire respecter pour les futures modifs)
10. Créer **`CLAUDE.md` à la racine** (chargé auto par le Claude Code du client) :
    - « header/nav/footer/head se modifient **dans `partials/`**, JAMAIS dans les pages ».
    - expliquer les marqueurs + `{{ASSET}}`/`{{LINK}}` + le fait que la CI **écrase** toute modif
      faite au mauvais endroit (filet de sécurité).
    - où va le contenu spécifique (hors zones KW), comment ajouter une page.
11. (Option) `README.md` court pour l'humain.

## 8. Vérification (gate avant merge dans preprod)
- **Aperçu local** : `python3 -m http.server` → contrôle visuel de pages clés (index, une adresse,
  une galerie, une page EN, une page profonde `en/adresses/messine.html`).
- **Diff de rendu** : comparer le HTML après injection à l'actuel → seules les zones attendues bougent
  (le contenu de nav/footer doit être **équivalent**, pas altéré).
- **Check liens** : crawler local, 0 lien cassé (surtout aux 3 profondeurs × 2 langues).
- **Test double base** : vérifier qu'une page marche servie sous `/kwerk/` ET à la racine.
- Idempotence : relancer l'injecteur 2× → aucun diff au 2e passage.

## 9. Risques & parades
- **Liens relatifs mal résolus** (le risque n°1) → table `{{ASSET}}`/`{{LINK}}` testée aux 3 profondeurs.
- **Footer EN/JS** désynchronisés après harmonisation → relire `js/footer.js`.
- **Marqueurs oubliés** sur une page → l'injecteur loggue les pages sans marqueur.
- **Boucle CI** → garde-fou `github-actions[bot]` conservé.
- **Travail sur preprod par erreur** → on reste sur `chantier-archi`, merge seulement quand vert.

## 9bis. Garde-fous anti-régression (les modifs de Lucas ne doivent rien casser)
Défense en profondeur — exigence explicite du client :
1. **CI réécrit (auto-réparation)** : chaque push `preprod` régénère les zones `KW:*` depuis les partials
   → toute modif faite dans une page est écrasée. Les analytics ne dérivent pas.
2. **Marqueurs auto-réparables** : `head` (ancre `</head>`) et `scripts` (ancre `</body>`) sont
   **réinsérés** si le marqueur a été supprimé → GTM/Axeptio/HubSpot reviennent même si tout est effacé.
   nav/footer : marqueur manquant ⇒ **échec CI** (réinsertion positionnelle trop risquée).
3. **Assertions bloquantes** (fin d'injecteur) : (a) chaque page contient GTM+HubSpot+Axeptio après build ;
   (b) les partials source contiennent les IDs requis (`GTM-MK4BS4GL`, HubSpot `26225487`, Axeptio clientId) ;
   (c) marqueurs équilibrés. Sinon → exit non-zéro = alarme rouge.
4. **`CLAUDE.md`** : édite les partials, jamais les zones KW ; ne touche pas aux IDs ; nouvelle page =
   partir de `partials/_page-template.html` (porte déjà les marqueurs).
> **Limite assumée** : Pages legacy publie indépendamment du résultat de l'Action → l'échec **alerte**
> mais ne **bloque** pas la publication ; courte fenêtre version-brute sur l'**aperçu** seulement (la prod
> reste protégée par l'étape de promotion `gh-pages` manuelle). Vrai blocage = seul argument pour Pages→Actions, non requis pour démarrer.

## 10. Rollout
`chantier-archi` → vérif complète → merge dans `preprod` → validation direction sur l'aperçu →
promotion `gh-pages` → prod. Le client reprend ses modifs **via les partials** (cadré par `CLAUDE.md`).
Après stabilisation : **retirer `gtm-check.yml`** (remplacé par les partials).

## 11. Journal des arbitrages (validés avec Serge)
**Pilote (3 pages)** : head/nav/menu/footer/scripts mutualisés, validés. Comportement preprod
préservé (contact = `#`/`contact.html` selon page, ouvre le volet via JS — NE PAS normaliser).
**Footer** : passé en **accordéon comme prod** (demandé) ; `footer.css` `.footer-nav` aligné prod
(`justify-content:flex-start; gap:86px`). `.footer-col`/`.footer-nav--3col` → CSS mort à retirer.
**Groupe EN (standard)** : menu+footer EN uniformes (1 jeu de liens) → mutualisables. Canonical figé :
« YOUR BUILDING<br>MANAGED BY KWERK » (2 lignes), « Le Dana » (option formulaire), alt « Our Addresses »,
commentaires en EN.
**Groupe légales** (`cgu`,`mentions-legales` FR+EN) : (A) extraire le `<style>` inline (`.cgu-section`,
identique x4) → `css/legal.css`, puis head mutualisable. (B) **préserver** le script Cloudflare
`email-decode.min.js` + dossier `cdn-cgi/` (emails obfusqués FR) → garder hors de la zone `scripts`.
**Bug galerie** (espace vide sous dernier lot < 7 images) = pré-existant, hors périmètre, laissé tel quel.
**Stubs exclus** : `contact.html`, `en/index.html`, `kwerk_bandeau.html` (ni nav/menu/footer).

## 12. État final livré (20/06/2026, sur `preprod`)
- **Mutualisation** : `head/nav/menu/footer/scripts` régénérés depuis `partials/` par `build/inject_partials.py`,
  lancé en CI à chaque push (workflow `.github/workflows/gtm-check.yml`). Liens relatifs préservés
  (marche sous `/kwerk/` ET à la racine). Marqueurs `<!-- KW:* -->` + attribut `alt=` (langue) par page.
- **Analytics** : GTM inline (filet `build/inject_gtm.py`), HubSpot via le partial `scripts`,
  **Axeptio chargé PAR GTM — NE JAMAIS l'inliner** (sinon double-chargement « SDK already loaded »).
- **CLAUDE.md** (racine, public) : consignes d'édition pour le Claude du client.
- **Nettoyage** : CSS inline des 11 pages → 8 fichiers `css/` (url() réécrits) ; CSS mort `.footer-col*`
  retiré ; JS mort `initAdressesCarousel` retiré ; galerie : dernier lot incomplet → compo adaptée
  (`.gallery-grid--n1..n6`) ; `all` reconstruit auto (galerie.js robuste, `"all": []`, `?v=5`).
- **Adresse Haussmann** : entièrement supprimée (pages, images, filtre, parasite) ; « haussmannien » =
  style architectural, conservé.
- **Reste à faire (optionnel)** : mutualiser le dataset `images` des galeries (encore dupliqué par page).
- **Déploiement** : `preprod` = aperçu GitHub Pages (validation). Promotion vers prod = décision de Serge seul.
