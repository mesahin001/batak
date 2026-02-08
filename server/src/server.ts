/**
 * Server entry point.
 * HTTP sunucusu oluşturur ve Socket.IO server'ı başlatır.
 */

import { createServer } from 'http';
import { config } from './config.js';
import { SocketServer } from './socket/SocketServer.js';
import { DatabaseManager } from './database/DatabaseManager.js';
import { AuthService } from './auth/AuthService.js';
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

  // Create HTTP server
  const httpServer = createServer();

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
