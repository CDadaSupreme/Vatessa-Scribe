/**
 * CommSession Google Docs Add-on
 * Main entry point and menu handlers
 */

/**
 * Runs when the add-on is installed
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Runs when document is opened
 */
function onOpen(e) {
  DocumentApp.getUi()
    .createAddonMenu()
    .addItem('Open CommSession', 'showSidebar')
    .addToUi();
}

/**
 * Homepage trigger for add-on
 */
function onHomepage(e) {
  return createCard();
}

/**
 * Creates the add-on card for homepage
 */
function createCard() {
  var card = CardService.newCardBuilder();
  card.setHeader(
    CardService.newCardHeader()
      .setTitle('CommSession')
      .setImageUrl('https://www.commsession.com/logo.png')
  );

  var section = CardService.newCardSection();
  section.addWidget(
    CardService.newTextParagraph()
      .setText('Sync your document with CommSession to manage approvals and governance.')
  );

  var syncButton = CardService.newTextButton()
    .setText('Sync to CommSession')
    .setOnClickAction(
      CardService.newAction()
        .setFunctionName('syncToCommSession')
    );

  section.addWidget(syncButton);
  card.addSection(section);

  return card.build();
}

/**
 * Shows the sidebar
 */
function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('CommSession')
    .setWidth(300);
  DocumentApp.getUi().showSidebar(html);
}

/**
 * Gets the current document status
 * Handles edge cases: document duplication, unlinked docs, expired tokens
 */
function getDocumentStatus() {
  try {
    var doc = DocumentApp.getActiveDocument();
    var docProperties = PropertiesService.getDocumentProperties();
    var docTitle = doc.getName();
    var docId = doc.getId();

    // Edge case 1: Document duplicated ("Copy of...")
    if (docTitle.indexOf('Copy of') === 0) {
      // Clear any stored message ID from duplicate
      docProperties.deleteAllProperties();
      return {
        linked: false,
        documentId: docId,
        documentName: docTitle,
        isDuplicate: true
      };
    }

    var messageId = docProperties.getProperty('CS_MESSAGE_ID');
    var lastSync = docProperties.getProperty('CS_LAST_SYNC');
    var storedHash = docProperties.getProperty('CS_CONTENT_HASH');

    // Check if user is authenticated
    var token = getAuthToken();
    if (!token) {
      return {
        linked: false,
        documentId: docId,
        documentName: docTitle,
        needsAuth: true
      };
    }

    // If no stored message ID, check via API
    if (!messageId) {
      try {
        var checkResult = checkDocumentLinked(docId);
        if (checkResult.linked && checkResult.messageId) {
          // Document was linked but local properties were lost
          messageId = checkResult.messageId;
          docProperties.setProperty('CS_MESSAGE_ID', messageId);
        } else {
          return {
            linked: false,
            documentId: docId,
            documentName: docTitle
          };
        }
      } catch (e) {
        Logger.log('Error checking document link: ' + e.toString());
        return {
          linked: false,
          documentId: docId,
          documentName: docTitle
        };
      }
    }

    // Get status from CommSession API
    try {
      var apiStatus = getMessageStatus(messageId);

      // Edge case 2: Message not found (unlinked in CommSession)
      if (!apiStatus) {
        docProperties.deleteAllProperties();
        return {
          linked: false,
          documentId: docId,
          documentName: docTitle,
          wasUnlinked: true
        };
      }

      // Check if content has changed
      var currentHash = generateContentHash();
      var hasChanges = storedHash && currentHash !== storedHash;

      return {
        linked: true,
        messageId: messageId,
        lastSync: lastSync,
        documentId: docId,
        documentName: docTitle,
        status: apiStatus,
        hasChanges: hasChanges,
        currentHash: currentHash
      };
    } catch (error) {
      // Edge case 3: Access token expired (401)
      if (error.toString().indexOf('401') !== -1) {
        clearAuthToken();
        return {
          linked: false,
          documentId: docId,
          documentName: docTitle,
          needsAuth: true,
          tokenExpired: true
        };
      }
      throw error;
    }
  } catch (error) {
    Logger.log('Error in getDocumentStatus: ' + error.toString());
    return {
      linked: false,
      error: error.toString()
    };
  }
}

/**
 * Gets the document content
 */
function getDocumentContent() {
  var doc = DocumentApp.getActiveDocument();
  var body = doc.getBody();
  return body.getText();
}

/**
 * Opens CommSession web app to create a new message
 * User will authenticate and link document there
 */
function createMessageInCommSession() {
  var doc = DocumentApp.getActiveDocument();
  var docId = doc.getId();
  var url = getCommSessionUrl() + '?source=google_docs&docId=' + docId;

  return {
    success: true,
    url: url
  };
}

/**
 * Syncs document to CommSession
 */
function syncToCommSession() {
  try {
    var docProperties = PropertiesService.getDocumentProperties();
    var messageId = docProperties.getProperty('CS_MESSAGE_ID');

    if (!messageId) {
      return {
        success: false,
        error: 'Document not linked to CommSession. Create a message first.'
      };
    }

    // Sync to CommSession
    var result = syncContent(messageId);

    if (result.success) {
      // Update properties
      docProperties.setProperty('CS_LAST_SYNC', result.syncedAt);
      docProperties.setProperty('CS_CONTENT_HASH', result.contentHash);

      return {
        success: true,
        syncedAt: result.syncedAt,
        versionId: result.versionId
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    Logger.log('Sync error: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Submits message for review
 */
function submitMessageForReview() {
  try {
    var docProperties = PropertiesService.getDocumentProperties();
    var messageId = docProperties.getProperty('CS_MESSAGE_ID');

    if (!messageId) {
      return {
        success: false,
        error: 'Document not linked to CommSession'
      };
    }

    // Submit for review (will sync first)
    var result = submitForReview(messageId, true);

    if (result.success) {
      return {
        success: true,
        message: result.message,
        notifiedApprovers: result.notifiedApprovers
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    Logger.log('Submit error: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Opens CommSession web app for this message
 */
function openInCommSession() {
  var docProperties = PropertiesService.getDocumentProperties();
  var messageId = docProperties.getProperty('CS_MESSAGE_ID');

  if (!messageId) {
    // If not linked, open create flow
    return createMessageInCommSession();
  }

  var url = getCommSessionUrl() + '/messages/' + messageId;
  return {
    success: true,
    url: url
  };
}

/**
 * Clears document link to CommSession
 */
function unlinkDocument() {
  var docProperties = PropertiesService.getDocumentProperties();
  docProperties.deleteAllProperties();

  return {
    success: true
  };
}

/**
 * Stores auth token from CommSession
 * Called by sidebar after user authenticates in web app
 */
function storeAuthToken(token) {
  setAuthToken(token);
  return {
    success: true
  };
}

/**
 * Stores message ID after linking in CommSession
 * Called by sidebar after user links document in web app
 */
function storeMessageId(messageId) {
  var docProperties = PropertiesService.getDocumentProperties();
  docProperties.setProperty('CS_MESSAGE_ID', messageId);

  // Initial sync to set content hash
  var currentHash = generateContentHash();
  docProperties.setProperty('CS_CONTENT_HASH', currentHash);
  docProperties.setProperty('CS_LAST_SYNC', new Date().toISOString());

  return {
    success: true
  };
}

/**
 * Checks if content has changed since last sync
 */
function checkForChanges() {
  var docProperties = PropertiesService.getDocumentProperties();
  var storedHash = docProperties.getProperty('CS_CONTENT_HASH');

  if (!storedHash) {
    return { hasChanges: false };
  }

  var currentHash = generateContentHash();
  return {
    hasChanges: currentHash !== storedHash,
    currentHash: currentHash,
    storedHash: storedHash
  };
}
