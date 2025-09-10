import { PlatformDetector } from "../types"
import { chatGPTDetector } from "./chatgpt-detector"
import { claudeDetector } from "./claude-detector"
import { claudeDetectorImproved } from "./claude-detector-improved"
import { deepseekDetector } from "./deepseek-detector"
import { geminiDetector } from "./gemini-detector"
import { genericDetector } from "./generic-detector"

/**
 * Feature flag for testing improved Claude detector
 */
const USE_IMPROVED_CLAUDE_DETECTOR = true // ✅ ВКЛЮЧЕН после диагностики и исправления

/**
 * Get the appropriate Claude detector based on feature flag
 */
const getClaudeDetector = (): PlatformDetector => {
  if (USE_IMPROVED_CLAUDE_DETECTOR) {
    return claudeDetectorImproved
  } else {
    return claudeDetector
  }
}

/**
 * Get the current Claude detector dynamically
 */
const getCurrentClaudeDetectorDynamic = (): PlatformDetector => {
  return getClaudeDetector()
}

/**
 * List of all available platform detectors
 * Generic detector is last as a fallback
 */
export const platformDetectors: PlatformDetector[] = [
  chatGPTDetector,
  // Use a proxy object to always get the current Claude detector
  {
    canDetect: (url: string) => url.includes("claude.ai"),
    findTables: () => getCurrentClaudeDetectorDynamic().findTables(),
    extractChatTitle: () => getCurrentClaudeDetectorDynamic().extractChatTitle()
  },
  geminiDetector,
  deepseekDetector,
  genericDetector
]

export {
  chatGPTDetector,
  claudeDetector,
  claudeDetectorImproved,
  geminiDetector,
  deepseekDetector,
  genericDetector
}

// Export function to get current Claude detector for testing
export const getCurrentClaudeDetector = getClaudeDetector
