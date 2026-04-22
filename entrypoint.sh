#!/bin/sh
# Run as the specified PUID/PGID so files created in the vault
# have the correct ownership for Obsidian Sync and other tools.

PUID="${PUID:-1000}"
PGID="${PGID:-1000}"

# Create group and user if they don't already exist
if ! getent group "$PGID" >/dev/null 2>&1; then
  addgroup -g "$PGID" vaultboard
fi
GROUP_NAME=$(getent group "$PGID" | cut -d: -f1)

if ! id -u "$PUID" >/dev/null 2>&1; then
  adduser -u "$PUID" -G "$GROUP_NAME" -D -h /app vaultboard
fi
USER_NAME=$(id -nu "$PUID" 2>/dev/null || echo "vaultboard")

# Ensure the app directory is accessible
chown -R "$PUID:$PGID" /app

# Run the command as the specified user
exec su-exec "$PUID:$PGID" "$@"
