/**
 * Server entry point.
 * HTTP sunucusu oluşturur ve Socket.IO server'ı başlatır.
 */

import { createServer } from 'http';
import { config } from './config.js';
import { SocketServer } from './socket/SocketServer.js';
async function main() {
  // Validate configuration
  config.validate();

  // Create HTTP server
  const httpServer = createServer();

  // Setup Socket.IO server
  const socketServer = new SocketServer(httpServer);

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
║                                                               ║
║   📱 Ready for PWA connections                                ║
║   🤖 Bot difficulty: ${config.defaultBotDifficulty.padEnd(38)}║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

// Start server
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
