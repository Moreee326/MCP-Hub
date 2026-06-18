# MCP Hub

> The Control Panel for Your AI Tools

A visual dashboard to add, connect, and call MCP (Model Context Protocol) servers — your AI agents' tools, all in one place. No config files. No terminal.

![Dashboard](screenshot-dashboard.png)

## Quick Start

```bash
# 1. Download or clone
git clone https://github.com/Moreee326/MCP-Hub.git
cd mcp-hub

# 2. Install dependencies
npm install

# 3. Start the server
node server.js

# 4. Open in browser
# http://localhost:3456
```

Or with npx (if you have Node.js 18+):

```bash
npx mcp-hub
```

## Features

| | |
|---|---|
| 🖥️ **Visual Dashboard** | See all MCP servers with color-coded status indicators |
| 🔌 **One-Click Connect** | Connect to any MCP server, auto-discover tools instantly |
| 🧰 **Inline Tool Calling** | Call any MCP tool with JSON arguments. See results in real-time |
| 💾 **Persistent Config** | Server configurations survive restarts |
| 🔒 **Secure by Design** | Isolated environment variables per server |

## Pricing

| Plan | Price | Limits |
|------|-------|--------|
| **Free** | $0 | 2 servers, full dashboard |
| **Pro** | $19 one-time | Unlimited servers, encrypted env vars, 12mo updates, priority support |

### How to buy Pro

1. Purchase a license key on [Gumroad](https://gumroad.com/l/mcp-hub-pro) ($19)
2. Open MCP Hub Dashboard → click the **FREE** badge → **Activate**
3. Enter your license key → **Pro unlocked**

## Requirements

- **Node.js 18+** (download from [nodejs.org](https://nodejs.org))
- macOS, Linux, or Windows

## What is MCP?

Model Context Protocol (MCP) is an open standard created by Anthropic that gives AI agents access to tools — filesystem, GitHub, databases, APIs, and more. MCP Hub gives you a beautiful UI to manage them all.

## Project Structure

```
mcp-hub/
├── server.js          # Backend API server (port 3456)
├── index.html         # Landing / marketing page
├── dashboard.html     # Dashboard SPA (at /app)
├── bin/mcp-hub.js     # CLI entry point
├── install.sh         # One-click install script
├── package.json
└── README.md
```

## License

MIT
