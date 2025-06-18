#!/bin/bash
set -e

IMAGE_NAME="hackathon-chat-app"

# Forward BASE_PATH to the build so Vite can generate assets with the correct
# prefix when the application is served behind a reverse proxy.
if [ -n "$BASE_PATH" ]; then
  BUILD_ARGS=(--build-arg BASE_PATH="$BASE_PATH")
else
  BUILD_ARGS=()
fi

docker build "${BUILD_ARGS[@]}" -t "$IMAGE_NAME" .
docker run -d --restart always -p 127.0.0.1:8086:8086 "$IMAGE_NAME"
