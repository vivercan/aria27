#!/bin/sh
# Smoke test post-deploy ARIA27
# Uso: scripts/smoke-post-deploy.sh
# Detecta si Vercel está sirviendo el último commit de main.

set -e
LATEST_SHA=$(git rev-parse main | cut -c1-7)
DEPLOYED_BUNDLE=$(curl -sm 10 https://aria.jjcrm27.com/ | grep -oE 'dpl_[A-Za-z0-9]+' | head -1)

if [ -z "$DEPLOYED_BUNDLE" ]; then
  echo "ERROR: no se pudo leer bundle de aria.jjcrm27.com"
  exit 1
fi

echo "main local SHA:    $LATEST_SHA"
echo "Vercel sirviendo:  $DEPLOYED_BUNDLE"

if [ "$1" = "--verify-deployment" ] && [ -n "$2" ]; then
  PREV_BUNDLE="$2"
  if [ "$DEPLOYED_BUNDLE" = "$PREV_BUNDLE" ]; then
    echo "ERROR: bundle no cambió tras push. Vercel build podría estar fallando."
    echo "Revisar: https://github.com/vivercan/aria27/deployments"
    exit 1
  fi
  echo "OK: bundle cambió. Deploy nuevo en producción."
fi
