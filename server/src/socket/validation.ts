/**
 * Strict payload schemas for socket events. No dependencies on purpose.
 * A payload is valid only if it is a plain object, has no keys outside the schema,
 * has every required key, and every present value passes its check.
 * null is treated like "absent" for optional keys (older clients send it).
 */
type Check = (v: unknown) => boolean;
interface Field { check: Check; optional?: boolean }
export type Schema = Record<string, Field>;

const str = (max: number, min = 1): Check => (v) => typeof v === 'string' && v.length >= min && v.length <= max;
const oneOf = (...values: string[]): Check => (v) => typeof v === 'string' && values.includes(v);
const int = (min: number, max: number): Check => (v) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const num = (min: number, max: number): Check => (v) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

const req = (check: Check): Field => ({ check });
const opt = (check: Check): Field => ({ check, optional: true });

const publicKey = str(128);
const username = str(64);
const gameMode = oneOf('koz_maca', 'ihaleli_batak');
const difficulty = oneOf('easy', 'normal', 'hard');
const roomCode = (v: unknown) => typeof v === 'string' && /^[A-Za-z0-9]{4,8}$/.test(v);

export const schemas = {
  join_queue: {
    publicKey: opt(publicKey), username: opt(username), gameMode: opt(gameMode),
    botDifficulty: opt(difficulty), botCount: opt(int(0, 3)),
  },
  play_card: { cardId: req(str(64)), signature: opt(str(512)) },
  bid_trump: {
    suit: req(oneOf('spades', 'hearts', 'diamonds', 'clubs', 'none')),
    amount: req(int(0, 20)), signature: opt(str(512)),
  },
  player_only: { publicKey: opt(publicKey) },
  create_private_room: {
    publicKey: opt(publicKey), username: opt(username), botDifficulty: opt(difficulty), gameMode: opt(gameMode),
  },
  join_private_room: { code: req(roomCode), publicKey: opt(publicKey), username: opt(username) },
  room_action: { code: req(roomCode), publicKey: opt(publicKey) },
  set_username: { publicKey: opt(publicKey), username: req(username) },
  claim_reward: { tournamentId: req(str(128)), publicKey: opt(publicKey), claimSignature: opt(str(2048)) },
  create_skr_room: {
    publicKey: opt(publicKey), username: opt(username), botDifficulty: opt(difficulty), gameMode: opt(gameMode),
    skrStake: req(num(0, 1_000_000)), claimSignature: req(str(2048)),
  },
  get_player: { publicKey: req(publicKey) },
  get_player_games: { publicKey: req(publicKey), limit: opt(int(1, 50)) },
  get_leaderboard: { limit: opt(int(1, 100)) },
} satisfies Record<string, Schema>;

export function validatePayload(payload: unknown, schema: Schema): boolean {
  if (payload === undefined || payload === null) payload = {};
  if (typeof payload !== 'object' || Array.isArray(payload)) return false;
  const obj = payload as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!(key in schema)) return false; // unknown field
  }
  for (const [key, field] of Object.entries(schema)) {
    const value = obj[key];
    if (value === undefined || value === null) {
      if (field.optional) continue;
      return false;
    }
    if (!field.check(value)) return false;
  }
  return true;
}
