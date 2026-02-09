# Database Migration Guide

## When to Migrate from SQLite to PostgreSQL

### Triggers for Migration

Migrate to PostgreSQL when you experience any of these:

1. **Performance Issues:**
   - Database queries becoming slow (>100ms)
   - Database file size > 1GB
   - Frequent database locks

2. **Scaling Needs:**
   - 300+ concurrent players
   - Need for read replicas
   - Multiple server instances

3. **Reliability:**
   - Need 99.99% uptime
   - Cannot restart server during active games
   - Need connection pooling

### Current Status (February 2026)

- **Database:** SQLite (better-sqlite3)
- **Capacity:** ~500 concurrent players
- **Status:** ✅ Working fine for MVP

**Recommendation:** Wait until you hit 300+ concurrent players before migrating.

---

## Pre-Migration Checklist

### Preparation
- [ ] Backup SQLite database (`cp data/batak.db data/batak.db.backup`)
- [ ] Set up PostgreSQL instance (managed or self-hosted)
- [ ] Test migration script on staging environment
- [ ] Schedule maintenance window (if needed)
- [ ] Prepare rollback plan

### PostgreSQL Setup Options

#### Option A: Managed (Recommended)
- AWS RDS: https://aws.amazon.com/rds/postgresql/
- Google Cloud SQL: https://cloud.google.com/sql/docs/postgres
- DigitalOcean: https://www.digitalocean.com/products/managed-databases/
- Railway: https://railway.app
- Neon: https://neon.tech (Serverless PostgreSQL)

#### Option B: Self-Hosted
- Docker Compose (included in docker-compose.yml)
- VPS with PostgreSQL installed

---

## Migration Steps

### Step 1: Set Up PostgreSQL

#### Using Docker Compose (Quick Start)

```bash
# Add PostgreSQL to docker-compose.yml
# Already configured in docker-compose.yml

# Start PostgreSQL
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
# Check logs: docker logs -f batak-postgres
```

#### Using Managed Service

1. Create PostgreSQL database
2. Get connection string (DATABASE_URL)
3. Add to `.env`:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/batak
   ```

### Step 2: Install PostgreSQL Client Library

```bash
# Add pg library to package.json
cd server
npm install pg @types/pg
```

### Step 3: Update .env

Add PostgreSQL configuration:

```bash
# Database Configuration
DATABASE_TYPE=postgresql  # or 'sqlite' to use SQLite
DATABASE_URL=postgresql://postgres:password@localhost:5432/batak
SQLITE_PATH=./data/batak.db  # Used only when DATABASE_TYPE=sqlite
```

### Step 4: Run Migration

```bash
# From server directory
cd server

# Run migration script
npx tsx src/database/migrate-to-postgres.ts

# Or add to package.json scripts:
# "migrate-to-postgres": "tsx src/database/migrate-to-postgres.ts"
# Then run: npm run migrate-to-postgres
```

### Step 5: Verify Migration

The migration script will verify by comparing row counts:

```
[Migration] Verification:
  Players: 4 → 4
  Games: 125 → 125
  NFT Rewards: 50 → 50
  Auth: 4 → 4

✅ Migration completed successfully!
```

### Step 6: Switch to PostgreSQL

1. Update `DatabaseManager` to use PostgreSQL
2. Restart server
3. Test all functionality
4. Monitor for errors

---

## Switching DatabaseManager to PostgreSQL

The DatabaseManager needs to be updated to support both SQLite and PostgreSQL.

### Option 1: Use pg library directly

Update `server/src/database/DatabaseManager.ts`:

```typescript
import { Pool } from 'pg';

export class DatabaseManager {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async getPlayer(publicKey: string): Promise<PlayerStats | null> {
    const result = await this.pool.query(
      'SELECT * FROM players WHERE public_key = $1',
      [publicKey]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      publicKey: row.public_key,
      username: row.username,
      // ... map other fields
    };
  }

  // ... update all other methods similarly
}
```

### Option 2: Use an ORM (Recommended for large-scale)

Consider using Prisma or TypeORM for better maintainability:

```bash
npm install prisma @prisma/client
npx prisma init
```

---

## Rollback Plan

If migration fails or issues arise:

### Step 1: Stop Server

```bash
pm2 stop batak-server
# or
docker-compose down
```

### Step 2: Revert to SQLite

```bash
# Restore backup
cp data/batak.db.backup data/batak.db

# Update .env
DATABASE_TYPE=sqlite
# Remove or comment out DATABASE_URL
```

### Step 3: Restart Server

```bash
pm2 restart batak-server
# or
docker-compose up -d
```

---

## Post-Migration Tasks

### Optimization
- [ ] Set up read replicas (if using managed service)
- [ ] Configure connection pooling
- [ ] Add database indexes for common queries
- [ ] Set up automated backups

### Monitoring
- [ ] Monitor query performance
- [ ] Track connection pool usage
- [ ] Set up alerts for slow queries
- [ ] Monitor database size

### Maintenance
- [ ] Set up VACUUM schedule (PostgreSQL maintenance)
- [ ] Archive old game history
- [ ] Clean up expired sessions

---

## Performance Comparison

### SQLite (Current)
- **Pros:** Zero config, fast for small datasets, single file
- **Cons:** Single writer, no horizontal scaling, limited concurrency
- **Max capacity:** ~500 concurrent players
- **Backup:** File copy

### PostgreSQL (After Migration)
- **Pros:** Multiple writers, read replicas, connection pooling, ACID compliant
- **Cons:** Additional infrastructure, complexity
- **Max capacity:** 10,000+ concurrent players
- **Backup:** pg_dump, managed service backups

---

## Cost Estimation

### Self-Hosted (Docker)
- **Cost:** $0 (included with VPS)
- **Complexity:** Medium
- **Recommended for:** Development, small production

### Managed PostgreSQL
- **Cost:** $15-50/month
- **Complexity:** Low
- **Recommended for:** Production, scaling

| Provider | Starting Price | Features |
|----------|---------------|----------|
| Neon | Free tier, $19/month | Serverless, auto-scaling |
| Railway | $5/month | Simple, good for small apps |
| DigitalOcean | $15/month | Managed, easy setup |
| AWS RDS | $15/month | Enterprise features |
| Google Cloud SQL | $10/month | GCP integration |

---

## Troubleshooting

### Issue: Migration fails with connection error

**Solution:**
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

### Issue: Row count mismatch

**Solution:**
```bash
# Check SQLite row counts
sqlite3 data/batak.db "SELECT COUNT(*) FROM players"

# Check PostgreSQL row counts
psql $DATABASE_URL -c "SELECT COUNT(*) FROM players"

# Re-run migration if needed
npm run migrate-to-postgres
```

### Issue: Performance worse after migration

**Solution:**
- Check if indexes are created
- Verify connection pool configuration
- Check query plans with `EXPLAIN ANALYZE`
- Consider read replica setup

---

## Additional Resources

- PostgreSQL Docs: https://www.postgresql.org/docs/
- pg Library: https://node-postgres.com/
- Prisma ORM: https://www.prisma.io/
- Migration Tools: https://github.com/skorpland/pgtap

---

**Last Updated:** February 2026
**Status:** Ready when needed (not urgent for MVP)
