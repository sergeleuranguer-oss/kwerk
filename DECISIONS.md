# DECISIONS — kwerk

> Décisions produit et d'architecture qui **font foi**. Une entrée = une décision datée, avec sa
> raison et ce qui a été écarté. Les **consignes d'édition** vivent dans `CLAUDE.md`, les mécaniques
> internes dans `docs/notes-techniques.md`, le raisonnement en cours dans `.apex/` (jetable, jamais
> cité comme source).

## Chantier maintenabilité — injection de partials au build

**Décidé** : **injection au build par script Python en CI** (extension du pattern existant),
**pas 11ty**.

**Pourquoi 11ty est écarté** : son `pathPrefix` casserait la prod servie à la racine du domaine,
imposerait de basculer Pages en Actions, et produirait deux builds. Le site doit fonctionner
**à la fois** sous `/kwerk/` et à la racine — d'où la règle du tout-relatif.

### Le point technique clé — deux préfixes relatifs

Les partials contiennent des liens vers des **assets** (à la racine du repo) **et** vers d'autres
**pages** (propres à chaque langue). Le script calcule deux préfixes **par page** :

| Placeholder | Pointe vers | racine FR | `en/` | `adresses/` | `en/adresses/` |
|---|---|---|---|---|---|
| `{{ASSET}}` | racine du repo (css, js, images) | `` | `../` | `../` | `../../` |
| `{{LINK}}` | racine de la langue (liens inter-pages) | `` | `` | `../` | `../` |

**C'est le risque n°1 du chantier** (liens relatifs mal résolus) → la table est testée aux trois
profondeurs.

### ⚠️ Garde-fous anti-régression — exigence explicite du client

Défense en profondeur, pour que les modifications d'un contributeur externe ne puissent rien casser :

1. **CI auto-réparatrice** : chaque push sur `preprod` régénère les zones `KW:*` depuis les partials
   → toute modification faite directement dans une page est écrasée. Les analytics ne dérivent pas.
2. **Marqueurs auto-réparables** : `head` (ancre `</head>`) et `scripts` (ancre `</body>`) sont
   **réinsérés** si le marqueur a été supprimé → GTM/Axeptio/HubSpot reviennent même si tout a été
   effacé. Pour `nav`/`footer`, un marqueur manquant fait **échouer la CI** (la réinsertion
   positionnelle serait trop risquée).
3. **Assertions bloquantes** en fin d'injecteur : (a) chaque page contient GTM + HubSpot + Axeptio
   après build ; (b) les partials source contiennent les IDs requis (`GTM-MK4BS4GL`, HubSpot
   `26225487`, clientId Axeptio) ; (c) marqueurs équilibrés. Sinon, sortie non-zéro = alarme rouge.

> **Limite assumée** : Pages legacy publie indépendamment du résultat de l'Action → l'échec
> **alerte** mais ne **bloque** pas la publication. La fenêtre de version brute ne concerne que
> l'**aperçu** (la prod reste protégée par la promotion manuelle vers `gh-pages`). Un vrai blocage
> serait le seul argument pour migrer Pages → Actions ; non requis pour démarrer.

## 2026-07-28 — Arbitrages sur le header vidéo et le poids des assets

| # | Sujet | Décision de Serge |
|---|---|---|
| A1 | Home fixe + bouton play | **Choix client — on reste comme ça. Sujet clos, ne pas rouvrir.** |
| A2 | `preload="auto"` (~8,5 Mo téléchargés avant tout clic) | **Validé sur le principe**, à passer plus tard — pas maintenant |
| B1 | Portraits PNG (6,6 Mo) | **À traiter** sur les photos ajoutées, une fois A2 passé |
| B2 | Images `1-HP` → `8-HP` (6,9 Mo, orphelines) | **On n'y touche pas** — A1 étant clos, elles restent en réserve |
| D1 | Écart de prod (189 commits) | **Promu le 28/07** : tout l'antérieur au 27/07, soit jusqu'à `4051818` (08/07) |

**Le fond de l'arbitrage A1**, pour ne pas le rediscuter : on ne peut pas avoir les deux. Un
navigateur n'autorise le son que sur geste du visiteur. Soit ça bouge tout seul mais **muet**
(autoplay), soit il y a du **son** mais il faut cliquer. La recommandation technique était
l'option 3 (autoplay muet + bouton play qui relance avec le son) ; le client a tranché autrement.

**Fait le 28/07** : `gh-pages` = `8bf03c9`, merge de l'état recetté au 08/07. Les 13 commits du
28/07 (header vidéo + profils équipe) **restent en preprod**, en attente de recette visuelle — ce
qui bloque leur promotion n'est plus un arbitrage technique.

### Point de méthode à porter au contributeur

Le réflexe « **JPEG pour la photo, PNG pour les aplats** » n'est pas acquis côté contributions.
C'est récurrent (4 portraits en PNG = 6,6 Mo, pour un rendu identique en JPEG qualité 82).

### Non-sujets — vérifiés et refermés

- **Carrousel services de la home** : le bloc `section.services-grid` est **entièrement commenté**
  (chemins absolus + 7 fichiers manquants). Rien n'est rendu, aucun 404, code mort identique en prod
  depuis le 19/03. Aucun impact.
- **Parité FR/EN** : blocs hero identiques, `aria-label` traduits, mêmes images, profondeur `../`
  correcte. Aucun lien cassé sur les 9 pages modifiées.
- **Ancre morte** `id="offres"` : plus aucun `href="#offres"` dans le repo. Inoffensif, à nettoyer
  seulement si on repasse dessus.
