# Site vitrine Kwerk

Site **statique** : HTML, CSS et JavaScript, sans framework ni build d'assets. Aucune dépendance à
installer. Un script Python mutualise les blocs communs (header, navigation, menu, footer, scripts)
au moment du build.

## ⚠️ Avant toute modification

**Lire [`CLAUDE.md`](CLAUDE.md).** Il contient les règles à respecter pour ne pas casser le site, et
notamment celle-ci, qui est la plus coûteuse à découvrir seul :

> Le header, la navigation, le menu, le footer et les scripts sont **générés**. Dans chaque page ils
> sont entourés de marqueurs `<!-- KW:… -->`. **Toute modification faite à l'intérieur de ces zones
> sera écrasée** au prochain push. Pour les modifier, éditer le fichier correspondant dans
> `partials/`.

Deux autres règles à connaître immédiatement : **tous les liens sont relatifs** (jamais de chemin
commençant par `/`), et le **cache-busting des CSS/JS est automatique** — ne jamais modifier à la
main la valeur après `?v=`.

## Prévisualiser en local

```bash
python3 -m http.server
```

Puis ouvrir <http://localhost:8000>.

## Régénérer les blocs mutualisés

```bash
python3 build/inject_partials.py
```

C'est fait automatiquement par GitHub Actions à chaque push. Le lancer manuellement avant de
committer permet de vérifier le rendu.

## Organisation

```
partials/   blocs mutualisés (fr/ et en/) injectés dans les pages
build/      script d'injection
css/  js/   feuilles de style et scripts
images/     médias, y compris les vidéos du header
docs/       notes techniques détaillées
en/         pages anglaises (un niveau plus profond : chemins en ../)
```

## Branches

- **`preprod`** — branche de travail, publiée sur GitHub Pages pour recette.
- **`gh-pages`** — versions validées, reprises pour la mise en production.

## Aller plus loin

[`docs/notes-techniques.md`](docs/notes-techniques.md) — mécanique du cache-busting, encodage des
vidéos, pièges CSS, contrôles d'intégrité. À ouvrir en cas de besoin précis, pas en lecture suivie.
