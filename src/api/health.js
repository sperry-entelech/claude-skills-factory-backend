const express = require('express');
const dbConnection = require('../db/database');

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'connected',
      claudeApi: 'available'
    };

    // Check database connection
    try {
      const db = dbConnection.getConnection();
      db.prepare('SELECT 1').get();
      health.database = 'connected';
    } catch (error) {
      health.database = 'disconnected';
      health.status = 'unhealthy';
      health.errors = health.errors || [];
      health.errors.push('Database connection failed');
    }

    // Check Claude API key
    if (!process.env.CLAUDE_API_KEY) {
      health.claudeApi = 'unavailable';
      health.status = 'unhealthy';
      health.errors = health.errors || [];
      health.errors.push('Claude API key not configured');
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      errors: ['Health check failed']
    });
  }
});

module.exports = router;
