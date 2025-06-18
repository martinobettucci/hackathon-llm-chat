# hackathon-chat

This repository contains a React-based chat application built with Vite.

## Running with Docker

1. Ensure [Docker](https://www.docker.com/) is installed on your system.
2. Execute the provided script to build the image and run the container:

```bash
./run_docker.sh
```

The container exposes the application on `127.0.0.1:8086` and is started in daemon mode with an automatic restart policy.
The Dockerfile sets `/chat` as the working directory so the application is served from the `/chat` context instead of the filesystem root.
