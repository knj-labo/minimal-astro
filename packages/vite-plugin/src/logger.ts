interface LogContext {
  [key: string]: any;
}

export function createContextualLogger(context: LogContext) {
  const prefix = Object.entries(context)
    .map(([key, value]) => `[${value}]`)
    .join(' ');

  return {
    debug: (message: string, data?: any) => {
      if (process.env.DEBUG) {
        console.debug(`${prefix} [DEBUG] ${message}`, data || '');
      }
    },
    info: (message: string, data?: any) => {
      console.info(`${prefix} [INFO] ${message}`, data || '');
    },
    warn: (message: string, data?: any) => {
      console.warn(`${prefix} [WARN] ${message}`, data || '');
    },
    error: (message: string, error?: Error | any, data?: any) => {
      console.error(`${prefix} [ERROR] ${message}`, error || '', data || '');
    },
  };
}