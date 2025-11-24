/**
 * CommSession API Client
 * Handles all API communication with CommSession backend
 */

// API Configuration
var COMMSESSION_API_URL = 'https://api.commsession.com';  // Production
// var COMMSESSION_API_URL = 'http://localhost:5000';     // Development

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
  var result = makeApiRequest('/api/v1/messages/' + messageId, 'GET');

  if (result.success) {
    return {
      id: result.data.id,
      subject: result.data.subject,
      status: result.data.status,
      workflowStage: result.data.workflowStage,
      updatedAt: result.data.updatedAt,
      approvers: result.data.approvers || []
    };
  } else {
    throw new Error(result.error);
  }
}

/**
 * Gets remote content hash for conflict detection
 */
function getRemoteContentHash(messageId) {
  var result = makeApiRequest('/api/v1/messages/' + messageId + '/hash', 'GET');

  if (result.success) {
    return result.data.contentHash;
  } else {
    Logger.log('Failed to get remote hash: ' + result.error);
    return null;
  }
}

/**
 * Syncs content to CommSession
 */
function syncContent(messageId, content, contentHash) {
  var doc = DocumentApp.getActiveDocument();

  var payload = {
    content: content,
    contentHash: contentHash,
    source: 'google-docs',
    documentId: doc.getId(),
    documentName: doc.getName()
  };

  var endpoint, method;

  if (messageId) {
    // Update existing message
    endpoint = '/api/v1/messages/' + messageId;
    method = 'PATCH';
  } else {
    // Create new message
    endpoint = '/api/v1/messages';
    method = 'POST';
    payload.subject = doc.getName();
  }

  var result = makeApiRequest(endpoint, method, payload);

  if (result.success) {
    return {
      success: true,
      messageId: result.data.id,
      url: getCommSessionUrl() + '/messages/' + result.data.id
    };
  } else {
    return {
      success: false,
      error: result.error
    };
  }
}

/**
 * Creates a new message in CommSession
 */
function createMessage(subject, content, contentHash) {
  var doc = DocumentApp.getActiveDocument();

  var payload = {
    subject: subject,
    content: content,
    contentHash: contentHash,
    source: 'google-docs',
    documentId: doc.getId(),
    documentName: doc.getName(),
    status: 'draft'
  };

  var result = makeApiRequest('/api/v1/messages', 'POST', payload);

  if (result.success) {
    return {
      success: true,
      messageId: result.data.id,
      url: getCommSessionUrl() + '/messages/' + result.data.id
    };
  } else {
    return {
      success: false,
      error: result.error
    };
  }
}

/**
 * Updates an existing message in CommSession
 */
function updateMessage(messageId, content, contentHash) {
  var payload = {
    content: content,
    contentHash: contentHash,
    lastModified: new Date().toISOString()
  };

  var result = makeApiRequest('/api/v1/messages/' + messageId, 'PATCH', payload);

  if (result.success) {
    return {
      success: true,
      messageId: result.data.id
    };
  } else {
    return {
      success: false,
      error: result.error
    };
  }
}

/**
 * Gets all messages for current user
 */
function getMyMessages() {
  var result = makeApiRequest('/api/v1/messages', 'GET');

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error);
  }
}
