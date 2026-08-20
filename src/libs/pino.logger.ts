import pino, { type HttpLogger, type Options } from "pino-http";
import { type Logger } from "pino";

const config = {
  transport: {
    targets: [
      {
        target: "pino-pretty",
        level: "debug",
        options: {
          colorize: true,
          levelFirst: true,
          translateTime: "SYS:standard",
        },
      },
    ],
  },
  level: "debug",
};

class PinoLogger {
  private logger: HttpLogger | null = null;

  createLogger(options: Options = {}): Logger {
    if (!this.logger) {
      this.logger = pino({ ...config, ...options });
    }
    return this.logger.logger;
  }
}

export const pinoLogger = new PinoLogger();
