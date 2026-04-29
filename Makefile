.PHONY: help build link reload

help:
	@echo "Agent Management Extension - Available Commands:"
	@echo "  make build    - Compile and package the VS Code extension (.vsix)"
	@echo "  make link     - Install the extension and link the 'am' CLI tool globally"
	@echo "  make reload   - Reload the current Antigravity window to apply changes"

build:
	@echo "==> Building extension..."
	cd am-extension && npm install && npm run compile && npx @vscode/vsce package --allow-missing-repository --allow-star-activation

link: build
	@echo "==> Installing extension into Antigravity..."
	cd am-extension && antigravity --install-extension am-extension-0.0.1.vsix --force
	@echo "==> Linking 'am' CLI command globally..."
	cd am-extension && chmod +x bin/am.js && npm link
	@echo "Done! You can now run 'am startTask'."

reload:
	@echo "==> Reloading window..."
	antigravity --open-url vscode://karson.am-extension/reloadWindow
