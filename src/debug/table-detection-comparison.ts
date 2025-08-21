/**
 * Diagnostic module for comparing old and new table detection algorithms
 * Helps identify discrepancies between findAllTables() and detectAllTables()
 */

import { findAllTables } from "../utils/table-detector"
import { detectAllTables } from "../utils/table-detection/batch-detector"
import { claudeDetectorImproved } from "../utils/table-detection/platform-detectors/claude-detector-improved"
import { claudeDetector } from "../utils/table-detection/platform-detectors/claude-detector"
import type { TableDetectionResult } from "../utils/table-detection/types"

export interface TableDetectionComparison {
  oldAlgorithm: {
    elements: HTMLElement[]
    count: number
  }
  newAlgorithm: {
    results: TableDetectionResult[]
    count: number
  }
  improvedAlgorithm?: {
    elements: HTMLElement[]
    count: number
  }
  discrepancies: {
    extraInNew: HTMLElement[]
    extraInOld: HTMLElement[]
    extraInImproved: HTMLElement[]
    contentMismatch: Array<{
      oldElement: HTMLElement
      newElement: HTMLElement
      reason: string
    }>
  }
}

/**
 * Compare all three table detection algorithms for Claude
 */
export const compareClaudeTableDetectionAlgorithms = async (): Promise<TableDetectionComparison> => {
  console.log("🔍 Starting Claude table detection algorithm comparison (3-way)...")
  
  // Run old algorithm
  console.log("📊 Running old algorithm (findAllTables)...")
  const oldElements = findAllTables()
  console.log(`Old algorithm found ${oldElements.length} elements`)
  
  // Run new algorithm
  console.log("🆕 Running new algorithm (detectAllTables)...")
  const newResults = await detectAllTables()
  const newElements = newResults.tables.map(t => t.element)
  console.log(`New algorithm found ${newElements.length} elements`)
  
  // Run improved algorithm (Claude-specific)
  let improvedElements: HTMLElement[] = []
  if (window.location.href.includes("claude.ai")) {
    console.log("✨ Running improved Claude-specific algorithm...")
    improvedElements = claudeDetectorImproved.findTables()
    console.log(`Improved algorithm found ${improvedElements.length} elements`)
  }
  
  // Analyze discrepancies
  const extraInNew: HTMLElement[] = []
  const extraInOld: HTMLElement[] = []
  const extraInImproved: HTMLElement[] = []
  const contentMismatch: Array<{
    oldElement: HTMLElement
    newElement: HTMLElement
    reason: string
  }> = []
  
  // Find elements only in new algorithm
  for (const newElement of newElements) {
    const foundInOld = oldElements.some(oldElement => 
      oldElement === newElement || 
      oldElement.contains(newElement) || 
      newElement.contains(oldElement)
    )
    
    if (!foundInOld) {
      extraInNew.push(newElement)
      console.log("❗ Element found only in NEW algorithm:", {
        tagName: newElement.tagName,
        className: newElement.className,
        textPreview: newElement.textContent?.substring(0, 100) + "...",
        position: getElementPosition(newElement)
      })
    }
  }
  
  // Find elements only in old algorithm
  for (const oldElement of oldElements) {
    const foundInNew = newElements.some(newElement => 
      newElement === oldElement || 
      newElement.contains(oldElement) || 
      oldElement.contains(newElement)
    )
    
    if (!foundInNew) {
      extraInOld.push(oldElement)
      console.log("❗ Element found only in OLD algorithm:", {
        tagName: oldElement.tagName,
        className: oldElement.className,
        textPreview: oldElement.textContent?.substring(0, 100) + "...",
        position: getElementPosition(oldElement)
      })
    }
  }
  
  // Find elements only in improved algorithm (compared to both old and new)
  for (const improvedElement of improvedElements) {
    const foundInOld = oldElements.some(oldElement => 
      oldElement === improvedElement || 
      oldElement.contains(improvedElement) || 
      improvedElement.contains(oldElement)
    )
    
    const foundInNew = newElements.some(newElement => 
      newElement === improvedElement || 
      newElement.contains(improvedElement) || 
      improvedElement.contains(newElement)
    )
    
    if (!foundInOld && !foundInNew) {
      extraInImproved.push(improvedElement)
      console.log("✨ Element found only in IMPROVED algorithm:", {
        tagName: improvedElement.tagName,
        className: improvedElement.className,
        textPreview: improvedElement.textContent?.substring(0, 100) + "...",
        position: getElementPosition(improvedElement)
      })
    }
  }
  
  // Log summary
  console.log(`📈 Three-way algorithm comparison summary:`)
  console.log(`   Old algorithm: ${oldElements.length} elements`)
  console.log(`   New algorithm: ${newElements.length} elements`)
  console.log(`   Improved algorithm: ${improvedElements.length} elements`)
  console.log(`   Extra in new: ${extraInNew.length} elements`)
  console.log(`   Extra in old: ${extraInOld.length} elements`)
  console.log(`   Extra in improved: ${extraInImproved.length} elements`)
  console.log(`   Content mismatches: ${contentMismatch.length}`)
  
  return {
    oldAlgorithm: {
      elements: oldElements,
      count: oldElements.length
    },
    newAlgorithm: {
      results: newResults.tables,
      count: newResults.tables.length
    },
    improvedAlgorithm: {
      elements: improvedElements,
      count: improvedElements.length
    },
    discrepancies: {
      extraInNew,
      extraInOld,
      extraInImproved,
      contentMismatch
    }
  }
}

/**
 * Compare both table detection algorithms
 */
export const compareTableDetectionAlgorithms = async (): Promise<TableDetectionComparison> => {
  // For Claude, use the three-way comparison
  if (window.location.href.includes("claude.ai")) {
    return compareClaudeTableDetectionAlgorithms()
  }
  
  console.log("🔍 Starting table detection algorithm comparison...")
  
  // Run old algorithm
  console.log("📊 Running old algorithm (findAllTables)...")
  const oldElements = findAllTables()
  console.log(`Old algorithm found ${oldElements.length} elements`)
  
  // Run new algorithm
  console.log("🆕 Running new algorithm (detectAllTables)...")
  const newResults = await detectAllTables()
  const newElements = newResults.tables.map(t => t.element)
  console.log(`New algorithm found ${newElements.length} elements`)
  
  // Analyze discrepancies
  const extraInNew: HTMLElement[] = []
  const extraInOld: HTMLElement[] = []
  const contentMismatch: Array<{
    oldElement: HTMLElement
    newElement: HTMLElement
    reason: string
  }> = []
  
  // Find elements only in new algorithm
  for (const newElement of newElements) {
    const foundInOld = oldElements.some(oldElement => 
      oldElement === newElement || 
      oldElement.contains(newElement) || 
      newElement.contains(oldElement)
    )
    
    if (!foundInOld) {
      extraInNew.push(newElement)
      console.log("❗ Element found only in NEW algorithm:", {
        tagName: newElement.tagName,
        className: newElement.className,
        textPreview: newElement.textContent?.substring(0, 100) + "...",
        position: getElementPosition(newElement)
      })
    }
  }
  
  // Find elements only in old algorithm
  for (const oldElement of oldElements) {
    const foundInNew = newElements.some(newElement => 
      newElement === oldElement || 
      newElement.contains(oldElement) || 
      oldElement.contains(newElement)
    )
    
    if (!foundInNew) {
      extraInOld.push(oldElement)
      console.log("❗ Element found only in OLD algorithm:", {
        tagName: oldElement.tagName,
        className: oldElement.className,
        textPreview: oldElement.textContent?.substring(0, 100) + "...",
        position: getElementPosition(oldElement)
      })
    }
  }
  
  // Log summary
  console.log(`📈 Algorithm comparison summary:`)
  console.log(`   Old algorithm: ${oldElements.length} elements`)
  console.log(`   New algorithm: ${newElements.length} elements`)
  console.log(`   Extra in new: ${extraInNew.length} elements`)
  console.log(`   Extra in old: ${extraInOld.length} elements`)
  console.log(`   Content mismatches: ${contentMismatch.length}`)
  
  return {
    oldAlgorithm: {
      elements: oldElements,
      count: oldElements.length
    },
    newAlgorithm: {
      results: newResults.tables,
      count: newResults.tables.length
    },
    discrepancies: {
      extraInNew,
      extraInOld,
      extraInImproved: [],
      contentMismatch
    }
  }
}

/**
 * Get human-readable position of element in DOM
 */
const getElementPosition = (element: HTMLElement): string => {
  const rect = element.getBoundingClientRect()
  return `x:${Math.round(rect.x)}, y:${Math.round(rect.y)}, w:${Math.round(rect.width)}, h:${Math.round(rect.height)}`
}

/**
 * Analyze specific element for table content
 */
export const analyzeElementContent = (element: HTMLElement): {
  hasTableContent: boolean
  contentType: 'html' | 'markdown' | 'text' | 'mixed' | 'none'
  tableLines: string[]
  confidence: number
  issues: string[]
} => {
  const text = element.textContent || ""
  const innerHTML = element.innerHTML || ""
  const issues: string[] = []
  
  // Check for HTML table
  if (element.tagName === 'TABLE' || element.querySelector('table')) {
    const tableEl =
      element.tagName === 'TABLE'
        ? (element as HTMLTableElement)
        : (element.querySelector('table') as HTMLTableElement | null)

    return {
      hasTableContent: true,
      contentType: 'html',
      tableLines: [],
      confidence: 0.95,
      issues: tableEl && tableEl.rows.length === 0 ? ['Empty table'] : []
    }
  }
  
  // Check for markdown/text table
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  const tableLines = lines.filter(line => 
    line.includes('|') && line.split('|').length >= 3
  )
  
  if (tableLines.length >= 2) {
    const validLines = tableLines.filter(line => {
      const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0)
      return cells.length >= 2 && cells.some(cell => cell.length > 1)
    })
    
    if (validLines.length < 2) {
      issues.push('Insufficient valid table lines')
    }
    
    // Check for separator line (markdown table indicator)
    const hasSeparator = tableLines.some(line => 
      line.includes('-') && line.split('|').every(cell => 
        cell.trim() === '' || /^-+$/.test(cell.trim()) || /^:-+:?$/.test(cell.trim())
      )
    )
    
    const confidence = (validLines.length / tableLines.length) * 
                      (hasSeparator ? 0.9 : 0.7) * 
                      Math.min(1, validLines.length / 3)
    
    return {
      hasTableContent: validLines.length >= 2,
      contentType: hasSeparator ? 'markdown' : 'text',
      tableLines: validLines,
      confidence,
      issues
    }
  }
  
  return {
    hasTableContent: false,
    contentType: 'none',
    tableLines: [],
    confidence: 0,
    issues: ['No table content detected']
  }
}

/**
 * Add visual markers to problematic elements for debugging
 */
export const highlightDiscrepancies = (comparison: TableDetectionComparison): void => {
  // Add red border to elements found only in new algorithm
  comparison.discrepancies.extraInNew.forEach((element, index) => {
    addDebugMarker(element, 'red', `NEW ONLY ${index + 1}`, `new-only-${index}`)
  })
  
  // Add blue border to elements found only in old algorithm
  comparison.discrepancies.extraInOld.forEach((element, index) => {
    addDebugMarker(element, 'blue', `OLD ONLY ${index + 1}`, `old-only-${index}`)
  })
  
  // Add green border to elements found only in improved algorithm
  comparison.discrepancies.extraInImproved.forEach((element, index) => {
    addDebugMarker(element, 'green', `IMPROVED ONLY ${index + 1}`, `improved-only-${index}`)
  })
  
  console.log("🎨 Visual debugging markers added to page")
}

/**
 * Add a debug marker to an element
 */
const addDebugMarker = (element: HTMLElement, color: string, text: string, id: string): void => {
  const marker = document.createElement('div')
  marker.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 3px solid ${color};
    pointer-events: none;
    z-index: 10000;
    background: rgba(${color === 'red' ? '255, 0, 0' : color === 'blue' ? '0, 0, 255' : '0, 255, 0'}, 0.1);
    font-size: 12px;
    font-weight: bold;
    color: ${color};
    padding: 2px;
  `
  marker.setAttribute('data-tablexport-debug', id)
  marker.textContent = text
  
  // Position relative to element
  const rect = element.getBoundingClientRect()
  marker.style.position = 'fixed'
  marker.style.top = rect.top + 'px'
  marker.style.left = rect.left + 'px'
  marker.style.width = rect.width + 'px'
  marker.style.height = rect.height + 'px'
  
  document.body.appendChild(marker)
}

/**
 * Remove all debug markers
 */
export const clearDebugMarkers = (): void => {
  const markers = document.querySelectorAll('[data-tablexport-debug]')
  markers.forEach(marker => marker.remove())
  console.log(`🧹 Removed ${markers.length} debug markers`)
}

/**
 * Run complete diagnosis with visual highlighting
 */
export const runCompleteTableDiagnosis = async (): Promise<TableDetectionComparison> => {
  console.log("🚀 Starting complete table detection diagnosis...")
  
  // Clear any existing markers
  clearDebugMarkers()
  
  // Run comparison
  const comparison = await compareTableDetectionAlgorithms()
  
  // Analyze each problematic element
  console.log("🔬 Analyzing problematic elements...")
  
  comparison.discrepancies.extraInNew.forEach((element, index) => {
    const analysis = analyzeElementContent(element)
    console.log(`❌ Extra in NEW [${index}]:`, {
      element: element.tagName + (element.className ? `.${element.className}` : ''),
      analysis,
      textPreview: element.textContent?.substring(0, 150) + "..."
    })
  })
  
  comparison.discrepancies.extraInOld.forEach((element, index) => {
    const analysis = analyzeElementContent(element)
    console.log(`✅ Extra in OLD [${index}]:`, {
      element: element.tagName + (element.className ? `.${element.className}` : ''),
      analysis,
      textPreview: element.textContent?.substring(0, 150) + "..."
    })
  })
  
  comparison.discrepancies.extraInImproved.forEach((element, index) => {
    const analysis = analyzeElementContent(element)
    console.log(`✨ Extra in IMPROVED [${index}]:`, {
      element: element.tagName + (element.className ? `.${element.className}` : ''),
      analysis,
      textPreview: element.textContent?.substring(0, 150) + "..."
    })
  })
  
  // Add visual markers
  highlightDiscrepancies(comparison)
  
  return comparison
}