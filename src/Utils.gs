/**
 * Utility Functions
 * Helper functions for the CommSession add-on
 */

/**
 * Formats timestamp for display
 */
function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Never';

  try {
    var now = new Date();
    var then = new Date(timestamp);
    var diffMs = now - then;
    var diffMins = Math.floor(diffMs / 1000 / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + ' minute' + (diffMins > 1 ? 's' : '') + ' ago';

    var diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';

    var diffDays = Math.floor(diffHours / 24);
    return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
  } catch (e) {
    Logger.log('Date formatting error: ' + e.toString());
    return timestamp;
  }
}

/**
 * Formats a date for display (alias for backward compatibility)
 */
function formatDate(dateString) {
  return formatTimeAgo(dateString);
}

/**
 * Gets emoji for approval status
 */
function getStatusEmoji(status) {
  var emojis = {
    'pending': '⏳',
    'approved': '✅',
    'changes_requested': '🔄',
    'rejected': '❌'
  };
  return emojis[status] || '⏳';
}

/**
 * Gets display text for message status
 */
function getStatusText(status) {
  var texts = {
    'draft': 'Draft',
    'in_review': 'In Review',
    'approved': 'Approved',
    'changes_requested': 'Changes Requested',
    'rejected': 'Rejected'
  };
  return texts[status] || status;
}

/**
 * Formats workflow status for display (alias for backward compatibility)
 */
function formatStatus(status) {
  return getStatusText(status);
}

/**
 * Gets status color for UI
 */
function getStatusColor(status) {
  var colorMap = {
    'draft': '#9ca3af',        // gray
    'active': '#60a5fa',       // blue
    'in_review': '#60a5fa',    // blue
    'approved': '#34d399',     // green
    'rejected': '#f87171',     // red
    'paused': '#fb923c',       // orange
    'cancelled': '#6b7280',    // dark gray
    'published': '#8b5cf6'     // purple
  };

  return colorMap[status.toLowerCase()] || '#9ca3af';
}

/**
 * Truncates text to specified length
 */
function truncateText(text, maxLength) {
  if (!text) {
    return '';
  }

  maxLength = maxLength || 100;

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Escapes HTML for safe display
 */
function escapeHtml(text) {
  if (!text) {
    return '';
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Gets user's email address
 */
function getUserEmail() {
  return Session.getActiveUser().getEmail();
}

/**
 * Logs an error with context
 */
function logError(context, error) {
  Logger.log('[ERROR] ' + context + ': ' + error.toString());

  // Could also send to external error tracking service
  // trackError(context, error);
}

/**
 * Logs an info message
 */
function logInfo(message) {
  Logger.log('[INFO] ' + message);
}

/**
 * Shows a toast notification
 */
function showToast(message, title, timeout) {
  var doc = DocumentApp.getActiveDocument();
  title = title || 'CommSession';
  timeout = timeout || 5;

  try {
    doc.toast(message, title, timeout);
  } catch (e) {
    Logger.log('Toast error: ' + e.toString());
  }
}

/**
 * Shows an alert dialog
 */
function showAlert(message, title, buttons) {
  var ui = DocumentApp.getUi();
  title = title || 'CommSession';
  buttons = buttons || ui.ButtonSet.OK;

  return ui.alert(title, message, buttons);
}

/**
 * Shows a confirmation dialog
 */
function showConfirm(message, title) {
  var ui = DocumentApp.getUi();
  title = title || 'CommSession';

  var response = ui.alert(title, message, ui.ButtonSet.YES_NO);
  return response === ui.Button.YES;
}

/**
 * Gets configuration value
 */
function getConfig(key, defaultValue) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var value = scriptProperties.getProperty(key);
  return value || defaultValue;
}

/**
 * Sets configuration value
 */
function setConfig(key, value) {
  var scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty(key, value);
}

/**
 * Checks if user is authenticated
 */
function isAuthenticated() {
  var userProperties = PropertiesService.getUserProperties();
  var token = userProperties.getProperty('COMMSESSION_AUTH_TOKEN');
  return !!token;
}

/**
 * Gets word count of document
 */
function getWordCount() {
  var doc = DocumentApp.getActiveDocument();
  var body = doc.getBody();
  var text = body.getText();

  // Remove extra whitespace and split by spaces
  var words = text.trim().split(/\s+/);

  // Filter out empty strings
  words = words.filter(function(word) {
    return word.length > 0;
  });

  return words.length;
}

/**
 * Gets character count of document
 */
function getCharacterCount() {
  var doc = DocumentApp.getActiveDocument();
  var body = doc.getBody();
  var text = body.getText();
  return text.length;
}

/**
 * Validates email address format
 */
function isValidEmail(email) {
  if (!email) {
    return false;
  }

  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Parses error message from API response
 */
function parseErrorMessage(error) {
  if (typeof error === 'string') {
    return error;
  }

  if (error.message) {
    return error.message;
  }

  if (error.error) {
    return parseErrorMessage(error.error);
  }

  return 'An unknown error occurred';
}

/**
 * Retries a function with exponential backoff
 */
function retryWithBackoff(func, maxRetries, initialDelay) {
  maxRetries = maxRetries || 3;
  initialDelay = initialDelay || 1000;

  var retries = 0;
  var delay = initialDelay;

  while (retries < maxRetries) {
    try {
      return func();
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw error;
      }

      Logger.log('Retry ' + retries + ' after ' + delay + 'ms');
      Utilities.sleep(delay);
      delay *= 2; // Exponential backoff
    }
  }
}

/**
 * Opens CommSession web app for creating a new message
 */
function openCreateMessage() {
  var doc = DocumentApp.getActiveDocument();
  var docId = doc.getId();
  var url = 'https://app.commsession.com/messages/new?source=google_docs&docId=' + docId;

  var html = HtmlService.createHtmlOutput(
    '<script>' +
    'window.open("' + url + '", "_blank");' +
    'google.script.host.close();' +
    '</script>'
  );

  DocumentApp.getUi().showModalDialog(html, 'Opening CommSession...');
}

/**
 * Opens CommSession web app for this message
 */
function openMessageInCommSession(webAppUrl) {
  var html = HtmlService.createHtmlOutput(
    '<script>' +
    'window.open("' + webAppUrl + '", "_blank");' +
    'google.script.host.close();' +
    '</script>'
  );

  DocumentApp.getUi().showModalDialog(html, 'Opening CommSession...');
}
