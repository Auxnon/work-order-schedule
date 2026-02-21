# Use bun if available, otherwise fall back to npm
runner := if `which bun 2>/dev/null` != "" { "bun" } else { "npm" }

# run development server
dev:
    {{runner}} run dev

# build for release
build:
    {{runner}} run build

# run tests
test:
    {{runner}} run test

