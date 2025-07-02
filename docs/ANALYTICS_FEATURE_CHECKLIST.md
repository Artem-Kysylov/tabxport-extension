# 📊 Analytics Feature Implementation Checklist

**Feature:** Table Data Summarization and Analytics  
**Status:** 🚧 In Development  
**Start Date:** [Current Date]  
**Target Completion:** 8 days  

---

## 🎯 **Feature Overview**

Add automatic data analysis and summary calculations to table exports:
- Calculate sums, averages, counts for different data types
- Add summary rows to exported tables 
- Support for single and batch table exports
- Error handling with user choice options
- English labels only (localization later)

---

## 📋 **Implementation Phases**

### **🎨 Phase 1: UI и настройки**
**Status:** ⏳ Not Started  
**Estimated:** 1 day

- [ ] **1.1** Add "Analytics" section to `src/components/popup/tabs/SettingsTab.tsx`:
  - [ ] ☑️ "Add summary rows" - main toggle
  - [ ] ☑️ "Calculate sums" - for numeric columns  
  - [ ] ☑️ "Calculate averages" - average values
  - [ ] ☑️ "Count unique values" - for text columns

- [ ] **1.2** Add settings to `src/lib/storage.ts`:
  - [ ] `analyticsEnabled: boolean`
  - [ ] `calculateSums: boolean` 
  - [ ] `calculateAverages: boolean`
  - [ ] `countUnique: boolean`

- [ ] **1.3** Update types in `src/types/index.ts` for new settings

---

### **🔧 Phase 2: Analytics Service**
**Status:** ⏳ Not Started  
**Estimated:** 2 days

- [ ] **2.1** Create `src/services/analytics/` structure:
  - [ ] `index.ts` - main export
  - [ ] `types.ts` - analytics types
  - [ ] `data-analyzer.ts` - main logic
  - [ ] `column-detector.ts` - data type detection
  - [ ] `summary-calculator.ts` - calculations
  - [ ] `error-handler.ts` - error handling

- [ ] **2.2** Data types with English labels:
  - [ ] Numbers - "Total:", "Average:"
  - [ ] Currency - "Total:", currency formatting
  - [ ] Text - "Count:", "Unique:"
  - [ ] Dates - "Count:", "Earliest:", "Latest:"
  - [ ] Mixed/Invalid - error handling

- [ ] **2.3** Calculations with English labels:
  - [ ] SUM → "Total: 1,234.56"
  - [ ] AVERAGE → "Average: 123.45"  
  - [ ] COUNT → "Count: 50"
  - [ ] COUNT_UNIQUE → "Unique: 15"

---

### **🚨 Phase 3: Error Handling (Modal Windows)**
**Status:** ⏳ Not Started  
**Estimated:** 1 day

- [ ] **3.1** Create `src/contents/components/error-modal/`:
  - [ ] `analytics-error-modal.ts` - modal for analytics errors
  - [ ] `error-modal-styles.css` - modal styles
  - [ ] `error-types.ts` - error type definitions

- [ ] **3.2** Error types and notifications:
  - [ ] "Mixed data types in column 'Price' (3 text values found)"
  - [ ] "Invalid date format in column 'Date' (5 cells affected)"  
  - [ ] "Empty column 'Total' - skipping calculations"

- [ ] **3.3** User actions in modal:
  - [ ] ✅ "Skip problematic columns and continue"
  - [ ] ✅ "Treat mixed columns as text"
  - [ ] ❌ "Cancel export"
  - [ ] 📋 "Show detailed error list"

---

### **📊 Phase 4: Table Parsing Integration**
**Status:** ⏳ Not Started  
**Estimated:** 1 day

- [ ] **4.1** Update `src/utils/table-detection/types.ts`:
  - [ ] Add `summaryRows?: SummaryRow[]`
  - [ ] Add `columnMetadata?: ColumnMetadata[]`
  - [ ] Add `analysisErrors?: AnalysisError[]`

- [ ] **4.2** Modify parsers:
  - [ ] `html-parser.ts` - call analysis after parsing
  - [ ] `markdown-parser.ts` - same
  - [ ] `text-parser.ts` - same

---

### **⚙️ Phase 5: Exporter Integration**
**Status:** ⏳ Not Started  
**Estimated:** 1 day

- [ ] **5.1** Update `src/lib/exporters/combined-exporter.ts`:
  - [ ] Check analytics settings from storage
  - [ ] Call analysis if enabled
  - [ ] Handle errors through modal

- [ ] **5.2** Summary row styles for formats:
  - [ ] **XLSX**: bold font + top border
  - [ ] **CSV**: text separators
  - [ ] **Google Sheets**: bold font + borders

---

### **🔗 Phase 6: Batch Export Integration**
**Status:** ⏳ Not Started  
**Estimated:** 1 day

- [ ] **6.1** Update `src/contents/components/batch-export/`:
  - [ ] `modal-handlers.ts` - pass analytics settings
  - [ ] `preferences.ts` - save analysis settings
  - [ ] `types.ts` - new interfaces

- [ ] **6.2** Multiple table handling:
  - [ ] Analyze each table separately
  - [ ] Group errors by table in modal

---

### **🎯 Phase 7: Final Polish**
**Status:** ⏳ Not Started  
**Estimated:** 0.5 day

- [ ] **7.1** Number formatting:
  - [ ] Thousand separators (1,234.56)
  - [ ] Round averages to 2 decimals
  - [ ] Preserve currency formats

- [ ] **7.2** UX improvements:
  - [ ] Loading indicator during analysis
  - [ ] Preview totals in tooltip before export
  - [ ] Counter for processed columns

---

### **🧪 Phase 8: Testing**
**Status:** ⏳ Not Started  
**Estimated:** 0.5 day

- [ ] **8.1** Unit tests for `analytics` service
- [ ] **8.2** Test on real tables:
  - [ ] ChatGPT tables with numbers
  - [ ] Claude tables with mixed data
  - [ ] HTML tables with currencies
- [ ] **8.3** Error handling testing
- [ ] **8.4** Batch export testing

---

## 📅 **Timeline**

| Phase | Days | Status | Notes |
|-------|------|--------|-------|
| Phase 1: UI | 1 | ⏳ | Settings in SettingsTab |
| Phase 2: Service | 2 | ⏳ | Core analytics logic |
| Phase 3: Errors | 1 | ⏳ | Modal error handling |
| Phase 4: Parsing | 1 | ⏳ | Integration with parsers |
| Phase 5: Export | 1 | ⏳ | Exporter integration |
| Phase 6: Batch | 1 | ⏳ | Batch export support |
| Phase 7: Polish | 0.5 | ⏳ | Final touches |
| Phase 8: Testing | 0.5 | ⏳ | Testing and validation |
| **Total** | **8** | ⏳ | |

---

## 🎯 **Success Criteria**

- [ ] ✅ Analytics settings visible in popup SettingsTab
- [ ] ✅ Summary rows added to single table exports (XLSX, CSV, Google Sheets)
- [ ] ✅ Summary rows added to batch exports
- [ ] ✅ Error modal shows for problematic data with user choices
- [ ] ✅ Numbers formatted correctly (1,234.56)
- [ ] ✅ Bold styling applied to summary rows
- [ ] ✅ All existing functionality still works
- [ ] ✅ No performance issues with large tables

---

## 📝 **Technical Decisions Made**

- **UI Location:** SettingsTab (may move later during UI refactor)
- **Labels:** English only (localization later)
- **Styling:** Bold font + top border for summary rows
- **Error Handling:** Modal on page (not popup) with user choice options
- **Formats:** Support XLSX, CSV, Google Sheets

---

## 🔄 **Progress Updates**

### [Date] - Phase X Started
- Started working on...
- Completed tasks:
  - [ ] Task 1
  - [ ] Task 2

### [Date] - Phase X Completed
- All tasks completed
- Issues encountered: None / [List issues]
- Ready for next phase

---

## 🐛 **Known Issues & Future Improvements**

### Issues
- [ ] None yet

### Future Improvements
- [ ] Localization support
- [ ] Advanced analytics (median, mode, etc.)
- [ ] Chart generation from data
- [ ] Export summary to separate file

---

**Last Updated:** [Current Date]  
**Next Review:** [Date + 1 day] 