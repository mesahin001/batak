# Batak Tournament - VPS Deployment Guide

Complete guide for deploying Batak Tournament to a Hetzner VPS with domain `batakci.xyz`.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Initial VPS Setup](#phase-1-initial-vps-setup)
3. [Phase 2: Install Docker](#phase-2-install-docker)
4. [Phase 3: Deploy Application](#phase-3-deploy-application)
5. [Phase 4: DNS Configuration](#phase-4-dns-configuration)
6. [Phase 5: SSL Certificate](#phase-5-ssl-certificate)
7. [Phase 6: Security Hardening](#phase-6-security-hardening)
8. [Phase 7: Monitoring & Maintenance](#phase-7-monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Hetzner VPS (CX22 or similar recommended)
- Domain: `batakci.xyz`
- Subdomain: `s.batakci.xyz`
- GitHub repository with Batak Tournament code
- Basic knowledge of SSH and command line

### Local Machine Setup

```bash
# Install required tools
brew install git  # macOS
# or
sudo apt install git  # Linux

# Setup SSH key (if not already)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy SSH public key for VPS setup
cat ~/.ssh/id_ed25519.pub
```

---

## Phase 1: Initial VPS Setup

### 1.1 Connect to VPS

```bash
# SSH into Hetzner VPS (using root initially)
ssh root@<your-vps-ip>

# Or with SSH key
ssh -i ~/.ssh/your-key root@<your-vps-ip>
```

### 1.2 Run Setup Script

```bash
# Download and run the setup script
curl -o /tmp/vps-setup.sh https://raw.githubusercontent.com/<your-username>/batak/main/scripts/vps-setup.sh
chmod +x /tmp/vps-setup.sh
sudo /tmp/vps-setup.sh
```

**Or manually:**

```bash
# Update system
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git vim ufw fail2ban

# Set timezone
timedatectl set-timezone Europe/Istanbul
```

### 1.3 Create Non-Root User

```bash
# Create user
adduser batak
usermod -aG sudo batak

# Setup SSH key for batak user
mkdir -p /home/batak/.ssh
vim /home/batak/.ssh/authorized_keys
# Paste your SSH public key
chown -R batak:batak /home/batak/.ssh
chmod 700 /home/batak/.ssh
chmod 600 /home/batak/.ssh/authorized_keys
```

### 1.4 Configure Firewall

```bash
# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (first!)
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
ufw status
```

### 1.5 Secure SSH

```bash
vim /etc/ssh/sshd_config

# Change these settings:
PermitRootLogin no        # Disable root login
PasswordAuthentication no  # Key-based auth only
PubkeyAuthentication yes
AllowUsers batak          # Only allow batak user

# Restart SSH
systemctl restart sshd
```

---

## Phase 2: Install Docker

### 2.1 Install Docker

```bash
# Install Docker using convenience script
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Add user to docker group
usermod -aG docker batak

# Enable Docker on boot
systemctl enable docker
systemctl start docker

# Verify installation
docker --version
docker compose version
```

---

## Phase 3: Deploy Application

### 3.1 Clone Repository

```bash
# Switch to batak user
su - batak

# Create app directory
mkdir -p ~/app
cd ~/app

# Clone repository
git clone https://github.com/<your-username>/batak.git .
# OR if private:
git clone git@github.com:<your-username>/batak.git .
```

### 3.2 Create Environment File

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Create .env file
cp .env.production.example .env
vim .env
```

**Edit `.env` with your values:**

```bash
NODE_ENV=production
PORT=3001
HOST_PORT=80

# IMPORTANT: Use the generated JWT_SECRET
JWT_SECRET=<generated-secret-here>

# Solana Configuration
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=5ZdgoyBDknoZ8tDYMDXf8zCUQ7FxuaDbK4QffAgSfA9h

# Optional: Server wallet for minting
# SOLANA_PRIVATE_KEY=<base58-private-key>
# MERKLE_TREE=<merkle-tree-address>

# Default Game Settings
DEFAULT_BOT_DIFFICULTY=normal
DEFAULT_BOT_COUNT=3
```

### 3.3 Build & Start Containers

```bash
# Build images
docker compose build

# Start services (detached)
docker compose up -d

# Check logs
docker compose logs -f batak-server

# Check running containers
docker ps
```

### 3.4 Verify Application

```bash
# Check server health
curl http://localhost:3001/health

# Check nginx is serving
curl http://localhost/

# View logs
docker compose logs batak-server
docker compose logs nginx
```

---

## Phase 4: DNS Configuration

### 4.1 Cloudflare DNS Settings

1. Go to Cloudflare Dashboard → batakci.xyz → DNS
2. Add A Record:
   - **Type:** A
   - **Name:** s
   - **IPv4 address:** `<your-hetzner-vps-ip>`
   - **Proxy status:** DNS only (gray cloud) - *for SSL certificate*
   - **TTL:** Auto

### 4.2 Verify DNS Propagation

```bash
# From local machine
dig s.batakci.xyz
nslookup s.batakci.xyz

# Or use online tool:
# https://dnschecker.org/
```

---

## Phase 5: SSL Certificate

### 5.1 Get Let's Encrypt Certificate

```bash
# On VPS, stop nginx temporarily
docker compose stop nginx

# Get certificate
sudo certbot certonly --standalone -d s.batakci.xyz

# Certificates saved to:
# /etc/letsencrypt/live/s.batakci.xyz/fullchain.pem
# /etc/letsencrypt/live/s.batakci.xyz/privkey.pem
```

### 5.2 Restart with SSL

```bash
# Start nginx with SSL
docker compose start nginx

# Verify HTTPS
curl https://s.batakci.xyz
```

### 5.3 Setup Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Setup cron job
(crontab -l 2>/dev/null; echo "0 0 * * 0 certbot renew --quiet --post-hook 'cd /home/batak/app && docker compose restart nginx'") | crontab -
```

### 5.4 Enable Cloudflare Proxy (Optional)

After SSL is working:

1. Go to Cloudflare DNS
2. Change s.batakci.xyz from "DNS only" to "Proxied" (orange cloud)
3. Enable:
   - SSL/TLS → Full (strict)
   - Always Use HTTPS → ON
   - Brotli compression → ON

---

## Phase 6: Security Hardening

### 6.1 Fail2Ban

```bash
# Configure Fail2Ban
sudo vim /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log
```

```bash
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban
```

### 6.2 Docker Security

```bash
sudo vim /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true,
  "icc": false,
  "userland-proxy": false
}
```

```bash
sudo systemctl restart docker
```

---

## Phase 7: Monitoring & Maintenance

### 7.1 Health Check Script

The health check script is already included in `scripts/health-check.sh`.

```bash
# Setup cron job for health checks (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/batak/app/scripts/health-check.sh >> /var/log/batak-health.log 2>&1") | crontab -
```

### 7.2 Database Backup

```bash
# Setup daily backup at 3 AM
(crontab -l 2>/dev/null; echo "0 3 * * * /home/batak/app/scripts/backup.sh") | crontab -
```

### 7.3 Manual Deployment

```bash
# Deploy latest code
cd ~/app
./scripts/vps-deploy.sh

# Or deploy specific branch
./scripts/vps-deploy.sh develop
```

### 7.4 View Logs

```bash
# All logs
docker compose logs -f

# Specific service
docker compose logs -f batak-server
docker compose logs -f nginx

# Last 100 lines
docker compose logs --tail=100 batak-server
```

### 7.5 Container Management

```bash
# Check status
docker compose ps

# Restart services
docker compose restart

# Restart specific service
docker compose restart batak-server

# Stop all
docker compose down

# Start all
docker compose up -d
```

---

## Troubleshooting

### Server Not Responding

```bash
# Check container status
docker compose ps

# Restart if needed
docker compose restart batak-server

# Check logs
docker compose logs batak-server
```

### SSL Certificate Issues

```bash
# Renew certificate manually
sudo certbot renew --force-renewal

# Restart nginx
docker compose restart nginx
```

### Database Issues

```bash
# Check database file
docker exec -it batak-server ls -la /app/data

# Backup database
docker cp batak-server:/app/data/batak.db ~/backup.db

# Restore database
docker cp ~/backup.db batak-server:/app/data/batak.db
```

### Port Already in Use

```bash
# Check what's using the port
sudo lsof -i :80
sudo lsof -i :443

# Stop conflicting service
sudo systemctl stop nginx  # if system nginx is running
```

### High Memory Usage

```bash
# Check resource usage
docker stats

# Restart containers
docker compose restart

# If needed, upgrade VPS plan
```

---

## GitHub Actions Auto-Deploy

### Setup GitHub Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Add the following secrets:

   - `HETZNER_HOST`: Your VPS IP address
   - `HETZNER_USER`: `batak`
   - `SSH_PRIVATE_KEY`: Your private SSH key content

   **To get SSH private key:**
   ```bash
   cat ~/.ssh/id_ed25519
   ```

### Trigger Deployment

Deployments run automatically on push to `main` branch.

To manually trigger:
1. Go to Actions tab in GitHub
2. Select "Deploy to Hetzner VPS"
3. Click "Run workflow"

---

## Cost Summary

| Item | Cost |
|------|------|
| Hetzner VPS (CX22) | ~€4-6/mo |
| Domain (batakci.xyz) | ~€10-15/year |
| SSL/TLS | Free (Let's Encrypt) |
| Cloudflare Free Tier | Free |
| **Total** | **~€5-8/mo** |

---

## Capacity Planning

### Current Setup (Level 1 MVP)
- **Capacity:** ~500 concurrent players
- **Database:** SQLite (single file)
- **Session Storage:** In-memory
- **Suitable for:** Beta testing, small tournaments

### Future Scaling (Level 2+)
When you need to scale:

1. **Add PostgreSQL** - Replace SQLite for better concurrency
2. **Add Redis** - For Socket.IO pub/sub and session persistence
3. **Add Second VPS** - With load balancer
4. **Setup Monitoring** - DataDog or CloudWatch
5. **CDN** - Cloudflare for static assets

---

## Security Checklist

- [ ] Root SSH login disabled
- [ ] Password authentication disabled
- [ ] Firewall (UFW) enabled
- [ ] Fail2Ban configured
- [ ] SSL/TLS certificate installed
- [ ] Auto-renewal configured
- [ ] JWT_SECRET is strong and random
- [ ] Database backups scheduled
- [ ] Health checks configured
- [ ] Docker daemon security configured
- [ ] Log rotation configured

---

## Support

For issues or questions:

1. Check logs: `docker compose logs -f`
2. Check health: `curl http://localhost:3001/health`
3. Review this documentation
4. Check GitHub Issues

---

## Quick Reference

### Essential Commands

```bash
# SSH into VPS
ssh batak@s.batakci.xyz

# Navigate to app
cd ~/app

# Check status
docker compose ps

# View logs
docker compose logs -f

# Deploy
./scripts/vps-deploy.sh

# Backup
./scripts/backup.sh

# Health check
./scripts/health-check.sh

# Restart
docker compose restart

# Stop
docker compose down

# Start
docker compose up -d
```

### File Locations

- **App directory:** `/home/batak/app`
- **Database:** `/home/batak/app/server/data/batak.db`
- **Backups:** `/home/batak/backups/`
- **Logs:** `/home/batak/app/logs/`
- **SSL Certs:** `/etc/letsencrypt/live/s.batakci.xyz/`

---

**Last updated:** February 2026
