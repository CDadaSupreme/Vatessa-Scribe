# Vatessa Google Docs Add-on - Setup Guide

Quick start guide to get the add-on running locally.

## Prerequisites

- [x] Google Account
- [x] Node.js v16+ installed
- [x] Git installed
- [ ] clasp CLI installed globally

## Step 1: Install clasp CLI

```bash
npm install -g @google/clasp
```

Verify installation:
```bash
clasp --version
```

## Step 2: Login to Google

```bash
clasp login
```

This will:
1. Open a browser window
2. Ask you to authorize clasp
3. Create credentials in `~/.clasprc.json`

## Step 3: Create Apps Script Project

From the `vatessa-google-docs-addon` directory:

```bash
cd C:/dev/kanovi/vatessa-google-docs-addon

# Create new Apps Script project
clasp create --type standalone --title "Vatessa Google Docs Add-on"
```

This creates a `.clasp.json` file with your script ID (already gitignored).

## Step 4: Push Code to Apps Script

```bash
clasp push
```

This uploads all `.gs` and `.html` files to Google Apps Script.

**Note**: clasp automatically finds files based on extension:
- `*.gs` files → Apps Script server-side code
- `*.html` files → HTML service files
- CSS must be inline in HTML (Google Apps Script limitation)

## Step 5: Open in Apps Script Editor

```bash
clasp open
```

This opens your project in the Apps Script web IDE where you can:
- View logs
- Test functions manually
- Set up triggers
- Configure project settings

## Step 6: Enable Apps Script API

1. Go to https://script.google.com/home/usersettings
2. Enable **Google Apps Script API**

## Step 7: Test the Add-on

### Option A: Test in Script Editor
1. Open Apps Script editor: `clasp open`
2. Click **Run** → Select `showSidebar`
3. Authorize the add-on when prompted
4. The sidebar will appear in a test document

### Option B: Test from Google Docs
1. Create a new Google Doc
2. Go to **Extensions** → **Apps Script**
3. This opens the bound script project
4. Run `onOpen()` to add the menu item
5. Refresh the document
6. Go to **Add-ons** → **Vatessa** → **Open Vatessa**

## Step 8: Link to Google Cloud Project (For Production)

Required only for deploying to Google Workspace Marketplace.

1. Create a Google Cloud Project
2. Get the project number:
   ```bash
   gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)"
   ```
3. In Apps Script editor:
   - Go to **Project Settings**
   - Under **Google Cloud Platform (GCP) Project**
   - Click **Change project**
   - Enter the project number

## Development Workflow

### Making Changes

1. Edit files locally in your IDE
2. Push changes to Apps Script:
   ```bash
   clasp push
   ```
3. Refresh the document to see changes

### Watch Mode (Auto-push on save)

```bash
clasp push --watch
```

### View Logs

```bash
clasp logs

# Or follow logs in real-time
clasp logs --watch
```

### Pull Changes from Apps Script

If you make changes in the web editor:

```bash
clasp pull
```

**Warning**: This overwrites local files!

## Configuration

### API Endpoint

Edit `src/API.gs` to set the Vatessa API URL:

```javascript
// For local development
var VATESSA_API_URL = 'http://localhost:5000';

// For production
var VATESSA_API_URL = 'https://api.vatessa.com';
```

### Authentication

Currently, the add-on requires setting an auth token. Options:

1. **User Properties** (Current implementation):
   ```javascript
   // User runs this once in Apps Script
   function setMyToken() {
     PropertiesService.getUserProperties()
       .setProperty('VATESSA_AUTH_TOKEN', 'your-token-here');
   }
   ```

2. **OAuth Flow** (Recommended for production):
   - Implement OAuth 2.0 flow in `src/API.gs`
   - Add OAuth scope to `appsscript.json`
   - See Google Apps Script OAuth docs

## Troubleshooting

### "Script not authorized"

**Solution**: Run any function manually in the script editor to trigger the authorization flow.

### "Sidebar not showing"

**Solution**:
1. Ensure `clasp push` completed successfully
2. Refresh the document
3. Check Apps Script logs for errors: `clasp logs`

### "API request failed"

**Solution**:
1. Check API endpoint is correct
2. Verify auth token is set
3. Check network connectivity
4. View logs: `clasp logs`

### "Cannot find module @google/clasp"

**Solution**: Install clasp globally:
```bash
npm install -g @google/clasp
```

### "Clasp command not found"

**Solution**:
- Windows: Close and reopen terminal
- Mac/Linux: Add npm global bin to PATH
  ```bash
  echo 'export PATH="$PATH:$(npm config get prefix)/bin"' >> ~/.bashrc
  source ~/.bashrc
  ```

## File Structure

```
vatessa-google-docs-addon/
├── src/
│   ├── Code.gs              # Main entry point & menu handlers
│   ├── Sidebar.html         # Sidebar UI (includes inline CSS & JS)
│   ├── API.gs               # Vatessa API client
│   ├── Fingerprint.gs       # SHA-256 content hashing
│   └── Utils.gs             # Helper functions
├── styles/
│   └── sidebar.css          # Additional CSS (for reference)
├── tests/
│   └── test-data.json       # Mock data for testing
├── .gitignore               # Excludes .clasp.json and credentials
├── appsscript.json          # Apps Script manifest
├── README.md                # Project documentation
├── DEPLOYMENT.md            # Deployment guide
└── SETUP.md                 # This file
```

## Next Steps

After successful local setup:

1. Test all functionality:
   - [ ] Sidebar loads
   - [ ] Sync to Vatessa works
   - [ ] Status display shows correctly
   - [ ] Open in Vatessa works
   - [ ] Unlink document works

2. Configure production API endpoint

3. Implement proper authentication (OAuth)

4. Follow `DEPLOYMENT.md` for publishing to Marketplace

## Resources

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [clasp Documentation](https://github.com/google/clasp)
- [Google Workspace Add-ons](https://developers.google.com/workspace/add-ons)
- [Vatessa API Documentation](https://docs.vatessa.com/api)

## Support

For issues or questions:
- **Engineering**: dev@vatessa.com
- **General**: support@vatessa.com
