import { Logger } from "../types"

// Определяем начальное состояние debug-логов безопасно для MV3 (service worker, content-script)
declare const process: any
const initialDebugEnabled = (() => {
  try {
    // 1) Явный глобальный флаг (можно включать/выключать из консоли)
    if (typeof (globalThis as any).__TABXPORT_DEBUG__ === "boolean") {
      return (globalThis as any).__TABXPORT_DEBUG__
    }
    // 2) Локальное хранилище (в content-script)
    if (typeof localStorage !== "undefined") {
      const v = localStorage.getItem("tabxport:debug")
      if (v === "1" || v === "true") return true
    }
    // 3) Переменная окружения (подставляется сборщиком)
    if (typeof process !== "undefined" && process?.env?.NODE_ENV) {
      return process.env.NODE_ENV !== "production"
    }
  } catch {
    // игнорируем любые ошибки сред
  }
  return false
})()

let debugEnabled = initialDebugEnabled

export const isDebugLoggingEnabled = () => debugEnabled
export const setDebugLoggingEnabled = (enabled: boolean) => {
  debugEnabled = enabled
  try {
    if (typeof localStorage !== "undefined") {
      if (enabled) localStorage.setItem("tabxport:debug", "1")
      else localStorage.removeItem("tabxport:debug")
    }
  } catch {
    // игнорируем ошибки localStorage в service worker
  }
  try {
    ;(globalThis as any).__TABXPORT_DEBUG__ = enabled
  } catch {
    // игнорируем
  }
}

/**
 * Consistent logging interface for table detection
 */
export const logger: Logger = {
  debug: (message: string, ...args: any[]): void => {
    if (!debugEnabled) return
    console.log(`TabXport: ${message}`, ...args)
  },

  info: (message: string, ...args: any[]): void => {
    console.info(`TabXport: ${message}`, ...args)
  },

  warn: (message: string, ...args: any[]): void => {
    console.warn(`TabXport: ${message}`, ...args)
  },

  error: (message: string, ...args: any[]): void => {
    console.error(`TabXport: ${message}`, ...args)
  }
}
