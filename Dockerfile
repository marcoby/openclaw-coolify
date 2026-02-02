FROM node:lts-bookworm-slim

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive \
    PIP_ROOT_USER_ACTION=ignore

# Install Core & Power Tools + Docker CLI (client only)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    python3 \
    python3-pip \
    python3-venv \
    jq \
    lsof \
    openssl \
    ca-certificates \
    ca-certificates \
    gnupg \
    ripgrep fd-find fzf bat \
    pandoc \
    poppler-utils \
    ffmpeg \
    imagemagick \
    graphviz \
    sqlite3 \
    pass \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CE CLI (Latest) to support API 1.44+
RUN install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y docker-ce-cli && \
    rm -rf /var/lib/apt/lists/*


# Install Go (Latest)
RUN curl -L "https://go.dev/dl/go1.23.4.linux-amd64.tar.gz" -o go.tar.gz && \
    tar -C /usr/local -xzf go.tar.gz && \
    rm go.tar.gz
ENV PATH="/usr/local/go/bin:${PATH}"

# Install Cloudflare Tunnel (cloudflared) - removed for managed hosting
# Not needed when using Coolify + host-level tunnels
# RUN ARCH=$(dpkg --print-architecture) && \
#     curl -L --output cloudflared.deb "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}.deb" && \
#     dpkg -i cloudflared.deb && \
#     rm cloudflared.deb

# Install GitHub CLI (gh)
RUN mkdir -p -m 755 /etc/apt/keyrings && \
    wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null && \
    chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && \
    apt-get install -y gh && \
    rm -rf /var/lib/apt/lists/*

# Install uv (Python tool manager)
ENV UV_INSTALL_DIR="/usr/local/bin"
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Bun
ENV BUN_INSTALL_NODE=0
ENV BUN_INSTALL="/root/.bun"
RUN apt-get update && apt-get install -y unzip && rm -rf /var/lib/apt/lists/* && \
    curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:/root/.bun/install/global/bin:${PATH}"

# Install Vercel, Marp, QMD
RUN bun install -g vercel @marp-team/marp-cli https://github.com/tobi/qmd && hash -r

# Configure QMD Persistence
ENV XDG_CACHE_HOME="/root/.openclaw/cache"

# Python tools
RUN pip3 install ipython csvkit openpyxl python-docx pypdf botasaurus browser-use playwright --break-system-packages && \
    playwright install-deps



# Debian aliases
RUN ln -s /usr/bin/fdfind /usr/bin/fd || true && \
    ln -s /usr/bin/batcat /usr/bin/bat || true

WORKDIR /app

# ✅ FINAL PATH (important)
ENV PATH="/usr/local/go/bin:/usr/local/bin:/usr/bin:/bin:/root/.local/bin:/root/.npm-global/bin:/root/.bun/bin:/root/.bun/install/global/bin:/root/.claude/bin:/root/.kimi/bin:/root/go/bin"

# OpenClaw install - Build from Marcoby source with custom branding
ARG OPENCLAW_REPO=https://github.com/marcoby/openclaw.git
ARG OPENCLAW_BRANCH=main
ENV OPENCLAW_NO_ONBOARD=1 \
    NPM_CONFIG_UNSAFE_PERM=true \
    OPENCLAW_PREFER_PNPM=1

# Enable corepack for pnpm
RUN corepack enable

# Copy Marcoby brand assets (logos) for UI build
COPY assets/ /tmp/marcoby-assets/

# Clone and build from source
RUN echo "🦞 Building OpenClaw from source (${OPENCLAW_REPO}@${OPENCLAW_BRANCH})..." && \
    git clone --depth 1 --branch ${OPENCLAW_BRANCH} ${OPENCLAW_REPO} /tmp/openclaw && \
    cd /tmp/openclaw && \
    echo "🎨 Copying Marcoby brand assets..." && \
    cp -v /tmp/marcoby-assets/*.png ui/public/ 2>/dev/null || true && \
    pnpm install --frozen-lockfile && \
    OPENCLAW_A2UI_SKIP_MISSING=1 pnpm build && \
    pnpm ui:build && \
    npm link && \
    if command -v openclaw >/dev/null 2>&1; then \
        echo "✅ openclaw binary found (built from source with Marcoby branding)"; \
    else \
        echo "❌ OpenClaw build failed (binary 'openclaw' not found)"; \
        exit 1; \
    fi

RUN bun pm -g untrusted
# AI Tool Suite
RUN bun install -g @openai/codex @google/gemini-cli opencode-ai @steipete/summarize @hyperbrowser/agent && \
    curl -fsSL https://claude.ai/install.sh | bash && \
    curl -L https://code.kimi.com/install.sh | bash




# Copy everything (obeying .dockerignore)
COPY . .

# Specialized symlinks and permissions
RUN ln -sf /root/.claude/bin/claude /usr/local/bin/claude || true && \
    ln -sf /root/.kimi/bin/kimi /usr/local/bin/kimi || true && \
    ln -sf /app/scripts/openclaw-approve.sh /usr/local/bin/openclaw-approve && \
    ln -sf /app/scripts/openclaw-approve.sh /usr/local/bin/openclaw-approve && \
    chmod +x /app/scripts/*.sh /usr/local/bin/openclaw-approve


EXPOSE 18789
CMD ["bash", "/app/scripts/bootstrap.sh"]