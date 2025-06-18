# hackathon-chat

This repository contains a React-based chat application built with Vite.
When the application is served behind a reverse proxy under a specific path
(for example `/chat`), Vite needs to know that base path so that asset URLs are
generated correctly. The provided Docker helper script automatically sets the
base path to `/chat/` if none is supplied via the `BASE_PATH` environment
variable. To override the default, export a different value before running the
script. For example:

```bash
export BASE_PATH=/chat/
```

## Running with Docker

1. Ensure [Docker](https://www.docker.com/) is installed on your system.
2. Execute the provided script to build the image and run the container. The
   application will be built with the `/chat/` base path unless you override it
   via `BASE_PATH`:

```bash
./run_docker.sh
```

The container exposes the application on `127.0.0.1:8086` and is started in daemon mode with an automatic restart policy.
