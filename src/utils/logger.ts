/**
 * Logging utility for debugging and tracing.
 * Uses both console and Logger (GAS) for visibility in both local and deployed contexts.
 */

export type LogContext = {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
};

class Logger {
  private context: LogContext = {};

  setContext(ctx: LogContext): void {
    this.context = { ...this.context, ...ctx };
  }

  clearContext(): void {
    this.context = {};
  }

  private format(level: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const contextStr = this.context.requestId
      ? ` [${this.context.requestId}]`
      : "";
    const dataStr = data ? ` ${JSON.stringify(data)}` : "";
    return `[${timestamp}]${contextStr} ${level}: ${message}${dataStr}`;
  }

  debug(message: string, data?: unknown): void {
    const msg = this.format("DEBUG", message, data);
    console.warn(msg);
  }

  info(message: string, data?: unknown): void {
    const msg = this.format("INFO", message, data);
    console.warn(msg);
    // Logger is available in GAS context
    try {
      if (typeof globalThis.Logger !== "undefined") {
        (globalThis as any).Logger.log(msg);
      }
    }
    catch {
      // Ignore if not in GAS context
    }
  }

  warn(message: string, data?: unknown): void {
    const msg = this.format("WARN", message, data);
    console.warn(msg);
    try {
      if (typeof globalThis.Logger !== "undefined") {
        (globalThis as any).Logger.log(msg);
      }
    }
    catch {
      // Ignore if not in GAS context
    }
  }

  error(message: string, data?: unknown): void {
    const msg = this.format("ERROR", message, data);
    console.error(msg);
    try {
      if (typeof globalThis.Logger !== "undefined") {
        (globalThis as any).Logger.log(msg);
      }
    }
    catch {
      // Ignore if not in GAS context
    }
  }
}

export const logger = new Logger();
