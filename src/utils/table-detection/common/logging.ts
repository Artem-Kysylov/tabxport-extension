import { Logger } from "../types"

/**
 * Consistent logging interface for table detection
 */
export const logger: Logger = {
  debug: (message: string, ...args: any[]): void => {
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
