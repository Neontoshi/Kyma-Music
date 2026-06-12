.PHONY: dev build check clean update

# Let Tauri manage both frontend and backend
dev:
	cd Kyma_Backend && cargo tauri dev

# Build for production
build:
	cd Kyma_Backend && cargo install tauri-cli && cargo tauri build


# Check Rust code for errors
check:
	cd Kyma_Backend && cargo check

# Clean build artifacts
clean:
	cd Kyma_Backend && cargo clean
	cd Kyma_Frontend && rm -rf dist node_modules/.vite

# Update dependencies
update:
	cd Kyma_Backend && cargo update
	cd Kyma_Frontend && npm update

# Frontend only (build for production)
frontend:
	cd Kyma_Frontend && npm run build

# Backend only (Rust without Tauri)
backend:
	cd Kyma_Backend && cargo run

# Fix auto-fixable warnings
fix:
	cd Kyma_Backend && cargo fix --allow-dirty

# Install all dependencies
install:
	cd Kyma_Frontend && npm install
	cd Kyma_Backend && cargo fetch

# Run in development with verbose output
dev-verbose:
	cd Kyma_Backend && cargo tauri dev --verbose
