#!/bin/bash
set -e

IMAGE_NAME="hackathon-chat-app"

docker build -t "$IMAGE_NAME" .
docker run -d --restart always -p 127.0.0.1:8086:8086 "$IMAGE_NAME"
