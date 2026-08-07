#!/usr/bin/env bash
# =============================================================================
#  Backup kwerk — site vitrine statique (repo PUBLIC demo-site2026/kwerk).
#
#  Le code est déjà sur GitHub → ce backup est un CONFORT (point de restauration
#  daté avant un chantier risqué), local, prune-2. On sauvegarde depuis le
#  REMOTE GitHub (= la vérité déployée), pas la copie de travail locale.
#
#  Lancement : /data/backups/kwerk/backup.sh
#  → produit 2 archives horodatées + met À JOUR le manifest (donc conso) tout seul.
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

# ---------------- Garde-fou espace ----------------
FREE_MB=$(df -Pm /data | awk 'NR==2{print $4}')
[ "$FREE_MB" -lt "$MIN_FREE_MB" ] && { echo "Espace /data insuffisant : ${FREE_MB} Mo"; exit 1; }

# ---------------- 1) Miroir du repo (depuis GitHub) ----------------
rm -rf "$STAGE"; mkdir -p "$STAGE"
echo "→ git clone --mirror depuis GitHub…"
git clone --quiet --mirror "$REPO_URL" "$STAGE/kwerk.git"

# branches présentes + sha preprod/prod (pour la note du manifest)
echo "   branches :"; git --git-dir="$STAGE/kwerk.git" for-each-ref --format='     %(refname:short)' refs/heads
SHA="$(git --git-dir="$STAGE/kwerk.git" rev-parse --short preprod)"
SHA_PROD="$(git --git-dir="$STAGE/kwerk.git" rev-parse --short gh-pages 2>/dev/null || echo '-')"
echo "   preprod = $SHA   |   gh-pages (prod) = $SHA_PROD"

echo "→ archive repo-mirror…"
tar czf "$DEST/kwerk-repo-mirror-$STAMP.tar.gz" -C "$STAGE" kwerk.git

# ---------------- 2) Contenu preprod déployé ----------------
# Dans un clone --mirror la branche est 'preprod' (pas 'origin/preprod').
echo "→ archive contenu preprod déployé…"
git --git-dir="$STAGE/kwerk.git" archive --format=tar.gz \
  --prefix=kwerk-preprod/ preprod -o "$DEST/kwerk-preprod-content-$STAMP.tar.gz"

# ---------------- 2bis) Contenu PROD (gh-pages) — version stable ----------------
# gh-pages = ce qui est promu puis copié sur le serveur de prod (racine du domaine).
# Version stable « qui ne doit pas sauter » → archive parcourable dédiée.
PROD_ARCHIVE=""
if [ "$SHA_PROD" != "-" ]; then
  echo "→ archive contenu PROD (gh-pages) déployé…"
  git --git-dir="$STAGE/kwerk.git" archive --format=tar.gz \
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

# ---------------- 3) MANIFEST (scanné par conso.lab39.dev) ----------------
# >>> L'étape qui manquait quand le backup était fait à la main : conso à jour à tous les coups.
python3 /data/backups/_lib/manifest.py write --project kwerk --dest "$DEST" \
  --frequence "quotidien" --retention "prune-2" \
  --offsite "originaux images → My Cloud Home (.34) ; code/contenu = GitHub" \
  --note "repo-mirror (preprod+gh-pages+historique) + contenu preprod ($SHA) + contenu PROD gh-pages ($SHA_PROD, version stable). Backup via backup.sh." \
  >/dev/null || echo "   ⚠ manifest non mis à jour" >&2

echo "✅ Terminé — total kwerk suivi : $(ls -1 "$DEST"/kwerk-*-*.tar.gz | wc -l) archives."

# ---------------- 4) DEAD-MAN'S SWITCH ----------------
# Le détecteur vit chez Cloudflare EXPRÈS : un cron absent n'échoue pas, il ne se passe RIEN — et un
# garde-fou logé dans le crontab surveillé partirait avec lui. Deux règles : on ne ping QUE si le
# backup est sain (sinon on se tait, et le silence alerte), et le ping ne doit JAMAIS faire échouer
# le backup (`|| true`, timeout court). Seuil côté worker : 36 h.
ping_worker() {
  local sec code
  sec=$(grep -m1 '^export SYNC_SECRET=' ~/.bashrc 2>/dev/null | cut -d= -f2- | tr -d "\"'") || true
  if [ -z "$sec" ]; then echo "   ⚠ ping worker ignoré (SYNC_SECRET absent de ~/.bashrc)"; return 0; fi
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
    -X POST 'https://mews-proxy.serge-leuranguer.workers.dev/backup-ping' \
    -H "x-sync-secret: $sec" -H 'Content-Type: application/json' \
    -d "{\"project\":\"kwerk\",\"snapshot\":\"$STAMP\",\"host\":\"$(hostname)\"}" 2>/dev/null) || true
  if [ "$code" = "200" ]; then echo "   ✓ ping worker OK (backup_health à jour)"
  else echo "   ⚠ ping worker KO (HTTP ${code:-timeout}) — backup conservé ; alerte possible demain 8h"; fi
  return 0
}
ping_worker
