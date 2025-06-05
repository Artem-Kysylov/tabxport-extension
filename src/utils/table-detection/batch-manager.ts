import type { BatchTableManager, TableDetectionResult, TableData, AISource } from './types';
import { logger } from './common/logging';
import { domUtils } from './common/dom-utils';

/**
 * Implementation of BatchTableManager for managing multiple tables
 */
class BatchTableManagerImpl implements BatchTableManager {
  private tables: Map<string, TableDetectionResult> = new Map();
  private lastCleanup: number = 0;
  private readonly CLEANUP_INTERVAL = 5000; // 5 seconds

  /**
   * Adds detected tables to the collection
   */
  addTables(tables: TableDetectionResult[]): void {
    logger.debug(`Adding ${tables.length} tables to batch manager`);
    
    tables.forEach(table => {
      // Use table ID as key to prevent duplicates
      const tableId = table.data.id;
      
      // Check if element is still valid and visible
      if (this.isValidTableElement(table.element)) {
        this.tables.set(tableId, table);
        logger.debug(`Added table ${tableId} to batch collection`);
      } else {
        logger.debug(`Skipping invalid table ${tableId}`);
      }
    });

    logger.debug(`Batch manager now contains ${this.tables.size} tables`);
  }

  /**
   * Gets all currently managed tables
   */
  getAllTables(): TableDetectionResult[] {
    this.performPeriodicCleanup();
    return Array.from(this.tables.values());
  }

  /**
   * Gets tables by their IDs
   */
  getTablesById(ids: string[]): TableDetectionResult[] {
    const results: TableDetectionResult[] = [];
    
    ids.forEach(id => {
      const table = this.tables.get(id);
      if (table && this.isValidTableElement(table.element)) {
        results.push(table);
      } else {
        logger.warn(`Table ${id} not found or no longer valid`);
      }
    });

    return results;
  }

  /**
   * Removes tables that are no longer valid or visible
   */
  cleanup(): void {
    logger.debug('Performing batch table cleanup');
    const initialCount = this.tables.size;
    
    // Remove invalid tables
    const toRemove: string[] = [];
    
    this.tables.forEach((table, id) => {
      if (!this.isValidTableElement(table.element)) {
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => {
      this.tables.delete(id);
      logger.debug(`Removed invalid table ${id} from batch collection`);
    });

    const removedCount = toRemove.length;
    if (removedCount > 0) {
      logger.debug(`Cleanup complete: removed ${removedCount} invalid tables, ${this.tables.size} remain`);
    }

    this.lastCleanup = Date.now();
  }

  /**
   * Gets the current count of managed tables
   */
  getCount(): number {
    this.performPeriodicCleanup();
    return this.tables.size;
  }

  /**
   * Clears all managed tables
   */
  clear(): void {
    logger.debug(`Clearing all ${this.tables.size} tables from batch collection`);
    this.tables.clear();
  }

  /**
   * Checks if a table element is still valid and visible
   */
  private isValidTableElement(element: HTMLElement): boolean {
    // Check if element is still in the DOM
    if (!document.contains(element)) {
      return false;
    }

    // Check if element is visible
    if (!domUtils.isVisible(element)) {
      return false;
    }

    // Check if element is not a UI element
    if (domUtils.isUIElement(element)) {
      return false;
    }

    return true;
  }

  /**
   * Performs periodic cleanup if enough time has passed
   */
  private performPeriodicCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup > this.CLEANUP_INTERVAL) {
      this.cleanup();
    }
  }

  /**
   * Gets debug information about the current state
   */
  getDebugInfo(): { count: number; tableIds: string[]; lastCleanup: number } {
    return {
      count: this.tables.size,
      tableIds: Array.from(this.tables.keys()),
      lastCleanup: this.lastCleanup
    };
  }
}

/**
 * Singleton instance of BatchTableManager
 */
export const batchTableManager = new BatchTableManagerImpl();

/**
 * Utility function to create a TableDetectionResult from basic data
 */
export const createTableDetectionResult = (
  element: HTMLElement,
  tableData: TableData
): TableDetectionResult => {
  const rect = element.getBoundingClientRect();
  
  return {
    element,
    data: tableData,
    position: {
      x: rect.left,
      y: rect.top
    }
  };
};

/**
 * Utility function to generate a batch detection result
 */
export const createBatchDetectionResult = (
  tables: TableDetectionResult[],
  source: AISource,
  chatTitle: string
): import('./types').BatchTableDetectionResult => {
  return {
    tables,
    count: tables.length,
    timestamp: Date.now(),
    source,
    chatTitle
  };
}; 