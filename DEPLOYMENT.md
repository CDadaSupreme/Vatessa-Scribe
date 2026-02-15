# Deployment Guide - Vatessa Google Docs Add-on

This guide covers deploying the Vatessa Google Docs Add-on to Google Workspace Marketplace.

## Deployment Stages

### Stage 1: Development (You are here)
- Local development with clasp
- Testing with unpublished add-on
- API integration development

### Stage 2: Internal Testing
- Deploy as unpublished add-on
- Share with internal team
- Gather feedback

### Stage 3: Private Beta
- Deploy to Google Workspace domain
- Limited user testing
- Bug fixes and refinements

### Stage 4: Public Release
- Submit to Google Workspace Marketplace
- Public availability
- Marketing and documentation

---

## Prerequisites

- [ ] Google Cloud Project with Apps Script API enabled
- [ ] OAuth consent screen configured
- [ ] Add-on tested and working locally
- [ ] Privacy policy URL
- [ ] Terms of service URL
- [ ] Support email configured

---

## Step 1: Prepare for Deployment

### 1.1 Update appsscript.json

Ensure all OAuth scopes are declared:

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/documents.currentonly",
    "https://www.googleapis.com/auth/script.container.ui"
  ],
  "addOns": {
    "common": {
      "name": "Vatessa",
      "logoUrl": "https://vatessa.com/VatessaLogo_Blue.png",
      "layoutProperties": {
        "primaryColor": "#4F46E5"
      }
    }
  }
}
```

### 1.2 Prepare Assets

Create the following assets:

- **Logo (128x128 px)**: Square logo for add-on listing
- **Screenshots (1280x800 px)**: 3-5 screenshots showing key features
- **Privacy Policy**: Hosted at `https://www.vatessa.com/privacy`
- **Terms of Service**: Hosted at `https://www.vatessa.com/terms`

---

## Step 2: Create Google Cloud Project

### 2.1 Create Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "Vatessa Google Docs Add-on"
3. Note the Project ID

### 2.2 Enable APIs

```bash
gcloud services enable script.googleapis.com
gcloud services enable drive.googleapis.com
```

### 2.3 Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in app information:
   - App name: `Vatessa`
   - User support email: `support@vatessa.com`
   - App logo: Upload 128x128 logo
   - Application home page: `https://www.vatessa.com`
   - Privacy policy: `https://www.vatessa.com/privacy`
   - Terms of service: `https://www.vatessa.com/terms`
4. Add scopes:
   - `https://www.googleapis.com/auth/documents.currentonly`
   - `https://www.googleapis.com/auth/script.container.ui`
5. Add test users (for development)

---

## Step 3: Link Apps Script to Cloud Project

### 3.1 Get Cloud Project Number

```bash
gcloud projects describe PROJECT_ID --format="value(projectNumber)"
```

### 3.2 Link in Apps Script

1. Open Apps Script project: `clasp open`
2. Go to **Project Settings**
3. Under **Google Cloud Platform (GCP) Project**, click **Change project**
4. Enter the Project Number
5. Click **Set project**

---

## Step 4: Deploy Add-on

### 4.1 Create Deployment

```bash
# Push latest code
clasp push

# Create versioned deployment
clasp deploy --description "v1.0.0 - Initial release"
```

### 4.2 Get Deployment ID

```bash
clasp deployments
```

Note the Deployment ID (e.g., `AKfycbz...`).

---

## Step 5: Test Deployment

### 5.1 Install Unpublished Add-on

1. Open a Google Doc
2. Go to **Extensions** → **Add-ons** → **Manage add-ons**
3. Click **+** (Install unpublished add-on)
4. Paste the **Deployment ID**
5. Click **Install**

### 5.2 Verify Functionality

- [ ] Sidebar loads correctly
- [ ] Sync to Vatessa works
- [ ] Status updates display
- [ ] "Open in Vatessa" link works
- [ ] Conflict detection works
- [ ] No errors in Apps Script logs

---

## Step 6: Submit to Google Workspace Marketplace

### 6.1 Prepare Marketplace Listing

1. Go to [Google Workspace Marketplace SDK](https://console.cloud.google.com/apis/api/appsmarket-component.googleapis.com)
2. Enable **Google Workspace Marketplace SDK**
3. Click **Configuration**

### 6.2 Fill Listing Information

**Basic Information**:
- App name: `Vatessa`
- Short description: `Sync Google Docs with Vatessa for approval workflows`
- Detailed description: (See template below)
- Category: `Productivity`
- Language: `English`

**Branding**:
- App icon: 128x128 logo
- Screenshots: Upload 3-5 screenshots
- Video URL: (Optional) Demo video

**Support**:
- Support email: `support@vatessa.com`
- Privacy policy: `https://www.vatessa.com/privacy`
- Terms of service: `https://www.vatessa.com/terms`

**OAuth Configuration**:
- Scopes: (Auto-populated from appsscript.json)

**Pricing**:
- Free or Paid: `Free` (or configure pricing)

### 6.3 Submit for Review

1. Click **Publish** → **Submit for review**
2. Google will review (typically 3-5 business days)
3. Address any feedback from Google reviewers
4. Once approved, click **Publish**

---

## Detailed Description Template

```
Vatessa Google Docs Add-on

Seamlessly connect your Google Docs drafts with the Vatessa approval workflow platform.

KEY FEATURES:
• Sync document content to Vatessa with one click
• View approval status directly in Google Docs
• Smart conflict detection prevents content overwrites
• Quick navigation to full Vatessa interface

HOW IT WORKS:
1. Open your Google Doc
2. Click Extensions → Vatessa
3. Sync your draft to Vatessa
4. View status updates in the sidebar
5. Open in Vatessa for full approval workflow management

ABOUT VATESSA:
Vatessa is a communication governance platform that helps organizations manage approval workflows, stakeholder reviews, and compliance tracking for important communications.

PRIVACY & SECURITY:
• Minimal OAuth scopes (documents.currentonly only)
• No data stored outside Google Docs
• Content hashing prevents accidental overwrites
• All data remains in your Google account

SUPPORT:
Need help? Contact support@vatessa.com

REQUIREMENTS:
• Google Workspace account
• Vatessa account (sign up at vatessa.com)
```

---

## Step 7: Post-Deployment

### 7.1 Monitor Usage

1. View installation metrics in Google Cloud Console
2. Monitor Apps Script execution logs
3. Track user feedback and support requests

### 7.2 Update Process

```bash
# Make changes
clasp push

# Create new deployment
clasp deploy --description "v1.1.0 - Bug fixes"

# Update marketplace listing (if needed)
```

### 7.3 Versioning

Follow semantic versioning:
- `v1.0.0` - Initial release
- `v1.0.1` - Bug fixes
- `v1.1.0` - New features
- `v2.0.0` - Breaking changes

---

## Troubleshooting Deployment

### "OAuth consent screen verification required"

Google requires verification for apps with sensitive scopes. Submit:
- Privacy policy
- Terms of service
- YouTube video showing app functionality
- Justification for each OAuth scope

### "Add-on rejected by Google"

Common reasons:
- Missing privacy policy
- Unclear app description
- Excessive OAuth scopes
- Branding issues

**Solution**: Address feedback and resubmit.

### "Users can't install add-on"

- Check OAuth consent screen is published
- Verify add-on is published on Marketplace
- Ensure users have accepted permissions

---

## Rollback Procedure

If critical bug discovered:

1. **Immediate**: Remove marketplace listing
2. Create hotfix branch
3. Fix bug and test thoroughly
4. Deploy new version
5. Re-publish to marketplace

```bash
# Create hotfix deployment
clasp deploy --description "v1.0.1 - Hotfix: Critical bug"
```

---

## Checklist Before Publishing

- [ ] All features tested and working
- [ ] No errors in Apps Script logs
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Support email configured
- [ ] Screenshots prepared (3-5 images)
- [ ] Logo assets ready (128x128 px)
- [ ] OAuth scopes justified
- [ ] Internal team has tested
- [ ] Documentation complete
- [ ] Error handling implemented
- [ ] User permissions handled gracefully

---

## Contact

For deployment questions, contact:
- **Engineering**: dev@vatessa.com
- **Support**: support@vatessa.com

---

**Last Updated**: 2025-11-24
**Current Version**: v1.0.0 (Development)
