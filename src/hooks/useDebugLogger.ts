import { useState, useEffect, useRef } from 'react';

export interface DebugLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  data?: any;
}

export const useDebugLogger = () => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const logIdRef = useRef(0);

  const addLog = (level: DebugLog['level'], message: string, data?: any) => {
    const log: DebugLog = {
      id: `log_${++logIdRef.current}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      data
    };
    
    setLogs(prev => [log, ...prev].slice(0, 100)); // Keep only last 100 logs
    
    // Also log to console with appropriate level
    const consoleData = data ? [message, data] : [message];
    switch (level) {
      case 'error':
        console.error(...consoleData);
        break;
      case 'warn':
        console.warn(...consoleData);
        break;
      case 'success':
        console.log(`✅ ${message}`, data);
        break;
      default:
        console.log(...consoleData);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const info = (message: string, data?: any) => addLog('info', message, data);
  const warn = (message: string, data?: any) => addLog('warn', message, data);
  const error = (message: string, data?: any) => addLog('error', message, data);
  const success = (message: string, data?: any) => addLog('success', message, data);

  return {
    logs,
    clearLogs,
    info,
    warn,
    error,
    success
  };
};

// Enhanced console wrapper for debugging video chat
export const createVideoDebugLogger = (prefix: string = '[VideoChat]') => {
  const timestamp = () => new Date().toLocaleTimeString();
  
  return {
    log: (message: string, ...args: any[]) => {
      console.log(`${prefix} ${timestamp()} ${message}`, ...args);
    },
    info: (message: string, ...args: any[]) => {
      console.info(`${prefix} ${timestamp()} ℹ️ ${message}`, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(`${prefix} ${timestamp()} ⚠️ ${message}`, ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(`${prefix} ${timestamp()} ❌ ${message}`, ...args);
    },
    success: (message: string, ...args: any[]) => {
      console.log(`${prefix} ${timestamp()} ✅ ${message}`, ...args);
    },
    debug: (message: string, ...args: any[]) => {
      console.debug(`${prefix} ${timestamp()} 🔍 ${message}`, ...args);
    }
  };
};