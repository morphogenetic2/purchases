# LabFlow Purchase Manager - Testing Guide

This document provides a comprehensive testing strategy for the application.

## Quick Start

```bash
# Run unit tests
npm test

# Run tests in watch mode (during development)
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

---

## 1. Unit Tests (Automated)

Unit tests are located in `src/tests/` and cover the following modules:

### Excel Import Module
| File | Coverage |
|------|----------|
| `excel/transformer.test.ts` | Data transformation, type coercion, defaults |
| `excel/validator.test.ts` | Required field validation, error formatting |
| `excel/parser.test.ts` | File parsing structure |

### Constants & Utils
| File | Coverage |
|------|----------|
| `constants.test.ts` | ORDER_STATUS, GROUP_BY_OPTIONS, PAGINATION |
| `utils.test.ts` | getStatusColor, cn (className merge) |

### Running Specific Tests
```bash
# Run only excel tests
npm test -- --grep "Excel"

# Run only transformer tests
npm test -- --grep "Transformer"
```

---

## 2. Manual Testing Checklist

### Authentication
- [ ] Navigate to `/` without being logged in → Should redirect to `/login`
- [ ] Enter incorrect password → Should show error
- [ ] Enter correct password → Should redirect to dashboard
- [ ] Close browser and reopen → Should still be logged in (cookie persists)

### Order Table Display
- [ ] Table loads with orders from database
- [ ] Pagination works (25/50/100/250/500/1000/All)
- [ ] Page navigation (prev/next) works correctly
- [ ] Empty state shows "No orders found" message

### Search & Filtering
- [ ] Search by description works
- [ ] Search by provider works
- [ ] Search by requester works
- [ ] Search by SKU works
- [ ] Search clears with X button
- [ ] Filter by Date dropdown works
- [ ] Filter by Provider dropdown works
- [ ] Filter by Requester dropdown works
- [ ] Filter by Status dropdown works
- [ ] Multiple filters can be combined
- [ ] Filters reset pagination to page 1

### Grouping
- [ ] Group by None (default)
- [ ] Group by Date shows date headers
- [ ] Group by Provider shows provider headers
- [ ] Group by Requester shows requester headers
- [ ] Group by Status shows status headers
- [ ] Group colors alternate correctly

### Inline Editing
- [ ] Click on Description cell → Editable
- [ ] Click on Provider cell → Editable
- [ ] Click on Quantity cell → Editable (number input)
- [ ] Click on Price cell → Editable (number input)
- [ ] Click on Date cell → Editable (date picker)
- [ ] Press Enter or blur → Saves changes
- [ ] Press Escape → Cancels edit

### Quick Receive
- [ ] "Receive" button appears for non-received orders
- [ ] Clicking "Receive" marks order as received
- [ ] Received date is set to today
- [ ] Status badge changes to green "received"
- [ ] "Receive" button disappears after receiving

### Revert Receive
- [ ] Click on green "received" badge → Confirmation dialog
- [ ] Confirm → Status reverts to "requested"
- [ ] Received date is cleared
- [ ] "Receive" button reappears

### Order Dialog (Add/Edit)
- [ ] Click "New Order" → Opens empty dialog
- [ ] Fill required fields and save → Order created
- [ ] Click pencil icon on row → Opens edit dialog with data
- [ ] Modify fields and save → Order updated
- [ ] Click "Delete Order" → Confirmation dialog
- [ ] Confirm delete → Order removed
- [ ] Click Cancel → Dialog closes without changes
- [ ] Validation: Cannot save without required fields

### Bulk Selection
- [ ] Click checkbox on row → Row selected (highlighted)
- [ ] Click header checkbox → All visible rows selected
- [ ] Selected count shown in floating action bar
- [ ] "Receive Selected" marks all as received (single DB call)
- [ ] "Delete Selected" removes all (single DB call)
- [ ] "Export Selected" downloads Excel with selected orders
- [ ] "Clear" button clears selection

### Column Personalization
- [ ] Click "Personalize columns" button
- [ ] Toggle columns on/off
- [ ] Drag to reorder columns
- [ ] Changes persist during session

### Excel Import
- [ ] Click "Import / Append Orders"
- [ ] Select .xlsx file → Opens mapping dialog
- [ ] Auto-mapping matches known headers
- [ ] Preview shows first 5 rows
- [ ] Manual mapping via dropdowns works
- [ ] "New Order" checkbox forces status to requested
- [ ] Default ordered_by selector works
- [ ] Default order_date picker works
- [ ] Import button creates orders
- [ ] Success message shows
- [ ] Table refreshes with new orders

### Excel Export
- [ ] Click "Export"
- [ ] Export dialog opens with options
- [ ] Select columns to export
- [ ] Click "Download" → .xlsx file downloads
- [ ] File contains correct data

### Realtime Updates
- [ ] Open app in two browser windows
- [ ] Create order in window 1 → Appears in window 2
- [ ] Edit order in window 1 → Updates in window 2
- [ ] Delete order in window 1 → Disappears in window 2
- [ ] Receive order in window 1 → Status updates in window 2

### Database Wipe
- [ ] Click menu (or wipe button) → Shows confirmation dialog
- [ ] Type confirmation text → Button enables
- [ ] Confirm → All orders deleted
- [ ] Table shows empty state

---

## 3. Edge Cases to Test

### Data Validation
- [ ] Import Excel with missing required fields → Shows error
- [ ] Import Excel with invalid date format → Still works (transforms)
- [ ] Import Excel with text in number field → Defaults to 0 or 1
- [ ] Very long description → Truncates in table, full in dialog
- [ ] Special characters in fields → Handled correctly

### Performance
- [ ] Load 1000+ orders → Table remains responsive
- [ ] Search with 1000+ orders → Filters quickly
- [ ] Bulk select 100 orders → Single DB call (check Network tab)

### Error Handling
- [ ] Network offline during save → Shows error message
- [ ] Database constraint violation → Shows error message
- [ ] Invalid Excel file → Shows error message

---

## 4. Testing with Sample Data

### Sample Excel File Structure
Create a test Excel file with these columns:

| Order Date | Provider | Description | SKU | Ordered By | Quantity | Unit Price | Project Code |
|------------|----------|-------------|-----|------------|----------|------------|--------------|
| 2024-01-15 | Sigma | DMEM Media 500ml | D6429 | ARN | 5 | 45.99 | PROJ-001 |
| 2024-01-16 | Fisher | Falcon Tubes 15ml | 352096 | MA | 10 | 12.50 | PROJ-002 |
| 2024-01-17 | VWR | Pipette Tips 1000ul | 613-1080 | FM | 3 | 89.00 | PROJ-001 |

### Test Scenarios with Sample Data
1. Import the Excel file
2. Search for "DMEM" → Should find 1 result
3. Filter by provider "Sigma" → Should show only Sigma orders
4. Group by Project → Should show PROJ-001 and PROJ-002 groups
5. Receive the VWR order → Should update status
6. Export remaining orders → Should have 3 orders

---

## 5. Browser Compatibility

Test the app in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome (responsive layout)
- [ ] Mobile Safari (responsive layout)

---

## 6. Running Tests

```bash
# Full test suite
npm test

# Watch mode (reruns on file changes)
npm run test:watch

# With coverage report
npm run test:coverage

# Specific test file
npm test -- src/tests/excel/transformer.test.ts

# Tests matching pattern
npm test -- --grep "should transform"
```

---

## 7. Adding New Tests

When adding new functionality:

1. **Pure functions** → Add unit tests in `src/tests/`
2. **Components with logic** → Extract logic to functions, test those
3. **Integration** → Use the manual checklist above

Example test structure:
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '$lib/myModule';

describe('My Module', () => {
    describe('myFunction', () => {
        it('should do something', () => {
            const result = myFunction('input');
            expect(result).toBe('expected');
        });
    });
});
```
