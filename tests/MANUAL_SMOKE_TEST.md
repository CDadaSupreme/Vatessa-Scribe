# Google Docs Add-on Manual Smoke Test

Run through this checklist before each release.

## Prerequisites

- [ ] Add-on installed in test Google account
- [ ] Vatessa staging/production account with test data
- [ ] At least one plan exists in Vatessa
- [ ] At least one message exists (or ability to create one)

## Environment

| Setting | Value |
|---------|-------|
| Date | __________________ |
| Tester | __________________ |
| Environment | [ ] Staging [ ] Production |
| Add-on Version | __________________ |
| Browser | __________________ |

---

## Test Cases

### 1. Add-on Installation & Loading

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Open any Google Doc | Document loads normally | | | |
| Click Extensions menu | "Vatessa" appears in menu | | | |
| Click Extensions > Vatessa > Open Vatessa | Sidebar opens | | | |
| Observe sidebar | Loading spinner appears briefly | | | |
| Wait for load | Content appears (no errors) | | | |

### 2. Unauthenticated State

*Start with a fresh document or clear auth token first*

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Open sidebar (not logged in) | "Connect to Vatessa" button visible | | | |
| Verify unlinked state | Shows "Not connected" or similar | | | |
| Click "Connect to Vatessa" | Auth popup/redirect opens | | | |

### 3. Authentication Flow

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Complete login in popup | Login succeeds | | | |
| Return to Google Doc | Sidebar auto-refreshes | | | |
| Verify authenticated state | User email or name displayed | | | |
| Verify token persists | Close and reopen sidebar - still logged in | | | |

### 4. Unlinked Document State

*Use a document that has never been linked*

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Open sidebar on new doc | Shows "Not connected" state | | | |
| Verify link options | "Create Message" or "Link to Message" visible | | | |
| Verify no status shown | No approvers, no sync time displayed | | | |

### 5. Create/Link Message Flow

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Click "Create Message in Vatessa" | New tab opens to Vatessa | | | |
| Verify URL includes docId | URL has `?source=google_docs&docId=xxx` | | | |
| Create message in Vatessa | Message creation succeeds | | | |
| Return to Google Doc | Sidebar shows "Connected" state | | | |
| Verify message info | Title and plan name displayed | | | |

### 6. Linked Document Status Display

*Use a document linked to an existing message*

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Open sidebar | Shows "Connected" / linked state | | | |
| Verify message title | Title matches Vatessa message | | | |
| Verify plan name | Plan name displayed correctly | | | |
| Verify status badge | Status badge shows (Draft/In Review/Approved) | | | |
| Verify status color | Badge color matches status | | | |
| Verify approvers | Up to 3 approvers shown (read-only) | | | |
| Verify comment count | Comment count displayed | | | |
| Verify last sync time | "Last synced: X minutes ago" or similar | | | |

### 7. Change Detection

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Type new content in document | Changes made | | | |
| Observe sidebar | "Changes detected" banner appears | | | |
| Delete the new content | Reverted to original | | | |
| Observe sidebar | Banner disappears (or shows "No changes") | | | |

### 8. Sync Content

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Make changes to document | New content added | | | |
| Click "Sync Changes" | Loading indicator appears | | | |
| Wait for sync | Success message displayed | | | |
| Verify in Vatessa web | Content updated in Vatessa | | | |
| Verify "Changes detected" gone | Banner no longer shows | | | |
| Verify last sync time updated | Shows "Just now" or recent time | | | |

### 9. Submit for Review

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Click "Submit for Review" | Confirmation dialog appears | | | |
| Click Cancel | Dialog closes, no action taken | | | |
| Click "Submit for Review" again | Confirmation dialog appears | | | |
| Confirm submission | Loading indicator shows | | | |
| Wait for submit | Success message displayed | | | |
| Verify status change | Status badge updates to "In Review" | | | |
| Check Vatessa web | Message status is "In Review" | | | |

### 10. Open in Vatessa

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Click "Open in Vatessa" | New tab opens | | | |
| Verify URL | Opens to correct message page | | | |
| Verify message loads | Same message as linked document | | | |

### 11. Unlink Document

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Find "Unlink" option | Option available (menu or button) | | | |
| Click Unlink | Confirmation dialog appears | | | |
| Confirm unlink | Document properties cleared | | | |
| Verify sidebar | Returns to "Not connected" state | | | |

### 12. Duplicate Document Handling

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Open a linked document | Shows connected state | | | |
| File > Make a copy | New document created | | | |
| Open sidebar in copy | Should NOT show as linked | | | |
| Verify "Copy of" detection | Shows unlinked state or warning | | | |

### 13. Error Handling

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Disconnect internet | Network unavailable | | | |
| Try to sync | Error message displayed (not crash) | | | |
| Error is user-friendly | Clear message, not stack trace | | | |
| Reconnect internet | Network restored | | | |
| Retry sync | Sync succeeds | | | |

### 14. Token Expiration

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Let token expire (or manually clear) | Token invalid | | | |
| Try to sync | Auth error shown | | | |
| Prompted to re-authenticate | "Connect" button or similar shown | | | |
| Re-authenticate | Token refreshed | | | |
| Retry sync | Sync succeeds | | | |

### 15. Sidebar Refresh/Polling

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Leave sidebar open | Sidebar visible | | | |
| Wait 30-60 seconds | Auto-refresh occurs | | | |
| Modify message in Vatessa web | Status changed externally | | | |
| Wait for refresh | Sidebar updates with new status | | | |

### 16. Message Type Selection

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Open sidebar on new doc | Type selector visible | | | |
| Verify default selection | "Communication" is selected | | | |
| Select "Policy" type | Policy option selectable | | | |
| Observe policy note | Info note appears about Vatessa web app | | | |
| Select "Communication" | Note disappears | | | |

### 17. Sync Communication Type

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Select type: Communication | Communication selected | | | |
| Click "Send for Approval" | Sync starts | | | |
| Verify sync success | Success message shown | | | |
| Check in Vatessa web | Message type is "communication" | | | |

### 18. Sync Policy Type

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Create new document | Fresh document | | | |
| Select type: Policy | Policy selected | | | |
| Click "Send for Approval" | Sync starts | | | |
| Verify sync success | Success message shown | | | |
| Check in Vatessa web | Message type is "policy" | | | |
| Check policy fields | Policy settings available in Nova | | | |

### 19. Message Type Persistence

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Sync a policy type message | Message synced as policy | | | |
| Close sidebar | Sidebar closes | | | |
| Re-open sidebar | Sidebar loads | | | |
| Verify type restored | Policy type still selected/shown | | | |

### 20. AI Polish — Mode Buttons

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Open sidebar on a connected doc | AI Polish section visible below AI Analysis | | | |
| Verify 5 mode buttons | Shorten, Formal, Casual, Simplify (2x2), Compliance (full-width) | | | |
| Buttons disabled when AI unavailable | All 5 buttons show disabled state | | | |
| Buttons enabled when AI available | All 5 buttons clickable | | | |

### 21. AI Polish — Rewrite with Selection

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Select a paragraph in the doc | Text highlighted | | | |
| Click "Shorten" button | Loading spinner appears | | | |
| Wait for rewrite | Before/After preview shown | | | |
| Verify "Before" text | Shows the selected text | | | |
| Verify "After" text | Shows rewritten (shorter) text | | | |
| Verify blue border on After box | After box has blue accent border | | | |

### 22. AI Polish — Rewrite without Selection

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Click anywhere (no selection) | No text highlighted | | | |
| Click "Formal" button | Loading spinner appears | | | |
| Wait for rewrite | Before/After preview shown | | | |
| Verify "Before" text | Shows full document body text | | | |
| Verify "After" text | Shows rewritten (formal tone) text | | | |

### 23. AI Polish — All 5 Modes

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Select text, click "Shorten" | Rewrite returned, text is shorter | | | |
| Dismiss, select text, click "Formal" | Rewrite returned, tone is formal | | | |
| Dismiss, select text, click "Casual" | Rewrite returned, tone is casual | | | |
| Dismiss, select text, click "Simplify" | Rewrite returned, text is simpler | | | |
| Dismiss, select text, click "Compliance" | Rewrite returned, compliance issues listed if any | | | |

### 24. AI Polish — Apply Action

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Get a rewrite result (with selection) | Before/After preview shown | | | |
| Click "Apply" | Document text replaced with rewritten text | | | |
| Verify preview dismissed | Polish section returns to button state | | | |
| Press Ctrl+Z | Original text restored (undo works) | | | |

### 25. AI Polish — Copy Action

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Get a rewrite result | Before/After preview shown | | | |
| Click "Copy" | Text copied to clipboard | | | |
| Paste in another app | Rewritten text appears | | | |
| Verify preview dismissed | Polish section returns to button state | | | |

### 26. AI Polish — Dismiss Action

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Get a rewrite result | Before/After preview shown | | | |
| Click "Dismiss" | Preview clears | | | |
| Verify button state | Mode buttons re-enabled | | | |
| No document changes | Document text unchanged | | | |

### 27. AI Polish — Compliance Mode Issues

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Select text with risky language | e.g. "We guarantee this will never happen" | | | |
| Click "Compliance" | Rewrite returned | | | |
| Verify issues list | Orange warning box with bullet list of issues | | | |
| Verify rewritten text | After box shows compliance-safe rewrite | | | |

### 28. AI Polish — Content Validation

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Open empty document, click any mode | Error: "No text to rewrite" | | | |
| Select >10,000 chars, click any mode | Error: "Exceeds 10,000 characters" with count | | | |
| Select normal text, click any mode | Rewrite succeeds | | | |

### 29. AI Polish — Error States

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Disconnect internet, click any mode | Error message shown (not crash) | | | |
| Use non-Business tier org | "Requires Business tier" + upgrade link | | | |
| Exhaust monthly AI limit | "Monthly limit reached" + upgrade link | | | |
| Click Dismiss on error | Error clears, buttons re-enabled | | | |

### 30. AI Polish — Buttons Disabled During Result

| Step | Expected | Pass | Fail | Notes |
|------|----------|:----:|:----:|-------|
| Get a rewrite result | Preview shown | | | |
| Try clicking another mode button | Button is disabled | | | |
| Dismiss result | Buttons re-enabled | | | |

---

## Performance Checks

| Metric | Acceptable | Actual | Notes |
|--------|------------|--------|-------|
| Sidebar load time | < 3 seconds | | |
| Sync completion | < 5 seconds | | |
| Status refresh | < 2 seconds | | |

---

## Results Summary

| Category | Passed | Failed | Skipped |
|----------|:------:|:------:|:-------:|
| Installation & Loading | /5 | | |
| Authentication | /4 | | |
| Document States | /3 | | |
| Create/Link | /5 | | |
| Status Display | /8 | | |
| Change Detection | /4 | | |
| Sync | /6 | | |
| Submit | /6 | | |
| Navigation | /3 | | |
| Unlink | /4 | | |
| Duplicate Handling | /4 | | |
| Error Handling | /5 | | |
| Token Expiration | /4 | | |
| Polling | /4 | | |
| Message Type Selection | /5 | | |
| Communication Sync | /4 | | |
| Policy Sync | /6 | | |
| Type Persistence | /4 | | |
| Polish — Mode Buttons | /4 | | |
| Polish — Rewrite with Selection | /6 | | |
| Polish — Rewrite without Selection | /5 | | |
| Polish — All 5 Modes | /5 | | |
| Polish — Apply Action | /4 | | |
| Polish — Copy Action | /4 | | |
| Polish — Dismiss Action | /4 | | |
| Polish — Compliance Issues | /4 | | |
| Polish — Content Validation | /3 | | |
| Polish — Error States | /4 | | |
| Polish — Buttons During Result | /3 | | |
| **TOTAL** | **/130** | | |

---

## Overall Status

- [ ] **PASS** - All critical tests passed, ready for release
- [ ] **PASS WITH ISSUES** - Minor issues noted, release with known issues
- [ ] **FAIL** - Blocking issues found, do not release

---

## Blocking Issues

*List any issues that must be fixed before release:*

1.
2.
3.

---

## Non-Blocking Issues

*List minor issues to fix in next release:*

1.
2.
3.

---

## Notes

*Additional observations, suggestions, or context:*




---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Developer | | | |
| Reviewer | | | |
