const Anthropic = require('@anthropic-ai/sdk');
const crypto = require('crypto');

// Initialize Claude client
const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

// Custom error classes
class ClaudeAPIError extends Error {
  constructor(message, code, status, retryable = false) {
    super(message);
    this.name = 'ClaudeAPIError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

class AnalysisError extends ClaudeAPIError {
  constructor(message) {
    super(message, 'ANALYSIS_ERROR', 0, false);
    this.name = 'AnalysisError';
  }
}

class RateLimitError extends ClaudeAPIError {
  constructor(message, retryAfter) {
    super(message, 'RATE_LIMIT', 429, true);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter || 60;
  }
}

class ServiceError extends ClaudeAPIError {
  constructor(message, retryable = true) {
    super(message, 'SERVER_ERROR', 500, retryable);
    this.name = 'ServiceError';
  }
}

// Rate limiter for client-side limiting
class RateLimiter {
  constructor(maxRequests = 50, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async acquire() {
    const now = Date.now();

    // Remove old requests outside window
    this.requests = this.requests.filter(
      time => now - time < this.windowMs
    );

    // Check if at limit
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);

      console.log(`Rate limit reached. Waiting ${waitTime}ms`);
      await sleep(waitTime);

      return this.acquire(); // Try again
    }

    // Record this request
    this.requests.push(now);
  }
}

const rateLimiter = new RateLimiter(50, 60000); // 50 req/min

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function estimateTokens(text) {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

function generateUUID() {
  return crypto.randomUUID();
}

// Response parsing utilities
function parseClaudeResponse(responseText) {
  try {
    // Try direct parse
    return JSON.parse(responseText);
  } catch (error) {
    // Sometimes Claude wraps JSON in markdown
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);

    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        throw new Error('Failed to parse JSON from markdown block');
      }
    }

    // Try to extract JSON object
    const objectMatch = responseText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch (e) {
        throw new Error('Failed to parse extracted JSON object');
      }
    }

    throw new Error('No valid JSON found in response');
  }
}

function validateAnalysisResponse(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Response must be an object');
  }

  if (!parsed.extractedData) {
    throw new Error('Missing extractedData field');
  }

  if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
    console.warn('Invalid or missing confidence score');
    parsed.confidence = 0.5; // Default
  }

  return parsed;
}

// Core API call function with error handling
async function callClaudeAPI(prompt, options = {}) {
  try {
    const response = await client.messages.create({
      model: options.model || "claude-3-5-sonnet-20241022",
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.3,
      system: options.system,
      messages: [{ role: "user", content: prompt }]
    });

    return response.content[0].text;

  } catch (error) {
    // Rate limit
    if (error.status === 429) {
      const retryAfter = error.headers?.['retry-after'] || 60;
      throw new RateLimitError(
        `Rate limit exceeded. Retry after ${retryAfter}s`,
        retryAfter
      );
    }

    // Authentication
    if (error.status === 401) {
      throw new ClaudeAPIError(
        'Invalid API key',
        'AUTH_ERROR',
        401,
        false
      );
    }

    // Server errors (retryable)
    if (error.status >= 500) {
      throw new ServiceError(
        'Claude API server error',
        true
      );
    }

    // Invalid request (not retryable)
    if (error.status === 400) {
      throw new ClaudeAPIError(
        `Invalid request: ${error.message}`,
        'INVALID_REQUEST',
        400,
        false
      );
    }

    // Network/timeout errors (retryable)
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      throw new ClaudeAPIError(
        'Network timeout',
        'TIMEOUT',
        0,
        true
      );
    }

    // Unknown error
    throw new ClaudeAPIError(
      error.message,
      'UNKNOWN',
      error.status || 0,
      false
    );
  }
}

// Retry logic with exponential backoff
async function callClaudeWithRetry(prompt, options = {}, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callClaudeAPI(prompt, options);

    } catch (error) {
      lastError = error;

      // Don't retry non-retryable errors
      if (!error.retryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate backoff
      const backoffMs = Math.min(
        Math.pow(2, attempt) * 1000, // Exponential: 2s, 4s, 8s
        30000 // Max 30 seconds
      );

      console.log(`Retry attempt ${attempt}/${maxRetries} after ${backoffMs}ms`);
      await sleep(backoffMs);
    }
  }

  throw lastError;
}

// Main function with rate limiting
async function callClaudeWithRateLimit(prompt, options) {
  await rateLimiter.acquire();
  return callClaudeWithRetry(prompt, options);
}

// Logging utilities
function logAPICall(prompt, response, duration) {
  console.log({
    timestamp: new Date().toISOString(),
    model: 'claude-3-5-sonnet-20241022',
    promptTokens: estimateTokens(prompt),
    responseTokens: estimateTokens(response),
    duration,
    success: true
  });
}

function logAPIError(error, context) {
  console.error({
    timestamp: new Date().toISOString(),
    error: error.message,
    code: error.code,
    status: error.status,
    context,
    retryable: error.retryable
  });
}

// Content validation
function shouldAnalyzeContent(content) {
  const tokens = estimateTokens(content);

  // Warn if content is very large
  if (tokens > 100000) {
    console.warn(`Large content: ~${tokens} tokens. Consider chunking.`);
  }

  return tokens <= 150000; // Stay under 200K limit with room for response
}

module.exports = {
  client,
  callClaudeAPI,
  callClaudeWithRetry,
  callClaudeWithRateLimit,
  parseClaudeResponse,
  validateAnalysisResponse,
  generateUUID,
  estimateTokens,
  shouldAnalyzeContent,
  logAPICall,
  logAPIError,
  sleep,
  // Error classes
  ClaudeAPIError,
  AnalysisError,
  RateLimitError,
  ServiceError
};
