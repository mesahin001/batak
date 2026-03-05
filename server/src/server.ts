/**
 * Server entry point.
 * HTTP sunucusu oluşturur ve Socket.IO server'ı başlatır.
 */

import { createServer } from 'http';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { config } from './config.js';
import { SocketServer } from './socket/SocketServer.js';
import { DatabaseManager } from './database/DatabaseManager.js';
import { AuthService } from './auth/AuthService.js';
import { checkRedisHealth, getRedisConfig } from './socket/RedisAdapter.js';
async function main() {
  // Validate configuration
  config.validate();

  // Initialize database
  const db = new DatabaseManager('./data/batak.db');

  // Initialize cNFT minter (only if merkle tree is configured)
  // Dynamic import to avoid crash when @metaplex-foundation/mpl-bubblegum is not installed
  let cnftMinter: any = null;
  if (config.merkleTree) {
    try {
      const { CNFTMinter } = await import('./solana/CNFTMinter.js');
      cnftMinter = new CNFTMinter(config.merkleTree);
      console.log('[Server] cNFT Minter initialized');
    } catch (error) {
      console.warn('[Server] cNFT Minter initialization failed, continuing without it:', (error as Error).message);
    }
  } else {
    console.log('[Server] No MERKLE_TREE configured, cNFT minting disabled');
  }

  // Initialize auth service
  const authService = new AuthService(db, config.jwtSecret);
  console.log('[Server] Auth service initialized');

  // Create Express app
  const app = express();

  // Health check endpoint
  app.get('/health', async (_req, res) => {
    try {
      const dbStats = db.getOverallStats();
      const redisConfig = getRedisConfig();
      const redisHealth = await checkRedisHealth(redisConfig);

      const healthData: any = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        solanaNetwork: config.solanaNetwork,
        database: {
          type: 'SQLite',
          path: './data/batak.db',
          totalPlayers: dbStats.totalPlayers,
          totalGames: dbStats.totalGames,
          totalNftsMinted: dbStats.totalNftsMinted
        },
        cnftMinting: cnftMinter ? 'enabled' : 'disabled',
        redis: redisConfig.enabled ? {
          enabled: true,
          healthy: redisHealth.healthy,
          latency: redisHealth.latency
        } : {
          enabled: false
        }
      };

      if (!redisHealth.healthy && redisConfig.enabled) {
        healthData.status = 'degraded';
      }

      res.status(redisHealth.healthy || !redisConfig.enabled ? 200 : 503).json(healthData);
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message
      });
    }
  });

  // Basic info endpoint
  app.get('/', (_req, res) => {
    res.status(200).json({
      name: 'Batak Tournament Server',
      version: '1.0.0',
      description: 'Turkish trick-taking card game with NFT rewards on Solana',
      endpoints: {
        health: '/health',
        websocket: 'Socket.IO on same port'
      }
    });
  });

  // NFT metadata static file serving
  app.get('/nft/:filename', (req, res) => {
    const filename = path.basename(req.params.filename); // path traversal prevention
    const filePath = path.join(process.cwd(), 'data', 'nft_metadata', filename);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.sendFile(path.resolve(filePath));
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup Socket.IO server
  new SocketServer(httpServer, db, cnftMinter, authService);

  // Start listening
  const PORT = config.port;
  httpServer.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🃏 BATAK TOURNAMENT SERVER                                  ║
║                                                               ║
║   Server running on: http://localhost:${PORT}                    ║
║   Environment: ${config.nodeEnv.padEnd(45)}║
║   Solana Network: ${config.solanaNetwork.padEnd(42)}║
║   Database: SQLite (./data/batak.db)                          ║
║   cNFT Minting: ${(cnftMinter ? 'Enabled' : 'Disabled').padEnd(42)}║
║                                                               ║
║   📱 Ready for PWA connections                                ║
║   🤖 Bot difficulty: ${config.defaultBotDifficulty.padEnd(38)}║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down gracefully...`);
    db.close();
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('\nSIGINT'));
}

// Start server
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
