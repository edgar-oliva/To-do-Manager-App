# Quick Start Guide - To-Do Manager App

## Installation Complete! ✅

The app has been installed in a clean environment using:
- **nvm** (Node Version Manager) - installed in `~/.nvm` (your home directory)
- **Node.js v24.12.0** - installed via nvm (isolated from system)
- **All dependencies** - installed in `node_modules` (project directory only)

## How to Run the App

### Option 1: Web Browser Mode
Run the app in your web browser:
```bash
./start-web.sh
```
Then open http://localhost:5173 in your browser.

### Option 2: Desktop App (Electron)
Run the app as a desktop application:
```bash
./start-desktop.sh
```
This will open a native desktop window.

## What's Installed

- **Node.js**: v24.12.0 (via nvm in `~/.nvm`)
- **npm**: v11.6.2
- **Dependencies**: All project dependencies in `node_modules/`

## Notes

- All Node.js installations are isolated via nvm - they won't affect your system Node.js (if any)
- All project dependencies are in the project's `node_modules` folder
- The app is ready to use! Just run one of the startup scripts above.

## Troubleshooting

If you get "command not found" errors:
1. Make sure nvm is loaded: `source ~/.nvm/nvm.sh`
2. Or restart your terminal (nvm auto-loads on new terminals)

If the scripts don't work:
- Make sure they're executable: `chmod +x start-web.sh start-desktop.sh`
- Or run directly: `npm run dev` (web) or `npm run electron:start` (desktop)

