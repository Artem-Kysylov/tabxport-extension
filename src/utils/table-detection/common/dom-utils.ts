import { DOMUtils } from '../types';

/**
 * Common DOM manipulation utilities for table detection
 */
export const domUtils: DOMUtils = {
  /**
   * Checks if an element is visible in the DOM
   */
  isVisible: (element: HTMLElement): boolean => {
    return element.offsetParent !== null;
  },

  /**
   * Checks if an element is a UI component that should be ignored
   */
  isUIElement: (element: HTMLElement): boolean => {
    const uiClassPatterns = [
      'text-input-field',
      'input',
      'toolbar',
      'button',
      'menu',
      'dropdown',
      'modal',
      'popup',
      'tooltip',
      'navigation',
      'header',
      'footer',
      'ng-tns'
    ];

    // Check class names
    const hasUIClass = uiClassPatterns.some(pattern => 
      element.classList.contains(pattern)
    );

    // Check ID patterns
    const hasUIId = element.id?.match(/(input|toolbar|menu|button)/i);

    // Check content patterns
    const content = element.textContent?.trim() || '';
    const hasUIContent = content.includes('Deep Research') || 
                        content.includes('Canvas') ||
                        content.includes('Спросить Gemini') ||
                        content.length < 20;

    return hasUIClass || !!hasUIId || hasUIContent;
  },

  /**
   * Gets sanitized text content from an element
   */
  getTextContent: (element: HTMLElement): string => {
    const text = element.textContent || '';
    return text.trim();
  },

  /**
   * Finds elements matching a selector, optionally within a container
   */
  findElements: (selector: string, container: HTMLElement = document.body): HTMLElement[] => {
    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  }
}; 