FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Base utilities only (removed 'sqlcmd' – it was invalid)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl jq bash-completion procps iputils-ping netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# base image already has user 'vscode' with good perms
USER vscode
WORKDIR /workspace
