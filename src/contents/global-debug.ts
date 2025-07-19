/**
 * Global debug interface for browser testing
 * Provides window.TabXportDebug object with debugging functions
 */

import { runCompleteTableDiagnosis, clearDebugMarkers } from "../debug/table-detection-comparison"
import { 
  smartTableDetection, 
  setDetectionMode, 
  getDetectionMode,
  enableDebugMode,
  disableDebugMode,
  testAllAlgorithms,
  updateConfig,
  getConfig,
  type DetectionMode
} from "../utils/table-detection/algorithm-switcher"

// Global debug interface
declare global {
  interface Window {
    TabXportDebug: {
      // Algorithm testing
      testAlgorithms: () => Promise<any>
      runDiagnosis: () => Promise<any>
      
      // Mode switching
      setMode: (mode: DetectionMode) => void
      getMode: () => DetectionMode
      
      // Debug controls
      enableDebug: (options?: { logComparisons?: boolean, visualMarkers?: boolean }) => void
      disableDebug: () => void
      clearMarkers: () => void
      
      // Configuration
      getConfig: () => any
      updateConfig: (config: any) => void
      
      // Quick actions
      useImproved: () => void
      useLegacy: () => void
      useNew: () => void
      useHybrid: () => void
      useAuto: () => void
      
      // Platform detectors
      enableImprovedClaude: () => void
      disableImprovedClaude: () => void
      
      // Batch export testing
      testBatchButtonRefresh: () => Promise<void>
      
      // Utilities
      help: () => void
      version: string
      
      // Simulate settings change
      simulateSettingsChange: (destination: "download" | "google_drive") => Promise<void>
      
      // Test Google Drive
      testGoogleDrive: () => Promise<void>
      
      // Check Google Drive settings
      checkGoogleDriveSettings: () => Promise<void>
      
      // Quick Google Drive auth check
      checkAuth: () => Promise<boolean>
      
      // Force open popup for authentication
      openPopupForAuth: () => void
      
      // Test extension context health
      testExtensionContext: () => Promise<boolean>
      
      // Test storage with error handling
      testStorageWithErrorHandling: () => Promise<{ writeSuccess: boolean; readSuccess: boolean; dataMatches: boolean }>
      
      // Comprehensive extension health check
      extensionHealthCheck: () => Promise<{ contextHealth: boolean; storageHealth: boolean; authHealth: boolean; overallHealth: boolean }>
      
      // Limit warning testing functions (added by debug-limit-warnings.js)
      testLimitWarnings?: {
        showLimitExceeded: () => void
        showLimitWarning1: () => void
        showLimitWarning2: () => void
        showLimitWarning3: () => void
        showLimitWarning4: () => void
        hideWarning: () => void
        help: () => void
      }
    }
    
    // Temporary debug interface used in dom-observer.ts
    TabXportDebugTemp?: {
      runDiagnosis: () => Promise<any>
      findOldTables: () => HTMLElement[]
      findNewTables: () => Promise<any>
      highlightTables: () => void
      clearHighlights: () => void
    }
  }
}

/**
 * Initialize global debug interface
 */
export const initializeGlobalDebug = (): void => {
  window.TabXportDebug = {
    // Algorithm testing
    testAlgorithms: async () => {
      console.log("🧪 TabXport: Testing all algorithms...")
      return await testAllAlgorithms()
    },
    
    runDiagnosis: async () => {
      console.log("🔬 TabXport: Running complete diagnosis...")
      return await runCompleteTableDiagnosis()
    },
    
    // Mode switching
    setMode: (mode: DetectionMode) => {
      console.log(`🔧 TabXport: Setting detection mode to ${mode}`)
      setDetectionMode(mode)
    },
    
    getMode: () => {
      const mode = getDetectionMode()
      console.log(`📊 TabXport: Current detection mode is ${mode}`)
      return mode
    },
    
    // Debug controls
    enableDebug: (options = {}) => {
      console.log("🐛 TabXport: Enabling debug mode...")
      enableDebugMode(options)
    },
    
    disableDebug: () => {
      console.log("🐛 TabXport: Disabling debug mode...")
      disableDebugMode()
    },
    
    clearMarkers: () => {
      console.log("🧹 TabXport: Clearing debug markers...")
      clearDebugMarkers()
    },
    
    // Configuration
    getConfig: () => {
      const config = getConfig()
      console.log("⚙️  TabXport: Current configuration:", config)
      return config
    },
    
    updateConfig: (config: any) => {
      console.log("⚙️  TabXport: Updating configuration:", config)
      updateConfig(config)
    },
    
    // Quick actions
    useImproved: () => {
      console.log("✨ TabXport: Switching to improved algorithm")
      setDetectionMode("improved-only")
    },
    
    useLegacy: () => {
      console.log("📊 TabXport: Switching to legacy algorithm")
      setDetectionMode("legacy-only")
    },
    
    useNew: () => {
      console.log("🆕 TabXport: Switching to new algorithm")
      setDetectionMode("new-only")
    },
    
    useHybrid: () => {
      console.log("🔄 TabXport: Switching to hybrid mode")
      setDetectionMode("hybrid")
    },
    
    useAuto: () => {
      console.log("🤖 TabXport: Switching to auto mode")
      setDetectionMode("auto")
    },
    
    // Platform detectors
    enableImprovedClaude: () => {
      console.log("✨ TabXport: Enabling improved Claude detector")
      updateConfig({
        claude: { useImproved: true, fallbackToOld: true }
      })
    },
    
    disableImprovedClaude: () => {
      console.log("📊 TabXport: Disabling improved Claude detector")
      updateConfig({
        claude: { useImproved: false, fallbackToOld: true }
      })
    },
    
    // Batch export testing
    testBatchButtonRefresh: async () => {
      console.log("🧪 TESTING: Batch button refresh")
      try {
        const { refreshAllBatchExportButtons } = await import("./components/batch-export-button")
        await refreshAllBatchExportButtons()
        console.log("✅ Test completed successfully")
      } catch (error: unknown) {
        console.error("❌ Test failed:", error)
      }
    },
    
    // Simulate settings change
    simulateSettingsChange: async (destination: "download" | "google_drive") => {
      console.log(`🎭 SIMULATING: Settings change to ${destination}`)
      try {
        // Save setting
        await chrome.storage.sync.set({ defaultDestination: destination })
        console.log(`💾 Saved destination: ${destination}`)
        
        // Trigger refresh
        const { refreshAllBatchExportButtons } = await import("./components/batch-export-button")
        await refreshAllBatchExportButtons()
        console.log("🔄 Triggered button refresh")
        
        console.log("✅ Simulation completed successfully")
      } catch (error: unknown) {
        console.error("❌ Simulation failed:", error)
      }
    },
    
    // Utilities
    help: () => {
      console.log(`
🚀 TabXport Debug Console - Commands Available:

📋 ALGORITHM TESTING:
   TabXportDebug.testAlgorithms()     - Test all detection algorithms
   TabXportDebug.runDiagnosis()       - Run complete table diagnosis

🔧 MODE SWITCHING:
   TabXportDebug.setMode(mode)        - Set detection mode
   TabXportDebug.getMode()            - Get current mode
   
   Quick modes:
   TabXportDebug.useLegacy()          - Use legacy algorithm only
   TabXportDebug.useNew()             - Use new algorithm only  
   TabXportDebug.useImproved()        - Use improved algorithm only
   TabXportDebug.useHybrid()          - Use hybrid mode (all algorithms)
   TabXportDebug.useAuto()            - Use auto mode (smart selection)

🐛 DEBUG CONTROLS:
   TabXportDebug.enableDebug()        - Enable debug mode
   TabXportDebug.disableDebug()       - Disable debug mode
   TabXportDebug.clearMarkers()       - Clear visual debug markers

⚙️  CONFIGURATION:
   TabXportDebug.getConfig()          - Show current configuration
   TabXportDebug.updateConfig(cfg)    - Update configuration

🔬 CLAUDE SPECIFIC:
   TabXportDebug.enableImprovedClaude()  - Enable improved Claude detector
   TabXportDebug.disableImprovedClaude() - Disable improved Claude detector

🔄 BATCH EXPORT:
   TabXportDebug.testBatchButtonRefresh() - Test batch button refresh functionality

📖 HELP:
   TabXportDebug.help()               - Show this help message

Example usage:
   TabXportDebug.runDiagnosis()       // See what's wrong
   TabXportDebug.useImproved()        // Try improved algorithm
   TabXportDebug.testAlgorithms()     // Compare all algorithms
      `)
    },
    
    version: "1.0.0-debug",
    
    // Test Google Drive
    testGoogleDrive: async () => {
      console.log("🧪 TESTING: Google Drive integration")
      try {
        // Проверим аутентификацию
        console.log("🔐 Checking Google authentication...")
        const authResult = await chrome.storage.sync.get(['googleToken', 'googleRefreshToken'])
        console.log("🔍 Auth tokens present:", {
          hasToken: !!authResult.googleToken,
          hasRefreshToken: !!authResult.googleRefreshToken,
          tokenLength: authResult.googleToken?.length || 0
        })
        
        if (!authResult.googleToken) {
          console.warn("⚠️ No Google token found - user needs to authenticate")
          return
        }
        
        // Попробуем создать тестовый файл
        console.log("📝 Creating test CSV content...")
        const testData = "Name,Value\nTest,123\nExample,456"
        const blob = new Blob([testData], { type: 'text/csv' })
        
        console.log("☁️ Attempting test upload to Google Drive...")
        const { googleDriveService } = await import("../lib/google-drive-api")
        
        const result = await googleDriveService.uploadFile({
          filename: `TabXport_Test_${Date.now()}.csv`,
          content: blob,
          mimeType: 'text/csv'
        })
        
        console.log("📤 Test upload result:", result)
        
        if (result.success) {
          console.log("✅ Google Drive test successful!")
          console.log(`🔗 File ID: ${result.fileId}`)
          console.log(`🌐 View: ${result.webViewLink}`)
        } else {
          console.error("❌ Google Drive test failed:", result.error)
        }
        
      } catch (error: unknown) {
        console.error("💥 Google Drive test error:", error)
      }
    },

    // Check current Google Drive settings
    checkGoogleDriveSettings: async () => {
      console.log("🔍 CHECKING: Current Google Drive settings")
      try {
        // Check extension settings
        const settings = await chrome.storage.sync.get([
          'defaultDestination', 
          'tablexport_user_settings'
        ])
        
        // Import authService for auth state
        const { authService } = await import('../lib/supabase/auth-service')
        const authState = authService.getCurrentState()
        const googleToken = authService.getGoogleToken()
        
        console.log("📋 Current settings:", {
          defaultDestination: settings.defaultDestination,
          userSettings: settings.tablexport_user_settings,
          authState: {
            isAuthenticated: authState.isAuthenticated,
            hasGoogleAccess: authState.hasGoogleAccess,
            hasGoogleToken: !!googleToken
          }
        })
        
      } catch (error: unknown) {
        console.error("❌ Error checking settings:", error)
      }
    },

    // Quick Google Drive auth check
    checkAuth: async () => {
      console.log("🔐 QUICK AUTH CHECK")
      try {
        // Import authService dynamically to avoid circular dependencies
        const { authService } = await import('../lib/supabase/auth-service')
        
        const authState = authService.getCurrentState()
        const googleToken = authService.getGoogleToken()
        
        console.log("📋 Auth status via authService:", {
          isAuthenticated: authState.isAuthenticated,
          hasGoogleAccess: authState.hasGoogleAccess,
          hasUser: !!authState.user,
          hasSession: !!authState.session,
          hasGoogleToken: !!googleToken,
          tokenLength: googleToken?.length || 0
        })
        
        if (!authState.isAuthenticated) {
          console.warn("⚠️ USER NOT AUTHENTICATED")
          console.log("📝 To fix:")
          console.log("1. Open extension popup")
          console.log("2. Click 'Sign In' or 'Connect Google'")
          console.log("3. Complete authentication flow")
          return false
        }
        
        if (!authState.hasGoogleAccess || !googleToken) {
          console.warn("⚠️ NO GOOGLE ACCESS OR TOKEN")
          console.log("📝 To fix:")
          console.log("1. Open extension popup")
          console.log("2. Go to Settings")
          console.log("3. Click 'Connect Google Drive' or 'Reconnect'")
          console.log("4. Complete OAuth flow")
          return false
        }
        
        console.log("✅ Google authentication appears to be configured")
        return true
      } catch (error: unknown) {
        console.error("❌ Auth check failed:", error)
        return false
      }
    },

    // Force open popup for authentication
    openPopupForAuth: () => {
      console.log("🔗 Opening popup for authentication...")
      try {
        chrome.action.openPopup()
        console.log("📝 Instructions:")
        console.log("1. In the popup, click on the Settings tab")
        console.log("2. Find 'Google Drive' section")
        console.log("3. Click 'Connect' or 'Sign In'")
        console.log("4. Complete the OAuth flow")
        console.log("5. Try batch export again")
      } catch (error: unknown) {
        console.log("❌ Could not open popup automatically")
        console.log("📝 Manual steps:")
        console.log("1. Click on extension icon in toolbar")
        console.log("2. Follow authentication steps")
      }
    },

    // Test extension context health
    testExtensionContext: async () => {
      console.log("🔍 TESTING: Extension context health")
      
      const tests = [
        {
          name: "Chrome Runtime ID",
          test: () => chrome.runtime?.id,
          expected: "Extension ID should be present"
        },
        {
          name: "Chrome Storage Sync",
          test: async () => {
            try {
              await chrome.storage.sync.get('test')
              return "✅ Available"
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error)
              return `❌ Error: ${errorMessage}`
            }
          },
          expected: "Storage should be accessible"
        },
        {
          name: "Chrome Storage Local",
          test: async () => {
            try {
              await chrome.storage.local.get('test')
              return "✅ Available"
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error)
              return `❌ Error: ${errorMessage}`
            }
          },
          expected: "Storage should be accessible"
        },
        {
          name: "Chrome Tabs API",
          test: async () => {
            try {
              await chrome.tabs.query({ active: true, currentWindow: true })
              return "✅ Available"
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error)
              return `❌ Error: ${errorMessage}`
            }
          },
          expected: "Tabs API should be accessible"
        },
        {
          name: "Chrome Action API",
          test: () => {
            try {
              return chrome.action ? "✅ Available" : "❌ Not available"
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error)
              return `❌ Error: ${errorMessage}`
            }
          },
          expected: "Action API should be accessible"
        }
      ]
      
      console.log("🧪 Running extension context tests...")
      
      for (const { name, test, expected } of tests) {
        try {
          const result = await test()
          console.log(`${name}: ${result} | Expected: ${expected}`)
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.error(`${name}: ❌ FAILED - ${errorMessage}`)
        }
      }
      
      // Check for context invalidation patterns
      console.log("\n🔍 Checking for context invalidation indicators...")
      
      if (!chrome?.runtime?.id) {
        console.error("🚨 CRITICAL: chrome.runtime.id is not available - extension context likely invalidated")
        console.log("📋 Recovery steps:")
        console.log("1. Go to chrome://extensions/")
        console.log("2. Find TableXport extension")
        console.log("3. Click 'Reload' button")
        console.log("4. Or disable and re-enable the extension")
        return false
      }
      
      console.log("✅ Extension context appears healthy")
      return true
    },

    // Test storage with error handling
    testStorageWithErrorHandling: async () => {
      console.log("🔍 TESTING: Storage operations with error handling")
      
      const { safeStorageOperation } = await import('../lib/error-handlers')
      
      const testKey = 'tablexport_test_key'
      const testValue = { test: true, timestamp: Date.now() }
      
      // Test sync storage write
      console.log("📝 Testing sync storage write...")
      const writeResult = await safeStorageOperation(
        async () => {
          await chrome.storage.sync.set({ [testKey]: testValue })
          return "Write successful"
        },
        "testStorageWrite"
      )
      
      console.log("Write result:", writeResult)
      
      // Test sync storage read
      console.log("📖 Testing sync storage read...")
      const readResult = await safeStorageOperation(
        async () => {
          const result = await chrome.storage.sync.get(testKey)
          return result[testKey]
        },
        "testStorageRead"
      )
      
      console.log("Read result:", readResult)
      
      // Cleanup
      console.log("🧹 Cleaning up test data...")
      await safeStorageOperation(
        async () => {
          await chrome.storage.sync.remove(testKey)
          return "Cleanup successful"
        },
        "testStorageCleanup"
      )
      
      return {
        writeSuccess: writeResult.success,
        readSuccess: readResult.success,
        dataMatches: JSON.stringify(readResult.data) === JSON.stringify(testValue)
      }
    },

    // Comprehensive extension health check
    extensionHealthCheck: async () => {
      console.log("🏥 COMPREHENSIVE EXTENSION HEALTH CHECK")
      console.log("=".repeat(50))
      
      const results = {
        contextHealth: false,
        storageHealth: false,
        authHealth: false,
        overallHealth: false
      }
      
      // 1. Context health
      console.log("\n1. 🔍 Checking extension context...")
      results.contextHealth = await window.TabXportDebug.testExtensionContext()
      
      // 2. Storage health
      console.log("\n2. 💾 Checking storage operations...")
      const storageTest = await window.TabXportDebug.testStorageWithErrorHandling()
      results.storageHealth = storageTest.writeSuccess && storageTest.readSuccess && storageTest.dataMatches
      
      console.log("Storage test results:", storageTest)
      
      // 3. Authentication health
      console.log("\n3. 🔐 Checking authentication...")
      results.authHealth = await window.TabXportDebug.checkAuth()
      
      // Overall health
      results.overallHealth = results.contextHealth && results.storageHealth
      
      console.log("\n📊 HEALTH CHECK SUMMARY:")
      console.log("=".repeat(30))
      console.log(`Context Health: ${results.contextHealth ? '✅ GOOD' : '❌ FAILED'}`)
      console.log(`Storage Health: ${results.storageHealth ? '✅ GOOD' : '❌ FAILED'}`)
      console.log(`Auth Health: ${results.authHealth ? '✅ GOOD' : '⚠️ NEEDS SETUP'}`)
      console.log(`Overall Health: ${results.overallHealth ? '✅ GOOD' : '❌ NEEDS ATTENTION'}`)
      
      if (!results.overallHealth) {
        console.log("\n🔧 RECOMMENDED ACTIONS:")
        if (!results.contextHealth) {
          console.log("• Reload the extension (chrome://extensions/)")
          console.log("• Refresh the current page")
        }
        if (!results.storageHealth) {
          console.log("• Check extension permissions")
          console.log("• Try reloading the extension")
        }
        if (!results.authHealth) {
          console.log("• Open extension popup and authenticate with Google Drive")
        }
      }
      
      return results
    }
  }
  
  console.log("🎮 TabXport Debug Console initialized!")
  console.log("📖 Type 'TabXportDebug.help()' for available commands")
  console.log("🏥 Type 'TabXportDebug.extensionHealthCheck()' for comprehensive diagnostics")
}

/**
 * Initialize debug interface when content script loads
 */
if (typeof window !== 'undefined') {
  // Initialize immediately
  initializeGlobalDebug()
  
  // Also initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGlobalDebug)
  } else {
    initializeGlobalDebug()
  }
  
  // Initialize limit warning debug functions
  import('./debug-limit-warnings').then(module => {
    module.initializeLimitWarningDebug()
  }).catch((error: unknown) => {
    console.error('Error loading limit warning debug module:', error)
  })
}

/**
 * Test batch export button refresh functionality
 */
const testBatchButtonRefresh = async (): Promise<void> => {
  console.log("🧪 Testing batch export button refresh...")
  
  try {
    const { refreshAllBatchExportButtons } = await import("./components/batch-export-button")
    await refreshAllBatchExportButtons()
    console.log("✅ Batch button refresh test completed")
  } catch (error: unknown) {
    console.error("❌ Batch button refresh test failed:", error)
  }
}