# Scribe (Google Docs Add-on)

> **Repo:** google-docs-addon
> **Product:** Vatessa
> **Purpose:** Submit Google Docs to Vatessa approval workflow

Vatessa is the approval and governance layer for business communications.

## Features

| Feature | Description |
|---------|-------------|
| Submit to Vatessa | Send document content to approval workflow |
| Select Approvers | Choose approvers from org members |
| Approval Status | View current approval state in sidebar |
| Sync Content | Pull approved/edited content back to Doc |
| Version History | View previous versions |

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Google Apps Script | Runtime |
| TypeScript | Language |
| Clasp | CLI deployment |
| React (optional) | Sidebar UI |

## Quick Start

```bash
# Install Clasp globally
npm install -g @google/clasp

# Authenticate with Google
clasp login

# Clone repo
git clone [repo-url]
cd google-docs-addon

# Install dependencies
npm install

# Configure
cp .env.example .env
cp .clasp.json.example .clasp.json
# Edit .clasp.json with your SCRIPT_ID

# Build and deploy
npm run build
clasp push

# Open in browser
clasp open
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to dist/ |
| `npm run push` | Build and push to Google |
| `npm run watch` | Watch mode - auto push on changes |
| `npm run open` | Open script in browser |
| `npm run logs` | Stream execution logs |

## Project Structure

```
src/
├── Code.ts              # Main entry, menu handlers
├── Sidebar.html         # Sidebar UI template
├── api/
│   ├── client.ts        # Vatessa API client
│   └── types.ts         # API type definitions
├── services/
│   ├── document.ts      # Google Doc operations
│   ├── auth.ts          # User auth helpers
│   └── storage.ts       # Properties service wrapper
├── ui/
│   ├── sidebar.ts       # Sidebar logic
│   └── dialogs.ts       # Modal dialogs
└── utils/
    ├── config.ts        # Configuration
    └── logger.ts        # Logging helpers
```

## Google Apps Script Limitations

| Limitation | Value |
|------------|-------|
| Execution time | 6 minutes max |
| URL Fetch calls | 20,000/day |
| Properties storage | 500KB total |
| Triggers | 20 per user per script |

## Related Repos

| Repo | Name | Purpose |
|------|------|---------|
| Atlas | Commsession-API | Backend API |
| Quill | word-addin | Word equivalent (future) |
| Nova | commsession-web | Web app (UI patterns) |

## Documentation

- [Developer Onboarding](./ONBOARDING.md)
