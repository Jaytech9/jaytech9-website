#!/bin/bash
# Builds the CRM and uploads it to Cloudflare Pages (project "jaytech9-crm").
# Run from anywhere:  bash crm/deploy.sh
# First time only, wrangler opens your browser to connect to your Cloudflare account.
set -e
cd "$(dirname "$0")"
npm ci --no-audit --no-fund
npm run build
npx wrangler pages project create jaytech9-crm --production-branch main 2>/dev/null || true
npx wrangler pages deploy dist --project-name jaytech9-crm --branch main --commit-dirty=true
