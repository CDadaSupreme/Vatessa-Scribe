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
 */
function getDocumentStatus() {
  var doc = DocumentApp.getActiveDocument();
  var properties = PropertiesService.getDocumentProperties();

  var messageId = properties.getProperty('COMMSESSION_MESSAGE_ID');
  var lastSync = properties.getProperty('COMMSESSION_LAST_SYNC');
  var contentHash = properties.getProperty('COMMSESSION_CONTENT_HASH');

  // If not linked, return unlinked status
  if (!messageId) {
    return {
      linked: false,
      documentId: doc.getId(),
      documentName: doc.getName()
    };
  }

  // Get status from CommSession API
  var apiStatus = getMessageStatus(messageId);

  return {
    linked: true,
    messageId: messageId,
    lastSync: lastSync,
    contentHash: contentHash,
    documentId: doc.getId(),
    documentName: doc.getName(),
    status: apiStatus
  };
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
 * Syncs document to CommSession
 */
function syncToCommSession() {
  try {
    var content = getDocumentContent();
    var properties = PropertiesService.getDocumentProperties();
    var messageId = properties.getProperty('COMMSESSION_MESSAGE_ID');

    // Calculate content fingerprint
    var newHash = calculateFingerprint(content);
    var oldHash = properties.getProperty('COMMSESSION_CONTENT_HASH');

    // Check for conflicts
    if (messageId && oldHash && newHash !== oldHash) {
      var remoteHash = getRemoteContentHash(messageId);
      if (remoteHash && remoteHash !== oldHash) {
        return {
          success: false,
          error: 'Conflict detected: Document has been modified both locally and in CommSession.'
        };
      }
    }

    // Sync to CommSession
    var result = syncContent(messageId, content, newHash);

    if (result.success) {
      // Update properties
      properties.setProperty('COMMSESSION_MESSAGE_ID', result.messageId);
      properties.setProperty('COMMSESSION_LAST_SYNC', new Date().toISOString());
      properties.setProperty('COMMSESSION_CONTENT_HASH', newHash);

      return {
        success: true,
        messageId: result.messageId,
        url: result.url
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
 * Opens CommSession web app for this message
 */
function openInCommSession() {
  var properties = PropertiesService.getDocumentProperties();
  var messageId = properties.getProperty('COMMSESSION_MESSAGE_ID');

  if (!messageId) {
    return {
      success: false,
      error: 'Document not linked to CommSession'
    };
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
  var properties = PropertiesService.getDocumentProperties();
  properties.deleteProperty('COMMSESSION_MESSAGE_ID');
  properties.deleteProperty('COMMSESSION_LAST_SYNC');
  properties.deleteProperty('COMMSESSION_CONTENT_HASH');

  return {
    success: true
  };
}
