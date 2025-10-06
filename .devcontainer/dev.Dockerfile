# Simple base image layering Node + .NET (devcontainers handles features also)
FROM mcr.microsoft.com/devcontainers/base:ubuntu

# (Optional) Install utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl jq bash-completion procps sqlcmd iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Create non-root (devcontainers may adjust later)
ARG USERNAME=vscode
RUN usermod -aG sudo ${USERNAME} || true

USER ${USERNAME}
WORKDIR /workspace