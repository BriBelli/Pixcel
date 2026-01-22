#!/bin/bash
# Build PXS Compute WASM module

echo "🦀 Building PXS Compute WASM module..."

# Check for wasm-pack
if ! command -v wasm-pack &> /dev/null; then
    echo "❌ wasm-pack not found. Install it with: cargo install wasm-pack"
    exit 1
fi

# Build for web target
wasm-pack build --target web --out-dir ../dist/wasm

if [ $? -eq 0 ]; then
    echo "✅ Build complete! Output in dist/wasm/"
    echo ""
    echo "Files created:"
    ls -la ../dist/wasm/
else
    echo "❌ Build failed"
    exit 1
fi
