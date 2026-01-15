.PHONY: build test clean publish push

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

# Version bump and push
version-patch:
	npm version patch
	git push origin dev --tags

version-minor:
	npm version minor
	git push origin dev --tags

version-major:
	npm version major
	git push origin dev --tags

# Help command
help:
	@echo "Available commands:"
	@echo "  make build         - Build the library"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make push          - Add, commit and push to dev"
	@echo "  make version-patch - Bump patch version and push tags"
	@echo "  make version-minor - Bump minor version and push tags"
	@echo "  make version-major - Bump major version and push tags"
