/**
 * Vatessa Google Docs Add-on
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
    .addItem('Open Vatessa', 'showSidebar')
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
      .setTitle('Vatessa')
      .setImageUrl('https://www.vatessa.com/logo.png')
  );

  var section = CardService.newCardSection();
  section.addWidget(
    CardService.newTextParagraph()
      .setText('Sync your document with Vatessa to manage approvals and governance.')
  );

  var syncButton = CardService.newTextButton()
    .setText('Sync to Vatessa')
    .setOnClickAction(
      CardService.newAction()
        .setFunctionName('syncToVatessa')
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
    .setTitle('Vatessa')
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

    var messageId = docProperties.getProperty('vatessa_message_id');
    var lastSync = docProperties.getProperty('vatessa_last_sync');
    var storedHash = docProperties.getProperty('vatessa_content_hash');

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
          docProperties.setProperty('vatessa_message_id', messageId);
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

    // Get status from Vatessa API
    try {
      var apiStatus = getMessageStatus(messageId);

      // Edge case 2: Message not found or API error
      if (!apiStatus || apiStatus.error) {
        Logger.log('getMessageStatus failed: ' + JSON.stringify(apiStatus));
        docProperties.deleteAllProperties();
        return {
          linked: false,
          documentId: docId,
          documentName: docTitle,
          wasUnlinked: true,
          apiError: apiStatus ? apiStatus.error : null
        };
      }

      // Check if content has changed
      var currentHash = generateContentHash();
      var hasChanges = storedHash && currentHash !== storedHash;

      // Get stored message type
      var messageType = docProperties.getProperty('vatessa_message_type') || 'communication';

      return {
        linked: true,
        messageId: messageId,
        lastSync: lastSync,
        documentId: docId,
        documentName: docTitle,
        status: apiStatus,
        hasChanges: hasChanges,
        currentHash: currentHash,
        messageType: messageType
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
 * Opens Vatessa web app to create a new message
 * User will authenticate and link document there
 */
function createMessageInVatessa() {
  var doc = DocumentApp.getActiveDocument();
  var docId = doc.getId();
  var url = getVatessaUrl() + '?source=google_docs&docId=' + docId;

  return {
    success: true,
    url: url
  };
}

/**
 * Syncs document to Vatessa
 */
function syncToVatessa() {
  try {
    var docProperties = PropertiesService.getDocumentProperties();
    var messageId = docProperties.getProperty('vatessa_message_id');

    if (!messageId) {
      return {
        success: false,
        error: 'Document not linked to Vatessa. Create a message first.'
      };
    }

    // Sync to Vatessa
    var result = syncContent(messageId);

    if (result.success) {
      // Update properties
      docProperties.setProperty('vatessa_last_sync', result.syncedAt);
      docProperties.setProperty('vatessa_content_hash', result.contentHash);

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
    var messageId = docProperties.getProperty('vatessa_message_id');

    if (!messageId) {
      return {
        success: false,
        error: 'Document not linked to Vatessa'
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
 * Opens Vatessa web app for this message
 */
function openInVatessa() {
  var docProperties = PropertiesService.getDocumentProperties();
  var messageId = docProperties.getProperty('vatessa_message_id');

  if (!messageId) {
    // If not linked, open create flow
    return createMessageInVatessa();
  }

  var url = getVatessaUrl() + '/messages/' + messageId;
  return {
    success: true,
    url: url
  };
}

/**
 * Clears document link to Vatessa
 */
function unlinkDocument() {
  var docProperties = PropertiesService.getDocumentProperties();
  docProperties.deleteAllProperties();

  return {
    success: true
  };
}

/**
 * Stores auth token from Vatessa
 * Called by sidebar after user authenticates in web app
 */
function storeAuthToken(token) {
  setAuthToken(token);
  return {
    success: true
  };
}

/**
 * Stores message ID after linking in Vatessa
 * Called by sidebar after user links document in web app
 */
function storeMessageId(messageId) {
  var docProperties = PropertiesService.getDocumentProperties();
  docProperties.setProperty('vatessa_message_id', messageId);

  // Initial sync to set content hash
  var currentHash = generateContentHash();
  docProperties.setProperty('vatessa_content_hash', currentHash);
  docProperties.setProperty('vatessa_last_sync', new Date().toISOString());

  return {
    success: true
  };
}

/**
 * Checks if content has changed since last sync
 */
function checkForChanges() {
  var docProperties = PropertiesService.getDocumentProperties();
  var storedHash = docProperties.getProperty('vatessa_content_hash');

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

/**
 * Sends document for approval
 * Creates a new message or updates existing one
 * @param {string} messageType - 'communication' or 'policy'
 */
function sendForApproval(messageType) {
  try {
    var doc = DocumentApp.getActiveDocument();
    var docProperties = PropertiesService.getDocumentProperties();
    var messageId = docProperties.getProperty('vatessa_message_id');

    // Get document content
    var content = {
      id: doc.getId(),
      name: doc.getName(),
      title: doc.getName(),
      content: doc.getBody().getText()
    };

    // Try to parse structured content if available
    try {
      var structured = parseStructuredContent(doc.getBody());
      if (structured.title) content.title = structured.title;
      if (structured.summary) content.summary = structured.summary;
      if (structured.audience) content.audience = structured.audience;
      if (structured.audienceSize) content.audienceSize = structured.audienceSize;
      if (structured.keyPoints) content.keyPoints = structured.keyPoints;
      if (structured.body) content.content = structured.body;
    } catch (e) {
      Logger.log('Could not parse structured content: ' + e.toString());
    }

    var result;
    if (messageId) {
      // Update existing message
      result = VatessaApi.updateMessage(messageId, content);
    } else {
      // Create new message with type
      result = VatessaApi.createMessage(content, messageType || 'communication');
      if (result && result.id) {
        docProperties.setProperty('vatessa_message_id', result.id);
        messageId = result.id;
      }
    }

    // Update sync properties
    var currentHash = generateContentHash();
    docProperties.setProperty('vatessa_content_hash', currentHash);
    docProperties.setProperty('vatessa_last_sync', new Date().toISOString());
    if (messageType) {
      docProperties.setProperty('vatessa_message_type', messageType);
    }

    return {
      success: true,
      messageId: messageId || result.id,
      isNew: !messageId
    };
  } catch (error) {
    Logger.log('sendForApproval error: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Gets the stored message type for this document
 */
function getStoredMessageType() {
  var docProperties = PropertiesService.getDocumentProperties();
  return docProperties.getProperty('vatessa_message_type') || 'communication';
}

/**
 * Validates content before sending to AI
 * @param {string} content - Document content
 * @returns {{ valid: boolean, error?: { code: string, message: string } }}
 */
function validateContent(content) {
  if (!content || content.trim().length === 0) {
    return {
      valid: false,
      error: {
        code: 'content_empty',
        message: 'Document is empty. Please add some content before analyzing.',
      },
    };
  }

  if (content.length > 50000) {
    return {
      valid: false,
      error: {
        code: 'content_too_long',
        message: 'Document exceeds 50,000 characters (' + content.length.toLocaleString() + ' chars). Please shorten it before analyzing.',
      },
    };
  }

  return { valid: true };
}

/**
 * Checks if AI service is available
 * Called from sidebar on load
 * @returns {{ available: boolean }}
 */
function checkAiHealth() {
  try {
    return VatessaApi.checkAiHealth();
  } catch (e) {
    Logger.log('checkAiHealth error: ' + e.toString());
    return { available: false };
  }
}

/**
 * Analyzes current document using AI
 * Called from sidebar "Analyze" button
 * @returns {Object} Analysis result or error object
 */
function analyzeDocument() {
  try {
    // Get document content
    var doc = DocumentApp.getActiveDocument();
    var docProperties = PropertiesService.getDocumentProperties();
    var messageType = docProperties.getProperty('vatessa_message_type') || 'communication';

    var content = {
      body: doc.getBody().getText(),
      messageType: messageType,
      audience: '',
    };

    // Try to parse structured content for audience
    try {
      var structured = parseStructuredContent(doc.getBody());
      if (structured.audience) content.audience = structured.audience;
    } catch (e) {
      Logger.log('Could not parse structured content: ' + e.toString());
    }

    // Client-side validation before API call
    var validation = validateContent(content.body);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Call the AI analyze endpoint
    var result = VatessaApi.analyzeContent(content);

    // Handle specific error codes
    if (result.error) {
      // Handle 401 - token expired
      if (result.status === 401) {
        return {
          success: false,
          error: {
            code: 'auth_expired',
            message: 'Your session has expired. Please reconnect your Vatessa account.',
          },
        };
      }
      // Handle 429 - limit exceeded
      if (result.status === 429) {
        return {
          success: false,
          error: {
            code: 'limit_exceeded',
            message: result.error.message || 'Monthly AI limit reached.',
          },
        };
      }
      // Handle 503 - unavailable
      if (result.status === 503) {
        return {
          success: false,
          error: {
            code: 'unavailable',
            message: 'AI analysis is temporarily unavailable. You can still send for manual review.',
          },
        };
      }
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      data: result.data,
      usage: result.usage,
    };

  } catch (e) {
    Logger.log('AI analysis error: ' + e.toString());
    return {
      success: false,
      error: {
        code: 'api_error',
        message: 'Unable to analyze document. Please try again.',
      },
    };
  }
}

/**
 * Gets AI suggestions for current document
 * Called from sidebar "Get Suggestions" button
 * @returns {Object} Suggestions or error object
 */
function getAiSuggestions() {
  try {
    var doc = DocumentApp.getActiveDocument();
    var content = doc.getBody().getText();

    // Client-side validation before API call
    var validation = validateContent(content);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    var result = VatessaApi.getAiSuggestions(content);

    // Handle specific error codes
    if (result.error) {
      // Handle 401 - token expired
      if (result.status === 401) {
        return {
          success: false,
          error: {
            code: 'auth_expired',
            message: 'Your session has expired. Please reconnect your Vatessa account.',
          },
        };
      }
      // Handle 429 - limit exceeded
      if (result.status === 429) {
        return {
          success: false,
          error: {
            code: 'limit_exceeded',
            message: result.error.message || 'Monthly AI limit reached.',
          },
        };
      }
      // Handle 503 - unavailable
      if (result.status === 503) {
        return {
          success: false,
          error: {
            code: 'unavailable',
            message: 'AI suggestions are temporarily unavailable.',
          },
        };
      }
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      data: result.data,
    };

  } catch (e) {
    Logger.log('AI suggestions error: ' + e.toString());
    return {
      success: false,
      error: {
        code: 'api_error',
        message: 'Unable to get suggestions. Please try again.',
      },
    };
  }
}

/**
 * Refreshes AI analysis (called from sidebar refresh button)
 */
function refreshAnalysis() {
  return analyzeDocument();
}
