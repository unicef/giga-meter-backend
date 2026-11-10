import { Injectable, Logger } from '@nestjs/common';

/** Consecutive upstream failures before the circuit opens. */
export const CIRCUIT_FAILURE_THRESHOLD = 5;

/** How long the circuit stays open before a request is allowed through again. */
export const CIRCUIT_OPEN_MS = 30_000;

/**
 * Fail-fast guard for the Google calls this module makes.
 *
 * When the upstream stops answering, every request still pays the full timeout
 * and holds a socket open for it. After a few consecutive failures the circuit
 * opens and requests are rejected immediately, until the cooldown expires and
 * one request is let through to probe the upstream again.
 *
 * Only failures that say something about the upstream count (timeouts, network
 * errors, 5xx). A 4xx means the upstream is alive and answered.
 */
@Injectable()
export class GeolocationCircuit {
  private readonly logger = new Logger(GeolocationCircuit.name);
  private consecutiveFailures = 0;
  private openedAt: number | null = null;

  /** True while the circuit is open and requests should fail fast. */
  isOpen(now = Date.now()): boolean {
    if (this.openedAt === null) {
      return false;
    }
    if (now - this.openedAt >= CIRCUIT_OPEN_MS) {
      // Cooldown expired: let the next request probe the upstream.
      this.openedAt = null;
      this.consecutiveFailures = 0;
      return false;
    }
    return true;
  }

  /** Milliseconds left before the circuit lets a request through again. */
  retryAfterMs(now = Date.now()): number {
    if (this.openedAt === null) {
      return 0;
    }
    return Math.max(0, CIRCUIT_OPEN_MS - (now - this.openedAt));
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openedAt = null;
  }

  recordFailure(now = Date.now()): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD && this.openedAt === null) {
      this.openedAt = now;
      this.logger.error(
        `Upstream failed ${this.consecutiveFailures} times in a row; failing fast for ${CIRCUIT_OPEN_MS} ms`,
      );
    }
  }
}
