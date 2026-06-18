#!/bin/bash
# MCP Hub — One-Click Installer (macOS & Linux)
set -e

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║        MCP Hub Installer             ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is required. Install it from https://nodejs.org (v18+)"
  exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js v18+ required. Current: $(node -v)"
  exit 1
fi

INSTALL_DIR="${HOME}/.mcp-hub"

echo "📦 Installing MCP Hub to ${INSTALL_DIR}..."

# Create directory
mkdir -p "${INSTALL_DIR}"

# Download (for production this would download from GitHub releases)
# For now, copy from current directory or create fresh
if [ -d "$(dirname "$0")/../mcp-hub" ]; then
  cp -R "$(dirname "$0")/.."/* "${INSTALL_DIR}/" 2>/dev/null || true
fi

# Ensure package.json exists
if [ ! -f "${INSTALL_DIR}/package.json" ]; then
  echo "📥 Downloading MCP Hub..."
  curl -fsSL "https://github.com/Moreee326/mcp-hub/archive/refs/heads/main.tar.gz" -o /tmp/mcp-hub.tar.gz 2>/dev/null || {
    echo "❌ Download failed. Please check your internet connection."
    exit 1
  }
  tar -xzf /tmp/mcp-hub.tar.gz -C /tmp/
  cp -R /tmp/mcp-hub-main/* "${INSTALL_DIR}/"
  rm -rf /tmp/mcp-hub-main /tmp/mcp-hub.tar.gz
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd "${INSTALL_DIR}" && npm install --production 2>/dev/null || npm install

echo ""
echo "  ✅ MCP Hub installed successfully!"
echo ""
echo "  🚀 Start it with:"
echo "     npx mcp-hub"
echo ""
echo "  Or run directly:"
echo "     node ${INSTALL_DIR}/server.js"
echo ""
echo "  🌐 Then open: http://localhost:3456"
echo ""
