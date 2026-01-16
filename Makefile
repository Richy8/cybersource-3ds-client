.PHONY: build test clean publish push release-patch release-minor release-major npm-publish

VERSION := $(shell node -p "require('./package.json').version")

# Build the package
build:
	npm run build

# Clean build artifacts
clean:
	rm -rf dist

# Build and push to GitHub
push:
	git add .
	@read -p "Enter commit message: " msg; \
	git commit -m "$$msg"; \
	git push origin dev

# Version bump and push to GitHub
version-patch:
	npm version patch
	git push origin dev --tags

version-minor:
	npm version minor
	git push origin dev --tags

version-major:
	npm version major
	git push origin dev --tags

# Publish to npm (requires authentication)
npm-publish:
	@echo "Publishing version $(VERSION) to npm..."
	npm publish

# Complete release workflow: bump version, build, push to GitHub, and publish to npm
release-patch:
	@echo "Creating patch release..."
	npm version patch
	@echo "Building package..."
	npm run build
	@echo "Pushing to GitHub..."
	git push origin dev --tags
	@echo "Publishing to npm..."
	npm publish
	@echo "✅ Patch release $(VERSION) complete!"

release-minor:
	@echo "Creating minor release..."
	npm version minor
	@echo "Building package..."
	npm run build
	@echo "Pushing to GitHub..."
	git push origin dev --tags
	@echo "Publishing to npm..."
	npm publish
	@echo "✅ Minor release $(VERSION) complete!"

release-major:
	@echo "Creating major release..."
	npm version major
	@echo "Building package..."
	npm run build
	@echo "Pushing to GitHub..."
	git push origin dev --tags
	@echo "Publishing to npm..."
	npm publish
	@echo "✅ Major release $(VERSION) complete!"

# Dry run - see what would be published
publish-dry-run:
	@echo "Dry run for version $(VERSION)..."
	npm publish --dry-run

# Check if you're logged in to npm
npm-whoami:
	@echo "Current npm user:"
	npm whoami

# Help command
help:
	@echo "Available commands:"
	@echo ""
	@echo "Build & Clean:"
	@echo "  make build              - Build the library"
	@echo "  make clean              - Remove build artifacts"
	@echo ""
	@echo "Git Operations:"
	@echo "  make push               - Add, commit and push to dev"
	@echo "  make version-patch      - Bump patch version and push tags"
	@echo "  make version-minor      - Bump minor version and push tags"
	@echo "  make version-major      - Bump major version and push tags"
	@echo ""
	@echo "NPM Publishing:"
	@echo "  make npm-publish        - Publish current version to npm"
	@echo "  make publish-dry-run    - Test publish without actually publishing"
	@echo "  make npm-whoami         - Check current npm user"
	@echo ""
	@echo "Complete Release (bump + build + push + publish):"
	@echo "  make release-patch      - Patch release (1.0.0 -> 1.0.1)"
	@echo "  make release-minor      - Minor release (1.0.0 -> 1.1.0)"
	@echo "  make release-major      - Major release (1.0.0 -> 2.0.0)"
	@echo ""
	@echo "Current version: $(VERSION)"
