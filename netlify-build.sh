#!/usr/bin/env sh
set -e

echo "=== Netlify Build: Podelkin ==="

bun install --frozen-lockfile
bunx prisma generate
bun run build

echo "=== Build complete ==="