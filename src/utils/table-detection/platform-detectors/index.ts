import { PlatformDetector } from '../types';
import { chatGPTDetector } from './chatgpt-detector';
import { claudeDetector } from './claude-detector';
import { geminiDetector } from './gemini-detector';
import { deepseekDetector } from './deepseek-detector';
import { genericDetector } from './generic-detector';

/**
 * List of all available platform detectors
 * Generic detector is last as a fallback
 */
export const platformDetectors: PlatformDetector[] = [
  chatGPTDetector,
  claudeDetector,
  geminiDetector,
  deepseekDetector,
  genericDetector
];

export {
  chatGPTDetector,
  claudeDetector,
  geminiDetector,
  deepseekDetector,
  genericDetector
}; 