import { createServer, Server as HTTPServer } from 'http';
import { AddressInfo } from 'net';
import { generateKeyPairSync, sign } from 'crypto';
import { io as connect, Socket } from 'socket.io-client';
import { PublicKey } from '@solana/web3.js';
import { SocketServer } from '../SocketServer';
import { AuthService } from '../../auth/AuthService';
import { DatabaseManager } from '../../database/DatabaseManager';
import { validatePayload, schemas } from '../validation';

function newWallet() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  return { address: new PublicKey(raw).toBase58(), privateKey };
}
const emitAck = (s: Socket, event: string, payload: any): Promise<any> =>
  new Promise((resolve) => s.emit(event, payload, resolve));

describe('ownership and strict payloads', () => {
  let http: HTTPServer;
  let url: string;
  let db: DatabaseManager;
  const sockets: Socket[] = [];

  const login = async (w = newWallet()): Promise<{ s: Socket; w: ReturnType<typeof newWallet> }> => {
    const s: Socket = await new Promise((resolve, reject) => {
      const c = connect(url, { transports: ['websocket'], forceNew: true });
      sockets.push(c);
      c.on('connect', () => resolve(c));
      c.on('connect_error', reject);
    });
    const ch = await emitAck(s, 'auth_wallet_challenge', { publicKey: w.address });
    const signature = sign(null, Buffer.from(ch.message, 'utf8'), w.privateKey).toString('base64');
    await emitAck(s, 'auth_wallet', { publicKey: w.address, signature });
    return { s, w };
  };

  beforeAll(async () => {
    process.env.AUTH_RATE_LIMIT_PER_MIN = '1000'; // this file logs in many times from one IP
    db = new DatabaseManager(':memory:');
    http = createServer();
    new SocketServer(http, db, null, new AuthService(db, 'test-secret'));
    await new Promise<void>((r) => http.listen(0, r));
    url = `http://localhost:${(http.address() as AddressInfo).port}`;
    await new Promise((r) => setTimeout(r, 100));
  });
  afterAll(async () => {
    delete process.env.AUTH_RATE_LIMIT_PER_MIN;
    sockets.forEach((s) => s.close());
    await new Promise<void>((r) => http.close(() => r()));
  });

  describe('private rooms: user B cannot act on user A\'s room', () => {
    it('B cannot start A\'s room, even by claiming to be the host', async () => {
      const a = await login();
      const b = await login();
      const room = await emitAck(a.s, 'create_private_room', {});
      expect(room.code).toBeDefined();

      const errors: any[] = [];
      b.s.on('error_message', (e) => errors.push(e));
      b.s.on('error', (e) => errors.push(e));
      let matchFound = false;
      a.s.on('match_found', () => { matchFound = true; });
      b.s.emit('start_private_room', { code: room.code, publicKey: a.w.address }); // spoofed host key
      await new Promise((r) => setTimeout(r, 300));
      expect(matchFound).toBe(false);
    });

    it('B cannot remove A from the room with a spoofed publicKey', async () => {
      const a = await login();
      const b = await login();
      const room = await emitAck(a.s, 'create_private_room', {});
      let closed = false;
      a.s.on('private_room_closed', () => { closed = true; });
      b.s.emit('leave_private_room', { code: room.code, publicKey: a.w.address });
      await new Promise((r) => setTimeout(r, 300));
      expect(closed).toBe(false);
      const joined = await emitAck(b.s, 'join_private_room', { code: room.code });
      expect(joined.hostPk).toBe(a.w.address); // A is still the host and the room still exists
    });

    it('B joining a room is recorded under B, not under a spoofed key', async () => {
      const a = await login();
      const b = await login();
      const c = newWallet();
      const room = await emitAck(a.s, 'create_private_room', {});
      const joined = await emitAck(b.s, 'join_private_room', { code: room.code, publicKey: c.address });
      const keys = joined.players.map((p: any) => p.publicKey);
      expect(keys).toContain(b.w.address);
      expect(keys).not.toContain(c.address);
    });
  });

  describe('strict payloads', () => {
    it('rejects unknown fields', async () => {
      const a = await login();
      const res = await emitAck(a.s, 'create_private_room', { botDifficulty: 'easy', isAdmin: true });
      expect(res.error).toBe('invalid_payload');
    });

    it('rejects bad enum values and out-of-range numbers', async () => {
      const a = await login();
      expect((await emitAck(a.s, 'create_private_room', { gameMode: 'cheat' })).error).toBe('invalid_payload');
      expect((await emitAck(a.s, 'create_private_room', { botDifficulty: 'god' })).error).toBe('invalid_payload');
      expect((await emitAck(a.s, 'create_skr_room', { skrStake: -5, claimSignature: 'x' })).error).toBe('invalid_payload');
      expect((await emitAck(a.s, 'create_skr_room', { skrStake: NaN, claimSignature: 'x' })).error).toBe('invalid_payload');
      expect((await emitAck(a.s, 'set_username', { username: 'x'.repeat(100) })).error).toBe('invalid_payload');
    });

    it('rejects non-object payloads', async () => {
      const a = await login();
      expect((await emitAck(a.s, 'create_private_room', 'hello')).error).toBe('invalid_payload');
      expect((await emitAck(a.s, 'create_private_room', ['x'])).error).toBe('invalid_payload');
    });

    it('still accepts what the real clients send', async () => {
      const a = await login();
      expect((await emitAck(a.s, 'create_private_room', {
        publicKey: a.w.address, username: 'Mehmet', botDifficulty: 'normal', gameMode: 'koz_maca',
      })).code).toBeDefined();
      expect((await emitAck(a.s, 'set_username', { publicKey: a.w.address, username: 'ok_name1' })).success).toBe(true);
    });

    it('schemas: bids and cards', () => {
      expect(validatePayload({ suit: 'spades', amount: 5 }, schemas.bid_trump)).toBe(true);
      expect(validatePayload({ suit: 'spades', amount: 0 }, schemas.bid_trump)).toBe(true);
      expect(validatePayload({ suit: 'spades', amount: 5.5 }, schemas.bid_trump)).toBe(false);
      expect(validatePayload({ suit: 'rocks', amount: 5 }, schemas.bid_trump)).toBe(false);
      expect(validatePayload({ cardId: 'spades-A-3' }, schemas.play_card)).toBe(true);
      expect(validatePayload({ cardId: 'spades-A-3', extra: 1 }, schemas.play_card)).toBe(false);
      expect(validatePayload({}, schemas.play_card)).toBe(false);
    });
  });

  describe('reads of other players need a login', () => {
    it('logged-out sockets cannot read stats, history or usernames', async () => {
      const s: Socket = await new Promise((resolve, reject) => {
        const c = connect(url, { transports: ['websocket'], forceNew: true });
        sockets.push(c);
        c.on('connect', () => resolve(c));
        c.on('connect_error', reject);
      });
      const target = newWallet().address;
      expect((await emitAck(s, 'get_player_stats', { publicKey: target })).error).toBe('not_authenticated');
      expect((await emitAck(s, 'get_player_games', { publicKey: target })).error).toBe('not_authenticated');
      expect((await emitAck(s, 'get_username', { publicKey: target })).error).toBe('not_authenticated');
    });

    it('logged-in users can read, and limit is bounded', async () => {
      const a = await login();
      const target = newWallet().address;
      expect((await emitAck(a.s, 'get_player_games', { publicKey: target, limit: 10 })).games).toBeDefined();
      expect((await emitAck(a.s, 'get_player_games', { publicKey: target, limit: 100000 })).error).toBe('invalid_payload');
    });
  });

  describe('real client flow still works', () => {
    it('join_queue with the web/mobile payload starts a bot game and in-game events are not rejected as invalid', async () => {
      const a = await login();
      const events: any[] = [];
      a.s.onAny((name, data) => events.push({ name, data }));
      const matched = new Promise<any>((resolve) => a.s.once('match_found', resolve));
      a.s.emit('join_queue', { publicKey: a.w.address, username: 'Tester', botCount: 3, botDifficulty: 'easy', gameMode: 'koz_maca' });
      const match = await Promise.race([matched, new Promise<any>((r) => setTimeout(() => r(null), 5000))]);
      expect(match).not.toBeNull();

      a.s.emit('bid_trump', { suit: 'spades', amount: 0 });
      a.s.emit('play_card', { cardId: 'spades-A-1' });
      await new Promise((r) => setTimeout(r, 400));
      const rejected = events.filter((e) => e.name === 'error' && e.data?.message === 'invalid_payload');
      expect(rejected).toEqual([]);
    });
  });
});
