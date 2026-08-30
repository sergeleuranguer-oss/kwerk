#!/usr/bin/env bash
# =============================================================================
#  Backup kwerk — site vitrine statique (repo PUBLIC demo-site2026/kwerk).
#
#  Le code est déjà sur GitHub → ce backup est un CONFORT (point de restauration
#  daté avant un chantier risqué), local, prune-2. On sauvegarde depuis le
#  REMOTE GitHub (= la vérité déployée), pas la copie de travail locale.
#
#  Lancement : /data/backups/kwerk/backup.sh   (cron quotidien 7h30)
#
#  🔴 CE FICHIER EXISTE EN DEUX EXEMPLAIRES — /data/backups/kwerk/backup.sh (celui que le CRON
#     lance) et kwerk/ops/backup.sh (celui qui est VERSIONNÉ). Toucher l'un = recopier sur l'autre.
#     Payé le 30/08/2026 : la copie de /data avait été migrée vers le helper de ping le 08/08, la
#     copie versionnée était restée avec l'URL `mews-proxy.../backup-ping` EN DUR — un endpoint
#     supprimé le 20/08. Rien ne cassait (le cron lance la bonne copie), mais la copie versionnée
#     est justement celle qu'on restaurerait après un incident : elle aurait pingué un détecteur
#     mort, et kwerk serait passé pour silencieux au pire moment.
#  → INCRÉMENTAL : ne produit des archives QUE si le dépôt a bougé depuis la dernière fois.
#
#  Pourquoi : ce script a d'abord été écrit pour un usage ponctuel, où re-télécharger tout le dépôt
#  ne coûtait rien. En quotidien, c'était 780 Mo tirés de GitHub et 1,1 Go réécrits sur le disque
#  chaque nuit pour un site qui bouge quelques fois par mois. Deux corrections :
#    1. MIROIR PERMANENT `.mirror.git` + `git remote update` → seuls les objets nouveaux transitent ;
#    2. EMPREINTE DE TOUTES LES RÉFÉRENCES comparée à la précédente → sans changement, aucune archive.
#
#  ⚠️ Conséquences à connaître, elles se tiennent :
#   - le manifest n'est réécrit QUE les jours où une archive est produite. L'écrire tous les jours
#     ferait diverger sa date de celle du dernier artefact — c'est exactement ce que conso appelle
#     un « drift » (backup tombé en silence). Ici les deux dates restent alignées ;
#   - la fréquence déclarée est « quotidien (si changement) », valeur pour laquelle le scanner ne
#     calcule PAS d'alerte d'âge : sans elle, un mois sans commit passerait kwerk en rouge ;
#   - le ping du dead-man's switch part TOUS LES JOURS, y compris quand il n'y a rien à faire. C'est
#     bien le signal recherché : « le cron a tourné et le contrôle est bon », pas « un fichier est né » ;
#   - le miroir est CACHÉ (`.mirror.git`) pour rester hors du scan du manifest, comme
#     `.archives-images-*` : un dossier remis à jour chaque nuit passerait pour l'artefact le plus
#     récent du dossier et déclencherait un faux drift.
#
#  Périmètre :
#    - kwerk-repo-mirror-…  : git clone --mirror (toutes branches preprod+gh-pages
#                             + historique), tar.gz. Restore : tar xzf … && git clone kwerk.git
#    - kwerk-preprod-content-… : git archive preprod → contenu déployé parcourable.
#    - kwerk-prod-content-…    : git archive gh-pages → PROD (version stable) parcourable.
#  Rétention : prune-2 (on garde les 2 plus récents PAR TYPE).
#  Hors périmètre : .archives-images-20260615/ (originaux pré-optim, déjà copiés hors-site).
# =============================================================================
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

REPO_URL="https://github.com/demo-site2026/kwerk.git"
DEST="/data/backups/kwerk"
LOGDIR="$DEST/logs"
MIN_FREE_MB=2000

STAMP="${BACKUP_STAMP:-$(date +%Y%m%d-%H%M)}"
STAGE="$DEST/.staging-$STAMP"
LOG="$LOGDIR/backup-$(date +%F).log"
mkdir -p "$LOGDIR"
exec > >(tee -a "$LOG") 2>&1

echo "===================================================================="
echo "  Backup kwerk — $(date '+%F %T')"
echo "===================================================================="

# ---------------- Verrou ----------------
exec 9>"$DEST/.lock"
if ! flock -n 9; then echo "⚠️  Un autre backup kwerk tourne déjà — abandon."; exit 0; fi

on_exit() {
  local rc=$?
  rm -rf "$STAGE" 2>/dev/null || true
  if [ "$rc" -eq 0 ]; then rm -f "$DEST/.FAILED"; echo "✅ Backup kwerk OK ($STAMP)"
  else echo "❌ ÉCHEC (code $rc) — voir $LOG"; echo "$(date '+%F %T')  ÉCHEC code=$rc" >> "$DEST/.FAILED"; fi
}
trap on_exit EXIT

# ---------------- 4) DEAD-MAN'S SWITCH ----------------
# Le détecteur vit chez Cloudflare EXPRÈS : un cron absent n'échoue pas, il ne se passe RIEN — et un
# garde-fou logé dans le crontab surveillé partirait avec lui. Deux règles : on ne ping QUE si le
# backup est sain (sinon on se tait, et le silence alerte), et le ping ne doit JAMAIS faire échouer
# le backup (`|| true`, timeout court). Seuil côté worker : 36 h.
# L'URL du/des détecteur(s) vit dans le helper, à UN SEUL endroit : elle était recopiée en dur
# dans 14 scripts, et en oublier un lors d'une migration ne se voit pas (08/08/2026).
source /data/backups/_lib/backup-ping.sh
ping_worker() { backup_ping "kwerk" "$STAMP"; }

# ---------------- Garde-fou espace ----------------
FREE_MB=$(df -Pm /data | awk 'NR==2{print $4}')
[ "$FREE_MB" -lt "$MIN_FREE_MB" ] && { echo "Espace /data insuffisant : ${FREE_MB} Mo"; exit 1; }

# ---------------- 1) Miroir permanent, mis à jour de façon incrémentale ----------------
MIRROR="$DEST/.mirror.git"
if [ -d "$MIRROR" ]; then
  echo "→ git remote update (incrémental)…"
  git --git-dir="$MIRROR" remote update --prune
else
  echo "→ premier passage : git clone --mirror depuis GitHub…"
  git clone --quiet --mirror "$REPO_URL" "$MIRROR"
fi

echo "   branches :"; git --git-dir="$MIRROR" for-each-ref --format='     %(refname:short)' refs/heads
SHA="$(git --git-dir="$MIRROR" rev-parse --short preprod)"
SHA_PROD="$(git --git-dir="$MIRROR" rev-parse --short gh-pages 2>/dev/null || echo '-')"
echo "   preprod = $SHA   |   gh-pages (prod) = $SHA_PROD"

# ---------------- 1bis) Le dépôt a-t-il bougé ? ----------------
# Empreinte de TOUTES les références, pas seulement preprod/gh-pages : une branche ou un tag qui
# bouge doit produire une archive, sinon le miroir sauvegardé serait en retard sur le miroir réel.
STATE_FILE="$DEST/.last-refs"
STATE="$(git --git-dir="$MIRROR" for-each-ref --format='%(objectname) %(refname)' | sort | sha256sum | cut -d' ' -f1)"
PREV="$(cat "$STATE_FILE" 2>/dev/null || echo '')"
NEWEST="$(ls -1t "$DEST"/kwerk-repo-mirror-*.tar.gz 2>/dev/null | head -1 || true)"

if [ "$STATE" = "$PREV" ] && [ -n "$NEWEST" ]; then
  echo "→ aucune référence modifiée depuis la dernière sauvegarde — rien à archiver."
  echo "   dernière archive conservée : $(basename "$NEWEST") ($(du -h "$NEWEST" | cut -f1))"
  echo "✅ Terminé — kwerk à jour, $(ls -1 "$DEST"/kwerk-*-*.tar.gz | wc -l) archives inchangées."
  ping_worker            # le cron a tourné et le contrôle est bon : c'est CE signal qu'on surveille
  exit 0
fi
[ -n "$PREV" ] && echo "→ le dépôt a bougé — production des archives." || echo "→ pas d'état précédent — production des archives."

mkdir -p "$STAGE"
echo "→ archive repo-mirror…"
# Le membre est renommé `kwerk.git` dans l'archive : la restauration documentée reste
# `tar xzf … && git clone kwerk.git`, inchangée malgré le miroir caché.
tar czf "$DEST/kwerk-repo-mirror-$STAMP.tar.gz" -C "$DEST" \
  --transform='s|^\.mirror\.git|kwerk.git|' .mirror.git

# ---------------- 2) Contenu preprod déployé ----------------
# Dans un clone --mirror la branche est 'preprod' (pas 'origin/preprod').
echo "→ archive contenu preprod déployé…"
git --git-dir="$MIRROR" archive --format=tar.gz \
  --prefix=kwerk-preprod/ preprod -o "$DEST/kwerk-preprod-content-$STAMP.tar.gz"

# ---------------- 2bis) Contenu PROD (gh-pages) — version stable ----------------
# gh-pages = ce qui est promu puis copié sur le serveur de prod (racine du domaine).
# Version stable « qui ne doit pas sauter » → archive parcourable dédiée.
PROD_ARCHIVE=""
if [ "$SHA_PROD" != "-" ]; then
  echo "→ archive contenu PROD (gh-pages) déployé…"
  git --git-dir="$MIRROR" archive --format=tar.gz \
    --prefix=kwerk-prod/ gh-pages -o "$DEST/kwerk-prod-content-$STAMP.tar.gz"
  PROD_ARCHIVE="$DEST/kwerk-prod-content-$STAMP.tar.gz"
else
  echo "⚠️  branche gh-pages absente du miroir — pas d'archive prod dédiée."
fi

# ---------------- Vérification intégrité ----------------
echo "→ vérification gzip…"
gzip -t "$DEST/kwerk-repo-mirror-$STAMP.tar.gz" "$DEST/kwerk-preprod-content-$STAMP.tar.gz" ${PROD_ARCHIVE:+"$PROD_ARCHIVE"}
echo "   repo-mirror    : $(du -h "$DEST/kwerk-repo-mirror-$STAMP.tar.gz" | cut -f1)"
echo "   preprod-content: $(du -h "$DEST/kwerk-preprod-content-$STAMP.tar.gz" | cut -f1)"
[ -n "$PROD_ARCHIVE" ] && echo "   prod-content   : $(du -h "$PROD_ARCHIVE" | cut -f1)"

# ---------------- Rétention prune-2 (par type) ----------------
prune_type() {
  local prefix="$1"
  # mtime décroissant ; on supprime tout à partir du 3e (= on garde 2)
  ls -1t "$DEST/$prefix"-*.tar.gz 2>/dev/null | tail -n +3 | while IFS= read -r f; do
    echo "   🗑  purge $(basename "$f")"; rm -f "$f"
  done
}
echo "→ rétention prune-2…"
prune_type "kwerk-repo-mirror"
prune_type "kwerk-preprod-content"
prune_type "kwerk-prod-content"

# État retenu seulement maintenant : si une archive avait échoué, le prochain passage
# doit refaire le travail, pas le considérer comme fait.
echo "$STATE" > "$STATE_FILE"

# ---------------- 3) MANIFEST (scanné par conso.lab39.dev) ----------------
# >>> L'étape qui manquait quand le backup était fait à la main : conso à jour à tous les coups.
python3 /data/backups/_lib/manifest.py write --project kwerk --dest "$DEST" \
  --frequence "quotidien (si changement)" --retention "prune-2" \
  --offsite "originaux images → My Cloud Home (.34) ; code/contenu = GitHub" \
  --note "repo-mirror (preprod+gh-pages+historique) + contenu preprod ($SHA) + contenu PROD gh-pages ($SHA_PROD, version stable). Backup via backup.sh." \
  >/dev/null || echo "   ⚠ manifest non mis à jour" >&2

echo "✅ Terminé — total kwerk suivi : $(ls -1 "$DEST"/kwerk-*-*.tar.gz | wc -l) archives."
ping_worker
