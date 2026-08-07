# ops/ — miroir des scripts de sauvegarde

⚠️ **Ces fichiers ne sont PAS exécutés depuis ici.** La copie qui tourne (cron) vit dans
`/data/backups/kwerk/`. Ce dossier est une **redondance hors-machine** : sans lui, ces scripts
n'existent qu'à un seul endroit du disque du minipc.

État au 2026-08-07 : sauvegarde **quotidienne 7h30** (cron), surveillée par un **dead-man's
switch** — `backup.sh` pingue `mews-proxy/backup-ping` à chaque succès, et le worker alerte par mail
si aucun signal n'arrive pendant 36 h. Le détecteur vit chez Cloudflare **exprès** : un cron effacé
ne produit aucune erreur, et un garde-fou logé dans le crontab surveillé disparaîtrait avec lui.
⚠️ Restaurer ce script sans réarmer la ligne de cron = sauvegarde muette, sans aucun signal… sauf
l'alerte du switch au bout de 36 h, qui est précisément là pour ça.

Restaurer après perte de `/data` :
```bash
mkdir -p /data/backups/kwerk
cp ops/*.sh /data/backups/kwerk/ && chmod +x /data/backups/kwerk/*.sh
crontab -e   # réarmer la ligne (cf. en-tête du script)
```

⚠️ **Sens de la synchro : `/data` → `ops/`.** Si tu modifies le script, modifie celui de
`/data/backups/kwerk/` puis recopie-le ici. L'inverse ne se propage pas tout seul.
Contrôle de dérive : `for f in ops/*.sh; do cmp "$f" "/data/backups/kwerk/$(basename $f)"; done`
