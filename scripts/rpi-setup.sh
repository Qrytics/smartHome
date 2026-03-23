#!/usr/bin/env bash
# =============================================================================
# Smart Home IoT – Raspberry Pi First-Time Setup
#
# Run this script once after cloning the repository on the Raspberry Pi.
# It installs all system-level dependencies and Docker in a way that avoids
# the known "raspbian trixie 404" APT error.
#
# Usage (from the repo root on the RPi):
#   chmod +x scripts/rpi-setup.sh
#   ./scripts/rpi-setup.sh
#
# What it does:
#   1. Removes any APT source that references download.docker.com/linux/raspbian
#      (Docker does not publish packages for the 'raspbian' flavour of trixie).
#   2. Runs  sudo apt update && sudo apt upgrade -y
#   3. Installs Python, Node, npm, git, and libpq-dev.
#   4. Installs Docker Engine + Docker Compose via the official convenience
#      script (https://get.docker.com).
#   5. Post-install fix: if get.docker.com added a 'raspbian' source entry,
#      replaces it with 'debian' so future  apt update  calls succeed.
#   6. Adds the current user to the docker group.
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

# ---------------------------------------------------------------------------
# Step 1 – Remove any Docker APT source that references 'raspbian'
# ---------------------------------------------------------------------------
# Docker does not publish packages for the 'raspbian' distribution on trixie
# (Debian 13).  A stale or incorrectly generated source entry will make every
# subsequent  apt update  fail with a 404.  We remove such entries from every
# file that apt reads before touching the package database.

purge_raspbian_docker_sources() {
    info "Scanning for Docker APT sources that reference 'raspbian'..."

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

    # --- Orphaned keyring files ---------------------------------------------
    for keyring in /etc/apt/keyrings/docker.gpg /etc/apt/keyrings/docker.asc; do
        if [[ -f "$keyring" ]]; then
            warn "Removing orphaned Docker keyring: $keyring"
            sudo rm -f "$keyring"
            found=1
        fi
    done

    if [[ $found -eq 0 ]]; then
        success "No broken Docker 'raspbian' sources found."
    else
        success "Stale Docker source entries removed."
    fi
}

# ---------------------------------------------------------------------------
# Step 2 – Post-install fix: replace 'raspbian' with 'debian' in any Docker
#           source that get.docker.com may have written
# ---------------------------------------------------------------------------
fix_docker_sources_post_install() {
    info "Checking Docker APT sources added by the convenience script..."

    local fixed=0

    while IFS= read -r -d '' file; do
        if grep -qi "download\.docker\.com.*raspbian" "$file" 2>/dev/null; then
            warn "Fixing Docker source (raspbian → debian): $file"
            sudo sed -i 's|download\.docker\.com/linux/raspbian|download.docker.com/linux/debian|ig' "$file"
            fixed=1
        fi
    done < <(find /etc/apt/sources.list.d/ -type f \( -name "*.list" -o -name "*.sources" \) -print0 2>/dev/null)

    if grep -qi "download\.docker\.com.*raspbian" /etc/apt/sources.list 2>/dev/null; then
        warn "Fixing inline Docker source in /etc/apt/sources.list (raspbian → debian)"
        sudo sed -i 's|download\.docker\.com/linux/raspbian|download.docker.com/linux/debian|ig' /etc/apt/sources.list
        fixed=1
    fi

    if [[ $fixed -eq 1 ]]; then
        success "Docker source fixed.  Running apt update to verify..."
        sudo apt update -qq
        success "apt update succeeded with the corrected Docker source."
    else
        success "Docker APT sources look correct — no fix needed."
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

# 1. Remove stale Docker raspbian sources
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

# 4. Install Docker via the official convenience script
if command -v docker &>/dev/null; then
    DOCKER_VERSION=$(docker --version 2>/dev/null | awk '{print $3}' | tr -d ',')
    warn "Docker is already installed ($DOCKER_VERSION) — skipping installation."
else
    info "Installing Docker Engine + Docker Compose via https://get.docker.com ..."
    curl -sSL https://get.docker.com | sh
    success "Docker installed."
fi
echo ""

# 5. Post-install fix: if get.docker.com wrote a 'raspbian' source, fix it
fix_docker_sources_post_install
echo ""

# 6. Add current user to the docker group
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
