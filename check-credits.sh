#!/bin/bash

NETLIFY_TOKEN="nfp_U3EJu7CcSUxGFWrTps7J9mty4cPvSGf7e3e7"
SITE_PROD_ID="fbb12cb2-5700-4cb4-b345-f957eddc78b6"
SITE_PREPROD_ID="a3504013-4e0e-4bb0-9391-319a9618b61d"

echo "=============================="
echo "  SUIVI CREDITS KWERK"
echo "=============================="

# Netlify usage
echo ""
echo "--- NETLIFY ---"

fetch_site_info() {
  local SITE_ID=$1
  local LABEL=$2
  local INFO=$(curl -s -H "Authorization: Bearer $NETLIFY_TOKEN" \
    "https://api.netlify.com/api/v1/sites/$SITE_ID")
  local NAME=$(echo "$INFO" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('name','?'))")
  local LAST_DEPLOY=$(echo "$INFO" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('published_deploy',{}).get('created_at','?')[:10])")
  local STATE=$(echo "$INFO" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('published_deploy',{}).get('state','?'))")
  echo "[$LABEL] $NAME — dernier deploy : $LAST_DEPLOY ($STATE)"
}

fetch_site_info "$SITE_PROD_ID" "PROD"
fetch_site_info "$SITE_PREPROD_ID" "PREPROD"

# Build minutes
USAGE=$(curl -s -H "Authorization: Bearer $NETLIFY_TOKEN" \
  "https://api.netlify.com/api/v1/accounts")
MINUTES_USED=$(echo "$USAGE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if isinstance(data, list) and len(data) > 0:
    caps = data[0].get('capabilities', {})
    builds = caps.get('builds', {})
    used = builds.get('used', '?')
    included = builds.get('included', 300)
    print(f'{used}/{included} minutes')
else:
    print('indisponible')
")
echo "Build minutes : $MINUTES_USED"

echo ""
echo "--- CLAUDE ---"
echo "Consulter manuellement : https://console.anthropic.com/settings/billing"

echo ""
echo "--- GITHUB ---"
echo "Pages statique = gratuit, aucun credit a surveiller"
echo "=============================="
