export { chatGPTTitleExtractor } from './chatgpt-title-extractor';
export { claudeTitleExtractor } from './claude-title-extractor';
export { deepseekTitleExtractor } from './deepseek-title-extractor';
export { geminiTitleExtractor } from './gemini-title-extractor';

export const getTitleExtractor = (url: string) => {
  if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
    return chatGPTTitleExtractor;
  }
  if (url.includes('claude.ai')) {
    return claudeTitleExtractor;
  }
  if (url.includes('chat.deepseek.com') || url.includes('deepseek.com')) {
    return deepseekTitleExtractor;
  }
  if (url.includes('gemini.google.com') || url.includes('bard.google.com')) {
    return geminiTitleExtractor;
  }
  return chatGPTTitleExtractor; // Default to ChatGPT extractor
}; 