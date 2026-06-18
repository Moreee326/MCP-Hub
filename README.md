# MCP Hub

> The Control Panel for Your AI Tools

A visual dashboard to add, connect, and call MCP (Model Context Protocol) servers — your AI agents' tools, all in one place. No config files. No terminal.

![Dashboard](screenshot-dashboard.png)

## Quick Start

```bash
npx mcp-hub
```

Or install globally:

```bash
npm install -g mcp-hub
mcp-hub
```

Then open **http://localhost:3456** in your browser.

## Features

- **Visual Dashboard** — See all MCP servers with status indicators
- **One-Click Connect** — Connect to any MCP server, auto-discover tools
- **Inline Tool Calling** — Call tools with JSON arguments, see results instantly
- **Persistent Config** — Server configs survive restarts
- **Secure by Design** — Isolated environment variables per server

## Pricing

| Plan | Price | Limits |
|------|-------|--------|
| Free | $0 | 2 servers |
| Pro  | $19 one-time | Unlimited servers, encrypted env vars, 12mo updates |

## Requirements

- Node.js 18+

## What is MCP?

Model Context Protocol (MCP) is an open standard that gives AI agents access to tools — filesystem, GitHub, databases, APIs, and more. MCP Hub gives you a beautiful UI to manage them all.

## License

MIT
