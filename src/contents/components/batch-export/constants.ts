/**
 * Constants for combined export
 */
export const COMBINED_EXPORT_LIMITS = {
  maxTables: 10,
  maxSheetNameLength: 25
} as const;

/**
 * LocalStorage key for remembered format
 */
export const STORAGE_KEY_PREFERRED_FORMAT = 'tablexport-preferred-format';

/**
 * DOM element IDs
 */
export const MODAL_ID = 'tablexport-batch-modal';
export const OVERLAY_ID = 'tablexport-modal-overlay';
export const BUTTON_ID = 'tablexport-batch-export-button';

/**
 * Minimum tables required for batch export
 */
export const MIN_TABLES_FOR_BATCH = 2; 