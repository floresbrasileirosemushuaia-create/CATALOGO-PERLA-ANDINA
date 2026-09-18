#!/usr/bin/env bash
set -euo pipefail

SCRIPT_ID='1WgBMyjVxd7x1e25OJOTSTwL8AFzq914pPEBdFfeHxawAmoNV84Q6yJgV'
DEPLOYMENT_ID='AKfycbx9H9BJTrwNXdORIrVwilUmQiCMq-enVm-HfXZjNjXKsudiklef9ZnMdc36ZtIsD7bB'
BACKEND_URL='https://script.google.com/macros/s/AKfycbx9H9BJTrwNXdORIrVwilUmQiCMq-enVm-HfXZjNjXKsudiklef9ZnMdc36ZtIsD7bB/exec'
EXPECTED_ACCOUNT='floresbrasileirosemushuaia@gmail.com'

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_ROOT="$(mktemp -d -t perla-v254.XXXXXX)"
REMOTE_DIR="$TEMP_ROOT/remote"
VERIFY_DIR="$TEMP_ROOT/verify"
AUTH_FILE="$(node -p "require('path').join(require('os').homedir(), '.clasprc.json')")"
BACKUP_FILE="$REPO_ROOT/apps-script-backup-before-v254-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"

mkdir -p "$REMOTE_DIR" "$VERIFY_DIR"
printf '{"scriptId":"%s","rootDir":"."}\n' "$SCRIPT_ID" > "$REMOTE_DIR/.clasp.json"
printf '{"scriptId":"%s","rootDir":"."}\n' "$SCRIPT_ID" > "$VERIFY_DIR/.clasp.json"

echo
echo 'PERLA ANDINA V2.5.4 — PUBLICAÇÃO SEGURA DO APPS SCRIPT'
echo 'Conta obrigatória: floresbrasileirosemushuaia@gmail.com'
echo
echo 'Será aberto um endereço oficial do Google.'
echo 'Depois de autorizar, copie o endereço FINAL mostrado no Chrome'
echo 'e cole SOMENTE neste terminal do Google Cloud Shell.'
echo 'Não envie senha, código ou esse endereço em conversa alguma.'
echo

npm install --global @google/clasp@3.4.1
clasp login --no-localhost

test -s "$AUTH_FILE"
AUTH_STATUS="$(clasp show-authorized-user -A "$AUTH_FILE")"
if [[ "$AUTH_STATUS" != *"$EXPECTED_ACCOUNT"* ]]; then
  echo "ERRO: a autorização não pertence a $EXPECTED_ACCOUNT" >&2
  echo 'Faça logout do clasp e execute novamente com a conta correta.' >&2
  exit 2
fi
echo "Conta confirmada: $EXPECTED_ACCOUNT"

cd "$REMOTE_DIR"
clasp pull -A "$AUTH_FILE"
test -f appsscript.json
tar -C "$REMOTE_DIR" -czf "$BACKUP_FILE" .
echo "Backup criado: $BACKUP_FILE"

node "$REPO_ROOT/cloud-deploy/apply_patch.js" "$REMOTE_DIR" "$REPO_ROOT/cloud-deploy/patch-plan.json"

for file in "$REMOTE_DIR"/*.js "$REMOTE_DIR"/*.gs; do
  [[ -e "$file" ]] || continue
  node -e "const fs=require('fs'),vm=require('vm');new vm.Script(fs.readFileSync(process.argv[1],'utf8'),{filename:process.argv[1]});" "$file"
done

clasp list-deployments --json -A "$AUTH_FILE" > "$TEMP_ROOT/deployments-before.json"
node -e "const fs=require('fs');const x=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const id=process.argv[2];if(!JSON.stringify(x).includes(id)){console.error('Deployment alvo não encontrado');process.exit(2)}" "$TEMP_ROOT/deployments-before.json" "$DEPLOYMENT_ID"

clasp push --force -A "$AUTH_FILE"
clasp create-deployment --deploymentId "$DEPLOYMENT_ID" --description 'V2.5.4 PERLA ANDINA - imagens carregadas na abertura' --json -A "$AUTH_FILE" > "$TEMP_ROOT/deploy-result.json"

cd "$VERIFY_DIR"
clasp pull -A "$AUTH_FILE"
node "$REPO_ROOT/cloud-deploy/compare_remote.js" "$REMOTE_DIR" "$VERIFY_DIR"

STAMP="$(date +%s)"
curl -fsSL --retry 8 --retry-delay 4 --retry-all-errors "$BACKEND_URL?health=1&t=$STAMP" -o "$TEMP_ROOT/apps-health.json"
node -e "const fs=require('fs');const x=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(!x.ok||x.version!=='2.5.4'||x.rawUi!==true){console.error(x);process.exit(2)}" "$TEMP_ROOT/apps-health.json"

curl -fsSL --retry 8 --retry-delay 4 --retry-all-errors "$BACKEND_URL?raw_ui=1&t=$STAMP" -o "$TEMP_ROOT/apps-ui.html"
grep -Eqi '<html([[:space:]>])' "$TEMP_ROOT/apps-ui.html"
grep -Fq 'V2.5.4 PERLA ANDINA' "$TEMP_ROOT/apps-ui.html"

for domain in perlaandinacatalogo.vercel.app catalogoperlaandina.vercel.app; do
  curl -fsSL --retry 8 --retry-delay 4 --retry-all-errors "https://$domain/api/health" -o "$TEMP_ROOT/$domain-health.json"
  node -e "const fs=require('fs');const x=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(!x.ok||x.version!=='2.5.4'){console.error(x);process.exit(2)}" "$TEMP_ROOT/$domain-health.json"
  curl -fsSL --retry 8 --retry-delay 4 --retry-all-errors "https://$domain/api/ui?v=254" -o "$TEMP_ROOT/$domain-ui.html"
  grep -Fq 'V2.5.4 PERLA ANDINA' "$TEMP_ROOT/$domain-ui.html"
done

echo
echo 'PUBLICAÇÃO CONCLUÍDA E VALIDADA NAS 3 PLATAFORMAS.'
echo "Backup preservado em: $BACKUP_FILE"

