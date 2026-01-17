/**
 * Document Parser
 * Extracts structured content from Google Docs
 */

/**
 * Parse structured content from document using heading conventions
 *
 * Expected format:
 * # Title (Heading 1)
 * ## Summary (Heading 2)
 * Content...
 * ## Audience (Heading 2)
 * Content...
 * ## Key Points (Heading 2)
 * Content...
 * ## Message (Heading 2)
 * Main body content...
 */
function parseStructuredContent(body) {
  const result = {
    title: '',
    summary: '',
    audience: '',
    audienceSize: 0,
    keyPoints: '',
    body: '',
    tone: 'professional',
  };

  if (!body) {
    return result;
  }

  try {
    const paragraphs = body.getParagraphs();
    let currentSection = 'body';
    let sectionContent = [];

    for (const para of paragraphs) {
      const heading = para.getHeading();
      const text = para.getText().trim();

      if (heading === DocumentApp.ParagraphHeading.HEADING1) {
        result.title = text;
      } else if (heading === DocumentApp.ParagraphHeading.HEADING2) {
        // Save previous section
        if (sectionContent.length > 0) {
          result[currentSection] = sectionContent.join('\n').trim();
          sectionContent = [];
        }

        // Determine new section
        const lowerText = text.toLowerCase();
        if (lowerText.includes('summary')) {
          currentSection = 'summary';
        } else if (lowerText.includes('audience')) {
          currentSection = 'audience';
        } else if (lowerText.includes('key point')) {
          currentSection = 'keyPoints';
        } else if (lowerText.includes('message') || lowerText.includes('body') || lowerText.includes('content')) {
          currentSection = 'body';
        } else if (lowerText.includes('tone')) {
          currentSection = 'tone';
        } else {
          // Unknown section, treat as body
          currentSection = 'body';
        }
      } else if (text) {
        sectionContent.push(text);
      }
    }

    // Save last section
    if (sectionContent.length > 0) {
      result[currentSection] = sectionContent.join('\n').trim();
    }

    // Extract audience size if mentioned
    const audienceSizeMatch = result.audience.match(/(\d+,?\d*)\s*(employees|people|recipients|members|users)/i);
    if (audienceSizeMatch) {
      result.audienceSize = parseInt(audienceSizeMatch[1].replace(',', ''));
    }

    // If no title from heading, use document name
    if (!result.title) {
      const doc = DocumentApp.getActiveDocument();
      result.title = doc.getName();
    }

    // If no body content, use all text
    if (!result.body) {
      result.body = body.getText();
    }

    return result;

  } catch (error) {
    Logger.log('Error parsing structured content: ' + error.toString());
    // Return basic content on error
    return {
      title: '',
      summary: '',
      audience: '',
      audienceSize: 0,
      keyPoints: '',
      body: body.getText(),
      tone: 'professional',
    };
  }
}

/**
 * Checks if document uses structured template
 */
function hasStructuredContent(body) {
  if (!body) {
    return false;
  }

  try {
    const paragraphs = body.getParagraphs();

    for (const para of paragraphs) {
      const heading = para.getHeading();
      if (heading === DocumentApp.ParagraphHeading.HEADING1 ||
          heading === DocumentApp.ParagraphHeading.HEADING2) {
        return true;
      }
    }

    return false;

  } catch (error) {
    Logger.log('Error checking structured content: ' + error.toString());
    return false;
  }
}

/**
 * Creates a new document from Vatessa template
 */
function createFromTemplate(templateId) {
  try {
    const template = DriveApp.getFileById(templateId);
    const copy = template.makeCopy('New Communication - ' + new Date().toLocaleDateString());
    const doc = DocumentApp.openById(copy.getId());

    return {
      success: true,
      documentId: doc.getId(),
      documentUrl: doc.getUrl(),
    };

  } catch (error) {
    Logger.log('Error creating from template: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
    };
  }
}

/**
 * Inserts a structured template into the current document
 */
function insertTemplate() {
  try {
    const doc = DocumentApp.getActiveDocument();
    const body = doc.getBody();

    // Only insert if document is empty or near-empty
    const existingText = body.getText().trim();
    if (existingText.length > 50) {
      return {
        success: false,
        error: 'Document already has content. Template can only be inserted into empty documents.',
      };
    }

    // Clear existing content
    body.clear();

    // Insert template structure
    body.appendParagraph('Communication Title')
      .setHeading(DocumentApp.ParagraphHeading.HEADING1);

    body.appendParagraph('Summary')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph('Brief overview of the communication purpose and key message.');

    body.appendParagraph('Audience')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph('Describe the target audience (e.g., "All employees - 500 people").');

    body.appendParagraph('Key Points')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph('- Point 1\n- Point 2\n- Point 3');

    body.appendParagraph('Message')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph('Write your full message content here...');

    return {
      success: true,
    };

  } catch (error) {
    Logger.log('Error inserting template: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
    };
  }
}

/**
 * Gets document statistics
 */
function getDocumentStats() {
  try {
    const doc = DocumentApp.getActiveDocument();
    const body = doc.getBody();
    const text = body.getText();

    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = body.getParagraphs().filter(p => p.getText().trim().length > 0);

    return {
      characters: text.length,
      words: words.length,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      readingTime: Math.ceil(words.length / 200), // ~200 words per minute
    };

  } catch (error) {
    Logger.log('Error getting document stats: ' + error.toString());
    return {
      characters: 0,
      words: 0,
      sentences: 0,
      paragraphs: 0,
      readingTime: 0,
    };
  }
}
