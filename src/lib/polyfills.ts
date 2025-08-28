// Browser polyfills for Node.js modules needed by simple-peer

// Polyfill for process in browser
if (typeof globalThis.process === 'undefined') {
  globalThis.process = {
    env: {
      NODE_DEBUG: undefined,
      NODE_ENV: 'development'
    },
    nextTick: (callback: () => void) => setTimeout(callback, 0),
    browser: true,
    version: '16.0.0',
    platform: 'browser',
    argv: [],
    pid: 0,
    cwd: () => '/',
    chdir: () => {},
    stderr: { write: () => {} },
    stdout: { write: () => {} },
    stdin: { read: () => {} }
  } as any;
}

// Ensure global is available
if (typeof globalThis.global === 'undefined') {
  globalThis.global = globalThis;
}

// Add debuglog function to util
if (typeof globalThis.util === 'undefined') {
  globalThis.util = {
    debuglog: () => () => {},
    format: (f: string, ...args: any[]) => f.replace(/%[sdj%]/g, (x) => {
      if (args.length === 0) return x;
      switch (x) {
        case '%s': return String(args.shift());
        case '%d': return Number(args.shift());
        case '%j': return JSON.stringify(args.shift());
        case '%%': return '%';
        default: return x;
      }
    })
  } as any;
}

// Console polyfill for environments without console
if (typeof console === 'undefined') {
  globalThis.console = {
    log: () => {},
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {}
  } as any;
}