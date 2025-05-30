import { PlatformDetector } from '../types';
import { chatGPTDetector } from './chatgpt-detector';
import { claudeDetector } from './claude-detector';
import { geminiDetector } from './gemini-detector';
import { deepseekDetector } from './deepseek-detector';

/**
 * List of all available platform detectors
 */
export const platformDetectors: PlatformDetector[] = [
  chatGPTDetector,
  claudeDetector,
  geminiDetector,
  deepseekDetector
];

export {
  chatGPTDetector,
  claudeDetector,
  geminiDetector,
  deepseekDetector
}; 