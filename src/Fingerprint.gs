/**
 * Content Fingerprinting
 * SHA-256 hashing for conflict detection
 */

/**
 * Generates SHA-256 hash of current document content
 * Combines title + text for complete content fingerprint
 */
function generateContentHash() {
  var doc = DocumentApp.getActiveDocument();
  var title = doc.getName();
  var text = doc.getBody().getText();

  // Combine title + text for hash
  var content = title + '\n' + text;

  return calculateFingerprint(content);
}

/**
 * Calculates SHA-256 hash of content
 * Uses Google's Utilities.computeDigest for secure hashing
 */
function calculateFingerprint(content) {
  if (!content) {
    return null;
  }

  // Normalize content before hashing
  var normalized = normalizeContent(content);

  // Compute SHA-256 hash
  var rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    normalized,
    Utilities.Charset.UTF_8
  );

  // Convert byte array to hex string
  var hashString = '';
  for (var i = 0; i < rawHash.length; i++) {
    var byte = rawHash[i];
    if (byte < 0) {
      byte += 256;
    }
    var byteString = byte.toString(16);
    if (byteString.length === 1) {
      byteString = '0' + byteString;
    }
    hashString += byteString;
  }

  return 'sha256:' + hashString;
}

/**
 * Normalizes content before hashing
 * Removes insignificant whitespace differences
 */
function normalizeContent(content) {
  // Trim whitespace
  content = content.trim();

  // Normalize line endings to \n
  content = content.replace(/\r\n/g, '\n');
  content = content.replace(/\r/g, '\n');

  // Collapse multiple spaces (but preserve intentional formatting)
  // Only collapse spaces within lines, not across lines
  var lines = content.split('\n');
  var normalizedLines = lines.map(function(line) {
    // Trim trailing spaces on each line
    return line.replace(/\s+$/g, '');
  });

  content = normalizedLines.join('\n');

  return content;
}

/**
 * Checks if two content hashes match
 */
function hashesMatch(hash1, hash2) {
  if (!hash1 || !hash2) {
    return false;
  }
  return hash1.toLowerCase() === hash2.toLowerCase();
}

/**
 * Detects if content has been modified
 */
function isContentModified(content) {
  var properties = PropertiesService.getDocumentProperties();
  var storedHash = properties.getProperty('VATESSA_CONTENT_HASH');

  if (!storedHash) {
    // No stored hash means content is new/untracked
    return true;
  }

  var currentHash = calculateFingerprint(content);
  return !hashesMatch(currentHash, storedHash);
}

/**
 * Detects conflicts between local and remote changes
 * Returns:
 *   null - No conflict
 *   'local' - Local changes only
 *   'remote' - Remote changes only
 *   'both' - Both local and remote changes (conflict!)
 */
function detectConflict(currentContent, messageId) {
  var properties = PropertiesService.getDocumentProperties();
  var baseHash = properties.getProperty('VATESSA_CONTENT_HASH');

  if (!baseHash) {
    // No base hash means this is first sync
    return null;
  }

  var currentHash = calculateFingerprint(currentContent);
  var localChanged = !hashesMatch(currentHash, baseHash);

  // Get remote hash
  var remoteHash = null;
  try {
    remoteHash = getRemoteContentHash(messageId);
  } catch (e) {
    Logger.log('Could not get remote hash: ' + e.toString());
    return null;
  }

  if (!remoteHash) {
    return null;
  }

  var remoteChanged = !hashesMatch(remoteHash, baseHash);

  // Determine conflict status
  if (!localChanged && !remoteChanged) {
    return null; // No changes
  } else if (localChanged && !remoteChanged) {
    return 'local'; // Only local changes
  } else if (!localChanged && remoteChanged) {
    return 'remote'; // Only remote changes
  } else {
    return 'both'; // Conflict!
  }
}

/**
 * Gets a short fingerprint (first 8 characters) for display
 */
function getShortFingerprint(content) {
  var fullHash = calculateFingerprint(content);
  if (!fullHash) {
    return null;
  }
  return fullHash.substring(0, 8);
}

/**
 * Validates content hash format
 */
function isValidHash(hash) {
  if (!hash) {
    return false;
  }

  // SHA-256 hash should be 64 hex characters
  var hashRegex = /^[a-f0-9]{64}$/i;
  return hashRegex.test(hash);
}
