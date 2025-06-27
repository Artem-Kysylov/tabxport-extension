/**
 * Force refresh utility for batch table detection
 * Clears all caches and forces re-detection
 */

import { clearAllBatchTables } from "./batch-manager"
import { detectAllTables } from "./batch-detector"
import { updateBatchButton } from "../../contents/components/batch-export-button"

/**
 * Force complete refresh of table detection
 */
export const forceRefreshTableDetection = async (): Promise<void> => {
  console.log("🔄 TabXport: Force refreshing table detection...")
  
  // Clear all existing batch tables
  clearAllBatchTables()
  
  // Wait a bit for cleanup
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Re-run detection
  const batchResult = await detectAllTables()
  
  // Update batch button
  updateBatchButton(batchResult)
  
  console.log(`✅ TabXport: Force refresh complete - found ${batchResult.count} tables`)
  
  return Promise.resolve()
}

/**
 * Add global force refresh function
 */
if (typeof window !== 'undefined') {
  (window as any).TabXportForceRefresh = forceRefreshTableDetection
  console.log("🔄 Added global function: window.TabXportForceRefresh()")
} 