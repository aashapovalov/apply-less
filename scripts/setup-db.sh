#!/usr/bin/env bash
set -e

echo "▶ Starting Postgres with Docker Compose..."
docker compose up -d postgres

echo "▶ Waiting for Postgres to become healthy..."

# Poll container health status
until [ "$(docker inspect -f '{{.State.Health.Status}}' applyless-postgres)" = "healthy" ]; do
  sleep 1
done

echo "✔ Postgres is healthy"

echo "▶ Running database migrations..."
npm run db:migrate

echo "✔ Database is ready"
