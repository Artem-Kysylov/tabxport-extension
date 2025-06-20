# Changelog

All notable changes to the TabXport extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.3] - 2025-01-28

### Fixed

- 🔧 **MAJOR: Исправлена стратегия извлечения названий для DeepSeek**
  - **ПРОБЛЕМА:** DeepSeek использует одинаковый заголовок вкладки для всех чатов
  - **РЕШЕНИЕ:** Изменен порядок поиска - сначала боковая панель, потом интерфейс, заголовок страницы в последнюю очередь
  - **NEW:** Приоритет поиска в боковой панели (`.chat-item.active`, `.sidebar .selected`)
  - **NEW:** Поиск в заголовке чата в основном интерфейсе (`.chat-title`, `.conversation-title`)
  - **NEW:** Fallback на первое сообщение пользователя
  - **NEW:** Заголовок страницы используется только как последний вариант
  - **RESULT:** Теперь разные чаты будут иметь разные названия файлов

### Added

- 📄 **Тестовая страница `test-deepseek-sidebar.html`**
  - Симуляция реальной структуры DeepSeek с боковой панелью
  - Возможность переключения между чатами для тестирования
  - Детальные инструкции по тестированию новой стратегии

## [0.2.2] - 2025-01-28

### Fixed

- 🔧 **Enhanced Title Extraction for Claude and DeepSeek**

  - Improved `extractClaudeTitle()` with comprehensive sidebar detection
  - Added chat ID extraction from URLs for Claude
  - **MAJOR: Enhanced DeepSeek title extraction with aggressive fallback strategies**
  - Added support for Chinese interface elements (新对话, 对话)
  - Improved navigation element detection for both platforms
  - Added localStorage/sessionStorage title extraction for DeepSeek
  - Enhanced meta tag extraction for additional title sources
  - **NEW: More lenient page title filtering for DeepSeek**
  - **NEW: Expanded selector coverage with 20+ new DeepSeek-specific selectors**
  - **NEW: Aggressive navigation element scanning for active titles**

- 🛠️ **Universal Fallback Strategy**
  - Added `extractUniversalChatTitle()` function as last resort
  - Extracts titles from first user messages across all platforms
  - Searches for relevant headings when other methods fail
  - Improved fallback logic in main `extractChatTitle()` function
  - **NEW: Enhanced with active element detection and title attributes**
  - **NEW: More comprehensive filtering and validation**

### Added

- 🧪 **Comprehensive Test Pages**
  - Created `test-platform-titles.html` for platform-specific testing
  - **NEW: `test-deepseek-debug.html` for detailed DeepSeek debugging**
  - **NEW: `test-deepseek-simple.html` for simplified testing**
  - Simulates Claude, DeepSeek, ChatGPT, and Gemini interface structures
  - Includes universal fallback testing scenarios
  - Dynamic element creation to mimic real platform behavior
  - **NEW: Real-time logging and debugging capabilities**

### Enhanced

- 📝 **Selector Coverage**
  - Added 15+ new selectors for Claude title extraction
  - **EXPANDED: 30+ new selectors for DeepSeek title extraction**
  - Improved selector specificity and reliability
  - Better handling of dynamic content and hidden elements
  - **NEW: Support for title attributes and meta tags**
  - **NEW: URL path extraction for readable chat names**

### Technical

- 🔍 **Debugging Improvements**
  - **NEW: Extensive console logging for DeepSeek extraction process**
  - **NEW: Step-by-step selector testing with results**
  - **NEW: Storage access validation and error handling**
  - **NEW: URL analysis and path extraction logging**
  - Better error reporting and fallback chain visibility

## [0.2.1] - 2025-01-28

### Added

- ✨ **DeepSeek Platform Support** - Full support for DeepSeek AI chat interface
  - Added `findDeepSeekTables()` function for DeepSeek-specific table detection
  - Updated content script configuration to include DeepSeek URLs
  - Added DeepSeek-specific button positioning logic
  - Updated manifest permissions for `chat.deepseek.com` and `deepseek.com`
  - Enhanced test page with DeepSeek simulation section
- 📝 **Smart Filename Generation** - Intelligent file naming based on chat context ✨ **NEW!**
  - Added `extractChatTitle()` function with platform-specific title extraction
  - ChatGPT: Extracts from sidebar, page title, or navigation
  - Claude: Extracts from page title, interface elements, or URL
  - Gemini: Extracts from page title, interface, or first user message
  - DeepSeek: Extracts from page title, interface, or conversation
  - Automatic filename cleaning and character validation
  - Falls back to platform name if no specific title found
  - Updated `TableData` interface with optional `chatTitle` field
  - Enhanced `generateFilename()` function to use chat titles
- 🔍 **Enhanced Table Detection**
  - Improved markdown table parsing in code blocks
  - Better filtering of UI elements vs actual data tables
  - More robust text content analysis

### Changed

- 🔧 **Type System Updates**

  - Extended `detectSource` function to include `'deepseek'` type
  - Updated `TableData` interface to support DeepSeek as a source
  - Enhanced platform detection logic across all components

- 🎨 **UI Improvements**
  - Platform-specific button positioning for better UX
  - Optimized button placement for DeepSeek's interface layout
  - Improved visual consistency across supported platforms

### Fixed

- 🐛 **Platform Detection**
  - More robust URL matching for platform identification
  - Better handling of subdomain variations
  - Improved error handling for unknown platforms

### Technical

- 📦 **Dependencies**
  - Maintained compatibility with existing dependencies
  - No breaking changes to existing APIs
  - Backward compatibility with previous table detection methods

## [0.1.0] - 2025-01-27

### Added

- 🚀 **Initial Release**

  - Support for ChatGPT, Claude, and Gemini platforms
  - HTML table detection and export functionality
  - Markdown table parsing in code blocks
  - Excel (.xlsx) and CSV export formats
  - Local download functionality
  - Modern popup interface with settings
  - Content script injection for table detection
  - Background script for export processing

- 🎨 **UI Components**

  - React-based popup interface
  - Settings form with export preferences
  - Subscription status display
  - Quick actions panel
  - Export buttons with loading states

- 🔧 **Core Features**

  - Automatic table detection using MutationObserver
  - Button positioning system with scroll handling
  - XLSX file generation using SheetJS
  - Chrome storage for user preferences
  - Cross-platform table parsing utilities

- 📱 **Platform Support**
  - **ChatGPT**: Assistant message parsing with code block support
  - **Claude**: Response container detection with markdown tables
  - **Gemini**: Dynamic content scanning with UI filtering

### Technical

- 🏗️ **Architecture**

  - Plasmo framework for modern extension development
  - TypeScript for type safety
  - React with hooks for UI components
  - Tailwind CSS for styling
  - Modular component architecture

- 🔍 **Table Detection Pipeline**
  - Platform-specific detection strategies
  - HTML, Markdown, and Div table parsing
  - Content validation and filtering
  - Duplicate prevention system

### Critical Bug Fixes and Optimizations

---

## Upcoming Features

### Phase 5: Supabase Integration (Days 7-8)

- User authentication and registration
- Subscription management system
- Usage tracking and limits
- Cloud settings synchronization

### Phase 6: Google Drive Integration (Days 9-10)

- OAuth authentication flow
- Automatic cloud backup
- Folder organization
- File sharing capabilities

### Phase 7: Chrome Web Store Launch (Days 11-12)

- Store listing optimization
- Marketing materials creation
- User onboarding flow
- Analytics integration

---

## Support

For issues, feature requests, or questions:

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-username/tabxport-extension/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/your-username/tabxport-extension/discussions)
- 📧 **Contact**: support@tabxport.com
