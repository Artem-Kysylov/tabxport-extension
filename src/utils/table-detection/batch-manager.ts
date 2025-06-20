import { domUtils } from "./common/dom-utils"
import { logger } from "./common/logging"
import type {
  AISource,
  BatchTableManager,
  TableData,
  TableDetectionResult
} from "./types"

/**
 * Private state for batch table management
 */
const createBatchTableState = () => {
  const tables = new Map<string, TableDetectionResult>()
  let lastCleanup = 0
  const CLEANUP_INTERVAL = 5000 // 5 seconds

  return {
    tables,
    lastCleanup,
    CLEANUP_INTERVAL
  }
}

// Global state
const batchState = createBatchTableState()

/**
 * Checks if a table element is still valid and visible
 */
const isValidTableElement = (element: HTMLElement): boolean => {
  // Check if element is still in the DOM
  if (!document.contains(element)) {
    return false
  }

  // Check if element is visible
  if (!domUtils.isVisible(element)) {
    return false
  }

  // Check if element is not a UI element
  if (domUtils.isUIElement(element)) {
    return false
  }

  return true
}

/**
 * Performs periodic cleanup if enough time has passed
 */
const performPeriodicCleanup = (): void => {
  const now = Date.now()
  if (now - batchState.lastCleanup > batchState.CLEANUP_INTERVAL) {
    cleanupBatchTables()
  }
}

/**
 * Adds detected tables to the collection
 */
export const addBatchTables = (tables: TableDetectionResult[]): void => {
  logger.debug(`Adding ${tables.length} tables to batch manager`)

  tables.forEach((table) => {
    // Use table ID as key to prevent duplicates
    const tableId = table.data.id

    // Check if element is still valid and visible
    if (isValidTableElement(table.element)) {
      batchState.tables.set(tableId, table)
      logger.debug(`Added table ${tableId} to batch collection`)
    } else {
      logger.debug(`Skipping invalid table ${tableId}`)
    }
  })

  logger.debug(`Batch manager now contains ${batchState.tables.size} tables`)
}

/**
 * Gets all currently managed tables
 */
export const getAllBatchTables = (): TableDetectionResult[] => {
  performPeriodicCleanup()
  return Array.from(batchState.tables.values())
}

/**
 * Gets tables by their IDs
 */
export const getBatchTablesById = (ids: string[]): TableDetectionResult[] => {
  const results: TableDetectionResult[] = []

  ids.forEach((id) => {
    const table = batchState.tables.get(id)
    if (table && isValidTableElement(table.element)) {
      results.push(table)
    } else {
      logger.warn(`Table ${id} not found or no longer valid`)
    }
  })

  return results
}

/**
 * Removes tables that are no longer valid or visible
 */
export const cleanupBatchTables = (): void => {
  logger.debug("Performing batch table cleanup")
  const initialCount = batchState.tables.size

  // Remove invalid tables
  const toRemove: string[] = []

  batchState.tables.forEach((table, id) => {
    if (!isValidTableElement(table.element)) {
      toRemove.push(id)
    }
  })

  toRemove.forEach((id) => {
    batchState.tables.delete(id)
    logger.debug(`Removed invalid table ${id} from batch collection`)
  })

  const removedCount = toRemove.length
  if (removedCount > 0) {
    logger.debug(
      `Cleanup complete: removed ${removedCount} invalid tables, ${batchState.tables.size} remain`
    )
  }

  batchState.lastCleanup = Date.now()
}

/**
 * Gets the current count of managed tables
 */
export const getBatchTablesCount = (): number => {
  performPeriodicCleanup()
  return batchState.tables.size
}

/**
 * Clears all managed tables
 */
export const clearAllBatchTables = (): void => {
  logger.debug(
    `Clearing all ${batchState.tables.size} tables from batch collection`
  )
  batchState.tables.clear()
}

/**
 * Gets debug information about the current state
 */
export const getBatchTablesDebugInfo = (): {
  count: number
  tableIds: string[]
  lastCleanup: number
} => {
  return {
    count: batchState.tables.size,
    tableIds: Array.from(batchState.tables.keys()),
    lastCleanup: batchState.lastCleanup
  }
}

/**
 * Utility function to create a TableDetectionResult from basic data
 */
export const createTableDetectionResult = (
  element: HTMLElement,
  tableData: TableData
): TableDetectionResult => {
  const rect = element.getBoundingClientRect()

  return {
    element,
    data: tableData,
    position: {
      x: rect.left,
      y: rect.top
    }
  }
}

/**
 * Utility function to generate a batch detection result
 */
export const createBatchDetectionResult = (
  tables: TableDetectionResult[],
  source: AISource,
  chatTitle: string
): import("./types").BatchTableDetectionResult => {
  return {
    tables,
    count: tables.length,
    timestamp: Date.now(),
    source,
    chatTitle
  }
}
