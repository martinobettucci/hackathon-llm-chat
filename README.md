# hackathon-chat

This repository contains a React-based chat application built with Vite.
When the application is served behind a reverse proxy under a specific path
(for example `/chat`), Vite needs to know that base path so that asset URLs are
generated correctly. Set the `BASE_PATH` environment variable before building
or running the Docker container to inform Vite of this path. For example:

```bash
export BASE_PATH=/chat/
```

## Running with Docker

1. Ensure [Docker](https://www.docker.com/) is installed on your system.
2. Execute the provided script to build the image and run the container. If the
   application needs to be served under a sub-path (such as `/chat`), export the
   desired value in `BASE_PATH` before running the script:

```bash
./run_docker.sh
```

The container exposes the application on `127.0.0.1:8086` and is started in daemon mode with an automatic restart policy.
