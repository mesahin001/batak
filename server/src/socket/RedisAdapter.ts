/**
 * Redis Adapter Configuration for Socket.IO
 *
 * Enables multi-server support and session sharing across instances.
 * This is optional - the app works fine without Redis for single-server deployments.
 *
 * Benefits:
 * - Multi-server scaling (horizontal scaling)
 * - Session persistence across server restarts
 * - Cross-server pub/sub for events
 * - Better reliability for production
 *
 * Usage:
 *   1. Set REDIS_URL in .env
 *   2. SocketServer will automatically detect and use Redis adapter
 */

import { Server as SocketIOServer } from 'socket.io';
import { createClient, RedisClientType } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

export interface RedisAdapterConfig {
  enabled: boolean;
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
}

/**
 * Create and configure Redis adapter for Socket.IO
 */
export async function setupRedisAdapter(
  io: SocketIOServer,
  config: RedisAdapterConfig
): Promise<void> {
  if (!config.enabled) {
    console.log('[SocketServer] Redis adapter disabled (single-server mode)');
    return;
  }

  try {
    // Build Redis URL
    let redisUrl = config.url;
    if (!redisUrl && config.host && config.port) {
      const auth = config.password ? `:${config.password}@` : '';
      redisUrl = `redis://${auth}${config.host}:${config.port}`;
      if (config.db) redisUrl += `/${config.db}`;
    }

    if (!redisUrl) {
      console.warn('[SocketServer] Redis enabled but no URL provided, falling back to memory adapter');
      return;
    }

    // Create Redis clients (pub and sub)
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    // Handle connection errors
    pubClient.on('error', (err) => {
      console.error('[Redis] Pub client error:', err);
    });
    subClient.on('error', (err) => {
      console.error('[Redis] Sub client error:', err);
    });

    // Connect to Redis
    await Promise.all([
      pubClient.connect(),
      subClient.connect()
    ]);

    console.log('[Redis] Connected successfully');

    // Create adapter
    await io.adapter(createAdapter(pubClient, subClient));

    console.log('[SocketServer] Redis adapter configured (multi-server mode enabled)');
  } catch (error) {
    console.error('[SocketServer] Failed to configure Redis adapter:', error);
    console.log('[SocketServer] Falling back to memory adapter (single-server mode)');
  }
}

/**
 * Parse Redis configuration from environment variables
 */
export function getRedisConfig(): RedisAdapterConfig {
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;
  const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : undefined;
  const redisPassword = process.env.REDIS_PASSWORD;
  const redisDb = process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : undefined;
  const redisEnabled = process.env.REDIS_ENABLED === 'true';

  return {
    enabled: redisEnabled || !!redisUrl || !!redisHost,
    url: redisUrl,
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    db: redisDb,
  };
}

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(config: RedisAdapterConfig): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  if (!config.enabled) {
    return { healthy: true }; // Redis not required
  }

  try {
    let redisUrl = config.url;
    if (!redisUrl && config.host && config.port) {
      const auth = config.password ? `:${config.password}@` : '';
      redisUrl = `redis://${auth}${config.host}:${config.port}`;
    }

    if (!redisUrl) {
      return { healthy: true, error: 'Redis enabled but not configured' };
    }

    const client = createClient({ url: redisUrl });

    const start = Date.now();
    await client.connect();
    const pong = await client.ping();
    const latency = Date.now() - start;

    await client.quit();

    return {
      healthy: pong === 'PONG',
      latency
    };
  } catch (error) {
    return {
      healthy: false,
      error: (error as Error).message
    };
  }
}
