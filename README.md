# Moltbot (Coolify Edition)

**Your Complete Autonomous AI Office.**

This isn't just a chatbot—it's a full-fledged **AI Workforce** running in your own private cloud (Coolify). It manages staff (agents), remembers corporate knowledge, and can even open its own doors to the public web.

---

## 🏢 Architecture: The AI Office

Think of this Docker container not as an app, but as an **Office Building**.

### 1. The Staff (Multi-Agent System)
*   **The Manager (Gateway)**: The main `moltbot` process. It hires "staff" to do work.
*   **The Workers (Sandboxes)**: When you ask for a complex coding task, the Manager spins up **isolated Docker containers** (sub-agents).
    *   They have their own Linux tools (Python, Node, Go).
    *   They work safely in a sandbox, then report back.
    *   *Managed via: Docker Socket Proxy (Secure Sidecar).*

### 2. Corporate Memory (Long-Term Storage)
Your office never forgets, thanks to a 3-tier memory architecture:
*   **The Filing Cabinet (`moltbot-workspace`)**: A persistent Docker Volume where agents write code, save files, and store heavy data. Survives restarts.
*   **The Brain (Internal SQLite)**: Moltbot's native transactional memory for conversations and facts.
*   **The Library (Qdrant)**: A dedicated Vector Database service (`qdrant:6333`) for building advanced RAG (Retrieval Augmented Generation) apps.

### 3. The Public Front Door (Cloudflare Tunnel)
Need to show a client your work?
*   The agent can start a web server (e.g., Next.js on port 3000).
*   It uses `cloudflared` to instantly create a **secure public URL** (e.g., `https://project-viz.trycloudflare.com`).
*   No router port forwarding required.

### 4. Zero-Config & Production Ready
*   **Pre-installed Tools**: `gh` (GitHub), `vercel`, `bun`, `python`, `ripgrep`.
*   **Secure**: All sub-agents are firewalled.
*   **Self-Healing**: Docker volumes ensure `moltbot-config` and `moltbot-workspace` persist forever.

---

## 🚀 Easy Setup on Coolify

1.  Open your Coolify Dashboard.
2.  Navigate to **Project** > **New**.
3.  Select **Public Repository**.
4.  Enter the URL: `https://github.com/essamamdani/moltbot-coolify`
5.  Click **Continue**.

---

## 🛠️ Environment Configuration

Before deploying, configure your **Environment Variables** in Coolify. These keys unlock different AI models and features.

### 🧠 AI Models (Required: At least one)
You must provide **at least one** of the following keys to power the agent.

| Variable | Description |
| :--- | :--- |
| `OPENAI_API_KEY` | Required for many core reasoning tasks (OpenAI models). |
| `ANTHROPIC_API_KEY` | Unlocks Claude 3.5 Sonnet / Opus (highly recommended for coding). |
| `MINIMAX_API_KEY` | Unlocks MiniMax M2.1 models (great performance/price). |
| `GEMINI_API_KEY` | Google Gemini models. |
| `KIMI_API_KEY` | Kimi / Moonshot AI models. |

### 🔌 Integrations (Optional)
Enable public URLs, deployments, or chat channels.

| Variable | Description |
| :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | If using Telegram (see Channel Setup below). |
| `CF_TUNNEL_TOKEN` | Cloudflare Tunnel token for exposing agent-created apps (Public URLs). |
| `VERCEL_TOKEN` | For deploying apps to Vercel (`vercel deploy --token ...`). |
| `GITHUB_TOKEN` | For creating repos/PRs (`gh auth login --with-token`). |
| `MOLTBOT_GATEWAY_PORT` | Internal port (Default: `18789`). Only change if needed. |

> **Pro Tip**: You can simply copy the contents of [.env.example](.env.example) into Coolify's bulk edit view.

---

## 📦 Lifecycle & Installation

### 1. Pre-request (Build)
When you click **Deploy**, Coolify builds your custom Docker image.
- **Base**: `ubuntu:24.04`
- **Installs**: `curl`, `git`, `python3` (with `uv`), `golang-go`.
- **Power Tools**: `ripgrep` (rg), `fd`, `fzf`, `bat`, `jq`.
- **Runtimes**: `bun`, `yarn`, `npm`.
- **Moltbot**: Downloads and installs the latest binary via `install.sh`.

### 2. Pre-install (Bootstrap)
The container starts with `bootstrap.sh`.
- **Config**: Generates `~/.moltbot/moltbot.json` if missing.
- **Migration**: Renames old `clawdbot.json` to `moltbot.json` if found.
- **Sandboxing**: Configures Docker sandboxing (see `SOUL.md` for safety rules).

### 3. Post-install (Ready)
Once running, check the **Service Logs** in Coolify.
- Look for: `🦞 MOLTBOT READY`
- You will see a **Dashboard URL** with a token (e.g., `http://.../?token=xyz`).
- **Click that link** to access your Moltbot Gateway UI.

### 4. Setup (Onboard)
For a guided configuration of your agent's personality and skills:
1.  Open the **Service Terminal** in Coolify.
2.  Run: `moltbot onboard`
3.  Follow the interactive wizard to set your model preferences and system prompts.

---

## 💬 Channel Setup

Moltbot lives where you work. You can connect it to WhatsApp, Telegram, Discord, etc.

### 📱 Telegram
**Fastest setup.**
1.  Talk to **@BotFather** on Telegram.
2.  Create a new bot (`/newbot`) and get the **Token**.
3.  Add `TELEGRAM_BOT_TOKEN` to your Coolify Environment Variables.
4.  **Redeploy** (or just restart).
5.  DM your new bot. It will ask for a **Pairing Code**.
6.  Go to your Moltbot Dashboard > **Pairing** to approve it.
    *   *Docs: [Telegram Channel Guide](docs/channels/telegram.md)*

### 🟢 WhatsApp
**Requires scanning a QR code.**
1.  Go to your Moltbot Dashboard (from the logs).
2.  Navigate to **Channels** > **WhatsApp**.
3.  Open WhatsApp on your phone > **Linked Devices** > **Link a Device**.
4.  Scan the QR code shown on the dashboard.
5.  **Done!** You can now chat with Moltbot.
    *   *Docs: [WhatsApp Channel Guide](docs/channels/whatsapp.md)*

### ⚡ Other Channels
You can verify status or manage other channels (Discord, Slack) via the dashboard or CLI.
*   *CLI Docs: [Channel Management](docs/cli/channels.md)*

---

## 🔒 Security & Sandboxing

- **Authentication**: Dashboard is token-protected. New chat users must be "paired" (approved) first.
- **Docker Proxy**: This setup uses a **Sockety Proxy (Sidecar)** pattern.
    - Moltbot talks to a restricted Docker API proxy (`tcp://docker-proxy:2375`).
    - **Blocked**: Swarm, Secrets, System, Volumes, and other critical host functions.
    - **Allowed**: Only what's needed for sandboxing (Containers, Images, Networks).
- **Isolation**: Sub-agents run in disposable containers. `SOUL.md` rules forbid the agent from touching your other Coolify services.