#!/usr/bin/env bash
# =============================================================================
# Smart Home IoT – Raspberry Pi First-Time Setup
#
# Run this script once after cloning the repository on the Raspberry Pi.
# It installs all system-level dependencies and Docker without triggering
# the known "raspbian trixie 404" APT error.
#
# Usage (from the repo root on the RPi):
#   chmod +x scripts/rpi-setup.sh
#   ./scripts/rpi-setup.sh
#
# What it does:
#   1. Removes any APT source that references download.docker.com/linux/raspbian
#      (these are left behind by failed previous install attempts).
#   2. Runs  sudo apt update && sudo apt upgrade -y
#   3. Installs Python, Node, npm, git, and libpq-dev.
#   4. Installs Docker Engine + Docker Compose directly from the official
#      *Debian* repository (download.docker.com/linux/debian trixie).
#      The get.docker.com convenience script is NOT used — it incorrectly
#      detects Raspberry Pi OS as 'raspbian' and writes a source entry that
#      does not exist for trixie, causing Docker installation to fail.
#   5. Adds the current user to the docker group.
#
# After the script finishes, log out and back in (or reboot) for the docker
# group membership to take effect.
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ---------------------------------------------------------------------------
# Step 1 – Remove any broken Docker APT sources
# ---------------------------------------------------------------------------
# Two kinds of broken source are handled:
#
# a) Sources that reference download.docker.com/linux/raspbian
#    Docker does not publish packages for the 'raspbian' distribution on
#    trixie (Debian 13).  A stale or incorrectly generated source entry will
#    make every subsequent  apt update  fail with a 404.
#
# b) Sources that reference a signed-by keyring path that does not exist.
#    A previous partial install can leave a docker.list pointing to
#    /etc/apt/keyrings/docker.asc that was never written (or was deleted).
#    apt update will error until the broken source is removed.

purge_raspbian_docker_sources() {
    info "Scanning for broken Docker APT sources (raspbian refs or missing keyring)..."

    local found=0

    # --- /etc/apt/sources.list.d/ -------------------------------------------
    while IFS= read -r -d '' file; do
        if grep -qi "download\.docker\.com.*raspbian" "$file" 2>/dev/null; then
            warn "Removing broken Docker source file: $file"
            sudo rm -f "$file"
            found=1
        fi
    done < <(find /etc/apt/sources.list.d/ -type f \( -name "*.list" -o -name "*.sources" \) -print0 2>/dev/null)

    # --- /etc/apt/sources.list (inline entries) -----------------------------
    if grep -qi "download\.docker\.com.*raspbian" /etc/apt/sources.list 2>/dev/null; then
        warn "Removing inline Docker 'raspbian' entry from /etc/apt/sources.list"
        sudo sed -i '/download\.docker\.com.*raspbian/id' /etc/apt/sources.list
        found=1
    fi

    # --- Docker source files whose signed-by keyring is missing -------------
    # A previous partial install can leave a docker.list that references a
    # keyring path that was never written (or was deleted).  apt update will
    # error on every run until the broken source is removed.  We detect this
    # by checking whether the path named in the signed-by= option exists.
    while IFS= read -r -d '' file; do
        if grep -qi "download\.docker\.com" "$file" 2>/dev/null; then
            local keyring
            keyring=$(grep -oE 'signed-by=[^ ]+' "$file" 2>/dev/null \
                        | cut -d= -f2 | tr -d ']' | head -1)
            if [[ -n "$keyring" && ! -f "$keyring" ]]; then
                warn "Removing stale Docker source '$file' — keyring '$keyring' not found"
                sudo rm -f "$file"
                found=1
            fi
        fi
    done < <(find /etc/apt/sources.list.d/ -type f -name "*.list" -print0 2>/dev/null)

    # --- Orphaned keyring files ---------------------------------------------
    for keyring in /etc/apt/keyrings/docker.gpg /etc/apt/keyrings/docker.asc; do
        if [[ -f "$keyring" ]]; then
            warn "Removing orphaned Docker keyring: $keyring"
            sudo rm -f "$keyring"
            found=1
        fi
    done

    if [[ $found -eq 0 ]]; then
        success "No broken Docker APT sources found."
    else
        success "Stale Docker source entries removed."
    fi
}

# ---------------------------------------------------------------------------
# Step 2 – Install Docker Engine using the official Debian repository
# ---------------------------------------------------------------------------
# On Raspberry Pi OS trixie the get.docker.com convenience script incorrectly
# detects the distribution as 'raspbian' and writes a source entry for
#   https://download.docker.com/linux/raspbian trixie
# which does not exist, causing the script to abort before Docker is installed.
#
# We bypass the convenience script entirely and add the Debian repository
# manually, using 'debian' as the distribution name (Raspberry Pi OS trixie
# is binary-compatible with Debian 13 / trixie).

install_docker() {
    if command -v docker &>/dev/null; then
        local DOCKER_VERSION
        DOCKER_VERSION=$(docker --version 2>/dev/null | awk '{print $3}' | tr -d ',')
        warn "Docker is already installed ($DOCKER_VERSION) — skipping installation."
        return
    fi

    info "Installing Docker Engine via the official Debian repository..."

    # 1. Prerequisites
    sudo apt install -y ca-certificates curl

    # 2. Add Docker's official GPG key
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/debian/gpg \
        -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc

    # 3. Add the Docker APT repository (debian, not raspbian)
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/debian trixie stable" \
        | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # 4. Update package index and install
    sudo apt update
    sudo apt install -y \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin

    success "Docker Engine and Docker Compose installed."
}

bootstrap_app_dependencies() {
    info "Bootstrapping backend/frontend dependencies for demo readiness..."

    if [[ -d "$REPO_ROOT/backend" ]]; then
        python3 -m venv "$REPO_ROOT/backend/venv"
        source "$REPO_ROOT/backend/venv/bin/activate"
        pip install --upgrade pip
        pip install -r "$REPO_ROOT/backend/requirements.txt"
        deactivate
        success "Backend virtualenv and dependencies are ready."
    else
        warn "Backend directory not found at $REPO_ROOT/backend; skipping backend bootstrap."
    fi

    if [[ -d "$REPO_ROOT/frontend" ]]; then
        (cd "$REPO_ROOT/frontend" && npm install)
        success "Frontend dependencies installed."
    else
        warn "Frontend directory not found at $REPO_ROOT/frontend; skipping frontend bootstrap."
    fi
}

# ===========================================================================
# MAIN
# ===========================================================================

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  Smart Home IoT – Raspberry Pi First-Time Setup${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# 1. Remove any stale Docker raspbian sources left from previous attempts
purge_raspbian_docker_sources
echo ""

# 2. System update
info "Updating and upgrading system packages..."
sudo apt update
sudo apt upgrade -y
success "System packages updated."
echo ""

# 3. Install system dependencies
info "Installing Python, Node.js, git, and build dependencies..."
sudo apt install -y python3 python3-pip python3-venv nodejs npm git libpq-dev
success "System dependencies installed."
echo ""

# 4. Install Docker Engine via the Debian repository
install_docker
echo ""

# 5. Add current user to the docker group
if id -nG "$USER" | grep -qw docker; then
    success "User '$USER' is already in the docker group."
else
    info "Adding '$USER' to the docker group..."
    sudo usermod -aG docker "$USER"
    success "User '$USER' added to the docker group."
    echo ""
    warn "ACTION REQUIRED: Log out and back in (or run 'newgrp docker') for"
    warn "the group change to take effect before running  docker compose."
fi

echo ""
# 6. Install backend/frontend app dependencies so post-pull setup is one step.
bootstrap_app_dependencies

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  Setup complete!  Next steps:${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "  1. Log out and back in (or reboot) for the docker group to take effect."
echo ""
echo "  2. Continue with the deployment guide:"
echo "     docs/RPI_DEPLOYMENT.md  →  steps 3.3 onward"
echo ""
echo "     cd ~/smartHome/backend"
echo "     python3 -m venv venv && source venv/bin/activate"
echo "     pip install -r requirements.txt"
echo ""
echo "     cd ~/smartHome/infrastructure"
echo "     docker compose up -d timescaledb mqtt redis"
echo ""
