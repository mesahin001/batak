# Redis Setup Guide

## Why Add Redis?

Redis provides several benefits for the Batak Tournament server:

### Benefits
1. **Multi-server scaling** - Run multiple server instances behind a load balancer
2. **Session persistence** - Players don't get disconnected during server restarts
3. **Cross-server events** - Socket.IO events work across all server instances
4. **Better reliability** - Graceful handling of server failures
5. **Pub/Sub** - Real-time events across all servers

### When to Add Redis

| Phase | Players | Redis Needed |
|-------|---------|--------------|
| MVP (Current) | 0-500 | No |
| Growth | 500-2,000 | Yes |
| Scale | 2,000-10,000 | Yes (with cluster) |

**Current Recommendation:** Add Redis when you consistently have 200+ concurrent players.

---

## Quick Start (Docker)

### Option 1: Docker Compose (Recommended)

Redis is already configured in `docker-compose.yml`:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped
```

Start Redis:

```bash
docker-compose up -d redis
```

### Option 2: Standalone Docker

```bash
docker run -d \
  --name batak-redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine \
  redis-server --appendonly yes
```

### Option 3: Managed Redis (Production)

Consider these providers:
- **Redis Cloud:** https://redis.com/enterprise/ (Free tier available)
- **Upstash:** https://upstash.com/ (Free tier, HTTP API)
- **AWS ElastiCache:** https://aws.amazon.com/elasticache/
- **Google Cloud Memorystore:** https://cloud.google.com/memorystore

---

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Redis Configuration (optional but recommended for production)
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379

# Or use individual components:
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=your-password (if set)
# REDIS_DB=0
```

### Production Configuration

For production with password-protected Redis:

```bash
REDIS_ENABLED=true
REDIS_URL=redis://:your-password@redis.example.com:6379/0
```

For Redis Cloud:

```bash
REDIS_ENABLED=true
REDIS_URL=rediss://username:password@redis-12345.c1.us-east1-2.gcp.cloud.redislabs.com:12345
```

---

## Installation

### Install Dependencies

```bash
cd server
npm install redis @socket.io/redis-adapter
```

### Verify Installation

The Redis adapter is already integrated into `SocketServer.ts`. When you set `REDIS_ENABLED=true`, it will automatically use Redis.

---

## Testing

### 1. Test Redis Connection

```bash
# From server directory
cd server

# Run the health check
curl http://localhost:3001/health

# Response should include:
{
  "status": "healthy",
  "redis": {
    "enabled": true,
    "healthy": true,
    "latency": 5
  }
}
```

### 2. Test Multi-Server Setup

Start two server instances:

```bash
# Terminal 1
PORT=3001 npm run dev

# Terminal 2
PORT=3002 npm run dev

# Connect clients to both servers
# They should be able to play together via Redis pub/sub
```

### 3. Test Session Persistence

1. Start a game
2. Restart server
3. Player should be able to reconnect and continue game

---

## Monitoring

### Check Redis Status

```bash
# Using redis-cli
docker exec -it batak-redis redis-cli

# Inside redis-cli
> INFO server
> INFO stats
> CLIENT LIST

# Check memory usage
> INFO memory

# Check connected clients
> CLIENT LIST

# Ping test
> PING
# Should return: PONG
```

### Monitor from Application

The `/health` endpoint includes Redis status:

```bash
curl http://localhost:3001/health | jq '.redis'
```

---

## Performance Tuning

### Memory Management

Redis by default uses all available memory. Configure max memory:

```bash
# In redis.conf or docker command
redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### Persistence

Choose persistence strategy:

**Append-Only File (AOF)** - Safer, slower:
```bash
redis-server --appendonly yes
```

**RDB Snapshots** - Faster, less durable:
```bash
redis-server --save 900 1 --save 300 10
```

**No persistence** - Fastest, data lost on restart (cache only):
```bash
redis-server --save ""
```

### Connection Pooling

Socket.IO Redis adapter handles connection pooling automatically. Default settings are good for most use cases.

---

## Troubleshooting

### Issue: Server fails to start with Redis enabled

**Error:** `Error: Redis connection to localhost:6379 failed`

**Solutions:**
1. Check Redis is running: `docker ps | grep redis`
2. Check REDIS_URL in .env
3. Test connection: `redis-cli -h localhost -p 6379 ping`

### Issue: High latency in health check

**Error:** `"latency": 500+` in `/health`

**Solutions:**
1. Check Redis CPU/memory usage
2. Move Redis to separate server
3. Use Redis clustering
4. Disable Redis if not needed (single server)

### Issue: Players get disconnected on restart

**Expected:** Without Redis, players disconnect
**With Redis:** Players can reconnect within 30 seconds

**Solution:** Ensure Redis is properly configured and `REDIS_ENABLED=true`

### Issue: Socket.IO events not working across servers

**Symptoms:** Player on server A can't see game state changes from server B

**Solution:** Check that both servers use same Redis URL:

```bash
# Server 1
REDIS_URL=redis://redis.example.com:6379 PORT=3001 npm run dev

# Server 2
REDIS_URL=redis://redis.example.com:6379 PORT=3002 npm run dev
```

---

## Scaling with Redis

### Horizontal Scaling

When you need multiple servers:

1. **Set up Redis** (single instance or cluster)
2. **Configure load balancer** (nginx, HAProxy, AWS ALB)
3. **Run multiple server instances** (all with same REDIS_URL)

Example nginx config:

```nginx
upstream batak_backend {
    server server1:3001;
    server server2:3001;
    server server3:3001;
}

server {
    listen 443 ssl;
    server_name s.batakci.xyz;

    location /socket.io/ {
        proxy_pass http://batak_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Redis Cluster (10,000+ players)

For very large scale, use Redis Cluster:

```bash
# Create Redis cluster with 3 masters + 3 replicas
redis-cli --cluster create \
  redis1:6379 redis2:6379 redis3:6379 \
  --cluster-replicas 1
```

Update SocketServer configuration to use cluster mode (requires `ioredis` instead of `redis`).

---

## Cost Estimation

### Self-Hosted Redis
- **VPS with Redis:** €5-10/month (can share with app server)
- **Dedicated Redis server:** €15-30/month

### Managed Redis
- **Upstash Free tier:** 10,000 commands/day
- **Upstash Pro:** $0.20/100K requests
- **Redis Cloud Free:** 30MB storage
- **Redis Cloud Paid:** $7/month (256MB)
- **AWS ElastiCache:** $15-50/month

**Recommendation:** Start with self-hosted Redis on same VPS. Upgrade to managed when you need better reliability.

---

## Migration Guide

### From Memory Adapter to Redis

1. **Install dependencies** (if not already installed)
2. **Set up Redis** (Docker or managed)
3. **Update .env:**
   ```bash
   REDIS_ENABLED=true
   REDIS_URL=redis://localhost:6379
   ```
4. **Restart server** - No other changes needed!

### Back to Memory Adapter

Simply set `REDIS_ENABLED=false` or remove Redis URL from .env.

---

## Best Practices

### Security
1. **Set a password** in production
2. **Use TLS/rediss://** for remote Redis
3. **Bind to localhost** if self-hosted
4. **Disable dangerous commands** (FLUSHDB, CONFIG)

### Monitoring
1. Monitor Redis memory usage
2. Track connection count
3. Monitor command stats
4. Set up alerts for high latency

### Backup
- Redis with AOF: Backup the `.aof` file
- Redis with RDB: Backup the `.rdb` file
- Use `redis-cli --rdb` for on-demand backups

---

## Additional Resources

- Redis Docs: https://redis.io/docs/
- Socket.IO Redis Adapter: https://socket.io/docs/v4/redis-adapter/
- Docker Redis: https://hub.docker.com/_/redis

---

**Last Updated:** February 2026
**Status:** Optional but recommended for production scaling
