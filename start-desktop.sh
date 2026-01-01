#!/bin/bash
# Script to start the To-Do Manager App in desktop (Electron) mode

cd "$(dirname "$0")"

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Start the Electron desktop app
echo "Starting To-Do Manager App (Desktop Mode)..."
echo "The Electron window will open shortly"
echo "Press Ctrl+C to stop the app"
echo ""

npm run electron:start

