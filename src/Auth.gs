/**
 * Vatessa OAuth2 Authentication
 * Handles OAuth flow with Vatessa backend
 */

// OAuth2 configuration
const OAUTH_CONFIG = {
  clientId: getClientId(),
  clientSecret: getClientSecret(),
  authorizationBaseUrl: 'https://vatessa.com/oauth/authorize',
  tokenUrl: 'https://api.vatessa.com/oauth/token',
  scope: 'messages:read messages:write analysis:read',
};

/**
 * Gets the OAuth2 service
 */
function getOAuthService() {
  return OAuth2.createService('vatessa')
    .setAuthorizationBaseUrl(OAUTH_CONFIG.authorizationBaseUrl)
    .setTokenUrl(OAUTH_CONFIG.tokenUrl)
    .setClientId(OAUTH_CONFIG.clientId)
    .setClientSecret(OAUTH_CONFIG.clientSecret)
    .setCallbackFunction('authCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setScope(OAUTH_CONFIG.scope)
    .setParam('access_type', 'offline')
    .setParam('prompt', 'consent');
}

/**
 * Initiates OAuth flow with Vatessa
 */
function initiateOAuth() {
  const service = getOAuthService();

  if (!service.hasAccess()) {
    const authUrl = service.getAuthorizationUrl();
    const html = HtmlService.createHtmlOutput(
      '<html><head>' +
      '<style>' +
      'body { font-family: "Google Sans", Arial, sans-serif; padding: 20px; text-align: center; }' +
      'a { color: #1a73e8; text-decoration: none; font-weight: 500; }' +
      'a:hover { text-decoration: underline; }' +
      'p { color: #5f6368; margin: 16px 0; }' +
      '</style>' +
      '</head><body>' +
      '<p>Please authorize Vatessa to access your account:</p>' +
      '<p><a href="' + authUrl + '" target="_blank">Connect to Vatessa</a></p>' +
      '<p style="font-size: 12px;">After authorizing, close this window and refresh the sidebar.</p>' +
      '</body></html>'
    )
      .setWidth(400)
      .setHeight(200);
    DocumentApp.getUi().showModalDialog(html, 'Connect to Vatessa');
    return { success: false, needsAuth: true };
  }

  return { success: true };
}

/**
 * OAuth callback handler
 */
function authCallback(request) {
  const service = getOAuthService();
  const authorized = service.handleCallback(request);

  if (authorized) {
    return HtmlService.createHtmlOutput(
      '<html><head>' +
      '<style>' +
      'body { font-family: "Google Sans", Arial, sans-serif; padding: 40px; text-align: center; }' +
      '.success { color: #188038; font-size: 24px; margin-bottom: 16px; }' +
      'p { color: #5f6368; }' +
      '</style>' +
      '</head><body>' +
      '<div class="success">&#10003; Connected!</div>' +
      '<p>You can close this window and return to Google Docs.</p>' +
      '<p>Refresh the sidebar to see your Vatessa connection.</p>' +
      '</body></html>'
    );
  } else {
    return HtmlService.createHtmlOutput(
      '<html><head>' +
      '<style>' +
      'body { font-family: "Google Sans", Arial, sans-serif; padding: 40px; text-align: center; }' +
      '.error { color: #d93025; font-size: 24px; margin-bottom: 16px; }' +
      'p { color: #5f6368; }' +
      '</style>' +
      '</head><body>' +
      '<div class="error">&#10007; Authorization Failed</div>' +
      '<p>Please close this window and try again.</p>' +
      '</body></html>'
    );
  }
}

/**
 * Get connection status
 */
function getConnectionStatus() {
  const service = getOAuthService();
  const messageId = PropertiesService.getDocumentProperties()
    .getProperty('vatessa_message_id');

  return {
    connected: service.hasAccess(),
    messageId: messageId,
  };
}

/**
 * Resets OAuth (logout)
 */
function resetOAuth() {
  const service = getOAuthService();
  service.reset();
}

/**
 * Disconnects from Vatessa
 */
function disconnect() {
  resetOAuth();
  return { success: true };
}

/**
 * Gets client ID from script properties
 * Store this in Script Properties in the Apps Script editor
 */
function getClientId() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('VATESSA_CLIENT_ID') || '';
}

/**
 * Gets client secret from script properties
 * Store this in Script Properties in the Apps Script editor
 */
function getClientSecret() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('VATESSA_CLIENT_SECRET') || '';
}

/**
 * Legacy auth functions for backward compatibility
 */
function getAuthToken() {
  const service = getOAuthService();
  if (service.hasAccess()) {
    return service.getAccessToken();
  }
  return null;
}

function setAuthToken(token) {
  // OAuth2 library handles token storage
  Logger.log('setAuthToken called - OAuth2 handles this automatically');
}

function clearAuthToken() {
  resetOAuth();
}
