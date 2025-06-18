#!/bin/bash
set -e

IMAGE_NAME="hackathon-chat-app"

# Forward BASE_PATH to the build so Vite can generate assets with the correct
# prefix when the application is served behind a reverse proxy.  If the user
# doesn't provide one, default to "/chat/" so that the container works out of
# the box when proxied under that path.
if [ -z "$BASE_PATH" ]; then
  BASE_PATH="/chat/"
fi
BUILD_ARGS=(--build-arg BASE_PATH="$BASE_PATH")

docker build "${BUILD_ARGS[@]}" -t "$IMAGE_NAME" .
docker run -d --restart always -p 127.0.0.1:8086:8086 "$IMAGE_NAME"
