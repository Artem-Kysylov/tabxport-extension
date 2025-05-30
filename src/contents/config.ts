import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: [
    'https://chat.openai.com/*',
    'https://chatgpt.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
    'https://bard.google.com/*',
    'https://chat.deepseek.com/*',
    'https://deepseek.com/*'
  ],
  all_frames: false,
}; 