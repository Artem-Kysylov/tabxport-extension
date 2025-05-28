# TabXport - AI Table Exporter

🚀 Chrome extension for exporting tables from AI chat platforms (ChatGPT, Claude, Gemini) to Excel/CSV with Google Drive integration.

## Features

- 📊 **Smart Table Detection** - Automatically detects HTML and Markdown tables
- 📁 **Multiple Export Formats** - XLSX and CSV support
- ☁️ **Google Drive Integration** - Direct upload to Google Drive (Pro)
- 🎯 **AI Platform Support** - ChatGPT, Claude, Gemini
- ⚡ **One-Click Export** - Export buttons appear next to tables
- 🎨 **Modern UI** - Clean, intuitive interface
- 🔧 **Customizable Settings** - Format preferences, auto-export, themes

## Supported Platforms

- [ChatGPT](https://chat.openai.com) - OpenAI's conversational AI
- [Claude](https://claude.ai) - Anthropic's AI assistant  
- [Gemini](https://gemini.google.com) - Google's AI platform

## Installation

### For Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Artem-Kysylov/tabxport-extension.git
   cd tabxport-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your API keys
   ```

4. **Build the extension**
   ```bash
   npm run build
   ```

5. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `build/chrome-mv3-prod/` folder

### From Chrome Web Store

*Coming soon...*

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck

# Lint code
npm run lint
```

## Environment Variables

Create a `.env` file based on `env.example`:

```env
PLASMO_PUBLIC_SUPABASE_URL=your_supabase_url
PLASMO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
PLASMO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

## Usage

1. **Visit supported AI platforms** (ChatGPT, Claude, Gemini)
2. **Generate tables** in your conversations
3. **Click export buttons** that appear next to tables
4. **Choose format** (XLSX/CSV) and destination
5. **Download or save to Google Drive**

## Project Structure

```
src/
├── background.ts          # Background script
├── popup.tsx             # Extension popup
├── options.tsx           # Settings page
├── contents/             # Content scripts
├── components/           # React components
├── lib/                  # Core libraries
├── utils/               # Utility functions
└── types/               # TypeScript types
```

## Tech Stack

- **Framework**: [Plasmo](https://www.plasmo.com/)
- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS
- **Export**: SheetJS (xlsx)
- **Backend**: Supabase
- **Storage**: Chrome Storage API

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@tabxport.com
- 🐛 Issues: [GitHub Issues](https://github.com/Artem-Kysylov/tabxport-extension/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/Artem-Kysylov/tabxport-extension/discussions)

---

Made with ❤️ by the TabXport Team
