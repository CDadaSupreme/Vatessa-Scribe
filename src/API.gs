/**
 * Vatessa API Client
 * Handles all API communication with Vatessa backend
 */

const VatessaApi = {
  // BASE_URL: 'https://api.vatessa.com',  // Production
  BASE_URL: 'https://triumphal-ember-endogenous.ngrok-free.dev',  // Development

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
   * Returns { error, status } on 400+ instead of throwing,
   * so callers can check result.error and result.status
   */
  fetch(endpoint, options = {}) {
    const token = this.getToken();
    if (!token) {
      return {
        error: { code: 'auth_required', message: 'Please connect your Vatessa account' },
        status: 401,
      };
    }

    const fetchOptions = {
      method: options.method || 'get',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true', // TODO: Remove when switching to production API URL
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

      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        // Non-JSON response
        data = { message: text };
      }

      // Handle auth errors - reset OAuth and return error
      if (code === 401) {
        resetOAuth();
        return {
          error: { code: 'auth_expired', message: 'Your session has expired. Please reconnect.' },
          status: 401,
        };
      }

      // Return errors with status codes (don't throw)
      if (code >= 400) {
        return {
          error: data.error || { code: 'api_error', message: 'Request failed' },
          status: code,
        };
      }

      return data;

    } catch (error) {
      // Network/fetch errors
      Logger.log('API Error: ' + error.message);
      return {
        error: { code: 'network_error', message: error.message },
        status: 0,
      };
    }
  },

  /**
   * Check if AI service is available
   * NOTE: Path is /v2/ai/health (NOT /api/v2/ai/health)
   * @returns {{ available: boolean } | { error: Object, status: number }}
   */
  checkAiHealth() {
    const result = this.fetch('/v2/ai/health', { method: 'GET' });
    // If there's an error, return available: false
    if (result.error) {
      return { available: false };
    }
    return result;
  },

  /**
   * Analyze document content for governance/risk using AI
   * NOTE: Path is /v2/ai/analyze (NOT /api/v2/ai/analyze)
   * @param {Object} content - Document content
   * @param {string} content.body - Main content text
   * @param {string} [content.messageType] - 'communication' or 'policy'
   * @param {string} [content.audience] - Target audience description
   * @returns {Object} Analysis result with { data, usage } or { error, status }
   */
  analyzeContent(content) {
    return this.fetch('/v2/ai/analyze', {
      method: 'POST',
      payload: {
        content: content.body,
        messageType: content.messageType || 'communication',
        audience: content.audience || '',
      },
    });
  },

  /**
   * Get AI suggestions for improving draft
   * NOTE: Path is /v2/ai/suggest (NOT /api/v2/ai/suggest)
   * @param {string} content - Current draft text
   * @returns {Object} Suggestions with { data } or { error, status }
   */
  getAiSuggestions(content) {
    return this.fetch('/v2/ai/suggest', {
      method: 'POST',
      payload: {
        content: content,
      },
    });
  },

  /**
   * Analyze message content with AI (legacy method)
   * @deprecated Use analyzeContent() instead
   */
  analyzeMessage(content) {
    return this.fetch('/v2/ai/analyze', {
      method: 'POST',
      payload: {
        title: content.title || content.name,
        summary: content.summary || '',
        audience: content.audience || '',
        audienceSize: content.audienceSize || 0,
        keyPoints: content.keyPoints || '',
        content: content.content,
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
    return this.fetch('/v2/messages', {
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
    return this.fetch('/v2/messages/' + messageId, {
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
    return this.fetch('/v2/messages/' + messageId);
  },

  /**
   * Check if document is linked to a message
   */
  checkDocumentLinked(docId) {
    try {
      return this.fetch('/v2/documents/google/' + docId);
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
    return this.fetch('/v2/messages/' + messageId + '/submit', {
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

    const result = this.fetch('/v2/messages/' + messageId + '/link-document', {
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
    return this.fetch('/v2/messages/' + messageId + '/unlink-document', {
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
