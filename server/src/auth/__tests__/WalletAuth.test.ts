import { generateKeyPairSync, sign } from 'crypto';
import { PublicKey } from '@solana/web3.js';
import { AuthService } from '../AuthService';
import { DatabaseManager } from '../../database/DatabaseManager';

function newWallet() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  return { address: new PublicKey(raw).toBase58(), base64Address: Buffer.from(raw).toString('base64'), privateKey };
}

const signMessage = (wallet: ReturnType<typeof newWallet>, message: string) =>
  sign(null, Buffer.from(message, 'utf8'), wallet.privateKey).toString('base64');

describe('wallet challenge signing', () => {
  let auth: AuthService;

  beforeEach(() => {
    auth = new AuthService(new DatabaseManager(':memory:'), 'test-secret');
  });

  it('accepts a valid signature over the challenge', () => {
    const w = newWallet();
    const challenge = auth.createWalletChallenge(w.address)!;
    expect(challenge.message).toContain(w.address);
    expect(auth.verifyWalletSignature(challenge, w.address, signMessage(w, challenge.message))).toBe(true);
  });

  it('accepts a base64 address (Solana Mobile Wallet Adapter format)', () => {
    const w = newWallet();
    const challenge = auth.createWalletChallenge(w.base64Address)!;
    expect(challenge).not.toBeNull();
    expect(auth.verifyWalletSignature(challenge, w.base64Address, signMessage(w, challenge.message))).toBe(true);
  });

  it('rejects a signature from another key', () => {
    const victim = newWallet();
    const attacker = newWallet();
    const challenge = auth.createWalletChallenge(victim.address)!;
    expect(auth.verifyWalletSignature(challenge, victim.address, signMessage(attacker, challenge.message))).toBe(false);
  });

  it('rejects a signature over a different message', () => {
    const w = newWallet();
    const challenge = auth.createWalletChallenge(w.address)!;
    expect(auth.verifyWalletSignature(challenge, w.address, signMessage(w, challenge.message + 'x'))).toBe(false);
  });

  it('rejects when the challenge was issued for another public key', () => {
    const a = newWallet();
    const b = newWallet();
    const challenge = auth.createWalletChallenge(a.address)!;
    expect(auth.verifyWalletSignature(challenge, b.address, signMessage(b, challenge.message))).toBe(false);
  });

  it('rejects an expired challenge', () => {
    const w = newWallet();
    const challenge = auth.createWalletChallenge(w.address)!;
    challenge.expiresAt = Date.now() - 1;
    expect(auth.verifyWalletSignature(challenge, w.address, signMessage(w, challenge.message))).toBe(false);
  });

  it('rejects malformed signatures and public keys', () => {
    const w = newWallet();
    const challenge = auth.createWalletChallenge(w.address)!;
    expect(auth.verifyWalletSignature(challenge, w.address, 'not-base64!')).toBe(false);
    expect(auth.verifyWalletSignature(challenge, w.address, '')).toBe(false);
    expect(auth.createWalletChallenge('nope')).toBeNull();
    expect(auth.createWalletChallenge('E_abcdef')).toBeNull();
  });

  it('issues a different nonce every time', () => {
    const w = newWallet();
    expect(auth.createWalletChallenge(w.address)!.message).not.toBe(auth.createWalletChallenge(w.address)!.message);
  });
});
