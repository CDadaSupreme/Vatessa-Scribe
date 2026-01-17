/**
 * Sync Logic
 * Handles synchronization between Google Docs and Vatessa
 */

/**
 * Main sync function called from sidebar
 */
function performSync() {
  try {
    var messageId = getStoredMessageId();

    if (!messageId) {
      return {
        success: false,
        error: 'NOT_LINKED'
      };
    }

    // Check if document has actually changed
    if (!hasContentChanged()) {
      return {
        success: true,
        message: 'No changes to sync',
        alreadySynced: true
      };
    }

    // Perform sync
    var result = syncDocumentContent(messageId);

    return {
      success: result.success,
      syncedAt: result.syncedAt,
      versionId: result.versionId
    };

  } catch (error) {
    Logger.log('Sync error: ' + error.message);

    if (error.message === 'AUTH_EXPIRED') {
      return {
        success: false,
        error: 'AUTH_EXPIRED',
        message: 'Your session has expired. Please reconnect.'
      };
    }

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Submits document for review (with auto-sync)
 */
function performSubmit() {
  try {
    var messageId = getStoredMessageId();

    if (!messageId) {
      return {
        success: false,
        error: 'NOT_LINKED'
      };
    }

    // Submit will sync automatically if syncFirst: true
    var result = submitForReview(messageId, true);

    // Update stored hash after submit (since it syncs)
    if (result.success) {
      var currentHash = generateContentHash();
      setStoredHash(currentHash);
    }

    return result;

  } catch (error) {
    Logger.log('Submit error: ' + error.message);

    if (error.message === 'AUTH_EXPIRED') {
      return {
        success: false,
        error: 'AUTH_EXPIRED',
        message: 'Your session has expired. Please reconnect.'
      };
    }

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Loads current status for sidebar
 */
function loadStatus() {
  try {
    var docInfo = getDocumentInfo();

    // Check if this is a duplicate ("Copy of...")
    if (docInfo.title.indexOf('Copy of ') === 0) {
      clearStoredMessageId();
      clearStoredHash();
      return {
        state: 'unlinked',
        reason: 'DUPLICATE_DETECTED',
        message: 'This appears to be a duplicate. Please link it to a message.'
      };
    }

    // Get stored message ID
    var messageId = getStoredMessageId();

    // If no stored ID, check if doc is linked via API
    if (!messageId) {
      var linkCheck = checkDocumentLinked(docInfo.id);

      if (linkCheck.authRequired) {
        return {
          state: 'auth_required',
          message: 'Please connect to Vatessa'
        };
      }

      if (linkCheck.linked) {
        messageId = linkCheck.messageId;
        setStoredMessageId(messageId);
      } else {
        return {
          state: 'unlinked',
          message: 'Not connected to Vatessa'
        };
      }
    }

    // Fetch message status
    var status = getMessageStatus(messageId);

    if (status.error === 'NOT_FOUND') {
      // Message was deleted or unlinked
      clearStoredMessageId();
      clearStoredHash();
      return {
        state: 'unlinked',
        reason: 'MESSAGE_DELETED',
        message: 'This message no longer exists in Vatessa'
      };
    }

    // Check if content has changed
    var hasChanges = hasContentChanged();

    return {
      state: 'linked',
      messageId: messageId,
      title: status.title,
      planName: status.planName,
      status: status.status,
      approvers: status.approvers,
      commentCount: status.commentCount,
      lastSyncedAt: status.lastSyncedAt,
      webAppUrl: status.webAppUrl,
      hasChanges: hasChanges
    };

  } catch (error) {
    Logger.log('Load status error: ' + error.message);

    if (error.message === 'AUTH_EXPIRED') {
      clearAuthToken();
      return {
        state: 'auth_required',
        message: 'Your session has expired. Please reconnect.'
      };
    }

    return {
      state: 'error',
      error: error.message
    };
  }
}

/**
 * Syncs document content to Vatessa
 */
function syncDocumentContent(messageId) {
  var content = getDocumentContentWithMetadata();
  var hash = generateContentHash();

  var payload = {
    content: {
      text: content.text,
      html: null // V1 doesn't preserve formatting
    },
    metadata: {
      title: content.title,
      lastModified: content.lastModified,
      wordCount: content.wordCount,
      contentHash: hash
    }
  };

  var result = makeAPICall('/messages/' + messageId + '/sync', 'POST', payload);

  // Store hash after successful sync
  if (result.success) {
    setStoredHash(hash);
  }

  return result;
}

/**
 * Gets document content with metadata
 */
function getDocumentContentWithMetadata() {
  var doc = DocumentApp.getActiveDocument();
  var body = doc.getBody();
  var text = body.getText();

  var wordCount = text.split(/\s+/).filter(function(word) {
    return word.length > 0;
  }).length;

  return {
    title: doc.getName(),
    text: text,
    wordCount: wordCount,
    lastModified: new Date().toISOString()
  };
}

/**
 * Gets document info
 */
function getDocumentInfo() {
  var doc = DocumentApp.getActiveDocument();
  return {
    id: doc.getId(),
    title: doc.getName(),
    url: doc.getUrl()
  };
}

/**
 * Gets stored message ID
 */
function getStoredMessageId() {
  var docProperties = PropertiesService.getDocumentProperties();
  return docProperties.getProperty('vatessa_message_id');
}

/**
 * Sets stored message ID
 */
function setStoredMessageId(messageId) {
  var docProperties = PropertiesService.getDocumentProperties();
  docProperties.setProperty('vatessa_message_id', messageId);
}

/**
 * Clears stored message ID
 */
function clearStoredMessageId() {
  var docProperties = PropertiesService.getDocumentProperties();
  docProperties.deleteProperty('vatessa_message_id');
}

/**
 * Gets stored content hash
 */
function getStoredHash() {
  var docProperties = PropertiesService.getDocumentProperties();
  return docProperties.getProperty('vatessa_content_hash');
}

/**
 * Sets stored content hash
 */
function setStoredHash(hash) {
  var docProperties = PropertiesService.getDocumentProperties();
  docProperties.setProperty('vatessa_content_hash', hash);
  docProperties.setProperty('vatessa_last_sync', new Date().toISOString());
}

/**
 * Clears stored content hash
 */
function clearStoredHash() {
  var docProperties = PropertiesService.getDocumentProperties();
  docProperties.deleteProperty('vatessa_content_hash');
  docProperties.deleteProperty('vatessa_last_sync');
}

/**
 * Checks if content has changed since last sync
 */
function hasContentChanged() {
  var storedHash = getStoredHash();

  if (!storedHash) {
    return true; // No stored hash means never synced
  }

  var currentHash = generateContentHash();
  return currentHash !== storedHash;
}

/**
 * Gets auth token
 */
function getAuthToken() {
  var userProperties = PropertiesService.getUserProperties();
  return userProperties.getProperty('vatessa_token');
}

/**
 * Sets auth token
 */
function setAuthToken(token) {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('vatessa_token', token);
}

/**
 * Clears auth token
 */
function clearAuthToken() {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty('vatessa_token');
}
