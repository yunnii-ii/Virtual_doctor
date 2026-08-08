const isDebug = __DEV__;

const Logger = {
  log: (message, data = null) => {
    if (isDebug) {
      console.log(`[LOG] ${new Date().toLocaleTimeString()}: ${message}`, data || '');
    }
  },
  warn: (message, data = null) => {
    if (isDebug) {
      console.warn(`[WARN] ${new Date().toLocaleTimeString()}: ${message}`, data || '');
    }
  },
  error: (message, error = null) => {
    if (isDebug) {
      console.error(`[ERROR] ${new Date().toLocaleTimeString()}: ${message}`, error || '');
    }
  },
  api: (method, url, data = null) => {
    if (isDebug) {
      console.log(`[API CALL] ${method.toUpperCase()} ${url}`, data ? { payload: data } : '');
    }
  }
};

export default Logger;
