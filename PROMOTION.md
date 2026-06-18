# MCP Hub — 推广文案

## 🔗 链接
- 官网: https://moreee326.github.io/MCP-Hub/
- GitHub: https://github.com/Moreee326/mcp-hub
- 购买: https://gumroad.com/l/mcp-hub
- 价格: Free（2 台服务器）/ Pro $19 买断

---

## 📮 Reddit — r/selfhosted

**Title:** I built MCP Hub — a visual dashboard to manage your AI's tools (open source, $19 one-time Pro)

**Body:**

Hey r/selfhosted 👋

If you've been playing with MCP (Model Context Protocol) servers for Claude Desktop, Cursor, or anything else — you know the pain: editing JSON configs, terminal-only `npx` commands, no visibility into what's connected.

I built **MCP Hub** — a dark-themed GUI dashboard that runs locally. Add any stdio-based MCP server, connect with one click, see all available tools, and call them inline from the browser.

**What it does:**
- 🖥️ Visual sidebar — see all servers, status dots (green/yellow/red), tool counts
- 🔌 One-click connect/disconnect — no terminal needed
- 🧰 Inline tool calling — JSON editor + result viewer, great for debugging
- 💾 Persistent config — servers survive restarts
- 💬 Built-in feedback widget (just added!)

**Pricing:**
- Free: 2 servers, all features
- Pro: $19 one-time (unlimited servers, encrypted env vars, 12mo updates)

**Tech:** Node.js + Express backend, single-file HTML dashboard, MCP JSON-RPC over stdio. Works on macOS/Linux/Windows.

GitHub: https://github.com/Moreee326/mcp-hub
Live demo: https://moreee326.github.io/MCP-Hub/

Would love feedback from anyone running MCP servers!

---

## 📮 Reddit — r/ClaudeAI (shorter version)

**Title:** I made a GUI dashboard to manage MCP servers for Claude — open source, $19 Pro

**Body:**

Tired of editing JSON to configure MCP servers for Claude Desktop? I built MCP Hub — a visual dashboard that runs locally at `localhost:3456`.

- Add servers by name + command (uvx, npx, python...)
- One-click connect → auto-discovers all tools
- Call any tool inline with a JSON editor
- Dark theme, responsive, persistent config

Free for 2 servers. Pro is $19 one-time (lifetime, unlimited).

https://moreee326.github.io/MCP-Hub/

---

## 📮 V2EX — 分享创造

**标题:** [开源] MCP Hub — 给 AI 工具做了个可视化管理面板，$19 买断 Pro

**正文:**

最近在用 MCP 协议给 Claude/Cursor 接各种工具，每次都要手写 JSON 配置、终端敲命令，烦了。于是撸了一个可视化管理面板。

**功能：**
- 侧边栏显示所有 MCP 服务器，绿/黄/红状态灯
- 一键连接/断开，自动发现服务器上的工具
- 内置 JSON-RPC 工具调用——填 JSON 参数直接跑，适合调试
- 配置持久化，重启不丢失
- 深色主题，响应式布局
- 刚加了用户反馈功能

**定价：**
- Free：最多 2 台服务器，功能完整
- Pro：$19 永久买断（无限服务器、加密环境变量、12 个月更新）

**技术栈：** Node.js + Express 后端，单文件 HTML 前端，通过 stdio 与 MCP 进程通信。

GitHub: https://github.com/Moreee326/mcp-hub
在线演示: https://moreee326.github.io/MCP-Hub/（有动画 demo）

欢迎试用和反馈 🙏

---

## 📮 Hacker News — Show HN

**Title:** Show HN: MCP Hub — A visual dashboard for managing MCP servers (OSS, $19 Pro)

**Body:**

Hi HN,

MCP (Model Context Protocol) is great for extending AI tools, but managing servers is still a CLI-only experience. I wanted something more visual.

MCP Hub is a local web dashboard for adding, connecting, and calling MCP servers. It spawns MCP processes via Node.js `spawn()`, communicates over JSON-RPC via stdio, and exposes a REST API consumed by a single-file HTML dashboard.

Key decisions:
- Dark theme, responsive, zero framework on the frontend (vanilla JS + CSS)
- `shell: false` for stdio reliability on Windows
- HMAC-signed license keys for the Pro tier ($19 one-time, not subscription)
- All data stays local (configs in `servers.json`, feedback in `feedback.json`)

Source: https://github.com/Moreee326/mcp-hub
Demo (with animated preview): https://moreee326.github.io/MCP-Hub/

Curious what the HN crowd thinks — both about the product and the pricing model.

---

## 🚀 Product Hunt 物料

### Tagline
The Control Panel for Your AI Tools — manage MCP servers visually, no terminal needed.

### Description
MCP Hub is a local web dashboard that gives you a beautiful GUI for managing all your MCP (Model Context Protocol) servers. 

Add any stdio-based MCP server by name and command. Connect with one click and it auto-discovers every available tool. Call tools inline with a JSON editor and see results instantly.

Built for developers who use Claude Desktop, Cursor, or any MCP-compatible AI tool.

✨ Features:
• Visual sidebar with server status indicators
• One-click connect/disconnect
• Inline tool calling & debugging
• Persistent config across restarts
• Dark theme, mobile responsive
• Built-in feedback widget

💸 Pricing:
• Free — up to 2 servers, all features
• Pro — $19 one-time, lifetime license, unlimited servers + encrypted env vars

### Maker comment
Hey Product Hunt! 👋

I built MCP Hub because I was tired of editing JSON configs to manage my MCP servers for Claude Desktop. Every time I wanted to add, debug, or just see what tools were available, I had to drop into the terminal.

This is a completely local tool — your data never leaves your machine. The Pro tier is a one-time $19 purchase (no subscription BS) that unlocks unlimited servers.

Try it free at https://moreee326.github.io/MCP-Hub/ — the landing page has an animated demo showing the full workflow.

Would love to hear what you think!

### 截图建议
1. 空状态（No Servers Yet + 三个预设按钮）
2. 连接后的 dashboard（侧边栏 + tools 网格 + tool call 结果）
3. 添加服务器的弹窗
4. 反馈弹窗
