const { 
  callClaudeWithRateLimit, 
  parseClaudeResponse, 
  validateAnalysisResponse,
  generateUUID,
  shouldAnalyzeContent,
  logAPICall,
  logAPIError,
  AnalysisError,
  RateLimitError,
  ServiceError
} = require('../utils/claudeClient');

// Analysis frameworks for different content types
const FRAMEWORKS = {
  copywriting: {
    // Core Elements
    core: {
      bigIdea: "The central unique concept or promise",
      hook: "Opening that grabs attention",
      problemPain: "Pain points being addressed",
      enemyVillain: "What's preventing success/causing pain",
      promise: "Main benefit or transformation",
      mechanism: "How the solution works (the 'secret sauce')",
      proof: "Evidence, testimonials, data, case studies",
      offer: "What they're getting and at what price",
      cta: "Call to action and next steps"
    },

    // Style & Voice
    style: {
      toneVoice: "Overall communication style (authoritative, friendly, urgent, etc.)",
      psychologicalTriggers: ["Urgency", "Scarcity", "Social proof", "Authority", "Reciprocity"],
      emotionalTone: "Primary emotions evoked (fear, hope, excitement, etc.)"
    },

    // Structure & Patterns
    structure: {
      sentenceStructure: {
        averageLength: "Number",
        patterns: ["Short punchy opens", "Longer explanatory sentences"],
        variety: "Mix of lengths for rhythm"
      },
      copyCadence: "Pacing and rhythm (fast, slow, varied)",
      paragraphFlow: "How paragraphs build on each other",
      formattingPatterns: ["Bullet points", "Bold text", "Subheadings", "P.S. sections"],
      narrativeFlow: "Story structure (Problem-Agitate-Solve, AIDA, etc.)"
    },

    // Language
    language: {
      languageStyle: "Direct, conversational, formal, technical, etc.",
      signaturePhrases: ["Recurring words or phrases that define the voice"],
      wordChoice: "Specific vocabulary patterns",
      powerWords: ["Words that trigger emotions or action"]
    }
  },

  process: {
    // Core Workflow
    workflow: {
      steps: [
        {
          name: "Step name",
          description: "What happens",
          duration: "Time required",
          owner: "Who's responsible"
        }
      ],
      decisionPoints: ["Where choices must be made"],
      dependencies: ["What must happen before each step"],
      criticalPath: "Steps that cannot be delayed"
    },

    // Resources
    resources: {
      toolsRequired: ["Software, equipment, materials needed"],
      skillsNeeded: ["Competencies required"],
      peopleInvolved: ["Roles and responsibilities"],
      documentsNeeded: ["Forms, templates, references"]
    },

    // Quality & Risk
    quality: {
      successMetrics: ["How to measure success"],
      qualityChecks: ["Validation points in process"],
      commonPitfalls: ["What usually goes wrong"],
      troubleshooting: ["How to fix common problems"]
    },

    // Context
    context: {
      when: "Triggers that initiate the process",
      frequency: "How often it's performed",
      variations: "Different scenarios or edge cases",
      dependencies: "What must exist before starting"
    }
  },

  technical: {
    // Core Concepts
    concepts: {
      mainConcepts: ["Key ideas being explained"],
      terminology: {
        "term": "definition with context"
      },
      prerequisites: ["What you need to know first"],
      difficulty: "Beginner, Intermediate, Advanced"
    },

    // Implementation
    implementation: {
      patterns: ["Design patterns or approaches used"],
      bestPractices: ["Recommended ways to do things"],
      antiPatterns: ["Common mistakes to avoid"],
      examples: [
        {
          scenario: "Use case",
          code: "Implementation",
          explanation: "Why it works"
        }
      ]
    },

    // Architecture
    architecture: {
      components: ["System parts and their purposes"],
      dataFlow: "How information moves",
      integrations: ["External systems or APIs"],
      scalability: "Performance considerations"
    }
  }
};

// Simple in-memory cache for analysis results
const analysisCache = new Map();

/**
 * Analyze content using Claude API with the appropriate framework
 * @param {string} content - Raw content to analyze
 * @param {string} contentType - Type of content (copywriting, process, technical)
 * @param {object} options - Additional options
 * @returns {Promise<object>} Analysis result
 */
async function analyzeContent(content, contentType, options = {}) {
  try {
    // 1. Validate inputs
    if (!content || content.length < 10) {
      throw new AnalysisError('Content too short for analysis');
    }

    if (content.length > 50000) {
      throw new AnalysisError('Content too long (max 50,000 characters)');
    }

    if (!FRAMEWORKS[contentType]) {
      throw new AnalysisError(`Unknown content type: ${contentType}. Supported types: ${Object.keys(FRAMEWORKS).join(', ')}`);
    }

    // 2. Check cache
    const cacheKey = getCacheKey(content, contentType);
    if (analysisCache.has(cacheKey)) {
      console.log('Returning cached analysis');
      return analysisCache.get(cacheKey);
    }

    // 3. Check if content is too large for analysis
    if (!shouldAnalyzeContent(content)) {
      throw new AnalysisError('Content too large for analysis. Consider breaking it into smaller chunks.');
    }

    // 4. Build analysis prompt
    const framework = FRAMEWORKS[contentType];
    const systemPrompt = `You are an expert content analyst specializing in extracting structured knowledge from ${contentType} content.

Your role:
- Extract structured knowledge from content
- Identify patterns and frameworks
- Return valid JSON responses
- Be specific and accurate

Guidelines:
- Quote exact phrases when possible
- Infer implicit patterns
- Use null for missing elements
- Provide confidence scores`;

    const userPrompt = buildAnalysisPrompt(content, contentType, framework);

    // 5. Call Claude API
    const startTime = Date.now();

    try {
      const responseText = await callClaudeWithRateLimit(userPrompt, {
        model: "claude-3-5-sonnet-20241022",
        maxTokens: 4096,
        temperature: 0.3,
        system: systemPrompt
      });

      const processingTime = (Date.now() - startTime) / 1000;

      // 6. Parse and validate response
      const parsed = parseClaudeResponse(responseText);
      const validated = validateAnalysisResponse(parsed);

      // 7. Build result
      const result = {
        analysisId: generateUUID(),
        contentType,
        extractedData: validated.extractedData,
        confidence: validated.confidence,
        processingTime,
        notes: validated.notes || '',
        timestamp: new Date().toISOString()
      };

      // 8. Cache result (15 minute TTL)
      analysisCache.set(cacheKey, result);
      setTimeout(() => analysisCache.delete(cacheKey), 15 * 60 * 1000);

      // 9. Log successful analysis
      logAPICall(userPrompt, responseText, processingTime * 1000);

      return result;

    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000;
      logAPIError(error, { contentType, contentLength: content.length, processingTime });
      throw error;
    }

  } catch (error) {
    // Re-throw known errors
    if (error instanceof AnalysisError || error instanceof RateLimitError || error instanceof ServiceError) {
      throw error;
    }

    // Wrap unknown errors
    throw new AnalysisError(`Analysis failed: ${error.message}`);
  }
}

/**
 * Build analysis prompt from framework
 * @param {string} content - Content to analyze
 * @param {string} contentType - Type of content
 * @param {object} framework - Analysis framework
 * @returns {string} Formatted prompt
 */
function buildAnalysisPrompt(content, contentType, framework) {
  return `You are an expert ${contentType} analyst. Analyze the following content and extract knowledge using this framework.

**CONTENT TO ANALYZE:**
${content}

**EXTRACTION FRAMEWORK:**
${JSON.stringify(framework, null, 2)}

**INSTRUCTIONS:**
1. Read the content carefully
2. Extract ALL elements from the framework that appear in the content
3. For elements not explicitly stated, infer them from patterns and context
4. Return a structured JSON response following the framework exactly
5. Be specific - quote actual phrases when possible
6. Identify patterns, not just surface content

**OUTPUT FORMAT:**
Return valid JSON matching the framework structure. For each element:
- If explicitly present: Extract the exact wording
- If implicit: Describe the pattern observed
- If missing: Use null

**CONFIDENCE SCORING:**
Also provide a confidence score (0-1) for your analysis quality.

Return format:
{
  "extractedData": { /* framework data */ },
  "confidence": 0.95,
  "notes": "Any observations about the content"
}`;
}

/**
 * Get cache key for content analysis
 * @param {string} content - Content to analyze
 * @param {string} contentType - Type of content
 * @returns {string} Cache key
 */
function getCacheKey(content, contentType) {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(content + contentType).digest('hex');
  return `${contentType}:${hash}`;
}

/**
 * Validate analysis quality
 * @param {object} analysisResult - Analysis result to validate
 * @returns {object} Validation result
 */
function validateAnalysisQuality(analysisResult) {
  const issues = [];

  // Check confidence threshold
  if (analysisResult.confidence < 0.7) {
    issues.push('Low confidence analysis - may need review');
  }

  // Check for missing critical data
  const extractedData = analysisResult.extractedData;

  if (analysisResult.contentType === 'copywriting') {
    if (!extractedData.core?.bigIdea) {
      issues.push('Missing big idea - core concept not identified');
    }
    if (!extractedData.core?.hook) {
      issues.push('Missing hook - attention-grabbing element not found');
    }
  }

  // Check for empty extractions
  const emptyFields = Object.entries(extractedData).filter(
    ([key, value]) => value === null || value === '' || (Array.isArray(value) && value.length === 0)
  );

  if (emptyFields.length > Object.keys(extractedData).length * 0.5) {
    issues.push('More than 50% of fields are empty - content may not match expected type');
  }

  return {
    isValid: issues.length === 0,
    issues,
    requiresReview: issues.length > 0 || analysisResult.confidence < 0.8
  };
}

/**
 * Analyze content with retry logic
 * @param {string} content - Content to analyze
 * @param {string} contentType - Type of content
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<object>} Analysis result
 */
async function analyzeContentWithRetry(content, contentType, maxRetries = 2) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await analyzeContent(content, contentType);
    } catch (error) {
      lastError = error;

      // Don't retry validation errors
      if (error instanceof AnalysisError && !error.retryable) {
        throw error;
      }

      // Retry transient errors with exponential backoff
      if (attempt < maxRetries && isRetryableError(error)) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${backoffMs}ms`);
        await sleep(backoffMs);
        continue;
      }
    }
  }

  throw lastError;
}

/**
 * Check if error is retryable
 * @param {Error} error - Error to check
 * @returns {boolean} Whether error is retryable
 */
function isRetryableError(error) {
  // Retry on rate limits, timeouts, network errors
  const retryableStatuses = [429, 500, 502, 503, 504];
  const retryableErrors = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'];

  return (
    retryableStatuses.includes(error.status) ||
    retryableErrors.includes(error.code) ||
    error.retryable === true
  );
}

/**
 * Sleep utility function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Sleep promise
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get available content types
 * @returns {Array<string>} Available content types
 */
function getAvailableContentTypes() {
  return Object.keys(FRAMEWORKS);
}

/**
 * Get framework for content type
 * @param {string} contentType - Content type
 * @returns {object} Framework object
 */
function getFramework(contentType) {
  return FRAMEWORKS[contentType];
}

module.exports = {
  analyzeContent,
  analyzeContentWithRetry,
  validateAnalysisQuality,
  getAvailableContentTypes,
  getFramework,
  FRAMEWORKS
};
