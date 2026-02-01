# OpenClaw aka (Clawdbot, MoltBot) (Coolify Edition)

**Your Assistant. Your Machine. Your Rules.**

OpenClaw aka (Clawdbot, MoltBot) is an open agent platform that runs on your machine and works from the chat apps you already use. WhatsApp, Telegram, Discord, Slack, Teams—wherever you are, your AI assistant follows.

Unlike SaaS assistants where your data lives on someone else’s servers, OpenClaw runs where you choose—laptop, homelab, or VPS. Your infrastructure. Your keys. Your data.

---

## 🚀 Easy Setup on Coolify

1.  Open your Coolify Dashboard.
2.  Navigate to **Project** > **New**.
3.  Select **Public Repository**.
4.  Enter the URL: `https://github.com/essamamdani/openclaw-coolify`
5.  Click **Continue**.

---

## 🧱 Prebuilt Image Workflow (Recommended for Productization)

This repo includes a GitHub Actions workflow that builds and publishes a Docker image to GHCR:
- Image: `ghcr.io/<org-or-user>/openclaw-coolify:latest`
- Tags: `latest`, `vX.Y.Z`, and commit `sha`

### 1) Enable GitHub Packages
Ensure GitHub Packages is enabled for your org/user (default on GHCR).

### 2) Push to GitHub
Every push to `main` publishes a new image.

### 3) Tell Coolify which image to pull
Set this environment variable in Coolify:
- `OPENCLAW_IMAGE=ghcr.io/<org-or-user>/openclaw-coolify:latest`

This avoids long build times inside Coolify.

---

## ✅ Coolify Environment Variables (Required for Deploy)

Set these in **Coolify > Service > Environment Variables** (no `.env` file is used in Coolify).

**Required secrets**
- `SERVICE_BASE64_REGISTRY` — random 32+ bytes, base64
- `SERVICE_BASE64_SEARXNG` — random 32+ bytes, base64

**At least one model key**
- `OPENAI_API_KEY` (or use `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `MINIMAX_API_KEY`, `KIMI_API_KEY`, `OPENCODE_API_KEY`)

**Optional**
- `TELEGRAM_BOT_TOKEN`
- `CF_TUNNEL_TOKEN`
- `GITHUB_TOKEN`, `GITHUB_USERNAME`, `GITHUB_EMAIL`
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

---

## 📦 Post-Deployment (Ready)
Once the container is running and healthy:

1.  **Access the Dashboard**:
    - Open the **Service Logs** in Coolify.
    - Look for: `🦞 OPENCLAW READY`.
    - You will see a **Dashboard URL** with a token (e.g., `https://.../?token=xyz`).
    - **Click that link** to access your OpenClaw Gateway UI.
2.  **Approve Your Device**:
    - You will see an "Unauthorized" or pairing screen (this is normal).
    - Open the **Service Terminal** in Coolify.
    - Run: `openclaw-approve`
    - > [!WARNING]
    - > **Security Note**: `openclaw-approve` is a break-glass utility that auto-accepts ALL pending pairing requests. Only run this immediately after accessing the URL yourself. Do not leave it running or use it when you don't recognize a request.
3.  **Guided Onboarding**: To configure your agent's personality and skills:
    - In the terminal, run: `openclaw onboard`
    - Follow the interactive wizard.
4.  **Configure Channels**: Go to the **Channels** tab in the dashboard to link WhatsApp, Telegram, etc.

---

## � Channel Setup

OpenClaw lives where you work. You can connect it to WhatsApp, Telegram, Discord, etc.

### 📱 Telegram
**Fastest setup.**
1.  Talk to **@BotFather** on Telegram.
2.  Create a new bot (`/newbot`) and get the **Token**.
3.  Add `TELEGRAM_BOT_TOKEN` to your Coolify Environment Variables.
4.  **Redeploy** (or just restart).
5.  DM your new bot. It will ask for a **Pairing Code**.
6.  Go to your OpenClaw Dashboard > **Pairing** to approve it.
    *   *Docs: [Telegram Channel Guide](docs/channels/telegram.md)*

### 🟢 WhatsApp
**Requires scanning a QR code.**
1.  Go to your OpenClaw Dashboard (from the logs).
2.  Navigate to **Channels** > **WhatsApp**.
3.  Open WhatsApp on your phone > **Linked Devices** > **Link a Device**.
4.  Scan the QR code shown on the dashboard.
5.  **Done!** You can now chat with OpenClaw.
    *   *Docs: [WhatsApp Channel Guide](docs/channels/whatsapp.md)*

### ⚡ Other Channels
You can verify status or manage other channels (Discord, Slack) via the dashboard or CLI.
*   *CLI Docs: [Channel Management](docs/cli/channels.md)*

---

## � Architecture: The AI Office

Think of this Docker container not as an app, but as an **Office Building**.

### 1. The Staff (Multi-Agent System)
*   **The Manager (Gateway)**: The main `openclaw` process. It hires "staff" to do work.
*   **The Workers (Sandboxes)**: When you ask for a complex coding task, the Manager spins up **isolated Docker containers** (sub-agents).
    *   They have their own Linux tools (Python, Node, Go).
    *   They work safely in a sandbox, then report back.
    *   *Managed via: Docker Socket Proxy (Secure Sidecar).*

### 2. Corporate Memory (Long-Term Storage)
Your office never forgets, thanks to a 3-tier memory architecture:
*   **The Filing Cabinet (`openclaw-workspace`)**: A persistent Docker Volume where agents write code, save files, and store heavy data. Survives restarts.
*   **The Brain (Internal SQLite)**: OpenClaw's native transactional memory for conversations and facts.
*   **Web Search (SearXNG)**: A private, tracking-free search engine (`searxng:8080`) for the agent's research.

### 3. The Security Vault
Your agent can securely manage credentials without leaking them:
*   **Bitwarden (`rbw`)**: Securely fetch secrets from your Bitwarden vault.
*   **Pass**: Local GPG-encrypted password storage for the agent's exclusive use.

### 4. The Public Front Door (Cloudflare Tunnel)
Need to show a client your work?
*   The agent can start a web server (e.g., Next.js on port 3000).
*   It uses `cloudflared` to instantly create a **secure public URL** (e.g., `https://project-viz.trycloudflare.com`).
*   *No router port forwarding required.*

### 5. Advanced Web Utilities
*   **Universal Scraper**: 5-stage fallback engine (Curl -> AI Browser -> Anti-Detect) to read any website.
*   **Research Tools**: `hackernews-cli`, `tuir` (Reddit), `newsboat` (RSS), `sonos` control.

### 6. Zero-Config & Production Ready
*   **Pre-installed Tools**: `gh` (GitHub), `vercel`, `bun`, `python`, `ripgrep`.
*   **Office Suite**: `pandoc` (Docs), `marp` (Slides), `csvkit` (Excel), `qmd` (Local AI Search).
*   **Secure**: All sub-agents are firewalled.
*   **Self-Healing**: Docker volumes ensure `openclaw-config` and `openclaw-workspace` persist forever.

---


## 🔒 Security & Sandboxing

- **Authentication**: Dashboard is token-protected. New chat users must be "paired" (approved) first.
- **Docker Proxy**: This setup uses a **Sockety Proxy (Sidecar)** pattern.
    - OpenClaw talks to a restricted Docker API proxy (`tcp://docker-proxy:2375`).
    - **Blocked**: Swarm, Secrets, System, Volumes, and other critical host functions.
    - **Allowed**: Only what's needed for sandboxing (Containers, Images, Networks).
- **Isolation**: Sub-agents run in disposable containers. `SOUL.md` rules forbid the agent from touching your other Coolify services.