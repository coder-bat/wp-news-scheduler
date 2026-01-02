#!/usr/bin/env bash
set -euo pipefail

# Happy News Scheduler - Server Setup Script
# Run as root on Pop!_OS / Ubuntu server

INSTALL_DIR="/opt/wp-news-scheduler"
SERVICE_USER="happynews"

echo "═══════════════════════════════════════════════════════════"
echo "  Happy News Scheduler - Server Setup"
echo "═══════════════════════════════════════════════════════════"

# Check root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)"
   exit 1
fi

# Create service user
echo ""
echo "📦 Creating service user..."
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd -r -s /bin/false -d "$INSTALL_DIR" "$SERVICE_USER"
    echo "   Created user: $SERVICE_USER"
else
    echo "   User already exists: $SERVICE_USER"
fi

# Add user to docker group
usermod -aG docker "$SERVICE_USER"

# Create install directory
echo ""
echo "📁 Setting up directories..."
mkdir -p "$INSTALL_DIR"/{config,secrets,data}

# Copy files (assumes you're running from project root)
echo ""
echo "📋 Copying files..."
if [[ -f "docker-compose.yml" ]]; then
    cp -r . "$INSTALL_DIR/"
    echo "   Copied project files"
else
    echo "   ⚠ Run this script from the project directory"
    echo "   Or copy files manually to $INSTALL_DIR"
fi

# Set permissions
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
chmod 700 "$INSTALL_DIR/secrets"

# Install systemd units
echo ""
echo "⚙️  Installing systemd units..."
cp "$INSTALL_DIR/deploy/systemd/happy-news@.service" /etc/systemd/system/
cp "$INSTALL_DIR/deploy/systemd/happy-news@morning.timer" /etc/systemd/system/
cp "$INSTALL_DIR/deploy/systemd/happy-news@afternoon.timer" /etc/systemd/system/
cp "$INSTALL_DIR/deploy/systemd/happy-news@evening.timer" /etc/systemd/system/

systemctl daemon-reload

# Enable timers
echo ""
echo "⏰ Enabling timers..."
systemctl enable happy-news@morning.timer
systemctl enable happy-news@afternoon.timer
systemctl enable happy-news@evening.timer

# Start timers
systemctl start happy-news@morning.timer
systemctl start happy-news@afternoon.timer
systemctl start happy-news@evening.timer

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Setup Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure secrets:"
echo "   echo 'your-wp-username' > $INSTALL_DIR/secrets/wp-username"
echo "   echo 'your-app-password' > $INSTALL_DIR/secrets/wp-app-password"
echo "   chmod 600 $INSTALL_DIR/secrets/*"
echo ""
echo "2. Edit configuration:"
echo "   nano $INSTALL_DIR/config/config.yaml"
echo ""
echo "3. Build Docker image:"
echo "   cd $INSTALL_DIR && docker compose build"
echo ""
echo "4. Test manually:"
echo "   docker compose run --rm publisher node dist/publisher/index.js morning"
echo ""
echo "5. Start admin UI:"
echo "   docker compose up -d admin"
echo ""
echo "6. Check timer status:"
echo "   systemctl list-timers | grep happy-news"
echo ""
echo "Access admin UI via SSH tunnel:"
echo "   ssh -L 8080:localhost:8080 your-server"
echo "   Then open http://localhost:8080"
echo ""
