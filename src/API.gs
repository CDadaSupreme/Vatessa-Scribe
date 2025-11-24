/**
 * CommSession API Client
 * Handles all API communication with CommSession backend
 */

// API Configuration
var COMMSESSION_API_URL = 'https://app.commsession.com/api/v2';  // Production
// var COMMSESSION_API_URL = 'http://localhost:5173/api/v2';     // Development

/**
 * Gets the CommSession web app URL
 */
function getCommSessionUrl() {
  return 'https://app.commsession.com';
  // return 'http://localhost:5173'; // Development
}

/**
 * Gets the auth token (placeholder - implement based on your auth strategy)
 * Options:
 * 1. Store in user properties after OAuth flow
 * 2. Prompt user to enter API key
 * 3. Use service account token
 */
function getAuthToken() {
  var userProperties = PropertiesService.getUserProperties();
  var token = userProperties.getProperty('COMMSESSION_AUTH_TOKEN');

  if (!token) {
    // Prompt user for token or initiate OAuth flow
    throw new Error('Not authenticated. Please configure your CommSession credentials.');
  }

  return token;
}

/**
 * Sets the auth token
 */
function setAuthToken(token) {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('COMMSESSION_AUTH_TOKEN', token);
}

/**
 * Makes an API request to CommSession
 */
function makeApiRequest(endpoint, method, payload) {
  method = method || 'GET';

  var options = {
    method: method,
    headers: {
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  // Add auth token if available
  try {
    var token = getAuthToken();
    options.headers['Authorization'] = 'Bearer ' + token;
  } catch (e) {
    Logger.log('No auth token available');
  }

  // Add payload for POST/PUT/PATCH
  if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.payload = JSON.stringify(payload);
  }

  var url = COMMSESSION_API_URL + endpoint;
  Logger.log('API Request: ' + method + ' ' + url);

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseBody = response.getContentText();

    Logger.log('API Response: ' + responseCode);

    if (responseCode >= 200 && responseCode < 300) {
      return {
        success: true,
        data: JSON.parse(responseBody)
      };
    } else {
      return {
        success: false,
        error: 'API request failed: ' + responseCode + ' - ' + responseBody
      };
    }
  } catch (error) {
    Logger.log('API Error: ' + error.toString());
    return {
      success: false,
      error: 'Network error: ' + error.toString()
    };
  }
}

/**
 * Gets message status from CommSession
 */
function getMessageStatus(messageId) {
  var result = makeApiRequest('/messages/' + messageId + '/status', 'GET');

  if (result.success) {
    return {
      messageId: result.data.messageId,
      title: result.data.title,
      planName: result.data.planName,
      status: result.data.status,
      approvers: result.data.approvers || [],
      commentCount: result.data.commentCount || 0,
      lastSyncedAt: result.data.lastSyncedAt,
      webAppUrl: result.data.webAppUrl
    };
  } else {
    if (result.error && result.error.indexOf('404') !== -1) {
      return null; // Message not found
    }
    throw new Error(result.error);
  }
}

/**
 * Checks if document is already linked to a message
 */
function checkDocumentLinked(documentId) {
  var result = makeApiRequest('/documents/google/' + documentId, 'GET');

  if (result.success) {
    return {
      linked: result.data.linked,
      messageId: result.data.messageId
    };
  } else {
    return {
      linked: false,
      messageId: null
    };
  }
}

/**
 * Links document to an existing message
 */
function linkDocumentToMessage(messageId, documentId, documentUrl, contentHash) {
  var payload = {
    documentId: documentId,
    documentUrl: documentUrl,
    platform: 'google_docs',
    contentHash: contentHash
  };

  var result = makeApiRequest('/messages/' + messageId + '/link-document', 'POST', payload);

  if (result.success) {
    return {
      success: true,
      document: result.data.document
    };
  } else {
    return {
      success: false,
      error: result.error,
      existingMessageId: result.data && result.data.existingMessageId
    };
  }
}

/**
 * Syncs content to CommSession
 */
function syncContent(messageId) {
  var doc = DocumentApp.getActiveDocument();
  var body = doc.getBody();
  var text = body.getText();
  var title = doc.getName();
  var wordCount = text.split(/\s+/).filter(function(word) { return word.length > 0; }).length;
  var contentHash = calculateFingerprint(text + '\n' + title);

  var payload = {
    content: {
      text: text
    },
    metadata: {
      title: title,
      lastModified: new Date().toISOString(),
      wordCount: wordCount,
      contentHash: contentHash
    }
  };

  var result = makeApiRequest('/messages/' + messageId + '/sync', 'POST', payload);

  if (result.success) {
    return {
      success: true,
      versionId: result.data.versionId,
      syncedAt: result.data.syncedAt,
      contentHash: contentHash
    };
  } else {
    return {
      success: false,
      error: result.error
    };
  }
}

/**
 * Submits message for review
 */
function submitForReview(messageId, syncFirst) {
  var payload = {
    syncFirst: syncFirst !== false // Default to true
  };

  var result = makeApiRequest('/messages/' + messageId + '/submit', 'POST', payload);

  if (result.success) {
    return {
      success: true,
      message: result.data.message,
      notifiedApprovers: result.data.notifiedApprovers || []
    };
  } else {
    return {
      success: false,
      error: result.error
    };
  }
}
