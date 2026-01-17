# Testing Checklist - Vatessa Google Docs Add-on

## ✅ Testing Checklist (Before Deployment)

### Authentication & Linking

- [ ] User can open sidebar in Google Doc
- [ ] Unlinked doc shows "Not connected" state
- [ ] "Create Message" button opens Vatessa web app
- [ ] After linking, sidebar shows "Connected" state
- [ ] Linked doc persists state after closing/reopening

### Status Display

- [ ] Message title displays correctly
- [ ] Plan name displays correctly
- [ ] Status badge shows correct state (Draft/In Review/Approved)
- [ ] Approvers list shows correct names + statuses
- [ ] Comment count shows correct number
- [ ] "Last synced" time displays correctly

### Sync Functionality

- [ ] Changes detected indicator appears when doc is edited
- [ ] Manual sync button updates Vatessa
- [ ] Hash comparison works correctly
- [ ] Sync clears "Changes detected" indicator
- [ ] Duplicate syncs don't create duplicate versions

### Submit for Review

- [ ] Submit confirmation dialog appears
- [ ] Submit syncs latest changes first
- [ ] Status changes to "In Review" after submit
- [ ] Success message displays
- [ ] "Track in Vatessa" link opens web app

### Edge Cases

- [ ] Duplicated doc ("Copy of...") prompts re-link
- [ ] Expired auth token shows re-authentication prompt
- [ ] Network error shows helpful error message
- [ ] Doc unlinked in Vatessa shows unlinked state
- [ ] Multiple users can open same doc without conflicts

## 🎯 Success Criteria for V1

V1 is successful if:

### ✅ 3 pilot customers can use it daily

- Draft in Google Docs
- Link to Vatessa messages
- Sync changes reliably
- Submit for review without issues

### ✅ No data loss

- All syncs preserve content
- No corrupted messages
- Fingerprint detection works 100%

### ✅ Users understand the mental model

- "I draft here, I manage there"
- Not confused about where to do what
- Minimal support questions

### ✅ No critical bugs in first week

- Auth works reliably
- Sync doesn't fail
- Status displays correctly

### ✅ Can demo confidently to investors

- Smooth user experience
- Professional UI
- No embarrassing bugs

## V1 does NOT need:

- ❌ Public Marketplace listing (private install only)
- ❌ Advanced features (watchers, version history, etc.)
- ❌ Real-time collaboration
- ❌ Offline support
- ❌ Perfect formatting preservation

**Guiding principle:** Ship simple, iterate based on real pilot feedback.

## Manual Testing Script

### Test 1: First-Time User Flow

1. Open a new Google Doc
2. Click Extensions → Vatessa → Open Vatessa
3. Verify sidebar shows "Not connected to Vatessa"
4. Click "Create Message in Vatessa"
5. Verify Vatessa web app opens in new tab with `?source=google_docs&docId={id}`
6. In Vatessa: Create message, link document
7. Return to Google Doc, refresh sidebar
8. Verify sidebar now shows "Connected" state with message title and plan

### Test 2: Content Sync Flow

1. Open linked Google Doc
2. Edit document content (add a paragraph)
3. Verify "Changes detected" banner appears
4. Click "Sync Changes"
5. Verify success message appears
6. Verify banner disappears
7. Check Vatessa web app to confirm content updated

### Test 3: Submit for Review Flow

1. Open linked Google Doc with changes
2. Click "Submit for Review"
3. Verify confirmation dialog appears
4. Click "Submit"
5. Verify success message with approver names
6. Verify status badge changes to "In Review"
7. Check Vatessa web app to confirm status change

### Test 4: Edge Case - Document Duplication

1. Open linked Google Doc
2. File → Make a copy
3. Open the "Copy of..." document
4. Open sidebar
5. Verify sidebar shows "Not connected" state
6. Verify no messageId is stored

### Test 5: Edge Case - Token Expiration

1. Open linked Google Doc
2. Manually clear auth token (or wait for expiration)
3. Click "Sync Changes"
4. Verify error message about expired session
5. Verify prompt to reconnect

## Performance Testing

- [ ] Sidebar loads in < 2 seconds
- [ ] Sync completes in < 5 seconds for typical document
- [ ] Polling doesn't degrade performance (30s intervals)
- [ ] No memory leaks with sidebar open for extended period

## Security Testing

- [ ] Auth token stored in UserProperties (not DocumentProperties)
- [ ] API calls include proper Authorization header
- [ ] No sensitive data logged to console
- [ ] XSS protection in sidebar HTML
- [ ] HTTPS only for API calls

## Browser Compatibility

Test in:
- [ ] Google Chrome (latest)
- [ ] Mozilla Firefox (latest)
- [ ] Microsoft Edge (latest)
- [ ] Safari (macOS, latest)

## Document Types

Test with:
- [ ] Blank new document
- [ ] Document with text content
- [ ] Document with headings and structure
- [ ] Very long document (>10 pages)
- [ ] Document with special characters

## Known Limitations (Document for Users)

1. **No rich formatting preservation** - Only plain text is synced
2. **No image/table support** - V1 syncs text only
3. **No real-time sync** - Manual sync or polling required
4. **No offline mode** - Requires internet connection
5. **No Google Doc locking** - Multiple users can edit simultaneously

## Reporting Issues

Create GitHub issues with:
- Browser and OS version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Console errors (if any)

## Pre-Flight Checklist

Before shipping to pilots:

- [ ] All code committed to git
- [ ] README.md updated with final instructions
- [ ] DEPLOYMENT.md reviewed and tested
- [ ] Test data removed from code
- [ ] Production API endpoint configured
- [ ] Error messages are user-friendly
- [ ] All TODOs in code resolved or documented
- [ ] clasp deployment tested
- [ ] 3 internal team members have tested successfully
