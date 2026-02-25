const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

export const debug = {
  log: (...args: any[]) => {
    if (DEBUG_MODE) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (DEBUG_MODE) {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (DEBUG_MODE) {
      console.warn(...args);
    }
  }
}; 