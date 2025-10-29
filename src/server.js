require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dbConnection = require('./db/database');

// Import route modules
const healthRoutes = require('./api/health');
const analyzeRoutes = require('./api/analyze');
const skillsRoutes = require('./api/skills');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware setup
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint (before other routes)
app.get('/health', async (req, res) => {
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

// API routes
app.use('/api', healthRoutes);
app.use('/api', analyzeRoutes);
app.use('/api', skillsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Claude Skills Factory API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      analyze: '/api/analyze',
      skills: '/api/skills',
      generateSkill: '/api/generate-skill'
    },
    documentation: 'See API specification for details'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/analyze',
      'POST /api/generate-skill',
      'GET /api/skills',
      'GET /api/skills/:id',
      'PUT /api/skills/:id',
      'DELETE /api/skills/:id',
      'GET /api/skills/:id/download'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: 'Internal server error',
    message: isDevelopment ? error.message : 'Something went wrong',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  dbConnection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  dbConnection.close();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Initialize database
    console.log('Initializing database...');
    dbConnection.connect();
    console.log('Database initialized');

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Claude Skills Factory API running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      if (!process.env.CLAUDE_API_KEY) {
        console.log('⚠️  Warning: CLAUDE_API_KEY not set - API will not work');
      }
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
