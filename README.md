# CommSession Google Docs Add-on

A lightweight bridge between Google Docs (where users draft) and the CommSession Web App (where users manage approvals, watchers, comments, and governance).

## Philosophy

This add-on is **NOT** a full CommSession experience. It's a **status display + sync bridge** that opens the web app for complex tasks.

## Features

- ✅ **Status Display**: View message approval status directly in Google Docs
- ✅ **Quick Sync**: Send document content to CommSession
- ✅ **Smart Detection**: Auto-detect if document is already linked to CommSession
- ✅ **Web App Integration**: One-click navigation to full CommSession interface
- ✅ **Conflict Detection**: SHA-256 fingerprinting prevents content overwrites

## Tech Stack

- **Google Apps Script** (V8 Runtime)
- **HTML Service** (Sidebar UI)
- **CommSession REST API** (for sync)
- **SHA-256** (content fingerprinting)

## Repository Structure

```
commsession-google-docs-addon/
├── src/
│   ├── Code.gs                 # Main entry point
│   ├── Sidebar.html            # Sidebar UI
│   ├── API.gs                  # CommSession API client
│   ├── Sync.gs                 # Content sync logic
│   ├── Fingerprint.gs          # Content hashing
│   └── Utils.gs                # Helper functions
├── styles/
│   └── sidebar.css             # Inline CSS
├── tests/
│   └── test-data.json          # Mock data
├── appsscript.json             # Apps Script manifest
├── .clasp.json                 # Clasp config (gitignored)
├── .gitignore
├── README.md
└── DEPLOYMENT.md
```

## Prerequisites

1. **Node.js** (v16+)
2. **Google Account** with access to Google Apps Script
3. **clasp CLI** (`npm install -g @google/clasp`)
4. **CommSession API Access** (development or production)

## Setup

### 1. Install clasp CLI

```bash
npm install -g @google/clasp
```

### 2. Login to Google

```bash
clasp login
```

### 3. Clone this repository

```bash
git clone https://github.com/your-org/commsession-google-docs-addon.git
cd commsession-google-docs-addon
```

### 4. Create Apps Script project

```bash
clasp create --type standalone --title "CommSession Google Docs Add-on"
```

This will create a `.clasp.json` file (gitignored).

### 5. Push code to Apps Script

```bash
clasp push
```

### 6. Open in Apps Script Editor

```bash
clasp open
```

## Development Workflow

### Edit locally and push

```bash
# Make changes to .gs and .html files
clasp push

# Watch for changes (auto-push)
clasp push --watch
```

### Pull changes from Apps Script

```bash
clasp pull
```

### View logs

```bash
clasp logs
```

## Configuration

### API Endpoint

Set the CommSession API endpoint in `src/API.gs`:

```javascript
var COMMSESSION_API_URL = 'https://api.commsession.com';  // Production
// var COMMSESSION_API_URL = 'http://localhost:5000';     // Development
```

### Document Property Keys

The add-on stores metadata in document properties:

- `COMMSESSION_MESSAGE_ID` - Linked CommSession message ID
- `COMMSESSION_LAST_SYNC` - Timestamp of last sync
- `COMMSESSION_CONTENT_HASH` - SHA-256 hash of last synced content

## Usage

1. **Open Google Docs** with a document
2. **Open Add-ons menu** → CommSession
3. **View sidebar** showing sync status
4. **Click "Sync to CommSession"** to send content
5. **Click "Open in CommSession"** for full interface

## Testing

### Unit Tests

```bash
# Run mock tests with test data
node tests/run-tests.js
```

### Manual Testing

1. Create a test Google Doc
2. Install the add-on (unpublished)
3. Test sync functionality
4. Verify status updates
5. Check conflict detection

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Security

- **OAuth Scopes**: Minimal scopes (`documents.currentonly`, `script.container.ui`)
- **API Authentication**: Uses user's CommSession auth token
- **Content Hashing**: SHA-256 prevents accidental overwrites
- **No Data Storage**: All data lives in document properties (user-controlled)

## Troubleshooting

### "Add-on not showing"
- Ensure you've authorized the add-on
- Check Apps Script project is bound to the document

### "Sync fails"
- Verify API endpoint is correct
- Check network connectivity
- View Apps Script logs (`clasp logs`)

### "Status not updating"
- Clear document properties
- Re-sync the document

## Contributing

This repository follows the same contribution guidelines as the main CommSession project.

## License

Proprietary - CommSession Platform

---

**Note**: This add-on is a lightweight bridge. For full CommSession features (approval workflows, comments, notifications), use the [CommSession Web App](https://app.commsession.com).
