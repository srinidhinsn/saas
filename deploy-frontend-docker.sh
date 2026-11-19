#!/bin/bash
set -euo pipefail

echo "=========================================="
echo "   Docker Frontend Deployment"
echo "=========================================="
echo

read -rp "Enter service name (e.g. frontend-service): " SERVICE_NAME
read -rp "Enter environment (qa/uat/prod): " ENVIRONMENT
read -rp "Enter OLD version currently running (e.g. v8): " OLD_VERSION
read -rp "Enter NEW version to deploy (e.g. v8.1): " NEW_VERSION
read -rp "Enter port (e.g. 8007): " PORT

OLD_CONTAINER="${SERVICE_NAME}-${OLD_VERSION}-${ENVIRONMENT}"
NEW_CONTAINER="${SERVICE_NAME}-${NEW_VERSION}-${ENVIRONMENT}"
NEW_IMAGE="${SERVICE_NAME}-${ENVIRONMENT}:${NEW_VERSION}"
OLD_IMAGE="${SERVICE_NAME}-${ENVIRONMENT}:${OLD_VERSION}"

echo
echo "-------- Summary --------"
echo "Service        : $SERVICE_NAME"
echo "Environment    : $ENVIRONMENT"
echo "Port           : $PORT"
echo "Old Container  : $OLD_CONTAINER   (image: $OLD_IMAGE)"
echo "New Container  : $NEW_CONTAINER   (image: $NEW_IMAGE)"
echo "--------------------------"
read -rp "Proceed with deployment? (y/n): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Deployment cancelled."
  exit 0
fi

ENV_DOCKERFILE="Dockerfile-${ENVIRONMENT}"
ENV_FILE=".env.${ENVIRONMENT}"
ENV_NGINX="nginx.conf-${ENVIRONMENT}"

if [[ ! -f "$ENV_DOCKERFILE" ]]; then
  echo "Expected build file '$ENV_DOCKERFILE' not found in $(pwd)."
  ls Dockerfile-* 2>/dev/null || echo "No Dockerfiles found."
  exit 1
fi

read -rp "Stage files for '$ENVIRONMENT' and build new image? (y/n): " DO_BUILD
if [[ "$DO_BUILD" == "y" || "$DO_BUILD" == "Y" ]]; then
  cp "$ENV_DOCKERFILE" Dockerfile

  if [[ -f "$ENV_FILE" ]]; then
    cp "$ENV_FILE" .env
  fi

  if [[ -f "$ENV_NGINX" ]]; then
    cp "$ENV_NGINX" nginx.conf
  fi

  docker build -t "$NEW_IMAGE" .
else
  docker pull "$NEW_IMAGE" || true
fi

OLD_ON_PORT=$(docker ps --filter "publish=${PORT}" -q)
if [[ -n "$OLD_ON_PORT" ]]; then
  docker stop "$OLD_ON_PORT" >/dev/null
fi

docker run -d \
  --name "$NEW_CONTAINER" \
  -p "${PORT}:${PORT}" \
  --restart unless-stopped \
  "$NEW_IMAGE"

sleep 5

if docker ps --filter "name=${NEW_CONTAINER}" --filter "status=running" -q | grep -q .; then
  echo "Deployment successful. $NEW_CONTAINER is running $NEW_IMAGE on port $PORT"
  read -rp "Remove old container '$OLD_CONTAINER' now? (y/n): " CLEANUP
  if [[ "$CLEANUP" == "y" || "$CLEANUP" == "Y" ]]; then
    docker rm -f "$OLD_CONTAINER" 2>/dev/null || true
  fi
else
  echo "New container failed to start. Rolling back."
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