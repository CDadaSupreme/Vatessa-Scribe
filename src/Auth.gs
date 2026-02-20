/**
 * Vatessa Personal Access Token Authentication
 * Simple token-based auth for Google Docs addon
 *
 * Users generate a PAT in Vatessa web app and paste it here.
 * Tokens are stored securely in user properties.
 */

// Property key for storing the token
const TOKEN_PROPERTY_KEY = 'vatessa_access_token';

/**
 * Gets the stored access token
 * @returns {string|null} The access token or null if not set
 */
function getOAuthService() {
  // Compatibility shim - returns object with hasAccess() for existing code
  return {
    hasAccess: function() {
      return !!getAccessToken();
    },
    getAccessToken: function() {
      return getAccessToken();
    },
    reset: function() {
      clearAccessToken();
    }
  };
}

/**
 * Gets the stored access token
 * @returns {string|null} The access token or null if not set
 */
function getAccessToken() {
  const props = PropertiesService.getUserProperties();
  return props.getProperty(TOKEN_PROPERTY_KEY);
}

/**
 * Stores the access token
 * @param {string} token - The PAT to store
 */
function setAccessToken(token) {
  const props = PropertiesService.getUserProperties();
  props.setProperty(TOKEN_PROPERTY_KEY, token);
}

/**
 * Clears the stored access token
 */
function clearAccessToken() {
  const props = PropertiesService.getUserProperties();
  props.deleteProperty(TOKEN_PROPERTY_KEY);
}

/**
 * Validates a token by making a test API call
 * @param {string} token - The token to validate
 * @returns {Object} Validation result { valid: boolean, error?: string }
 */
function validateToken(token) {
  if (!token || !token.startsWith('pat_')) {
    return {
      valid: false,
      error: 'Invalid token format. Token should start with "pat_"'
    };
  }

  try {
    // Make a test call to check AI health (lightweight endpoint)
    const response = UrlFetchApp.fetch(VatessaApi.BASE_URL + '/v2/ai/health', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      muteHttpExceptions: true,
    });

    const code = response.getResponseCode();

    if (code === 401) {
      return { valid: false, error: 'Invalid or expired token' };
    }

    if (code === 403) {
      return { valid: false, error: 'Token does not have required permissions' };
    }

    if (code >= 200 && code < 300) {
      return { valid: true };
    }

    return { valid: false, error: 'Unable to verify token (status: ' + code + ')' };
  } catch (e) {
    Logger.log('Token validation error: ' + e.toString());
    return { valid: false, error: 'Network error: ' + e.message };
  }
}

/**
 * Connects to Vatessa using a Personal Access Token
 * Called from the sidebar when user submits their token
 * @param {string} token - The PAT from Vatessa
 * @returns {Object} Connection result
 */
function connectWithToken(token) {
  // Validate the token first
  var validation = validateToken(token);

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    };
  }

  // Token is valid, store it
  setAccessToken(token);

  return {
    success: true,
    message: 'Successfully connected to Vatessa'
  };
}

/**
 * Get connection status
 * @returns {Object} Connection status { connected: boolean, messageId?: string }
 */
function getConnectionStatus() {
  const token = getAccessToken();
  const messageId = PropertiesService.getDocumentProperties()
    .getProperty('vatessa_message_id');

  return {
    connected: !!token,
    messageId: messageId,
  };
}

/**
 * Disconnects from Vatessa (clears token)
 * @returns {Object} Disconnect result
 */
function disconnect() {
  clearAccessToken();
  return { success: true };
}

/**
 * Resets OAuth (clears token) - compatibility function
 */
function resetOAuth() {
  clearAccessToken();
}

/**
 * Legacy auth function for backward compatibility
 */
function getAuthToken() {
  return getAccessToken();
}

/**
 * Legacy auth function for backward compatibility
 */
function setAuthToken(token) {
  setAccessToken(token);
}

/**
 * Legacy auth function for backward compatibility
 */
function clearAuthToken() {
  clearAccessToken();
}

/**
 * Shows the token setup dialog (legacy manual PAT entry)
 * Called when user needs to connect to Vatessa manually
 */
function showTokenSetup() {
  var html = HtmlService.createHtmlOutput(
    '<html><head>' +
    '<style>' +
    'body { font-family: "Google Sans", Arial, sans-serif; padding: 20px; }' +
    'h3 { color: #4F46E5; margin-bottom: 16px; }' +
    'p { color: #5f6368; margin: 12px 0; font-size: 13px; }' +
    'input { width: 100%; padding: 10px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 12px; }' +
    'button { background: #4F46E5; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; margin-top: 12px; }' +
    'button:hover { background: #4338CA; }' +
    '.steps { background: #f8f9fa; padding: 12px; border-radius: 4px; margin: 16px 0; }' +
    '.steps li { margin: 8px 0; color: #333; }' +
    '.error { color: #d93025; margin-top: 8px; display: none; }' +
    '</style>' +
    '</head><body>' +
    '<h3>Connect to Vatessa</h3>' +
    '<div class="steps">' +
    '<p><strong>To get your access token:</strong></p>' +
    '<ol>' +
    '<li>Go to <a href="https://app.vatessa.com/settings/tokens" target="_blank">Vatessa Settings → API Tokens</a></li>' +
    '<li>Click "Generate New Token"</li>' +
    '<li>Name it "Google Docs"</li>' +
    '<li>Copy the token and paste below</li>' +
    '</ol>' +
    '</div>' +
    '<input type="text" id="token" placeholder="pat_xxxxx..." />' +
    '<p class="error" id="error"></p>' +
    '<button onclick="connect()">Connect</button>' +
    '<script>' +
    'function connect() {' +
    '  var token = document.getElementById("token").value.trim();' +
    '  if (!token) {' +
    '    showError("Please enter your access token");' +
    '    return;' +
    '  }' +
    '  document.querySelector("button").disabled = true;' +
    '  document.querySelector("button").textContent = "Connecting...";' +
    '  google.script.run' +
    '    .withSuccessHandler(function(result) {' +
    '      if (result.success) {' +
    '        google.script.host.close();' +
    '      } else {' +
    '        showError(result.error || "Connection failed");' +
    '        document.querySelector("button").disabled = false;' +
    '        document.querySelector("button").textContent = "Connect";' +
    '      }' +
    '    })' +
    '    .withFailureHandler(function(err) {' +
    '      showError(err.message || "Connection failed");' +
    '      document.querySelector("button").disabled = false;' +
    '      document.querySelector("button").textContent = "Connect";' +
    '    })' +
    '    .connectWithToken(token);' +
    '}' +
    'function showError(msg) {' +
    '  var el = document.getElementById("error");' +
    '  el.textContent = msg;' +
    '  el.style.display = "block";' +
    '}' +
    '</script>' +
    '</body></html>'
  )
    .setWidth(450)
    .setHeight(420);
  DocumentApp.getUi().showModalDialog(html, 'Connect to Vatessa');
}

// ===== Device Authorization Flow =====

/**
 * Initiates a device authorization request
 * Called from sidebar to get a user code for display
 * @returns {Object} { deviceCode, userCode, verificationUrl, expiresIn } or { error }
 */
function initiateDeviceAuth() {
  try {
    var response = UrlFetchApp.fetch(VatessaApi.BASE_URL + '/v2/device-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      muteHttpExceptions: true,
    });

    var code = response.getResponseCode();
    var data = JSON.parse(response.getContentText());

    if (code >= 200 && code < 300) {
      return data;
    }

    return { error: (data.error && data.error.message) || 'Failed to start connection' };
  } catch (e) {
    Logger.log('Device auth initiation error: ' + e.toString());
    return { error: 'Network error: ' + e.message };
  }
}

/**
 * Polls for device authorization status
 * Called from sidebar every 3 seconds
 * @param {string} deviceCode - The device code to poll
 * @returns {Object} { status: 'pending'|'approved'|'expired', token?: string }
 */
function pollDeviceAuth(deviceCode) {
  try {
    var response = UrlFetchApp.fetch(
      VatessaApi.BASE_URL + '/v2/device-auth/poll/' + deviceCode,
      {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
        muteHttpExceptions: true,
      }
    );

    var code = response.getResponseCode();
    var data = JSON.parse(response.getContentText());

    if (code >= 200 && code < 300) {
      return data;
    }

    return { status: 'expired' };
  } catch (e) {
    Logger.log('Device auth poll error: ' + e.toString());
    return { status: 'error', error: e.message };
  }
}

/**
 * Completes device authorization by storing the received token
 * Called from sidebar when poll returns approved status
 * @param {string} token - The PAT received from device auth flow
 * @returns {Object} { success: boolean }
 */
function completeDeviceAuth(token) {
  setAccessToken(token);
  return { success: true };
}

/**
 * Initiates connection flow
 * Shows token setup dialog if not connected
 * @returns {Object} Auth status
 */
function initiateOAuth() {
  var token = getAccessToken();

  if (!token) {
    showTokenSetup();
    return { success: false, needsAuth: true };
  }

  return { success: true };
}

/**
 * Gets the Vatessa web app URL
 * @returns {string} The Vatessa URL
 */
function getVatessaUrl() {
  return 'https://app.vatessa.com';
}
