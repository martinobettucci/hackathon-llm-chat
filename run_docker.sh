#!/bin/bash
set -e

IMAGE_NAME="hackathon-chat-app"

docker build -t "$IMAGE_NAME" .
docker run -d --restart always -p 127.0.0.1:8088:8088 "$IMAGE_NAME"
