---
description: Lance la sauvegarde de kwerk et rend compte du résultat
---
Sauvegarde **kwerk**.

> Commande **générée** depuis `fleet.json`. Elle **appelle** le script, elle ne redécrit pas ce
> qu'il sauvegarde : le périmètre, la rétention et les exclusions vivent dans le script, à un seul
> endroit. Une commande qui recopie le périmètre devient fausse dès qu'on touche au script — c'est
> arrivé à `backup-running.md`, périmé le jour même où son cron a été armé.

1. **Lancer** :
   ```bash
   /data/backups/kwerk/backup.sh
   ```
2. **Rendre compte** de ce que le script a imprimé : chemin de l'archive, taille, nombre de clés KV
   s'il en dumpe, et l'état du ping de surveillance. ⚠️ **Ne jamais annoncer « backup OK » sur la
   seule absence d'erreur** — lis la sortie.
3. **En cas d'échec**, ne pas relancer en boucle : rapporter le message. Un `.FAILED` dans le
   dossier de destination signale une archive suspecte, il est plus fiable que le code de sortie.

⚠️ Ne modifie ni le périmètre ni la rétention depuis cette commande. Ça se décide dans le script.
