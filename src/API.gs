/**
 * Vatessa API Client
 * Handles all API communication with Vatessa backend
 */

const VatessaApi = {
  BASE_URL: 'https://api.vatessa.com',
  // BASE_URL: 'http://localhost:3000',  // Development

  /**
   * Get auth token from OAuth service
   */
  getToken() {
    const service = getOAuthService();
    if (service.hasAccess()) {
      return service.getAccessToken();
    }
    return null;
  },

  /**
   * Make authenticated request to Vatessa
   */
  fetch(endpoint, options = {}) {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated. Please connect to Vatessa.');
    }

    const fetchOptions = {
      method: options.method || 'get',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      muteHttpExceptions: true,
    };

    if (options.payload) {
      fetchOptions.payload = typeof options.payload === 'string'
        ? options.payload
        : JSON.stringify(options.payload);
    }

    try {
      const response = UrlFetchApp.fetch(this.BASE_URL + endpoint, fetchOptions);
      const code = response.getResponseCode();
      const text = response.getContentText();

      // Handle auth errors
      if (code === 401) {
        resetOAuth();
        throw new Error('AUTH_EXPIRED');
      }

      // Handle not found
      if (code === 404) {
        return { error: 'NOT_FOUND', statusCode: 404 };
      }

      // Handle other errors
      if (code >= 400) {
        const errorData = text ? JSON.parse(text) : {};
        throw new Error(errorData.error || 'API request failed');
      }

      return text ? JSON.parse(text) : {};

    } catch (error) {
      Logger.log('API Error: ' + error.message);
      throw error;
    }
  },

  /**
   * Analyze message content with AI
   */
  analyzeMessage(content) {
    return this.fetch('/api/governance/analyze', {
      method: 'POST',
      payload: {
        title: content.title || content.name,
        summary: content.summary || '',
        audience: content.audience || '',
        audienceSize: content.audienceSize || 0,
        keyPoints: content.keyPoints || '',
        body: content.content,
        tone: content.tone || 'professional',
      },
    });
  },

  /**
   * Create new message
   * @param {Object} content - Document content
   * @param {string} messageType - 'communication' or 'policy'
   */
  createMessage(content, messageType) {
    return this.fetch('/api/messages', {
      method: 'POST',
      payload: {
        title: content.title || content.name,
        summary: content.summary || '',
        audience: content.audience || '',
        audienceSize: content.audienceSize || 0,
        keyPoints: content.keyPoints || '',
        body: content.content,
        tone: content.tone || 'professional',
        message_type: messageType || 'communication',
        sourceType: 'google_docs',
        sourceId: content.id,
      },
    });
  },

  /**
   * Update existing message
   */
  updateMessage(messageId, content) {
    return this.fetch('/api/messages/' + messageId, {
      method: 'PUT',
      payload: {
        title: content.title || content.name,
        summary: content.summary || '',
        audience: content.audience || '',
        audienceSize: content.audienceSize || 0,
        keyPoints: content.keyPoints || '',
        body: content.content,
      },
    });
  },

  /**
   * Get message status
   */
  getMessageStatus(messageId) {
    return this.fetch('/api/messages/' + messageId);
  },

  /**
   * Check if document is linked to a message
   */
  checkDocumentLinked(docId) {
    try {
      return this.fetch('/api/documents/google/' + docId);
    } catch (error) {
      if (error.message === 'AUTH_EXPIRED' || error.message.includes('Not authenticated')) {
        return { linked: false, authRequired: true };
      }
      if (error.message === 'NOT_FOUND') {
        return { linked: false };
      }
      throw error;
    }
  },

  /**
   * Submit message for review
   */
  submitForReview(messageId, syncFirst) {
    return this.fetch('/api/messages/' + messageId + '/submit', {
      method: 'POST',
      payload: {
        syncFirst: syncFirst !== false,
      },
    });
  },

  /**
   * Link document to message
   */
  linkDocument(messageId, docId, docUrl) {
    const hash = generateContentHash();

    const result = this.fetch('/api/messages/' + messageId + '/link-document', {
      method: 'POST',
      payload: {
        documentId: docId,
        documentUrl: docUrl,
        platform: 'google_docs',
        contentHash: hash,
      },
    });

    if (result.success) {
      const docProperties = PropertiesService.getDocumentProperties();
      docProperties.setProperty('vatessa_message_id', messageId);
      docProperties.setProperty('vatessa_content_hash', hash);
      docProperties.setProperty('vatessa_last_sync', new Date().toISOString());
    }

    return result;
  },

  /**
   * Unlink document from message
   */
  unlinkDocument(messageId) {
    return this.fetch('/api/messages/' + messageId + '/unlink-document', {
      method: 'DELETE',
    });
  },
};

// Legacy function wrappers for backward compatibility
function makeAPICall(endpoint, method, payload) {
  return VatessaApi.fetch(endpoint, {
    method: method,
    payload: payload,
  });
}

function checkDocumentLinked(docId) {
  return VatessaApi.checkDocumentLinked(docId);
}

function getMessageStatus(messageId) {
  return VatessaApi.getMessageStatus(messageId);
}

function submitForReview(messageId, syncFirst) {
  return VatessaApi.submitForReview(messageId, syncFirst);
}

function linkDocument(messageId, docId, docUrl) {
  return VatessaApi.linkDocument(messageId, docId, docUrl);
}
