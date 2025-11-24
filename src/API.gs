/**
 * CommSession API Client
 * Handles all API communication with CommSession backend
 */

// API Configuration
var API_BASE = 'https://app.commsession.com/api/v2';
// var API_BASE = 'http://localhost:5173/api/v2';  // Development

/**
 * Makes an authenticated API call to CommSession
 */
function makeAPICall(endpoint, method, payload) {
  var token = getAuthToken();

  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }

  var options = {
    method: method.toLowerCase(),
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.payload = JSON.stringify(payload);
  }

  try {
    var response = UrlFetchApp.fetch(API_BASE + endpoint, options);
    var statusCode = response.getResponseCode();
    var responseText = response.getContentText();

    // Handle auth errors
    if (statusCode === 401) {
      clearAuthToken();
      throw new Error('AUTH_EXPIRED');
    }

    // Handle not found
    if (statusCode === 404) {
      return { error: 'NOT_FOUND', statusCode: 404 };
    }

    // Handle other errors
    if (statusCode >= 400) {
      var errorData = JSON.parse(responseText);
      throw new Error(errorData.error || 'API_ERROR');
    }

    return JSON.parse(responseText);

  } catch (error) {
    Logger.log('API Error: ' + error.message);
    throw error;
  }
}

/**
 * Checks if document is already linked to a message
 */
function checkDocumentLinked(docId) {
  try {
    return makeAPICall('/documents/google/' + docId, 'GET');
  } catch (error) {
    if (error.message === 'AUTH_REQUIRED' || error.message === 'AUTH_EXPIRED') {
      return { linked: false, authRequired: true };
    }
    throw error;
  }
}

/**
 * Gets message status for sidebar display
 */
function getMessageStatus(messageId) {
  return makeAPICall('/messages/' + messageId + '/status', 'GET');
}

/**
 * Submits message for review
 */
function submitForReview(messageId, syncFirst) {
  var payload = {
    syncFirst: syncFirst !== false // Default to true
  };

  return makeAPICall('/messages/' + messageId + '/submit', 'POST', payload);
}

/**
 * Links document to CommSession message
 */
function linkDocument(messageId, docId, docUrl) {
  var hash = generateContentHash();

  var payload = {
    documentId: docId,
    documentUrl: docUrl,
    platform: 'google_docs',
    contentHash: hash
  };

  var result = makeAPICall('/messages/' + messageId + '/link-document', 'POST', payload);

  if (result.success) {
    setStoredMessageId(messageId);
    setStoredHash(hash);
  }

  return result;
}
