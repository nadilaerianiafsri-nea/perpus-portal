import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';

type Bucket = { count: number; expires: number };
const rules: Record<string, { limit: number; window: number }> = {
  '/auth/login': { limit: 20, window: 15 * 60000 },
  '/auth/register': { limit: 6, window: 60 * 60000 },
  '/auth/forgot-password': { limit: 8, window: 60 * 60000 },
  '/auth/reset-password': { limit: 20, window: 15 * 60000 },
  '/auth/resend-verification': { limit: 8, window: 60 * 60000 },
  '/contact': { limit: 10, window: 10 * 60000 },
};

@Injectable()
export class PublicRateGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private nextPrune = 0;

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const path = req.path.toLowerCase().replace(/\/+$/, '');
    const rule = req.method === 'POST' ? rules[path] : undefined;
    if (!rule) return true;
    const now = Date.now();
    if (now >= this.nextPrune) {
      for (const [key, bucket] of this.buckets) if (bucket.expires <= now) this.buckets.delete(key);
      this.nextPrune = now + 60000;
    }
    const res = context.switchToHttp().getResponse<Response>();
    const reject = (expires: number): never => {
      res.setHeader('Retry-After', Math.max(1, Math.ceil((expires - now) / 1000)));
      throw new HttpException('Terlalu banyak permintaan. Silakan coba lagi nanti.', 429);
    };
    const take = (key: string, limit: number, window: number) => {
      let bucket = this.buckets.get(key);
      if (!bucket || bucket.expires <= now) {
        // Fail closed under a flood instead of allocating unbounded memory.
        if (!bucket && this.buckets.size >= 20000) reject(now + 60000);
        bucket = { count: 0, expires: now + window }; this.buckets.set(key, bucket);
      }
      if (bucket.count >= limit) reject(bucket.expires);
      bucket.count++;
    };
    // A trusted reverse proxy may represent many visitors. Use a generous socket
    // cap plus account-specific caps; never trust arbitrary X-Forwarded-For.
    take(`${path}:socket:${req.socket.remoteAddress ?? 'unknown'}`, 300, 60000);
    const email: unknown = req.body?.email;
    const token: unknown = req.body?.token;
    const account = typeof email === 'string' && email.length <= 254 ? email.trim().toLowerCase() : path === '/auth/reset-password' && typeof token === 'string' && token.length <= 4096 ? token : null;
    if (account !== null) {
      const identity = createHash('sha256').update(account).digest('hex');
      take(`${path}:account:${identity}`, rule.limit, rule.window);
    }
    return true;
  }
}
