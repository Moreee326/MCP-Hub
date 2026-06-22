const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.MCP_HUB_PORT || 3456;

// ── State ──────────────────────────────────────────────────────────
const servers = {}; // name -> { config, proc, status, tools, buffer, reqQueue }
const CONFIG_PATH = path.join(__dirname, 'servers.json');
const LICENSE_PATH = path.join(__dirname, '.mcp-hub-license');

// ── License System ─────────────────────────────────────────────────
// Free tier: max 2 servers. Pro tier: unlimited.
// License keys are HMAC-SHA256 signed: MCPHUB-PRO-{hex}-{signature}
const crypto = require('crypto');
const LICENSE_SECRET = 'mcp-hub-secret-key-change-in-production-v1';

function generateLicenseKey() {
  const payload = crypto.randomBytes(8).toString('hex');
  const sig = crypto.createHmac('sha256', LICENSE_SECRET).update(payload).digest('hex').substring(0, 8);
  return `MCPHUB-PRO-${payload}-${sig}`;
}

function validateLicenseKey(key) {
  if (!key || typeof key !== 'string') return false;
  const parts = key.trim().split('-');
  if (parts[0].toUpperCase() !== 'MCPHUB' || parts[1].toUpperCase() !== 'PRO') return false;
  const payload = parts.slice(2, -1).join('-') || parts[2];
  const sig = parts[parts.length - 1];
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', LICENSE_SECRET).update(payload.toLowerCase()).digest('hex').substring(0, 8);
  return sig.toLowerCase() === expected.toLowerCase();
}

function loadLicense() {
  try {
    if (fs.existsSync(LICENSE_PATH)) {
      const data = JSON.parse(fs.readFileSync(LICENSE_PATH, 'utf8'));
      if (data.key && validateLicenseKey(data.key)) {
        return { tier: 'pro', key: data.key };
      }
    }
  } catch (e) {}
  return { tier: 'free', key: null };
}

function saveLicense(key) {
  fs.writeFileSync(LICENSE_PATH, JSON.stringify({ key, activatedAt: new Date().toISOString() }), 'utf8');
}

function getLicense() { return loadLicense(); }

function checkServerLimit(req, res, next) { next(); }

// ── Middleware ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});
app.use(express.static(__dirname));

// ── Load/Save config ───────────────────────────────────────────────
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) { console.error('Config load error:', e.message); }
  return {};
}

function saveConfig() {
  const configs = {};
  for (const [name, s] of Object.entries(servers)) {
    configs[name] = s.config;
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(configs, null, 2), 'utf8');
}

// ── JSON-RPC over stdio ────────────────────────────────────────────
// Each process gets a persistent stdout buffer + pending requests map
function setupStdioHandler(proc) {
  proc._rpcBuffer = '';
  proc._pending = {};
  proc._idCounter = 0;
  
  proc.stdout.on('data', (data) => {
    proc._rpcBuffer += data.toString();
    // Try to extract complete JSON objects
    const lines = proc._rpcBuffer.split('\n');
    // Keep the last (potentially incomplete) line in the buffer
    proc._rpcBuffer = lines.pop() || '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const resp = JSON.parse(trimmed);
        if (resp.id != null && proc._pending[resp.id]) {
          const { resolve, reject, timer } = proc._pending[resp.id];
          clearTimeout(timer);
          delete proc._pending[resp.id];
          if (resp.error) reject(new Error(resp.error.message || JSON.stringify(resp.error)));
          else resolve(resp.result);
        }
      } catch (e) {
        // Not a complete JSON line yet — keep buffering
      }
    }
  });
}

function sendJsonRpc(proc, method, params = {}, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const id = ++proc._idCounter;
    const request = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
    
    const timer = setTimeout(() => {
      delete proc._pending[id];
      reject(new Error(`Request timed out (${timeoutMs}ms): ${method}`));
    }, timeoutMs);
    
    proc._pending[id] = { resolve, reject, timer };
    proc.stdin.write(request);
  });
}

// ── MCP Server Lifecycle ───────────────────────────────────────────
async function connectServer(name) {
  const s = servers[name];
  if (!s) return { error: 'Server not found' };
  if (s.status === 'connected') return { status: 'already_connected' };
  
  s.status = 'connecting';
  s.tools = [];
  s.lastError = null;
  
  try {
    const cmd = s.config.command;
    const args = s.config.args || [];
    const env = { ...process.env, ...(s.config.env || {}) };
    
    s.proc = spawn(cmd, args, {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });
    
    // Set up persistent JSON-RPC handler
    setupStdioHandler(s.proc);
    
    // Collect stderr
    s.stderrbuf = '';
    s.proc.stderr.on('data', (data) => {
      s.stderrbuf += data.toString();
    });
    
    // Handle exit
    s.proc.on('exit', (code) => {
      s.status = 'disconnected';
      s.lastError = `Process exited with code ${code}`;
      if (s.stderrbuf) s.lastError += `\nstderr: ${s.stderrbuf}`;
      s.proc = null;
    });
    
    s.proc.on('error', (err) => {
      s.status = 'error';
      s.lastError = err.message;
      s.proc = null;
    });
    
    // Initialize MCP connection
    const initResult = await sendJsonRpc(s.proc, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'mcp-hub', version: '1.0.0' },
    }, 60000);
    
    // Send initialized notification
    s.proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    
    // List tools
    const toolsResult = await sendJsonRpc(s.proc, 'tools/list');
    s.tools = toolsResult.tools || [];
    s.status = 'connected';
    
    return { status: 'connected', tools: s.tools };
  } catch (err) {
    s.status = 'error';
    s.lastError = err.message;
    if (s.proc) {
      try { s.proc.kill(); } catch (e) {}
      s.proc = null;
    }
    return { error: err.message };
  }
}

function disconnectServer(name) {
  const s = servers[name];
  if (!s) return { error: 'Server not found' };
  if (s.proc) {
    try { s.proc.kill(); } catch (e) {}
    s.proc = null;
  }
  s.status = 'disconnected';
  s.tools = [];
  return { status: 'disconnected' };
}

function removeServer(name) {
  disconnectServer(name);
  delete servers[name];
  saveConfig();
  return { status: 'removed' };
}

// ── License API ─────────────────────────────────────────────────────
const https = require('https');
const GUMROAD_PERMALINK = process.env.GUMROAD_PERMALINK || 'mcp-hub';

// Validate key: try Gumroad API first, fall back to HMAC
async function validateLicenseKeyWithGumroad(key) {
  // Try HMAC first (offline, fast)
  if (validateLicenseKey(key)) return { valid: true, source: 'hmac' };
  
  // Try Gumroad verify API
  try {
    const body = `product_permalink=${encodeURIComponent(GUMROAD_PERMALINK)}&license_key=${encodeURIComponent(key)}`;
    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.gumroad.com', path: '/v2/licenses/verify',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    if (result.success) return { valid: true, source: 'gumroad', email: result.purchaser?.email };
  } catch (e) { /* Gumroad API unreachable, fall through */ }
  
  return { valid: false };
}

// Get current license status
app.get('/api/license', (req, res) => {
  res.json(getLicense());
});

// Generate a new license key (admin only - for development use)
app.post('/api/license/generate', (req, res) => {
  const key = generateLicenseKey();
  res.json({ key });
});

// Activate a license key
app.post('/api/license/activate', async (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'License key required' });
  
  const result = await validateLicenseKeyWithGumroad(key).catch(() => ({ valid: false }));
  if (!result.valid) {
    return res.status(400).json({ error: 'Invalid license key' });
  }
  
  saveLicense(key);
  const source = result.source === 'gumroad' ? ' (verified via Gumroad)' : '';
  res.json({ tier: 'supporter', message: `Supporter badge activated!💜${source}` });
});

// ── REST API ────────────────────────────────────────────────────────

// List all servers
app.get('/api/servers', (req, res) => {
  const list = Object.entries(servers).map(([name, s]) => ({
    name,
    config: s.config,
    status: s.status,
    toolsCount: s.tools ? s.tools.length : 0,
    lastError: s.lastError || null,
    stderr: s.stderrbuf || null,
  }));
  res.json(list);
});

// Add a server
app.post('/api/servers', (req, res) => {
  const { name, command, args, env, timeout } = req.body;
  if (!name || !command) {
    return res.status(400).json({ error: 'name and command are required' });
  }
  if (servers[name]) {
    return res.status(409).json({ error: `Server "${name}" already exists` });
  }
  
  const config = { command, args: args || [], env: env || {}, timeout: timeout || 120 };
  servers[name] = { config, status: 'stopped', tools: [], proc: null, buffer: '', lastError: null, stderrbuf: null };
  saveConfig();
  
  res.json({ name, status: 'created' });
});

// Update a server config
app.put('/api/servers/:name', (req, res) => {
  const { name } = req.params;
  if (!servers[name]) return res.status(404).json({ error: 'Not found' });
  
  // Disconnect if connected
  if (servers[name].status === 'connected' || servers[name].status === 'connecting') {
    disconnectServer(name);
  }
  
  const { command, args, env, timeout } = req.body;
  if (command) servers[name].config.command = command;
  if (args) servers[name].config.args = args;
  if (env) servers[name].config.env = env;
  if (timeout) servers[name].config.timeout = timeout;
  
  saveConfig();
  res.json({ name, status: 'updated' });
});

// Remove a server
app.delete('/api/servers/:name', (req, res) => {
  const { name } = req.params;
  if (!servers[name]) return res.status(404).json({ error: 'Not found' });
  res.json(removeServer(name));
});

// Export server configs
app.get('/api/servers/export', (req, res) => {
  const configs = {};
  for (const [name, s] of Object.entries(servers)) {
    configs[name] = s.config;
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="mcp-hub-servers-${new Date().toISOString().slice(0,10)}.json"`);
  res.json(configs);
});

// Import server configs
app.post('/api/servers/import', (req, res) => {
  const { configs, overwrite } = req.body;
  if (!configs || typeof configs !== 'object') {
    return res.status(400).json({ error: 'Invalid config data. Expected { "name": { command, args, env } }' });
  }
  let added = 0, skipped = 0;
  for (const [name, config] of Object.entries(configs)) {
    if (!config.command) continue;
    if (servers[name] && !overwrite) { skipped++; continue; }
    if (!servers[name]) {
      servers[name] = { config: { command: config.command, args: config.args || [], env: config.env || {}, timeout: config.timeout || 120 }, status: 'stopped', tools: [], proc: null, buffer: '', lastError: null, stderrbuf: null };
    } else {
      Object.assign(servers[name].config, config);
    }
    added++;
  }
  saveConfig();
  res.json({ added, skipped, message: `Imported ${added} server(s)${skipped ? `, ${skipped} skipped (already exist)` : ''}` });
});

// ── MCP Marketplace ──────────────────────────────────────────────────
const MARKETPLACE = [
  { name:'fetch', desc:'Fetch web pages and APIs — great for getting content from URLs',
    cmd:'uvx', args:['mcp-server-fetch'], env:{}, tags:['web','data'] },
  { name:'filesystem', desc:'Read, write, and search files on your local machine',
    cmd:'npx', args:['-y','@modelcontextprotocol/server-filesystem','.'], env:{}, tags:['file','local'] },
  { name:'github', desc:'Interact with GitHub: repos, issues, PRs, search code',
    cmd:'npx', args:['-y','@modelcontextprotocol/server-github'], env:{GITHUB_TOKEN:'your_github_token'}, tags:['dev','git'] },
  { name:'brave-search', desc:'Search the web using Brave Search API (free tier available)',
    cmd:'npx', args:['-y','@modelcontextprotocol/server-brave-search'], env:{BRAVE_API_KEY:'your_brave_api_key'}, tags:['web','search'] },
  { name:'playwright', desc:'Browser automation — navigate, click, extract, screenshot',
    cmd:'npx', args:['-y','@playwright/mcp'], env:{}, tags:['browser','automation'] },
  { name:'sqlite', desc:'Query and manage SQLite databases directly',
    cmd:'uvx', args:['mcp-server-sqlite','--db','/path/to/database.db'], env:{}, tags:['data','database'] },
  { name:'memory', desc:'Persistent memory store — save and recall information across sessions',
    cmd:'npx', args:['-y','@modelcontextprotocol/server-memory'], env:{}, tags:['ai','storage'] },
  { name:'time', desc:'Get current time, date, and timezone info',
    cmd:'uvx', args:['mcp-server-time'], env:{}, tags:['utility'] },
  { name:'slack', desc:'Read messages, search channels, and send Slack notifications',
    cmd:'npx', args:['-y','@modelcontextprotocol/server-slack'], env:{SLACK_BOT_TOKEN:'xoxb-xxx',SLACK_TEAM_ID:'T00000000'}, tags:['communication'] },
  { name:'puppeteer', desc:'Headless Chrome automation — screenshots, PDFs, scraping',
    cmd:'npx', args:['-y','@modelcontextprotocol/server-puppeteer'], env:{}, tags:['browser','automation'] },
];

app.get('/api/marketplace', (req, res) => {
  const list = MARKETPLACE.map(s => ({
    name: s.name, desc: s.desc, cmd: s.cmd, args: s.args,
    envHint: Object.keys(s.env).length ? Object.keys(s.env) : null,
    tags: s.tags,
  }));
  res.json(list);
});

// Connect to a server
app.post('/api/servers/:name/connect', async (req, res) => {
  const { name } = req.params;
  if (!servers[name]) return res.status(404).json({ error: 'Not found' });
  
  // Don't await - send initial response, continue in background
  const result = await connectServer(name);
  res.json(result);
});

// Disconnect a server
app.post('/api/servers/:name/disconnect', (req, res) => {
  const { name } = req.params;
  if (!servers[name]) return res.status(404).json({ error: 'Not found' });
  res.json(disconnectServer(name));
});

// Get server details (tools + status)
app.get('/api/servers/:name', (req, res) => {
  const { name } = req.params;
  if (!servers[name]) return res.status(404).json({ error: 'Not found' });
  const s = servers[name];
  res.json({
    name,
    config: s.config,
    status: s.status,
    tools: s.tools || [],
    lastError: s.lastError || null,
    stderr: s.stderrbuf || null,
  });
});

// Call a tool on a server
app.post('/api/servers/:name/call', async (req, res) => {
  const { name } = req.params;
  const { tool, args } = req.body;
  
  if (!servers[name]) return res.status(404).json({ error: 'Server not found' });
  const s = servers[name];
  if (s.status !== 'connected') return res.status(400).json({ error: 'Server not connected' });
  if (!s.proc) return res.status(400).json({ error: 'Server process not running' });
  
  try {
    // Check if tool exists
    if (!s.tools.find(t => t.name === tool)) {
      return res.status(400).json({ error: `Tool "${tool}" not found. Available: ${s.tools.map(t => t.name).join(', ')}` });
    }
    
    const result = await sendJsonRpc(s.proc, 'tools/call', {
      name: tool,
      arguments: args || {},
    });
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get server logs (stderr)
app.get('/api/servers/:name/logs', (req, res) => {
  const { name } = req.params;
  if (!servers[name]) return res.status(404).json({ error: 'Not found' });
  res.json({ stderr: servers[name].stderrbuf || '' });
});

// ── Feedback API ─────────────────────────────────────────────────────
const FEEDBACK_PATH = path.join(__dirname, 'feedback.json');

function loadFeedback() {
  try {
    if (fs.existsSync(FEEDBACK_PATH)) {
      return JSON.parse(fs.readFileSync(FEEDBACK_PATH, 'utf8'));
    }
  } catch (e) { console.error('Feedback load error:', e.message); }
  return [];
}

function saveFeedback(entry) {
  const feedback = loadFeedback();
  feedback.push(entry);
  fs.writeFileSync(FEEDBACK_PATH, JSON.stringify(feedback, null, 2), 'utf8');
}

app.post('/api/feedback', (req, res) => {
  const { type, message, email } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }
  const validTypes = ['bug', 'feature', 'suggestion', 'love'];
  const feedbackType = validTypes.includes(type) ? type : 'suggestion';
  
  const entry = {
    type: feedbackType,
    message: message.trim(),
    email: email ? email.trim() : null,
    timestamp: new Date().toISOString(),
    userAgent: req.get('user-agent') || null,
  };
  
  saveFeedback(entry);
  console.log(`[Feedback] ${feedbackType}: ${message.trim().substring(0, 80)}`);
  res.json({ status: 'received', message: 'Thanks for your feedback! 🎉' });
});

// ── Update Check ────────────────────────────────────────────────────
const PKG = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const CURRENT_VERSION = PKG.version;

// Check GitHub for newer release
app.get('/api/update/check', async (req, res) => {
  try {
    const resp = await fetch('https://api.github.com/repos/Moreee326/MCP-Hub/releases/latest', {
      headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'mcp-hub' },
    });
    if (!resp.ok) throw new Error(`GitHub API: ${resp.status}`);
    const release = await resp.json();
    const latest = (release.tag_name || '').replace(/^v/, '');
    const hasUpdate = compareVersions(latest, CURRENT_VERSION) > 0;
    res.json({
      currentVersion: CURRENT_VERSION,
      latestVersion: latest || CURRENT_VERSION,
      hasUpdate,
      downloadUrl: release.html_url || 'https://github.com/Moreee326/MCP-Hub/releases',
      releaseNotes: release.body?.substring(0, 500) || null,
    });
  } catch (e) {
    // Offline or API error — return current version with no update
    res.json({ currentVersion: CURRENT_VERSION, latestVersion: CURRENT_VERSION, hasUpdate: false, error: e.message });
  }
});

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i]||0) > (pb[i]||0)) return 1;
    if ((pa[i]||0) < (pb[i]||0)) return -1;
  }
  return 0;
}

// ── Startup ─────────────────────────────────────────────────────────
async function startup() {
  const configs = loadConfig();
  for (const [name, config] of Object.entries(configs)) {
    servers[name] = { config, status: 'stopped', tools: [], proc: null, buffer: '', lastError: null, stderrbuf: null };
  }
  
  console.log(`MCP Hub loaded ${Object.keys(configs).length} server config(s)`);
  console.log(`Configured: ${Object.keys(configs).join(', ') || '(none)'}`);
}

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║        MCP Hub is running!          ║`);
  console.log(`  ║                                      ║`);
  console.log(`  ║  Local:   http://localhost:${PORT}     ║`);
  console.log(`  ║  API:     http://localhost:${PORT}/api ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
});

startup().catch(console.error);
