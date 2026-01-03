# Scribe Developer Onboarding

## Prerequisites

- Node.js 18+
- Git
- Google account
- Clasp CLI: `npm install -g @google/clasp`

## Setup Steps

1. **Install Clasp globally**

   ```bash
   npm install -g @google/clasp
   ```

2. **Authenticate with Google**

   ```bash
   clasp login
   ```

   This opens a browser for OAuth. Grant permissions.

3. **Enable Apps Script API**

   - Go to: https://script.google.com/home/usersettings
   - Turn ON "Google Apps Script API"

4. **Clone the repository**

   ```bash
   git clone [repo-url]
   cd google-docs-addon
   ```

5. **Install dependencies**

   ```bash
   npm install
   ```

6. **Configure environment**

   ```bash
   cp .env.example .env
   cp .clasp.json.example .clasp.json
   ```

7. **Create a new Apps Script project (first time only)**

   ```bash
   clasp create --title "Vatessa" --type docs --rootDir ./dist
   ```

   This creates `.clasp.json` with your new SCRIPT_ID.

   **OR** use existing project:
   - Get SCRIPT_ID from: https://script.google.com -> Your Project -> Project Settings -> IDs
   - Edit `.clasp.json` with that ID

8. **Build and deploy**

   ```bash
   npm run build
   clasp push
   ```

9. **Test in Google Docs**

   - Open any Google Doc
   - Extensions -> Vatessa -> [feature]
   - Or: Extensions -> Apps Script -> Run function

## Development Workflow

### Make changes:

```bash
# Edit files in src/

# Build and push
npm run push

# Or use watch mode (auto-push on save)
npm run watch
```

### View logs:

```bash
clasp logs --watch
```

### Open script editor:

```bash
clasp open
```

## Google Apps Script Basics

### Entry points (Code.ts):

```typescript
// Menu creation - runs when doc opens
function onOpen() {
  DocumentApp.getUi()
    .createMenu('Vatessa')
    .addItem('Submit for Approval', 'showSubmitDialog')
    .addItem('View Status', 'showStatusSidebar')
    .addToUi();
}

// Sidebar handler
function showStatusSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Vatessa');
  DocumentApp.getUi().showSidebar(html);
}
```

### Get document content:

```typescript
function getDocumentContent(): string {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  return body.getText();
}

function getDocumentHtml(): string {
  const doc = DocumentApp.getActiveDocument();
  const id = doc.getId();
  const url = `https://docs.google.com/feeds/download/documents/export/Export?id=${id}&exportFormat=html`;
  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` }
  });
  return response.getContentText();
}
```

### Call Vatessa API:

```typescript
function submitToVatessa(title: string, approvers: string[]) {
  const content = getDocumentContent();
  const docId = DocumentApp.getActiveDocument().getId();

  const response = UrlFetchApp.fetch(`${API_URL}/v2/messages`, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'x-org-id': getOrgId()
    },
    payload: JSON.stringify({
      title,
      content,
      sourceType: 'google-doc',
      sourceId: docId,
      approvers
    })
  });

  return JSON.parse(response.getContentText());
}
```

### Store data (Properties Service):

```typescript
// User-specific storage
function saveUserSetting(key: string, value: string) {
  PropertiesService.getUserProperties().setProperty(key, value);
}

function getUserSetting(key: string): string | null {
  return PropertiesService.getUserProperties().getProperty(key);
}

// Document-specific storage
function saveDocSetting(key: string, value: string) {
  PropertiesService.getDocumentProperties().setProperty(key, value);
}
```

## Sidebar Communication

### From sidebar (JavaScript) to Apps Script:

```html
<script>
  function submitDocument() {
    const title = document.getElementById('title').value;

    google.script.run
      .withSuccessHandler(onSuccess)
      .withFailureHandler(onError)
      .submitToVatessa(title, selectedApprovers);
  }

  function onSuccess(result) {
    console.log('Submitted:', result);
  }

  function onError(error) {
    console.error('Error:', error);
  }
</script>
```

### Return data to sidebar:

```typescript
// Code.ts
function getApprovalStatus(): ApprovalStatus {
  const docId = DocumentApp.getActiveDocument().getId();
  const messageId = getDocSetting('vatessa_message_id');

  if (!messageId) {
    return { status: 'not_submitted' };
  }

  const response = UrlFetchApp.fetch(`${API_URL}/v2/messages/${messageId}`);
  return JSON.parse(response.getContentText());
}
```

## API Integration

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v2/messages` | POST | Submit doc for approval |
| `/v2/messages/:id` | GET | Get approval status |
| `/v2/messages/:id` | PUT | Update content |
| `/v2/orgs/:orgId/members` | GET | List approvers |
| `/v2/users/me/permissions` | GET | Check user permissions |

## Testing

### Test in Script Editor:

1. `clasp open`
2. Select function from dropdown
3. Click "Run"
4. View logs in Execution Log

### Test in Document:

1. Open a Google Doc
2. Extensions -> Vatessa -> [feature]
3. Check sidebar/dialog works

### Debug API calls:

```typescript
function testApiConnection() {
  try {
    const response = UrlFetchApp.fetch(`${API_URL}/health`);
    Logger.log('API Response: ' + response.getContentText());
    return true;
  } catch (error) {
    Logger.log('API Error: ' + error);
    return false;
  }
}
```

## Deployment

### Development:

```bash
clasp push
```

### Production:

1. Create new deployment:

   ```bash
   clasp deploy --description "v1.0.0"
   ```

2. Or in browser:
   - `clasp open`
   - Deploy -> New deployment
   - Select "Add-on" type
   - Fill in details

### Publishing to Marketplace (future):

- Requires Google review
- See: https://developers.google.com/workspace/marketplace

## Common Issues

**"Script not found":**
- Check `.clasp.json` has correct SCRIPT_ID
- Ensure you ran `clasp login`

**"Authorization required":**
- Run function once from Script Editor
- Grant permissions when prompted

**"URL Fetch failed":**
- Check API_URL is correct
- Verify API is running (for localhost)
- Check API allows external requests

**Changes not appearing:**
- Ensure `clasp push` succeeded
- Refresh the Google Doc
- Clear browser cache

## Current Priorities

[Chris will update with specific tasks]

## Questions?

Contact Chris directly.
