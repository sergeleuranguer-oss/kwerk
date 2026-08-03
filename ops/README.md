# ops/ — miroir des scripts de sauvegarde

⚠️ **Ces fichiers ne sont PAS exécutés depuis ici.** La copie qui tourne (cron) vit dans
`/data/backups/kwerk/`. Ce dossier est une **redondance hors-machine** : sans lui, ces scripts
n'existent qu'à un seul endroit du disque du minipc.

Restaurer après perte de `/data` :
```bash
mkdir -p /data/backups/kwerk
cp ops/*.sh /data/backups/kwerk/ && chmod +x /data/backups/kwerk/*.sh
crontab -e   # réarmer la ligne (cf. en-tête du script)
```

⚠️ **Sens de la synchro : `/data` → `ops/`.** Si tu modifies le script, modifie celui de
`/data/backups/kwerk/` puis recopie-le ici. L'inverse ne se propage pas tout seul.
Contrôle de dérive : `for f in ops/*.sh; do cmp "$f" "/data/backups/kwerk/$(basename $f)"; done`
