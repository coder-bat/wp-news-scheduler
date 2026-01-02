# Happy News Scheduler

Automatically publishes 3 uplifting news articles daily to your WordPress site from curated RSS feeds.

## Features

- 🌟 **Curated Feeds**: 15 pre-configured positive news sources
- 📅 **3x Daily Posts**: Morning (09:00), Afternoon (13:00), Evening (18:00)
- 🎯 **Uplift Scoring**: Filters for genuinely positive content
- 🖼️ **Auto Images**: Wikimedia Commons → Unsplash → Pexels fallback
- 🔄 **Deduplication**: Never posts the same article twice
- 📊 **Admin Dashboard**: Monitor posts, audit logs, and feeds
- 🐳 **Docker + systemd**: Production-ready deployment

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- WordPress site with REST API enabled
- WordPress Application Password

### Local Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run publisher (test mode)
npm run publish -- morning

# Start admin UI
npm run admin
```

### WordPress Setup

1. Go to **Users → Profile** in WordPress admin
2. Scroll to **Application Passwords**
3. Create password named `happy-news-scheduler`
4. Copy the password (spaces don't matter)

### Configure Secrets

Create secret files:

```bash
mkdir -p secrets
echo 'your-wp-username' > secrets/wp-username
echo 'xxxx xxxx xxxx xxxx' > secrets/wp-app-password
chmod 600 secrets/*
```

Optional (for image providers):
```bash
echo 'your-unsplash-access-key' > secrets/unsplash-access-key
echo 'your-pexels-api-key' > secrets/pexels-api-key
```

### Configuration

Edit `config/config.yaml`:

```yaml
wordpress:
  siteUrl: https://your-site.com
  categorySlug: happy-news
  categoryName: Happy News

schedule:
  timezone: America/New_York  # Your timezone
  slots:
    morning: "09:00"
    afternoon: "13:00"
    evening: "18:00"
```

## Deployment

### Server Setup (Pop!_OS / Ubuntu)

```bash
# Clone to server
git clone <repo> /opt/wp-news-scheduler
cd /opt/wp-news-scheduler

# Run setup script
sudo bash deploy/setup.sh

# Configure secrets
sudo -u happynews nano /opt/wp-news-scheduler/secrets/wp-username
sudo -u happynews nano /opt/wp-news-scheduler/secrets/wp-app-password

# Build Docker image
cd /opt/wp-news-scheduler
sudo docker compose build

# Test manually
sudo docker compose run --rm publisher node dist/publisher/index.js morning

# Start admin UI
sudo docker compose up -d admin
```

### Check Timers

```bash
# List active timers
systemctl list-timers | grep happy-news

# View logs
journalctl -u happy-news@morning.service -f
```

### Access Admin UI

Via SSH tunnel (recommended for security):

```bash
ssh -L 8080:localhost:8080 your-server
# Then open http://localhost:8080
```

## Architecture

```
src/
├── config/       # YAML config & secrets loading
├── feeds/        # RSS/Atom feed fetching & parsing
├── filter/       # Uplift scoring & selection
├── summary/      # Post content generation
├── images/       # Image search (Wikimedia, Unsplash, Pexels)
├── wp/           # WordPress REST API client
├── state/        # Dedup & audit logging
├── utils/        # Scheduling utilities
├── publisher/    # Main entrypoint
└── admin/        # Express admin UI
```

## Feed Sources

- **Tier 1 (Priority 10)**: Good News Network, Positive.News, Reasons to be Cheerful
- **Tier 2 (Priority 8)**: Solutions Journalism, Future Crunch, YES! Magazine
- **Tier 3 (Priority 6)**: Optimist Daily, Upworthy, Greater Good
- **Tier 4 (Priority 4)**: Happy Broadcast, Sunny Skyz
- **Bonus (Mixed tone)**: NPR, BBC, Guardian (positive keyword filters)

## License

MIT
