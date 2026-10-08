/**
 * Small in-memory sliding-window limiter. Keys are caller-chosen strings
 * (e.g. "ip:1.2.3.4:auth" or "player:<pk>:claim_reward").
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  private sweeper: NodeJS.Timeout;

  constructor(private windowMs: number = 60_000) {
    this.sweeper = setInterval(() => this.sweep(), windowMs);
    this.sweeper.unref();
  }

  /** Returns true when the call is allowed, false when `key` is over `limit` in the window. */
  allow(key: string, limit: number): boolean {
    const now = Date.now();
    const recent = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    if (recent.length >= limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, times] of this.hits) {
      if (times.every((t) => now - t >= this.windowMs)) this.hits.delete(key);
    }
  }
}
