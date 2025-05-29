# TabXport - AI Table Exporter

🚀 **Export tables from AI chat platforms to Excel/CSV format with one click!**

TabXport is a powerful Chrome extension that automatically detects tables in AI chat interfaces and provides seamless export functionality to Excel (.xlsx) and CSV formats.

## 🌟 Supported Platforms

- **ChatGPT** (chat.openai.com)
- **Claude** (claude.ai) 
- **Gemini** (gemini.google.com)
- **DeepSeek** (chat.deepseek.com) ✨ **NEW!**
- **Other AI platforms** (basic support)

## ✨ Features

### Core Functionality
- 🔍 **Automatic Table Detection** - Instantly finds tables in AI responses
- 📊 **Multiple Export Formats** - Excel (.xlsx) and CSV support
- 🎯 **One-Click Export** - Export buttons appear next to detected tables
- 📝 **Smart Filename Generation** - Uses chat titles for meaningful file names ✨ **NEW!**
- 🌐 **Cross-Platform** - Works across multiple AI chat platforms

### Smart Detection
- **HTML Tables** - Standard `<table>` elements
- **Markdown Tables** - Tables in code blocks with pipe separators
- **Div-based Tables** - Structured content using div elements
- **Text Tables** - Plain text tables with delimiters

### Export Options
- 📁 **Local Downloads** - Save directly to your computer
- ☁️ **Google Drive Integration** - Sync to cloud storage (Pro feature)
- 🔧 **Customizable Settings** - Choose default formats and destinations
- 📱 **Auto-export** - Automatic export for power users

### Platform-Specific Features

#### ChatGPT
- Detects tables in assistant responses
- Supports code blocks with markdown tables
- Handles complex nested table structures

#### Claude
- Parses tables from Claude's response format
- Supports both HTML and markdown table formats
- Filters out UI elements automatically

#### Gemini
- Optimized for Google's Gemini interface
- Handles dynamic content loading
- Supports tables in various content containers

#### DeepSeek ✨ **NEW!**
- Full support for DeepSeek's chat interface
- Detects tables in assistant responses
- Supports code blocks and structured content
- Optimized button positioning for DeepSeek's UI

## 🚀 Installation

### From Chrome Web Store
*Coming soon - Extension will be available on Chrome Web Store*

### Development Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/tabxport-extension.git
   cd tabxport-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/chrome-mv3-dev` folder

## 🛠️ Usage

1. **Visit any supported AI platform** (ChatGPT, Claude, Gemini, DeepSeek)
2. **Chat with the AI** and ask for tabular data
3. **Look for export buttons** that appear next to detected tables
4. **Click "Export"** to download your table data
5. **Choose your format** - Excel (.xlsx) or CSV

### Example Prompts for Testing

Try these prompts to generate tables:

**For any AI platform:**
```
Create a comparison table of programming languages including JavaScript, Python, and TypeScript with columns for release year, paradigm, and typing system.
```

**For database comparisons:**
```
Show me a table comparing PostgreSQL, MongoDB, Redis, and Cassandra with their types, ACID compliance, and primary use cases.
```

**For technology stacks:**
```
Create a table of popular web frameworks with their languages, release years, and categories.
```

## ⚙️ Settings

Access settings through the extension popup:

- **Export Format**: Choose default between Excel (.xlsx) or CSV
- **Destination**: Local download or Google Drive (Pro)
- **Auto-export**: Automatically export detected tables
- **Theme**: Light, dark, or auto theme selection

## 🔧 Development

### Project Structure
```
src/
├── contents/          # Content scripts for table detection
├── background/        # Background service worker
├── popup/            # Extension popup interface
├── options/          # Settings page
├── components/       # React components
├── utils/            # Utility functions
├── types/            # TypeScript type definitions
└── lib/              # Shared libraries
```

### Key Technologies
- **Plasmo Framework** - Modern extension development
- **TypeScript** - Type-safe JavaScript
- **React** - UI components
- **Tailwind CSS** - Styling
- **XLSX.js** - Excel file generation

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run package      # Package extension
npm run typecheck    # Type checking
npm run lint         # Code linting
```

### Testing
Open the test page to verify functionality:
```
http://localhost:3000/test-tables.html
```

Add `?deepseek` to test DeepSeek-specific features:
```
http://localhost:3000/test-tables.html?deepseek
```

## 🏗️ Architecture

### Table Detection Pipeline
1. **Platform Detection** - Identifies current AI platform
2. **Element Scanning** - Finds potential table containers
3. **Content Analysis** - Parses different table formats
4. **Button Injection** - Adds export buttons to valid tables
5. **Export Processing** - Converts and downloads data

### Supported Table Formats
- **HTML Tables**: `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>`
- **Markdown Tables**: Pipe-separated format in `<pre>` or `<code>`
- **Div Tables**: Structured `<div>` elements with consistent layout
- **Text Tables**: Plain text with delimiters

## 🔮 Roadmap

### Phase 5: Supabase Integration (Days 7-8)
- [ ] User authentication system
- [ ] Subscription management
- [ ] Usage tracking and limits
- [ ] User profiles and settings sync

### Phase 6: Google Drive Integration (Days 9-10)
- [ ] OAuth authentication
- [ ] Automatic cloud sync
- [ ] Folder organization
- [ ] File sharing capabilities

### Phase 7: Chrome Web Store (Days 11-12)
- [ ] Store listing optimization
- [ ] Marketing materials
- [ ] User onboarding flow
- [ ] Analytics integration

### Future Features
- [ ] **More AI Platforms** - Perplexity, Poe, Character.AI
- [ ] **Advanced Formatting** - Custom styling, formulas
- [ ] **Collaboration** - Shared exports, team workspaces
- [ ] **API Integration** - Webhook exports, third-party connections

## 📦 Dependencies

### Core
- `plasmo` - Extension framework
- `react` & `react-dom` - UI library
- `typescript` - Type safety
- `xlsx` - Excel file generation

### Integrations
- `@supabase/supabase-js` - Authentication & database
- `@types/chrome` - Chrome extension APIs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with descriptive messages
5. Push and create a Pull Request

### Code Style
- Use TypeScript for all new code
- Follow functional programming patterns
- Prefer const over let, never use var
- Use meaningful, descriptive names
- Write clean, readable code with minimal comments

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: GitHub Issues tracker
- **Discussions**: GitHub Discussions
- **Email**: support@tabxport.com

---

**Made with ❤️ for the AI community**

*TabXport - Making AI data extraction effortless*
