#!/usr/bin/env bash
set -e

WRANGLER="/home/runner/workspace/.config/npm/node_global/bin/wrangler"

echo "==> Installing dependencies..."
cd "$(dirname "$0")"
npm install --no-save 2>/dev/null || true

echo ""
echo "==> Step 1: Creating D1 database 'phytoclinic-users'..."
DB_OUTPUT=$($WRANGLER d1 create phytoclinic-users 2>&1) || true
echo "$DB_OUTPUT"

DB_ID=$(echo "$DB_OUTPUT" | grep -oP 'database_id\s*=\s*"\K[^"]+' | head -1)
if [ -z "$DB_ID" ]; then
  DB_ID=$(echo "$DB_OUTPUT" | grep -oP '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
fi

if [ -n "$DB_ID" ]; then
  echo "==> Found database ID: $DB_ID"
  sed -i "s/REPLACE_WITH_D1_DATABASE_ID/$DB_ID/" wrangler.toml
else
  echo "⚠  Could not auto-detect DB ID. Update wrangler.toml manually with the database_id."
fi

EXPRESS_URL="${EXPRESS_API_URL:-https://e5fa2394-c6c2-4f8c-b0df-18375d64b589-00-tdlkvh8rbudj.janeway.replit.dev}"
sed -i "s|REPLACE_WITH_EXPRESS_API_URL|$EXPRESS_URL|" wrangler.toml

echo ""
echo "==> Step 2: Running D1 schema migration (remote)..."
$WRANGLER d1 execute phytoclinic-users --remote --file=./schema.sql

echo ""
echo "==> Step 3: Deploying Worker to Cloudflare..."
$WRANGLER deploy

echo ""
echo "✅ Deployment complete!"
echo ""
WORKER_URL=$($WRANGLER deployments list 2>/dev/null | grep -oP 'https://[^[:space:]]+\.workers\.dev' | head -1 || echo "Check dashboard.cloudflare.com")
echo "Worker URL: ${WORKER_URL:-Check Cloudflare dashboard for URL}"
