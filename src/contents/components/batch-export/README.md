# Batch Export Module

This directory contains the refactored batch export functionality split into modular components for better maintainability.

## Module Structure

### Core Files

- **`types.ts`** - TypeScript interfaces, types, and constant definitions
- **`constants.ts`** - Application constants and configuration values
- **`preferences.ts`** - Format preference management utilities

### UI Components

- **`html-generators.ts`** - HTML generation functions for modal components
- **`modal-styles.css`** - CSS styles for the modal (standalone file)
- **`button-styles.css`** - CSS styles for the button (standalone file)
- **`styles.ts`** - CSS injection utilities (contains inline styles as strings)
- **`button-html.ts`** - HTML generation for the batch export button

### Logic & Handlers

- **`modal-handlers.ts`** - Event handlers and export logic for the modal

## Main Files

- **`../batch-export-modal.ts`** - Main modal component (refactored)
- **`../batch-export-button.ts`** - Main button component (refactored)

## Benefits of This Structure

1. **Separation of Concerns**: Each file has a single responsibility
2. **Maintainability**: Easier to find and modify specific functionality
3. **Reusability**: Components can be reused across different parts of the application
4. **Testing**: Smaller modules are easier to unit test
5. **Code Organization**: Clear structure makes the codebase more navigable

## Module Dependencies

```
batch-export-modal.ts
├── types.ts
├── constants.ts
├── preferences.ts
├── html-generators.ts
├── styles.ts
└── modal-handlers.ts

batch-export-button.ts
├── types.ts
├── constants.ts
├── button-html.ts
└── styles.ts
```

## File Size Reduction

- **Original `batch-export-modal.ts`**: 1424 lines → **New**: ~150 lines
- **Original `batch-export-button.ts`**: 321 lines → **New**: ~130 lines
- **Total**: Reduced from 1745 lines to ~280 lines in main files
- **Modular components**: ~800 lines distributed across logical modules

## Usage

The refactored components maintain the same public API, so no changes are needed in consuming code:

```typescript
import { showBatchExportModal } from './batch-export-modal';
import { updateBatchButton } from './batch-export-button';

// Usage remains the same
showBatchExportModal(batchResult);
updateBatchButton(batchResult);
``` 