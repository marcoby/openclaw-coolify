#!/usr/bin/env bash
set -e

# ------------------------------------------------------------------
# 🛡️ RESILIENCE: Wait for Docker Proxy
# ------------------------------------------------------------------
WAIT_COUNT=0
MAX_WAIT=60
echo "⏳ Waiting for docker-proxy to be resolvable and reachable..."
until nc -z docker-proxy 2375 >/dev/null 2>&1 || [ $WAIT_COUNT -eq $MAX_WAIT ]; do
  sleep 2
  WAIT_COUNT=$((WAIT_COUNT + 1))
  echo "   [attempt $WAIT_COUNT/$MAX_WAIT] Waiting for tcp://docker-proxy:2375..."
done

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
  echo "⚠️  WARNING: docker-proxy not reached. Sandbox features may fail."
else
  echo "✅ docker-proxy is UP."
fi

# ------------------------------------------------------------------
# CONFIGURATION
# ------------------------------------------------------------------
OPENCLAW_STATE="${OPENCLAW_STATE_DIR:-/data/.openclaw}"
CONFIG_FILE="$OPENCLAW_STATE/openclaw.json"
WORKSPACE_DIR="${OPENCLAW_WORKSPACE:-/data/openclaw-workspace}"

mkdir -p "$OPENCLAW_STATE" "$WORKSPACE_DIR"
chmod 700 "$OPENCLAW_STATE"

mkdir -p "$OPENCLAW_STATE/credentials"
mkdir -p "$OPENCLAW_STATE/agents/main/sessions"
chmod 700 "$OPENCLAW_STATE/credentials"

# Map data dirs to home for tool compatibility
for dir in .agents .ssh .config .local .cache .npm .bun .claude .kimi; do
    if [ ! -L "/root/$dir" ] && [ ! -e "/root/$dir" ]; then
        ln -sf "/data/$dir" "/root/$dir"
    fi
done

# ------------------------------------------------------------------
# 🧠 MARCOBY LOGIC: Seed Agent Workspaces
# ------------------------------------------------------------------
seed_agent() {
  local id="$1"
  local name="$2"
  local dir="/data/openclaw-$id"

  if [ "$id" = "main" ]; then
    dir="${OPENCLAW_WORKSPACE:-/data/openclaw-workspace}"
  fi

  mkdir -p "$dir"

  # ✅ MAIN agent ALWAYS gets ORIGINAL repo SOUL.md and BOOTSTRAP.md
  # We force overwrite for the main agent to ensure updates propogate
  if [ "$id" = "main" ]; then
    if [ -f "./SOUL.md" ]; then
      echo "✨ Syncing SOUL.md to $dir (Marcoby Force-Sync)"
      cp -f "./SOUL.md" "$dir/SOUL.md"
    fi
    if [ -f "./BOOTSTRAP.md" ]; then
      echo "🚀 Syncing BOOTSTRAP.md to $dir"
      cp -f "./BOOTSTRAP.md" "$dir/BOOTSTRAP.md"
    fi
    return 0
  fi

  # 🔒 For other agents: NEVER overwrite existing SOUL.md
  if [ -f "$dir/SOUL.md" ]; then
    echo "🧠 SOUL.md already exists for $id — skipping"
    return 0
  fi

  # Fallback for other agents
  cat >"$dir/SOUL.md" <<EOF
# SOUL.md - $name
You are OpenClaw, a helpful and premium AI assistant.
EOF
}

seed_agent "main" "OpenClaw"

# ----------------------------
# Generate Config with Prime Directive
# ----------------------------
if [ ! -f "$CONFIG_FILE" ]; then
  echo "🏥 Generating openclaw.json with Prime Directive..."
  TOKEN=$(openssl rand -hex 24 2>/dev/null || node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
  cat >"$CONFIG_FILE" <<EOF
{
"commands": {
    "native": true,
    "nativeSkills": true,
    "text": true,
    "bash": true,
    "config": true,
    "debug": true,
    "restart": true,
    "useAccessGroups": true
  },
  "plugins": {
    "enabled": true,
    "entries": {
      "whatsapp": {
        "enabled": true
      },
      "telegram": {
        "enabled": true
      },
      "google-antigravity-auth": {
        "enabled": true
      }
    }
  },
  "skills": {
    "allowBundled": [
      "*"
    ],
    "install": {
      "nodeManager": "npm"
    }
  },
  "gateway": {
  "port": $OPENCLAW_GATEWAY_PORT,
  "mode": "local",
    "bind": "lan",
    "controlUi": {
      "enabled": true,
      "allowInsecureAuth": false
    },
    "trustedProxies": [
      "*"
    ],
    "tailscale": {
      "mode": "off",
      "resetOnExit": false
    },
    "auth": { "mode": "token", "token": "$TOKEN" }
  },
  "agents": {
    "defaults": {
      "workspace": "$WORKSPACE_DIR",
      "envelopeTimestamp": "on",
      "envelopeElapsed": "on",
      "cliBackends": {},
      "heartbeat": {
        "every": "1h"
      },
      "maxConcurrent": 4,
      "sandbox": {
        "mode": "non-main",
        "scope": "session",
        "browser": {
          "enabled": true
        }
      }
    },
    "list": [
      { "id": "main","default": true, "name": "default",  "workspace": "${OPENCLAW_WORKSPACE:-/data/openclaw-workspace}"}
    ]
  }
}
EOF
fi

# ------------------------------------------------------------------
# 🔄 ENFORCEMENT: Environment Overrides openclaw.json
# ------------------------------------------------------------------
if [ -f "$CONFIG_FILE" ]; then
    echo "🔄 Enforcing Nexus/Marcoby configuration in openclaw.json..."
    
    # 1. Fallback Construction
    FALLBACKS_ARRAY=()
    [ -n "$OPENAI_API_KEY" ] && FALLBACKS_ARRAY+=("\"openai/gpt-4o-mini\"" "\"openai/gpt-4o\"")
    [ -n "$GEMINI_API_KEY" ] && FALLBACKS_ARRAY+=("\"google/gemini-2.0-flash-exp\"" "\"google/gemini-1.5-pro\"")
    [ -n "$ANTHROPIC_API_KEY" ] && FALLBACKS_ARRAY+=("\"anthropic/claude-3-5-sonnet-20241022\"")
    
    # Join array with commas
    IFS=, ; FALLBACKS_STRING="${FALLBACKS_ARRAY[*]}" ; unset IFS
    GENERATED_FALLBACKS="[$FALLBACKS_STRING]"
    
    if [ "$GENERATED_FALLBACKS" == "[]" ]; then
       GENERATED_FALLBACKS='["google/gemini-2.0-flash-exp", "anthropic/claude-3-5-sonnet-20241022", "openai/gpt-4o-mini"]'
    fi
    
    FINAL_FALLBACKS="${OPENCLAW_AGENTS_DEFAULTS_MODEL_FALLBACKS:-$GENERATED_FALLBACKS}"
    
    # 2. Apply Overrides
    jq --arg model "${OPENCLAW_AGENTS_DEFAULTS_MODEL_PRIMARY:-google/gemini-2.0-flash-exp}" \
       --arg fallbacks "$FINAL_FALLBACKS" \
       --arg token "${OPENCLAW_GATEWAY_TOKEN:-sk-openclaw-local}" \
       --arg port "${OPENCLAW_GATEWAY_PORT:-18790}" \
       '.agents.defaults.model = { "primary": $model, "fallbacks": ($fallbacks | fromjson? // [$fallbacks]) } | .gateway.auth.token = $token | .gateway.port = ($port|tonumber)' \
       "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
fi

# ----------------------------
# Export state
# ----------------------------
export OPENCLAW_STATE_DIR="$OPENCLAW_STATE"

# ----------------------------
# Sandbox setup
# ----------------------------
[ -f scripts/sandbox-setup.sh ] && bash scripts/sandbox-setup.sh
[ -f scripts/sandbox-browser-setup.sh ] && bash scripts/sandbox-browser-setup.sh

# ----------------------------
# Recovery & Monitoring
# ----------------------------
if [ -f scripts/recover_sandbox.sh ]; then
  echo "🛡️  Deploying Recovery Protocols..."
  cp scripts/recover_sandbox.sh "$WORKSPACE_DIR/"
  cp scripts/monitor_sandbox.sh "$WORKSPACE_DIR/"
  chmod +x "$WORKSPACE_DIR/recover_sandbox.sh" "$WORKSPACE_DIR/monitor_sandbox.sh"
  
  # Run initial recovery
  bash "$WORKSPACE_DIR/recover_sandbox.sh"
  
  # Start background monitor
  nohup bash "$WORKSPACE_DIR/monitor_sandbox.sh" >/dev/null 2>&1 &
fi

# ----------------------------
# Run OpenClaw
# ----------------------------
ulimit -n 65535
# ----------------------------
# Banner & Access Info
# ----------------------------
# Try to extract existing token if not already set (e.g. from previous run)
if [ -f "$CONFIG_FILE" ]; then
    SAVED_TOKEN=$(jq -r '.gateway.auth.token // empty' "$CONFIG_FILE" 2>/dev/null || grep -o '"token": "[^"]*"' "$CONFIG_FILE" | tail -1 | cut -d'"' -f4)
    if [ -n "$SAVED_TOKEN" ]; then
        TOKEN="$SAVED_TOKEN"
    fi
fi

echo ""
echo "=================================================================="
echo "🦞 OpenClaw is ready!"
echo "=================================================================="
echo ""
echo "🔑 Access Token: $TOKEN"
echo ""
echo "🌍 Service URL (Local): http://localhost:${OPENCLAW_GATEWAY_PORT:-18790}?token=$TOKEN"
if [ -n "$SERVICE_FQDN_OPENCLAW" ]; then
    echo "☁️  Service URL (Public): https://${SERVICE_FQDN_OPENCLAW}?token=$TOKEN"
    echo "    (Wait for cloud tunnel to propagate if just started)"
fi
echo ""
echo "👉 Onboarding:"
echo "   1. Access the UI using the link above."
echo "   2. To approve this machine, run inside the container:"
echo "      openclaw-approve"
echo "   3. To start the onboarding wizard:"
echo "      openclaw onboard"
echo ""
echo "=================================================================="
echo "🔧 Current ulimit is: $(ulimit -n)"
exec openclaw gateway run