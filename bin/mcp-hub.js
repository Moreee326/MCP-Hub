#!/usr/bin/env node
// MCP Hub — CLI entry point
// Usage: npx mcp-hub
//        npm install -g mcp-hub && mcp-hub

const path = require('path');
const net = require('net');

const PORT = 3456;

// Colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  purple: '\x1b[38;5;99m',
  cyan: '\x1b[38;5;51m',
  green: '\x1b[38;5;46m',
  gray: '\x1b[38;5;244m',
};

// Check if port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(true));
    s.once('listening', () => { s.close(); resolve(false); });
    s.listen(port);
  });
}

async function main() {
  console.log(`\n${c.purple}  ╔══════════════════════════════════════╗${c.reset}`);
  console.log(`${c.purple}  ║${c.reset}  ${c.bold}${c.cyan}MCP Hub${c.reset} — The Control Panel${c.reset}  ${c.purple}║${c.reset}`);
  console.log(`${c.purple}  ║${c.reset}  ${c.bold}for Your AI Tools${c.reset}              ${c.purple}║${c.reset}`);
  console.log(`${c.purple}  ╚══════════════════════════════════════╝${c.reset}\n`);

  const inUse = await isPortInUse(PORT);
  if (inUse) {
    console.log(`${c.green}  ✅ Already running!${c.reset}`);
    console.log(`${c.gray}  ─────────────────────────────────────${c.reset}`);
    console.log(`  ${c.bold}Dashboard:${c.reset} ${c.cyan}http://localhost:${PORT}/app${c.reset}`);
    console.log(`  ${c.bold}Landing:${c.reset}   ${c.cyan}http://localhost:${PORT}${c.reset}`);
    console.log(`${c.gray}  ─────────────────────────────────────${c.reset}`);
    process.exit(0);
  }

  // Directly require and start the server
  process.env.MCP_HUB_PORT = PORT;
  require(path.join(__dirname, '..', 'server.js'));
}

main().catch(err => {
  console.error(`  ❌ ${err.message}`);
  process.exit(1);
});
