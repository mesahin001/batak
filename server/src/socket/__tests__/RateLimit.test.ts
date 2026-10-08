import { createServer, Server as HTTPServer } from 'http';
import { AddressInfo } from 'net';
import { io as connect, Socket } from 'socket.io-client';
import { SocketServer } from '../SocketServer';
import { AuthService } from '../../auth/AuthService';
import { DatabaseManager } from '../../database/DatabaseManager';
import { RateLimiter } from '../RateLimiter';

const emitAck = (s: Socket, event: string, payload: any): Promise<any> =>
  new Promise((resolve) => s.emit(event, payload, resolve));

describe('RateLimiter', () => {
  it('allows up to the limit and then blocks', () => {
    const l = new RateLimiter(60_000);
    for (let i = 0; i < 3; i++) expect(l.allow('k', 3)).toBe(true);
    expect(l.allow('k', 3)).toBe(false);
    expect(l.allow('other', 3)).toBe(true);
  });
});

describe('auth rate limit', () => {
  let http: HTTPServer;
  let url: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    const db = new DatabaseManager(':memory:');
    http = createServer();
    new SocketServer(http, db, null, new AuthService(db, 'test-secret'));
    await new Promise<void>((r) => http.listen(0, r));
    url = `http://localhost:${(http.address() as AddressInfo).port}`;
    await new Promise((r) => setTimeout(r, 100));
  });

  afterAll(async () => {
    sockets.forEach((s) => s.close());
    await new Promise<void>((r) => http.close(() => r()));
  });

  it('blocks password guessing per IP even across reconnects', async () => {
    const results: any[] = [];
    for (let i = 0; i < 25; i++) {
      const s: Socket = await new Promise((resolve, reject) => {
        const c = connect(url, { transports: ['websocket'], forceNew: true });
        sockets.push(c);
        c.on('connect', () => resolve(c));
        c.on('connect_error', reject);
      });
      results.push(await emitAck(s, 'auth_login', { email: 'a@b.co', password: 'wrong' + i }));
      s.close();
    }
    expect(results.slice(0, 20).every((r) => r.error !== 'rate_limited')).toBe(true);
    expect(results.slice(20).every((r) => r.error === 'rate_limited')).toBe(true);
  });
});
