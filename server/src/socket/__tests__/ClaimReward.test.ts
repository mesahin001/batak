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

describe('claim_reward eligibility', () => {
  let http: HTTPServer;
  let url: string;
  let db: DatabaseManager;
  let auth: AuthService;
  let mintCalls = 0;
  const sockets: Socket[] = [];
  const minter: any = {
    mintTournamentReward: async () => {
      mintCalls++;
      await new Promise((r) => setTimeout(r, 100));
      return { assetId: `asset-${mintCalls}`, signature: `sig-${mintCalls}`, metadataUri: 'uri' };
    },
  };

  const login = async (w: ReturnType<typeof newWallet>): Promise<Socket> => {
    const s: Socket = await new Promise((resolve, reject) => {
      const c = connect(url, { transports: ['websocket'], forceNew: true });
      sockets.push(c);
      c.on('connect', () => resolve(c));
      c.on('connect_error', reject);
    });
    const ch = await emitAck(s, 'auth_wallet_challenge', { publicKey: w.address });
    const signature = sign(null, Buffer.from(ch.message, 'utf8'), w.privateKey).toString('base64');
    await emitAck(s, 'auth_wallet', { publicKey: w.address, signature });
    return s;
  };

  const finishGame = (id: string, winner: string, others: string[]) =>
    db.completeGame(id, winner, [10, 5, 3, 1], [], 'koz_maca', 5, [winner, ...others]);

  beforeAll(async () => {
    db = new DatabaseManager(':memory:');
    auth = new AuthService(db, 'test-secret');
    http = createServer();
    new SocketServer(http, db, minter, auth);
    await new Promise<void>((r) => http.listen(0, r));
    url = `http://localhost:${(http.address() as AddressInfo).port}`;
    await new Promise((r) => setTimeout(r, 100));
  });

  afterAll(async () => {
    sockets.forEach((s) => s.close());
    await new Promise<void>((r) => http.close(() => r()));
  });

  beforeEach(() => { mintCalls = 0; });

  it('rejects a game that does not exist', async () => {
    const s = await login(newWallet());
    expect((await emitAck(s, 'claim_reward', { tournamentId: 'nope' })).error).toBe('not_eligible');
    expect(mintCalls).toBe(0);
  });

  it('rejects a player who did not win', async () => {
    const winner = newWallet();
    const loser = newWallet();
    finishGame('g-loser', winner.address, [loser.address]);
    const s = await login(loser);
    expect((await emitAck(s, 'claim_reward', { tournamentId: 'g-loser' })).error).toBe('not_eligible');
    expect(mintCalls).toBe(0);
  });

  it('rejects a spoofed publicKey for someone elses win', async () => {
    const winner = newWallet();
    const attacker = newWallet();
    finishGame('g-spoof', winner.address, []);
    const s = await login(attacker);
    const res = await emitAck(s, 'claim_reward', { tournamentId: 'g-spoof', publicKey: winner.address });
    expect(res.error).toBe('not_eligible');
    expect(mintCalls).toBe(0);
  });

  it('rejects a game that is still in progress', async () => {
    const w = newWallet();
    db.completeGame('g-open', w.address, [], [], 'koz_maca', 5, [w.address]);
    db['db'].prepare(`UPDATE games SET status='in_progress' WHERE id='g-open'`).run();
    const s = await login(w);
    expect((await emitAck(s, 'claim_reward', { tournamentId: 'g-open' })).error).toBe('not_eligible');
  });

  it('mints once for the winner and returns the same result on repeat claims', async () => {
    const w = newWallet();
    finishGame('g-win', w.address, []);
    const s = await login(w);
    const first = await emitAck(s, 'claim_reward', { tournamentId: 'g-win' });
    expect(first.success).toBe(true);
    expect(first.mintAddress).toBe('asset-1');
    const second = await emitAck(s, 'claim_reward', { tournamentId: 'g-win' });
    expect(second.success).toBe(true);
    expect(second.alreadyClaimed).toBe(true);
    expect(mintCalls).toBe(1);
  });

  it('mints only once for simultaneous claims', async () => {
    const w = newWallet();
    finishGame('g-race', w.address, []);
    const a = await login(w);
    const b = await login(w);
    const results = await Promise.all([
      emitAck(a, 'claim_reward', { tournamentId: 'g-race' }),
      emitAck(b, 'claim_reward', { tournamentId: 'g-race' }),
    ]);
    expect(mintCalls).toBe(1);
    expect(results.filter((r) => r.success).length).toBe(1);
    expect(results.filter((r) => r.error === 'claim_in_progress').length).toBe(1);
  });
});
