// Kyma_Frontend/src/services/logger.ts
import { invoke } from "@tauri-apps/api/core";

type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

class FrontendLogger {
  private static instance: FrontendLogger;
  private isDev: boolean;
  private errorCount = 0;
  private lastErrorTime = 0;
  private uiLoggingEnabled = true;
  private originalConsoleError = console.error;

  private constructor() {
    this.isDev = import.meta.env.DEV;
    this.setupGlobalHandlers();
  }

  static getInstance(): FrontendLogger {
    if (!FrontendLogger.instance) {
      FrontendLogger.instance = new FrontendLogger();
    }
    return FrontendLogger.instance;
  }

  logUI(component: string, action: string, details?: any) {
    if (!this.uiLoggingEnabled) return;
    this.logInfo(`UI: ${component} - ${action}`, details);
  }

  private setupGlobalHandlers() {
    // Catch unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      const error = event.reason;
      this.logError("Unhandled Promise Rejection", {
        message: error?.message || String(error),
        stack: error?.stack,
        reason: String(event.reason),
      });
    });

    // Catch uncaught exceptions
    window.addEventListener("error", (event) => {
      this.logError("Uncaught Exception", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    });

    // Override console.error — use saved original to avoid infinite recursion
    console.error = (...args) => {
      this.originalConsoleError.apply(console, args);
      this.logError("Console Error", {
        args: args.map((a) => String(a)).join(" "),
      });
    };

    // Log navigation events
    window.addEventListener("beforeunload", () => {
      this.logInfo("Page unloading", { url: window.location.href });
    });
  }

  private async sendToBackend(level: LogLevel, message: string, data?: any) {
    // Rate limit errors to avoid spam (max 10 per second)
    const now = Date.now();
    if (level === "ERROR") {
      if (now - this.lastErrorTime < 100) {
        this.errorCount++;
        if (this.errorCount > 10) {
          return;
        }
      } else {
        this.errorCount = 0;
        this.lastErrorTime = now;
      }
    }

    try {
      const dataStr = data ? JSON.stringify(data) : null;
      await invoke("log_frontend", { level, message, data: dataStr });
    } catch (err) {
      // Use original console to avoid triggering the override
      this.originalConsoleError("[Logger] Failed to send log to backend:", err);
    }
  }

  logError(message: string, data?: any) {
    if (this.isDev) {
      // Use original console.error to avoid infinite recursion
      this.originalConsoleError(`[ERROR] ${message}`, data);
    }
    this.sendToBackend("ERROR", message, data);
  }

  logWarn(message: string, data?: any) {
    if (this.isDev) {
      console.warn(`[WARN] ${message}`, data);
    }
    this.sendToBackend("WARN", message, data);
  }

  logInfo(message: string, data?: any) {
    if (this.isDev) {
      console.log(`[INFO] ${message}`, data);
    }
    if (!this.isDev) {
      return;
    }
    this.sendToBackend("INFO", message, data);
  }

  logDebug(message: string, data?: any) {
    if (this.isDev) {
      console.debug(`[DEBUG] ${message}`, data);
    }
    // Never send DEBUG logs to backend
  }
}

export const logger = FrontendLogger.getInstance();

// Helper function to log Tauri command errors
export function logCommandError(command: string, error: any, args?: any) {
  logger.logError(`Tauri command failed: ${command}`, {
    command,
    error: error?.message || String(error),
    args: args ? JSON.stringify(args).slice(0, 500) : undefined,
  });
}

// Helper function to wrap async functions with logging
export function withLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      logger.logError(`Function failed: ${name}`, { args, error });
      throw error;
    }
  }) as T;
}
