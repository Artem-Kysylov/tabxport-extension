/**
 * Algorithm switcher for table detection
 * Allows runtime switching between different detection algorithms
 */

import { findAllTables } from "../table-detector"
import { detectAllTables } from "./batch-detector"
import { claudeDetectorImproved } from "./platform-detectors/claude-detector-improved"
import { logger } from "./common/logging"
import type { TableDetectionResult } from "./types"

/**
 * Detection mode for table algorithms
 */
export type DetectionMode = 
  | "legacy-only"      // Use only old findAllTables()
  | "new-only"         // Use only new detectAllTables()
  | "improved-only"    // Use only improved algorithm (Claude-specific)
  | "hybrid"           // Use both old and new, merge results
  | "auto"             // Automatically choose best algorithm

/**
 * Configuration for algorithm switching
 */
interface AlgorithmConfig {
  mode: DetectionMode
  claude: {
    useImproved: boolean
    fallbackToOld: boolean
  }
  debug: {
    enabled: boolean
    logComparisons: boolean
    visualMarkers: boolean
  }
}

/**
 * Default configuration
 */
let currentConfig: AlgorithmConfig = {
  mode: "auto",
  claude: {
    useImproved: true,
    fallbackToOld: true
  },
  debug: {
    enabled: false,
    logComparisons: false,
    visualMarkers: false
  }
}

/**
 * Set the detection mode
 */
export const setDetectionMode = (mode: DetectionMode): void => {
  currentConfig.mode = mode
  logger.debug(`Detection mode changed to: ${mode}`)
}

/**
 * Get current detection mode
 */
export const getDetectionMode = (): DetectionMode => {
  return currentConfig.mode
}

/**
 * Update algorithm configuration
 */
export const updateConfig = (config: Partial<AlgorithmConfig>): void => {
  currentConfig = { ...currentConfig, ...config }
  logger.debug("Algorithm configuration updated:", currentConfig)
}

/**
 * Get current configuration
 */
export const getConfig = (): AlgorithmConfig => {
  return { ...currentConfig }
}

/**
 * Smart table detection that uses the best algorithm based on configuration
 */
export const smartTableDetection = async (): Promise<{
  elements: HTMLElement[]
  batchResult?: TableDetectionResult[]
  mode: DetectionMode
  performance: {
    oldTime?: number
    newTime?: number
    improvedTime?: number
  }
}> => {
  const performance: {
    oldTime?: number
    newTime?: number
    improvedTime?: number
  } = {}
  const currentUrl = window.location.href
  const isClaudeAI = currentUrl.includes("claude.ai")

  logger.debug(`Smart table detection starting for URL: ${currentUrl}`)

  switch (currentConfig.mode) {
    case "legacy-only":
      return await runLegacyOnly(performance)
      
    case "new-only":
      return await runNewOnly(performance)
      
    case "improved-only":
      if (isClaudeAI) {
        return await runImprovedOnly(performance)
      } else {
        console.warn("TabXport: Improved mode only available for Claude, falling back to new algorithm")
        return await runNewOnly(performance)
      }
      
    case "hybrid":
      return await runHybrid(performance)
      
    case "auto":
    default:
      return await runAuto(performance, isClaudeAI)
  }
}

/**
 * Run legacy algorithm only
 */
const runLegacyOnly = async (performance: any): Promise<any> => {
  const startTime = Date.now()
  const elements = findAllTables()
  performance.oldTime = Date.now() - startTime
  return { elements, mode: "legacy-only" as DetectionMode, performance }
}

/**
 * Run new algorithm only
 */
const runNewOnly = async (performance: any): Promise<any> => {
  const startTime = Date.now()
  const batchResult = await detectAllTables()
  performance.newTime = Date.now() - startTime
  const elements = batchResult.tables.map(t => t.element)
  return { elements, batchResult: batchResult.tables, mode: "new-only" as DetectionMode, performance }
}

/**
 * Run improved algorithm only (Claude-specific)
 */
const runImprovedOnly = async (performance: any): Promise<any> => {
  const startTime = Date.now()
  const elements = claudeDetectorImproved.findTables()
  performance.improvedTime = Date.now() - startTime
  return { elements, mode: "improved-only" as DetectionMode, performance }
}

/**
 * Run hybrid mode (merge results from multiple algorithms)
 */
const runHybrid = async (performance: any): Promise<any> => {
  const isClaudeAI = window.location.href.includes("claude.ai")
  const [legacyResult, newResult, improvedResult] = await Promise.all([
    runLegacyOnly({}),
    runNewOnly({}),
    isClaudeAI ? runImprovedOnly({}) : Promise.resolve(null)
  ])
  performance.oldTime = legacyResult.performance.oldTime
  performance.newTime = newResult.performance.newTime
  if (improvedResult) performance.improvedTime = improvedResult.performance.improvedTime

  const allElements = [
    ...legacyResult.elements,
    ...newResult.elements,
    ...(improvedResult ? improvedResult.elements : [])
  ]
  const uniqueElements = deduplicateElements(allElements)
  return { elements: uniqueElements, batchResult: newResult.batchResult, mode: "hybrid" as DetectionMode, performance }
}

/**
 * Run auto mode (intelligently choose best algorithm)
 */
const runAuto = async (performance: any, isClaudeAI: boolean): Promise<any> => {
  if (isClaudeAI && currentConfig.claude.useImproved) {
    const result = await runImprovedOnly(performance)
    if (result.elements.length === 0 && currentConfig.claude.fallbackToOld) {
      console.warn("TabXport: Improved mode only available for Claude, falling back to new algorithm")
      const fallbackResult = await runLegacyOnly({})
      performance.oldTime = fallbackResult.performance.oldTime
      return { elements: fallbackResult.elements, mode: "auto" as DetectionMode, performance }
    }
    return { ...result, mode: "auto" as DetectionMode }
  } else {
    // For non-Claude sites or when improved is disabled, use new algorithm
    console.log("TabXport Auto: Using new algorithm")
    return await runNewOnly(performance)
  }
}

/**
 * Deduplicate elements by content and DOM relationships
 */
const deduplicateElements = (elements: HTMLElement[]): HTMLElement[] => {
  const uniqueElements: HTMLElement[] = []
  const processedContent = new Set<string>()
  
  for (const element of elements) {
    // Create content hash
    const content = element.textContent?.trim() || ""
    const contentHash = content.substring(0, 200).replace(/\s+/g, ' ').toLowerCase()
    
    // Skip if content already seen
    if (processedContent.has(contentHash)) {
      continue
    }
    
    // Skip if element is nested within an existing element
    const isNested = uniqueElements.some(existing => 
      existing.contains(element) || element.contains(existing)
    )
    
    if (!isNested) {
      uniqueElements.push(element)
      processedContent.add(contentHash)
    }
  }
  
  return uniqueElements
}

/**
 * Enable debug mode with comparison logging
 */
export const enableDebugMode = (options: {
  logComparisons?: boolean
  visualMarkers?: boolean
} = {}): void => {
  currentConfig.debug = {
    enabled: true,
    logComparisons: options.logComparisons ?? false,
    visualMarkers: options.visualMarkers ?? false
  }
  
  console.log("TabXport Algorithm Switcher: Debug mode enabled", currentConfig.debug)
}

/**
 * Disable debug mode
 */
export const disableDebugMode = (): void => {
  currentConfig.debug.enabled = false
  console.log("TabXport Algorithm Switcher: Debug mode disabled")
}

/**
 * Test all algorithms and return comparison
 */
export const testAllAlgorithms = async (): Promise<{
  legacy: { elements: HTMLElement[], time: number }
  new: { elements: HTMLElement[], time: number }
  improved?: { elements: HTMLElement[], time: number }
  comparison: {
    uniqueInLegacy: number
    uniqueInNew: number
    uniqueInImproved?: number
    commonElements: number
  }
}> => {
  console.log("TabXport Testing: Running all algorithms for comparison...")
  
  const isClaudeAI = window.location.href.includes("claude.ai")
  
  // Test all algorithms
  const [legacyResult, newResult, improvedResult] = await Promise.all([
    runLegacyOnly({}),
    runNewOnly({}),
    isClaudeAI ? runImprovedOnly({}) : Promise.resolve(null)
  ])
  
  // Compare results
  const legacyElements = new Set(legacyResult.elements)
  const newElements = new Set(newResult.elements)
  const improvedElements = improvedResult ? new Set(improvedResult.elements) : null
  
  const uniqueInLegacy = [...legacyElements].filter(el => !newElements.has(el)).length
  const uniqueInNew = [...newElements].filter(el => !legacyElements.has(el)).length
  const commonElements = [...legacyElements].filter(el => newElements.has(el)).length
  
  let uniqueInImproved: number | undefined
  if (improvedElements) {
    uniqueInImproved = [...improvedElements].filter(el => 
      !legacyElements.has(el) && !newElements.has(el)
    ).length
  }
  
  const result = {
    legacy: {
      elements: legacyResult.elements,
      time: legacyResult.performance.oldTime
    },
    new: {
      elements: newResult.elements,
      time: newResult.performance.newTime
    },
    ...(improvedResult && {
      improved: {
        elements: improvedResult.elements,
        time: improvedResult.performance.improvedTime
      }
    }),
    comparison: {
      uniqueInLegacy,
      uniqueInNew,
      ...(uniqueInImproved !== undefined && { uniqueInImproved }),
      commonElements
    }
  }
  
  console.log("TabXport Testing: Algorithm comparison completed:", result.comparison)
  
  return result
}