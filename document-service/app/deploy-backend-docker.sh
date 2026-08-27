#!/bin/bash
set -euo pipefail

echo "=========================================="
echo "   Document Service Deployment (Docker Compose)"
echo "=========================================="
echo

read -rp "Enter service name (document-service): " SERVICE_NAME
read -rp "Enter environment (qa/uat/prod/prodx): " ENVIRONMENT
read -rp "Enter OLD version currently running (e.g. v1.1): " OLD_VERSION
read -rp "Enter NEW version to deploy (e.g. v1.2): " NEW_VERSION
read -rp "Enter port (e.g. 8006): " PORT

OLD_CONTAINER="${SERVICE_NAME}-${OLD_VERSION}-${ENVIRONMENT}"
NEW_CONTAINER="${SERVICE_NAME}-${NEW_VERSION}-${ENVIRONMENT}"
NEW_IMAGE="${SERVICE_NAME}-${ENVIRONMENT}:${NEW_VERSION}"
OLD_IMAGE="${SERVICE_NAME}-${ENVIRONMENT}:${OLD_VERSION}"

echo
echo "-------- Summary --------"
echo "Environment    : $ENVIRONMENT"
echo "Port           : $PORT"
echo "Old Container  : $OLD_CONTAINER   (image: $OLD_IMAGE)"
echo "New Container  : $NEW_CONTAINER   (image: $NEW_IMAGE)"
echo "--------------------------"

ENV_COMPOSE="docker-compose.yaml-${ENVIRONMENT}"
ENV_FILE=".env.${ENVIRONMENT}"
ENV_DOCKERFILE="Dockerfile-${ENVIRONMENT}"

if [[ ! -f "$ENV_COMPOSE" ]]; then
  echo "Expected compose file '$ENV_COMPOSE' not found in $(pwd)."
  ls docker-compose.yaml-* 2>/dev/null || echo "No environment compose files found."
  exit 1
fi

if [[ ! -f "$ENV_DOCKERFILE" ]]; then
  echo "Expected build file '$ENV_DOCKERFILE' not found in $(pwd)."
  ls Dockerfile-* 2>/dev/null || echo "No Dockerfiles found."
  exit 1
fi

read -rp "Proceed with deployment? (y/n): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Deployment cancelled."
  exit 0
fi

cp "$ENV_COMPOSE" docker-compose.yaml
cp "$ENV_DOCKERFILE" Dockerfile

if [[ -f "$ENV_FILE" ]]; then
  cp "$ENV_FILE" .env
fi

cp docker-compose.yaml docker-compose.yaml.bak

sed -E -i "s#(${SERVICE_NAME}-${ENVIRONMENT}:)[^\"[:space:]]+#\1${NEW_VERSION}#g" docker-compose.yaml
sed -E -i "s#(${SERVICE_NAME}-)[^-]+(-${ENVIRONMENT})#\1${NEW_VERSION}\2#g" docker-compose.yaml

OLD_PORT_IN_FILE=$(grep -oE '"[0-9]+:[0-9]+"' docker-compose.yaml | head -1 | grep -oE '[0-9]+' | head -1)
if [[ -n "$OLD_PORT_IN_FILE" && "$OLD_PORT_IN_FILE" != "$PORT" ]]; then
  sed -i "s#${OLD_PORT_IN_FILE}#${PORT}#g" docker-compose.yaml
  echo "Replaced port ${OLD_PORT_IN_FILE} -> ${PORT} in docker-compose.yaml"
fi

echo "Staged $ENV_COMPOSE -> docker-compose.yaml, $ENV_DOCKERFILE -> Dockerfile, and set version to $NEW_VERSION"

docker compose -f docker-compose.yaml build

OLD_ON_PORT=$(docker ps --filter "publish=${PORT}" -q)
if [[ -n "$OLD_ON_PORT" ]]; then
  docker stop "$OLD_ON_PORT" >/dev/null
fi

docker compose -f docker-compose.yaml up -d

sleep 5

if docker ps --filter "name=${NEW_CONTAINER}" --filter "status=running" -q | grep -q .; then
  echo "Deployment successful. $NEW_CONTAINER is running $NEW_IMAGE on port $PORT"
  read -rp "Remove old container '$OLD_CONTAINER' now? (y/n): " CLEANUP
  if [[ "$CLEANUP" == "y" || "$CLEANUP" == "Y" ]]; then
    docker rm -f "$OLD_CONTAINER" 2>/dev/null || true
  fi
else
  echo "New container failed to start. Rolling back."
  cp docker-compose.yaml.bak docker-compose.yaml
  docker rm -f "$NEW_CONTAINER" 2>/dev/null || true

  if [[ -n "$OLD_ON_PORT" ]]; then
    docker start "$OLD_ON_PORT" >/dev/null
    echo "Rollback complete. Old container restarted on port $PORT."
  else
    echo "No old container reference found to restart automatically."
    echo "Old image available as: $OLD_IMAGE"
  fi
  exit 1
fi

echo "-------- Running Containers --------"
docker ps --filter "name=${SERVICE_NAME}"

echo "-------- Volumes --------"
docker volume ls | grep upload_nfs || echo "Check volume name manually with: docker volume ls"