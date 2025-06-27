# 🔄 Settings Synchronization - User Guide

## Issue Fixed
**Problem**: Batch export button text didn't update immediately when changing settings in popup

**Solution**: Real-time synchronization between popup settings and batch export buttons

## How It Works Now

### ✅ Before (Fixed)
1. User changes destination setting in popup: "Download to Device" → "Google Drive"
2. ❌ Button still shows: "Export 2 tables to Device"
3. ❌ User needs to refresh page to see: "Export 2 tables to Google Drive"

### ✅ After (Current)
1. User changes destination setting in popup: "Download to Device" → "Google Drive"  
2. ✅ Button **immediately** updates to: "Export 2 tables to Google Drive"
3. ✅ No page refresh needed!

## Testing Steps

### 1. Setup
1. Open Claude.ai and generate some tables
2. Verify batch export button appears: "Export X tables to Device"

### 2. Change Settings  
1. Click TabXport extension icon (popup opens)
2. In "Default Destination" section, click "Google Drive"
3. Close popup

### 3. Verify Update
1. Look at batch export button on the page
2. ✅ Should now show: "Export X tables to Google Drive"
3. ✅ Icon should change from 💾 to ☁️

## Troubleshooting

### Button doesn't update?
Try these steps:

1. **Check Console** (F12 → Console):
   ```javascript
   // Should see messages like:
   // "📤 Notified content script about defaultDestination change: google_drive"
   // "📥 Settings changed: defaultDestination = google_drive"
   // "🔄 Refreshing batch export buttons due to destination change"
   ```

2. **Manual Refresh**:
   ```javascript
   // In browser console:
   TabXportDebug.testBatchButtonRefresh()
   ```

3. **Re-install Extension**:
   - Remove extension completely
   - Install fresh version
   - Re-authorize Google Drive if needed

### Expected Behavior
- ✅ Real-time updates (no page refresh)
- ✅ Only affects current active tab  
- ✅ Works on all supported platforms (Claude.ai, ChatGPT, etc.)
- ✅ Falls back gracefully if content script unavailable

## Technical Notes

- Uses Chrome extension messaging API
- Requires "tabs" permission (added to manifest)
- Dynamic imports prevent circular dependencies
- Graceful error handling for unsupported sites

---

**Проблема решена!** Теперь кнопки batch export обновляются мгновенно при изменении настроек destination в popup. 