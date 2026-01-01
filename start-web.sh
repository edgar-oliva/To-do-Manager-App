#!/bin/bash
# Script to start the To-Do Manager App in web mode

cd "$(dirname "$0")"

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Start the development server
echo "Starting To-Do Manager App (Web Mode)..."
echo "The app will be available at http://localhost:5173"
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev

