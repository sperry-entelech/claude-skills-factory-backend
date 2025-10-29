const express = require('express');
const { z } = require('zod');
const { analyzeContent } = require('../services/contentAnalysis');

const router = express.Router();

// Request validation schema
const AnalyzeRequestSchema = z.object({
  content: z.string().min(10, 'Content must be at least 10 characters').max(50000, 'Content must be less than 50,000 characters'),
  contentType: z.enum(['copywriting', 'process', 'technical'], {
    errorMap: () => ({ message: 'Content type must be one of: copywriting, process, technical' })
  })
});

/**
 * POST /api/analyze
 * Analyzes content and extracts structured knowledge
 */
router.post('/analyze', async (req, res) => {
  try {
    // 1. Validate request body
    const validatedData = AnalyzeRequestSchema.parse(req.body);

    // 2. Call service layer
    const analysis = await analyzeContent(
      validatedData.content,
      validatedData.contentType
    );

    // 3. Return success response
    res.status(200).json(analysis);

  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    // Handle known errors
    if (error.code === 'RATE_LIMIT') {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: error.retryAfter || 60,
        message: error.message
      });
    }

    if (error.code === 'ANALYSIS_ERROR') {
      return res.status(400).json({
        error: 'Analysis failed',
        message: error.message,
        retryable: false
      });
    }

    // Log unexpected errors
    console.error('Analysis error:', error);

    // Return generic error
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message,
      retryable: error.retryable || false
    });
  }
});

module.exports = router;
