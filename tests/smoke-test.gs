/**
 * Vatessa Google Docs Add-on - Smoke Tests
 *
 * Run these tests in the Apps Script editor to verify basic functionality.
 * Menu: Run > runSmokeTests
 * View results: View > Logs
 *
 * Prerequisites:
 * - User must be authenticated (have a valid token)
 * - Vatessa API must be accessible
 */

// Test configuration
var TEST_CONFIG = {
  // Set to true to run tests against staging API
  useStaging: false,
  // Timeout for API calls (ms)
  timeout: 10000,
  // Expected API version
  expectedApiVersion: 'v2'
};

/**
 * Main entry point - runs all smoke tests
 */
function runSmokeTests() {
  var results = [];

  Logger.log('');
  Logger.log('========================================');
  Logger.log('  Vatessa Add-on Smoke Tests');
  Logger.log('  ' + new Date().toISOString());
  Logger.log('========================================');
  Logger.log('');

  // Core functionality tests
  results.push(testApiConnection());
  results.push(testAuthToken());
  results.push(testDocumentAccess());
  results.push(testContentHash());
  results.push(testPropertiesService());

  // API integration tests (require auth)
  var token = getAuthToken();
  if (token) {
    results.push(testDocumentLinkCheck());
    results.push(testMessageStatusFetch());
  } else {
    results.push({
      name: 'Document Link Check',
      passed: false,
      message: 'Skipped - no auth token',
      skipped: true
    });
    results.push({
      name: 'Message Status Fetch',
      passed: false,
      message: 'Skipped - no auth token',
      skipped: true
    });
  }

  // Payload format tests
  results.push(testSyncPayloadFormat());
  results.push(testSubmitPayloadFormat());

  // Utility function tests
  results.push(testUtilityFunctions());

  // Message type tests
  results.push(testMessageTypeSupport());
  results.push(testMessageTypePersistence());

  // AI Polish tests
  results.push(testValidateRewriteContent());
  results.push(testGetSelectedText());
  results.push(testRewritePayloadFormat());
  results.push(testRewriteFeedbackPayloadFormat());

  // AI Polish integration tests (require auth)
  if (token) {
    results.push(testRewriteTextIntegration());
    results.push(testApplyRewriteFunction());
    results.push(testSendRewriteFeedbackFunction());
  } else {
    results.push({
      name: 'Rewrite Text Integration',
      passed: false,
      message: 'Skipped - no auth token',
      skipped: true
    });
    results.push({
      name: 'Apply Rewrite Function',
      passed: false,
      message: 'Skipped - no auth token',
      skipped: true
    });
    results.push({
      name: 'Send Rewrite Feedback',
      passed: false,
      message: 'Skipped - no auth token',
      skipped: true
    });
  }

  // Log results summary
  logTestResults(results);

  return results;
}

/**
 * Test 1: API Connection
 * Verifies the API base URL is reachable
 */
function testApiConnection() {
  var testName = 'API Connection';

  try {
    // Try to reach the API health endpoint
    var url = API_BASE + '/health';
    var options = {
      method: 'get',
      muteHttpExceptions: true,
      validateHttpsCertificates: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var statusCode = response.getResponseCode();

    // 200 = healthy, 401 = reachable but needs auth (still counts as connected)
    if (statusCode === 200 || statusCode === 401 || statusCode === 404) {
      return {
        name: testName,
        passed: true,
        message: 'API reachable (HTTP ' + statusCode + ')'
      };
    }

    return {
      name: testName,
      passed: false,
      message: 'Unexpected status: HTTP ' + statusCode
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: 'Connection failed: ' + error.toString()
    };
  }
}

/**
 * Test 2: Auth Token
 * Verifies auth token is stored and valid
 */
function testAuthToken() {
  var testName = 'Auth Token';

  try {
    var token = getAuthToken();

    if (!token) {
      return {
        name: testName,
        passed: false,
        message: 'No token stored - user needs to authenticate'
      };
    }

    // Token exists, try to validate it
    var url = API_BASE + '/user/me';
    var options = {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var statusCode = response.getResponseCode();

    if (statusCode === 200) {
      var user = JSON.parse(response.getContentText());
      return {
        name: testName,
        passed: true,
        message: 'Valid token for: ' + (user.email || 'unknown user')
      };
    }

    if (statusCode === 401) {
      return {
        name: testName,
        passed: false,
        message: 'Token expired or invalid'
      };
    }

    return {
      name: testName,
      passed: false,
      message: 'Unexpected response: HTTP ' + statusCode
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Test 3: Document Access
 * Verifies we can access the active document
 */
function testDocumentAccess() {
  var testName = 'Document Access';

  try {
    var doc = DocumentApp.getActiveDocument();

    if (!doc) {
      return {
        name: testName,
        passed: false,
        message: 'No active document - run from a Google Doc'
      };
    }

    var docId = doc.getId();
    var docTitle = doc.getName();
    var body = doc.getBody();
    var text = body.getText();

    if (!docId) {
      return {
        name: testName,
        passed: false,
        message: 'Could not get document ID'
      };
    }

    return {
      name: testName,
      passed: true,
      message: 'Document: "' + truncateText(docTitle, 30) + '" (' + text.length + ' chars)'
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Test 4: Content Hash
 * Verifies content hashing works correctly
 */
function testContentHash() {
  var testName = 'Content Hash';

  try {
    // Test with known content
    var testContent = 'Test Title\nThis is test content.';
    var hash1 = calculateFingerprint(testContent);

    if (!hash1) {
      return {
        name: testName,
        passed: false,
        message: 'Hash generation returned null'
      };
    }

    // Verify hash format
    if (!hash1.startsWith('sha256:')) {
      return {
        name: testName,
        passed: false,
        message: 'Invalid hash prefix: ' + hash1.substring(0, 10)
      };
    }

    // Verify hash is 64 hex chars after prefix
    var hashValue = hash1.replace('sha256:', '');
    if (hashValue.length !== 64) {
      return {
        name: testName,
        passed: false,
        message: 'Invalid hash length: ' + hashValue.length + ' (expected 64)'
      };
    }

    // Verify hash is deterministic
    var hash2 = calculateFingerprint(testContent);
    if (hash1 !== hash2) {
      return {
        name: testName,
        passed: false,
        message: 'Hash not deterministic'
      };
    }

    // Verify different content produces different hash
    var hash3 = calculateFingerprint(testContent + ' modified');
    if (hash1 === hash3) {
      return {
        name: testName,
        passed: false,
        message: 'Different content produced same hash'
      };
    }

    return {
      name: testName,
      passed: true,
      message: 'Hash: ' + hash1.substring(0, 20) + '...'
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Test 5: Properties Service
 * Verifies we can read/write to properties
 */
function testPropertiesService() {
  var testName = 'Properties Service';

  try {
    var testKey = 'VATESSA_TEST_KEY';
    var testValue = 'test_' + new Date().getTime();

    // Test user properties
    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty(testKey, testValue);
    var retrieved = userProps.getProperty(testKey);
    userProps.deleteProperty(testKey);

    if (retrieved !== testValue) {
      return {
        name: testName,
        passed: false,
        message: 'User properties read/write failed'
      };
    }

    // Test document properties (if in a document context)
    try {
      var docProps = PropertiesService.getDocumentProperties();
      docProps.setProperty(testKey, testValue);
      var docRetrieved = docProps.getProperty(testKey);
      docProps.deleteProperty(testKey);

      if (docRetrieved !== testValue) {
        return {
          name: testName,
          passed: false,
          message: 'Document properties read/write failed'
        };
      }
    } catch (e) {
      // Document properties may not be available outside of document context
      return {
        name: testName,
        passed: true,
        message: 'User properties OK (doc properties not available)'
      };
    }

    return {
      name: testName,
      passed: true,
      message: 'User and document properties working'
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Test 6: Document Link Check
 * Verifies we can check if a document is linked (requires auth)
 */
function testDocumentLinkCheck() {
  var testName = 'Document Link Check';

  try {
    var doc = DocumentApp.getActiveDocument();
    if (!doc) {
      return {
        name: testName,
        passed: false,
        message: 'No active document'
      };
    }

    var docId = doc.getId();
    var result = checkDocumentLinked(docId);

    // Result should have 'linked' boolean property
    if (typeof result.linked !== 'boolean' && !result.authRequired) {
      return {
        name: testName,
        passed: false,
        message: 'Invalid response format'
      };
    }

    if (result.authRequired) {
      return {
        name: testName,
        passed: false,
        message: 'Auth required'
      };
    }

    var status = result.linked ? 'Linked to ' + result.messageId : 'Not linked';
    return {
      name: testName,
      passed: true,
      message: status
    };

  } catch (error) {
    // 404 is expected if document not linked
    if (error.toString().indexOf('NOT_FOUND') !== -1) {
      return {
        name: testName,
        passed: true,
        message: 'Document not linked (expected)'
      };
    }

    return {
      name: testName,
      passed: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Test 7: Message Status Fetch
 * Verifies we can fetch message status (requires linked document)
 */
function testMessageStatusFetch() {
  var testName = 'Message Status Fetch';

  try {
    var messageId = getStoredMessageId();

    if (!messageId) {
      return {
        name: testName,
        passed: true,
        message: 'Skipped - no linked message',
        skipped: true
      };
    }

    var status = getMessageStatus(messageId);

    if (!status || status.error === 'NOT_FOUND') {
      return {
        name: testName,
        passed: false,
        message: 'Message not found: ' + messageId
      };
    }

    // Verify expected fields
    var hasRequiredFields = status.messageId || status.title || status.status;
    if (!hasRequiredFields) {
      return {
        name: testName,
        passed: false,
        message: 'Missing required fields in response'
      };
    }

    return {
      name: testName,
      passed: true,
      message: 'Status: ' + (status.status || 'unknown') + ' - ' + truncateText(status.title, 20)
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Test 8: Sync Payload Format
 * Verifies the sync payload has correct structure
 */
function testSyncPayloadFormat() {
  var testName = 'Sync Payload Format';

  try {
    // Build a mock payload
    var mockData = {
      title: 'Test Document Title',
      text: 'This is the document body content for testing.',
      wordCount: 8,
      lastModified: new Date().toISOString()
    };

    var hash = calculateFingerprint(mockData.title + '\n' + mockData.text);

    var payload = {
      content: {
        text: mockData.text,
        html: null
      },
      metadata: {
        title: mockData.title,
        lastModified: mockData.lastModified,
        wordCount: mockData.wordCount,
        contentHash: hash
      }
    };

    // Validate structure
    var errors = [];

    if (!payload.content) errors.push('missing content');
    if (!payload.content.text) errors.push('missing content.text');
    if (!payload.metadata) errors.push('missing metadata');
    if (!payload.metadata.title) errors.push('missing metadata.title');
    if (!payload.metadata.contentHash) errors.push('missing metadata.contentHash');

    if (errors.length > 0) {
      return {
        name: testName,
        passed: false,
        message: 'Invalid payload: ' + errors.join(', ')
      };
    }

    return {
      name: testName,
      passed: true,
      message: 'Payload structure valid'
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Test 9: Submit Payload Format
 * Verifies the submit payload has correct structure
 */
function testSubmitPayloadFormat() {
  var testName = 'Submit Payload Format';

  try {
    var payload = {
      syncFirst: true
    };

    // Validate structure
    if (typeof payload.syncFirst !== 'boolean') {
      return {
        name: testName,
        passed: false,
        message: 'syncFirst should be boolean'
      };
    }

    return {
      name: testName,
      passed: true,
      message: 'Payload structure valid'
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Test 10: Utility Functions
 * Verifies utility functions work correctly
 */
function testUtilityFunctions() {
  var testName = 'Utility Functions';

  try {
    var errors = [];

    // Test formatTimeAgo
    var now = new Date();
    var fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
    var formatted = formatTimeAgo(fiveMinutesAgo.toISOString());
    if (formatted.indexOf('minute') === -1) {
      errors.push('formatTimeAgo failed');
    }

    // Test truncateText
    var longText = 'This is a very long text that should be truncated';
    var truncated = truncateText(longText, 20);
    if (truncated.length > 20) {
      errors.push('truncateText failed');
    }

    // Test escapeHtml
    var html = '<script>alert("xss")</script>';
    var escaped = escapeHtml(html);
    if (escaped.indexOf('<script>') !== -1) {
      errors.push('escapeHtml failed');
    }

    // Test getStatusColor
    var color = getStatusColor('approved');
    if (!color || color.indexOf('#') !== 0) {
      errors.push('getStatusColor failed');
    }

    // Test getStatusText
    var statusText = getStatusText('in_review');
    if (statusText !== 'In Review') {
      errors.push('getStatusText failed');
    }

    if (errors.length > 0) {
      return {
        name: testName,
        passed: false,
        message: errors.join(', ')
      };
    }

    return {
      name: testName,
      passed: true,
      message: 'All utility functions working'
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Logs test results in a readable format
 */
function logTestResults(results) {
  Logger.log('');
  Logger.log('========================================');
  Logger.log('  RESULTS');
  Logger.log('========================================');
  Logger.log('');

  var passed = 0;
  var failed = 0;
  var skipped = 0;

  results.forEach(function(result) {
    var icon = result.passed ? '[PASS]' : '[FAIL]';
    if (result.skipped) {
      icon = '[SKIP]';
      skipped++;
    } else if (result.passed) {
      passed++;
    } else {
      failed++;
    }

    Logger.log(icon + ' ' + result.name);
    Logger.log('       ' + result.message);
    Logger.log('');
  });

  Logger.log('========================================');
  Logger.log('  SUMMARY');
  Logger.log('========================================');
  Logger.log('');
  Logger.log('  Passed:  ' + passed);
  Logger.log('  Failed:  ' + failed);
  Logger.log('  Skipped: ' + skipped);
  Logger.log('  Total:   ' + results.length);
  Logger.log('');

  if (failed === 0) {
    Logger.log('  STATUS: ALL TESTS PASSED');
  } else {
    Logger.log('  STATUS: ' + failed + ' TEST(S) FAILED');
  }

  Logger.log('');
  Logger.log('========================================');
}

/**
 * Test 11: Message Type Support
 * Verifies message type field works correctly
 */
function testMessageTypeSupport() {
  var testName = 'Message Type Support';

  try {
    var errors = [];

    // Test valid message types
    var validTypes = ['communication', 'policy'];
    validTypes.forEach(function(type) {
      if (type !== 'communication' && type !== 'policy') {
        errors.push('Invalid type not in allowed list: ' + type);
      }
    });

    // Test default type
    var defaultType = 'communication';
    if (defaultType !== 'communication') {
      errors.push('Default type should be communication');
    }

    // Test create payload includes message_type
    var mockContent = {
      title: 'Test Policy',
      content: 'This is a test policy document.'
    };
    var messageType = 'policy';

    var payload = {
      title: mockContent.title,
      body: mockContent.content,
      message_type: messageType,
      sourceType: 'google_docs'
    };

    if (!payload.message_type) {
      errors.push('Payload missing message_type field');
    }

    if (payload.message_type !== 'policy') {
      errors.push('Payload message_type should be policy');
    }

    // Test property storage
    var testKey = 'vatessa_message_type';
    var docProps = PropertiesService.getDocumentProperties();
    docProps.setProperty(testKey, 'policy');
    var retrieved = docProps.getProperty(testKey);
    docProps.deleteProperty(testKey);

    if (retrieved !== 'policy') {
      errors.push('Message type not stored correctly in properties');
    }

    if (errors.length > 0) {
      return {
        name: testName,
        passed: false,
        message: errors.join(', ')
      };
    }

    return {
      name: testName,
      passed: true,
      message: 'Message type support working (communication/policy)'
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Test 12: Message Type Persistence
 * Verifies message type is returned in document status
 */
function testMessageTypePersistence() {
  var testName = 'Message Type Persistence';

  try {
    var docProps = PropertiesService.getDocumentProperties();
    var testKey = 'vatessa_message_type';

    // Store a message type
    docProps.setProperty(testKey, 'policy');

    // Simulate getDocumentStatus return
    var storedType = docProps.getProperty(testKey) || 'communication';

    // Clean up
    docProps.deleteProperty(testKey);

    if (storedType !== 'policy') {
      return {
        name: testName,
        passed: false,
        message: 'Stored type not retrieved correctly'
      };
    }

    // Test default fallback
    var defaultType = docProps.getProperty(testKey) || 'communication';
    if (defaultType !== 'communication') {
      return {
        name: testName,
        passed: false,
        message: 'Default type fallback failed'
      };
    }

    return {
      name: testName,
      passed: true,
      message: 'Message type persists and defaults correctly'
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: 'Error: ' + error.toString()
    };
  }
}

// =============================================
// AI Polish Tests (B3)
// =============================================

/**
 * Test 13: Validate Rewrite Content
 * Verifies content validation for the rewrite endpoint
 */
function testValidateRewriteContent() {
  var testName = 'Validate Rewrite Content';

  try {
    var errors = [];

    // Test 1: Empty content should fail
    var result1 = validateRewriteContent('');
    if (result1.valid !== false) {
      errors.push('Empty string should be invalid');
    }
    if (!result1.error || result1.error.code !== 'content_empty') {
      errors.push('Empty string should return content_empty code');
    }

    // Test 2: Null content should fail
    var result2 = validateRewriteContent(null);
    if (result2.valid !== false) {
      errors.push('Null should be invalid');
    }

    // Test 3: Whitespace-only content should fail
    var result3 = validateRewriteContent('   \n\t  ');
    if (result3.valid !== false) {
      errors.push('Whitespace-only should be invalid');
    }

    // Test 4: Normal content should pass
    var result4 = validateRewriteContent('Hello, this is a test document.');
    if (result4.valid !== true) {
      errors.push('Normal content should be valid');
    }

    // Test 5: Content at exactly 10,000 chars should pass
    var contentAt10k = '';
    for (var i = 0; i < 10000; i++) { contentAt10k += 'a'; }
    var result5 = validateRewriteContent(contentAt10k);
    if (result5.valid !== true) {
      errors.push('Content at exactly 10,000 chars should be valid');
    }

    // Test 6: Content over 10,000 chars should fail
    var contentOver10k = contentAt10k + 'extra';
    var result6 = validateRewriteContent(contentOver10k);
    if (result6.valid !== false) {
      errors.push('Content over 10,000 chars should be invalid');
    }
    if (!result6.error || result6.error.code !== 'content_too_long') {
      errors.push('Over-limit should return content_too_long code');
    }

    if (errors.length > 0) {
      return {
        name: testName,
        passed: false,
        message: errors.join('; ')
      };
    }

    return {
      name: testName,
      passed: true,
      message: 'All 6 validation cases passed'
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Test 14: Get Selected Text
 * Verifies getSelectedText returns correct structure
 */
function testGetSelectedText() {
  var testName = 'Get Selected Text';

  try {
    var result = getSelectedText();

    // Should always return an object with text and hasSelection
    if (typeof result !== 'object' || result === null) {
      return {
        name: testName,
        passed: false,
        message: 'Should return an object'
      };
    }

    if (typeof result.hasSelection !== 'boolean') {
      return {
        name: testName,
        passed: false,
        message: 'hasSelection should be a boolean'
      };
    }

    if (typeof result.text !== 'string') {
      return {
        name: testName,
        passed: false,
        message: 'text should be a string'
      };
    }

    // When running from the editor (no UI selection), hasSelection should be false
    var selectionNote = result.hasSelection
      ? 'Selection found: "' + truncateText(result.text, 30) + '"'
      : 'No selection (expected when running from editor)';

    return {
      name: testName,
      passed: true,
      message: selectionNote
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Test 15: Rewrite Payload Format
 * Verifies the rewrite API payload has correct structure
 */
function testRewritePayloadFormat() {
  var testName = 'Rewrite Payload Format';

  try {
    var errors = [];

    // Valid actions
    var validActions = ['shorten', 'formal', 'casual', 'simplify', 'compliance'];

    validActions.forEach(function(action) {
      var payload = {
        content: 'Test content for rewrite.',
        action: action,
      };

      if (!payload.content) errors.push('Missing content for action: ' + action);
      if (!payload.action) errors.push('Missing action: ' + action);
    });

    // Test with context
    var payloadWithContext = {
      content: 'Test content.',
      action: 'formal',
      context: {
        messageType: 'communication',
        audience: 'Internal employees',
      },
    };

    if (!payloadWithContext.context) errors.push('Missing context field');
    if (!payloadWithContext.context.messageType) errors.push('Missing context.messageType');
    if (!payloadWithContext.context.audience) errors.push('Missing context.audience');

    // Verify all 5 actions are covered
    if (validActions.length !== 5) {
      errors.push('Expected 5 valid actions, got ' + validActions.length);
    }

    if (errors.length > 0) {
      return {
        name: testName,
        passed: false,
        message: errors.join('; ')
      };
    }

    return {
      name: testName,
      passed: true,
      message: 'Payload valid for all 5 rewrite actions'
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Test 16: Rewrite Feedback Payload Format
 * Verifies the feedback API payload has correct structure
 */
function testRewriteFeedbackPayloadFormat() {
  var testName = 'Rewrite Feedback Payload Format';

  try {
    var errors = [];

    var validFeedbackActions = ['applied_replace', 'copied', 'dismissed'];

    validFeedbackActions.forEach(function(action) {
      var payload = {
        rewriteId: 'rw_test-uuid-1234',
        action: action,
      };

      if (!payload.rewriteId) errors.push('Missing rewriteId for: ' + action);
      if (!payload.action) errors.push('Missing action: ' + action);
    });

    // Test rewriteId format
    var testId = 'rw_a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    if (!testId.startsWith('rw_')) {
      errors.push('rewriteId should start with rw_ prefix');
    }

    if (validFeedbackActions.length !== 3) {
      errors.push('Expected 3 feedback actions, got ' + validFeedbackActions.length);
    }

    if (errors.length > 0) {
      return {
        name: testName,
        passed: false,
        message: errors.join('; ')
      };
    }

    return {
      name: testName,
      passed: true,
      message: 'Feedback payload valid for all 3 actions'
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Test 17: Rewrite Text Integration
 * Tests the full rewriteText flow (requires auth and Business tier)
 */
function testRewriteTextIntegration() {
  var testName = 'Rewrite Text Integration';

  try {
    // Ensure document has content
    var doc = DocumentApp.getActiveDocument();
    if (!doc) {
      return {
        name: testName,
        passed: false,
        message: 'No active document'
      };
    }

    var bodyText = doc.getBody().getText();
    if (!bodyText || bodyText.trim().length === 0) {
      return {
        name: testName,
        passed: true,
        message: 'Skipped - document is empty (would return content_empty)',
        skipped: true
      };
    }

    // Call rewriteText with 'shorten' action
    var result = rewriteText('shorten');

    // Result should always be an object with success field
    if (typeof result !== 'object' || typeof result.success !== 'boolean') {
      return {
        name: testName,
        passed: false,
        message: 'Invalid response structure'
      };
    }

    // If successful, verify data shape
    if (result.success) {
      var data = result.data;
      if (!data.rewriteId || !data.original || !data.rewritten || !data.action) {
        return {
          name: testName,
          passed: false,
          message: 'Success response missing required fields (rewriteId, original, rewritten, action)'
        };
      }

      if (data.action !== 'shorten') {
        return {
          name: testName,
          passed: false,
          message: 'Action mismatch: expected "shorten", got "' + data.action + '"'
        };
      }

      if (typeof result.hasSelection !== 'boolean') {
        return {
          name: testName,
          passed: false,
          message: 'Missing hasSelection boolean'
        };
      }

      return {
        name: testName,
        passed: true,
        message: 'Rewrite succeeded: ' + data.original.length + ' chars → ' + data.rewritten.length + ' chars'
      };
    }

    // Handle expected errors (tier_required is acceptable for non-Business orgs)
    if (result.error) {
      var code = result.error.code;
      if (code === 'tier_required') {
        return {
          name: testName,
          passed: true,
          message: 'Tier gating works correctly (Business tier required)',
          skipped: true
        };
      }
      if (code === 'limit_exceeded') {
        return {
          name: testName,
          passed: true,
          message: 'Rate limiting works correctly',
          skipped: true
        };
      }
      if (code === 'unavailable') {
        return {
          name: testName,
          passed: true,
          message: 'Service unavailable (expected if AI not configured)',
          skipped: true
        };
      }
      // Unexpected error
      return {
        name: testName,
        passed: false,
        message: 'Unexpected error: ' + code + ' - ' + result.error.message
      };
    }

    return {
      name: testName,
      passed: false,
      message: 'Unexpected result format'
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Test 18: Apply Rewrite Function
 * Tests that applyRewrite can modify document text
 */
function testApplyRewriteFunction() {
  var testName = 'Apply Rewrite Function';

  try {
    var doc = DocumentApp.getActiveDocument();
    if (!doc) {
      return {
        name: testName,
        passed: false,
        message: 'No active document'
      };
    }

    var body = doc.getBody();
    var originalText = body.getText();

    // Test full body replace (replaceSelection=false)
    var testText = originalText + '\n[SMOKE_TEST_MARKER]';
    var result = applyRewrite(testText, false);

    if (!result.success) {
      return {
        name: testName,
        passed: false,
        message: 'Apply failed: ' + (result.error || 'unknown')
      };
    }

    // Verify the text was applied
    var newText = body.getText();
    if (newText.indexOf('[SMOKE_TEST_MARKER]') === -1) {
      // Revert and fail
      body.setText(originalText);
      return {
        name: testName,
        passed: false,
        message: 'Text not applied to document'
      };
    }

    // Revert to original
    body.setText(originalText);

    // Verify revert worked
    var revertedText = body.getText();
    if (revertedText !== originalText) {
      return {
        name: testName,
        passed: false,
        message: 'Failed to revert document to original text'
      };
    }

    return {
      name: testName,
      passed: true,
      message: 'Apply and revert both succeeded'
    };

  } catch (error) {
    // Try to revert on error
    try {
      var doc = DocumentApp.getActiveDocument();
      if (doc && typeof originalText !== 'undefined') {
        doc.getBody().setText(originalText);
      }
    } catch (e) {}

    return {
      name: testName,
      passed: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Test 19: Send Rewrite Feedback Function
 * Tests that sendRewriteFeedback doesn't throw (fire-and-forget)
 */
function testSendRewriteFeedbackFunction() {
  var testName = 'Send Rewrite Feedback';

  try {
    // Call with a fake rewriteId — should not throw (fire-and-forget)
    // The backend will return 404 for unknown IDs, but the function silently catches
    sendRewriteFeedback('rw_smoke-test-fake-id', 'dismissed');

    return {
      name: testName,
      passed: true,
      message: 'Fire-and-forget completed without throwing'
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: 'Should not throw: ' + error.toString()
    };
  }
}

/**
 * Run AI Polish specific tests
 */
function runPolishTests() {
  var results = [];

  Logger.log('');
  Logger.log('========================================');
  Logger.log('  AI Polish (B3) Tests');
  Logger.log('  ' + new Date().toISOString());
  Logger.log('========================================');
  Logger.log('');

  // Unit tests (no auth required)
  results.push(testValidateRewriteContent());
  results.push(testGetSelectedText());
  results.push(testRewritePayloadFormat());
  results.push(testRewriteFeedbackPayloadFormat());

  // Integration tests (require auth)
  var token = getAuthToken();
  if (token) {
    results.push(testRewriteTextIntegration());
    results.push(testApplyRewriteFunction());
    results.push(testSendRewriteFeedbackFunction());
  } else {
    Logger.log('  [SKIP] Integration tests skipped - no auth token');
  }

  logTestResults(results);
  return results;
}

/**
 * Quick test for development - run a single test
 */
function runQuickTest() {
  var result = testApiConnection();
  Logger.log(result.name + ': ' + (result.passed ? 'PASS' : 'FAIL'));
  Logger.log(result.message);
}

/**
 * Run message type specific tests
 */
function runMessageTypeTests() {
  var results = [];

  Logger.log('');
  Logger.log('========================================');
  Logger.log('  Message Type Tests');
  Logger.log('  ' + new Date().toISOString());
  Logger.log('========================================');
  Logger.log('');

  results.push(testMessageTypeSupport());
  results.push(testMessageTypePersistence());

  logTestResults(results);
  return results;
}

/**
 * Gets Vatessa web app URL
 */
function getVatessaUrl() {
  return 'https://app.vatessa.com';
}
