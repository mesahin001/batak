import { createServer, Server as HTTPServer } from 'http';
import { AddressInfo } from 'net';
import { generateKeyPairSync, sign } from 'crypto';
import { io as connect, Socket } from 'socket.io-client';
import { PublicKey } from '@solana/web3.js';
import { SocketServer } from '../SocketServer';
import { AuthService } from '../../auth/AuthService';
import { DatabaseManager } from '../../database/DatabaseManager';

function newWallet() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  return { address: new PublicKey(raw).toBase58(), privateKey };
}

const emitAck = (s: Socket, event: string, payload: any): Promise<any> =>
  new Promise((resolve) => s.emit(event, payload, resolve));

describe('socket authentication', () => {
  let http: HTTPServer;
  let url: string;
  let db: DatabaseManager;
  let auth: AuthService;
  const sockets: Socket[] = [];

  const client = (opts: any = {}): Promise<Socket> =>
    new Promise((resolve, reject) => {
      const s = connect(url, { transports: ['websocket'], forceNew: true, ...opts });
      sockets.push(s);
      s.on('connect', () => resolve(s));
      s.on('connect_error', reject);
    });

  const walletLogin = async (s: Socket, w: ReturnType<typeof newWallet>) => {
    const ch = await emitAck(s, 'auth_wallet_challenge', { publicKey: w.address });
    const signature = sign(null, Buffer.from(ch.message, 'utf8'), w.privateKey).toString('base64');
    return emitAck(s, 'auth_wallet', { publicKey: w.address, signature });
  };

  beforeAll(async () => {
    db = new DatabaseManager(':memory:');
    auth = new AuthService(db, 'test-secret');
    http = createServer();
    new SocketServer(http, db, null, auth);
    await new Promise<void>((r) => http.listen(0, r));
    url = `http://localhost:${(http.address() as AddressInfo).port}`;
    await new Promise((r) => setTimeout(r, 100)); // handlers register after the redis step
  });

  afterAll(async () => {
    sockets.forEach((s) => s.close());
    await new Promise<void>((r) => http.close(() => r()));
  });

  it('rejects auth_wallet without a signature', async () => {
    const s = await client();
    const w = newWallet();
    const res = await emitAck(s, 'auth_wallet', { publicKey: w.address });
    expect(res.success).toBe(false);
    expect(res.token).toBeUndefined();
  });

  it('rejects a signature from the wrong key', async () => {
    const s = await client();
    const victim = newWallet();
    const attacker = newWallet();
    const ch = await emitAck(s, 'auth_wallet_challenge', { publicKey: victim.address });
    const signature = sign(null, Buffer.from(ch.message, 'utf8'), attacker.privateKey).toString('base64');
    const res = await emitAck(s, 'auth_wallet', { publicKey: victim.address, signature });
    expect(res.success).toBe(false);
    expect(res.token).toBeUndefined();
  });

  it('does not let a challenge be reused', async () => {
    const s = await client();
    const w = newWallet();
    const ch = await emitAck(s, 'auth_wallet_challenge', { publicKey: w.address });
    const signature = sign(null, Buffer.from(ch.message, 'utf8'), w.privateKey).toString('base64');
    expect((await emitAck(s, 'auth_wallet', { publicKey: w.address, signature })).success).toBe(true);
    expect((await emitAck(s, 'auth_wallet', { publicKey: w.address, signature })).success).toBe(false);
  });

  it('logs in with a valid signed challenge and returns a token for that wallet', async () => {
    const s = await client();
    const w = newWallet();
    const res = await walletLogin(s, w);
    expect(res.success).toBe(true);
    expect(res.playerId).toBe(w.address);
    expect(auth.verifyToken(res.token)?.playerId).toBe(w.address);
  });

  it('refuses game events from an unauthenticated socket', async () => {
    const s = await client();
    const res = await emitAck(s, 'set_username', { publicKey: 'victim', username: 'hacker' });
    expect(res.error).toBe('not_authenticated');
    expect((await emitAck(s, 'create_private_room', { publicKey: 'victim' })).error).toBe('not_authenticated');
    expect((await emitAck(s, 'claim_reward', { tournamentId: 'x', publicKey: 'victim' })).error).toBe('not_authenticated');
  });

  it('ignores a spoofed publicKey and uses the authenticated identity', async () => {
    const attackerWallet = newWallet();
    const victimWallet = newWallet();
    db.ensureWalletAuth(victimWallet.address);
    const victimNameBefore = db.getPlayer(victimWallet.address)?.username;

    const s = await client();
    await walletLogin(s, attackerWallet);

    const res = await emitAck(s, 'set_username', { publicKey: victimWallet.address, username: 'pwned_name' });
    expect(res.success).toBe(true);
    expect(db.getPlayer(victimWallet.address)?.username).toBe(victimNameBefore);
    expect(db.getPlayer(attackerWallet.address)?.username).toBe('pwned_name');

    const room = await emitAck(s, 'create_private_room', { publicKey: victimWallet.address });
    expect(room.hostPk ?? room.players[0].publicKey).toBe(attackerWallet.address);
  });

  it('authenticates a reconnect from the handshake token', async () => {
    const first = await client();
    const w = newWallet();
    const { token } = await walletLogin(first, w);

    const second = await client({ auth: { token } });
    const res = await emitAck(second, 'set_username', { publicKey: 'ignored', username: 'handshake_ok' });
    expect(res.success).toBe(true);
    expect(db.getPlayer(w.address)?.username).toBe('handshake_ok');
  });

  it('keeps email login working', async () => {
    const s = await client();
    const reg = await emitAck(s, 'auth_register', { email: 'a@b.co', password: 'secret1' });
    expect(reg.success).toBe(true);
    const res = await emitAck(s, 'set_username', { publicKey: 'ignored', username: 'email_user' });
    expect(res.success).toBe(true);
  });
});
