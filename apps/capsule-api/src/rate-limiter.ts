interface AttemptBucket {
  count: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, AttemptBucket>();

  public constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number,
    private readonly blockMs: number,
  ) {}

  public check(key: string, now = Date.now()): { allowed: boolean; retryAfterMs?: number } {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      this.buckets.set(key, { count: 1, firstAttemptAt: now });
      return { allowed: true };
    }

    if (bucket.blockedUntil && bucket.blockedUntil > now) {
      return { allowed: false, retryAfterMs: bucket.blockedUntil - now };
    }

    if (now - bucket.firstAttemptAt > this.windowMs) {
      bucket.count = 1;
      bucket.firstAttemptAt = now;
      bucket.blockedUntil = undefined;
      return { allowed: true };
    }

    bucket.count += 1;
    if (bucket.count > this.maxAttempts) {
      bucket.blockedUntil = now + this.blockMs;
      return { allowed: false, retryAfterMs: this.blockMs };
    }

    return { allowed: true };
  }

  public registerFailure(key: string, now = Date.now()): number {
    const bucket = this.buckets.get(key) ?? { count: 0, firstAttemptAt: now };

    if (now - bucket.firstAttemptAt > this.windowMs) {
      bucket.count = 1;
      bucket.firstAttemptAt = now;
      bucket.blockedUntil = undefined;
    } else {
      bucket.count += 1;
    }

    this.buckets.set(key, bucket);
    return bucket.count;
  }
}
