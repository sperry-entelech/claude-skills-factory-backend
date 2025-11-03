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
// CORS configuration - allow frontend URL in production, localhost in dev
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [
          process.env.FRONTEND_URL,
          'https://frontend-khaki-six-59.vercel.app',
          'https://frontend-ec4x3btwv-sperry-entelechs-projects.vercel.app',
          'https://claude-skills-factory.vercel.app', // Main frontend domain
        ].filter(Boolean)
      : ['http://localhost:5173', 'http://localhost:3000'];
    
    // Allow all Vercel frontend deployments (they use pattern: *.vercel.app)
    const isVercelFrontend = origin && (
      allowedOrigins.includes(origin) ||
      origin.includes('.vercel.app') || // Allow any Vercel deployment
      origin.includes('sperry-entelechs-projects') && origin.includes('.vercel.app')
    );
    
    if (isVercelFrontend || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}. Allowed:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

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
    documentation: 'See API specification for details',
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: PORT,
      corsConfigured: !!process.env.FRONTEND_URL,
      claudeApiConfigured: !!process.env.CLAUDE_API_KEY
    }
  });
});

// Diagnostic endpoint for debugging frontend connections
app.get('/api/diagnostic', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    backendUrl: `${req.protocol}://${req.get('host')}`,
    apiBaseUrl: `${req.protocol}://${req.get('host')}/api`,
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      frontendUrl: process.env.FRONTEND_URL || 'not set',
      claudeApiConfigured: !!process.env.CLAUDE_API_KEY
    },
    cors: {
      allowedOrigins: process.env.NODE_ENV === 'production'
        ? [
            process.env.FRONTEND_URL,
            'https://frontend-khaki-six-59.vercel.app',
            'https://frontend-ec4x3btwv-sperry-entelechs-projects.vercel.app',
            'https://claude-skills-factory.vercel.app',
            '*.vercel.app (pattern)'
          ].filter(Boolean)
        : ['http://localhost:5173', 'http://localhost:3000'],
      requestingOrigin: req.get('origin') || 'none'
    },
    recommendations: {
      frontendEnvVar: 'VITE_API_URL should be set to: ' + `${req.protocol}://${req.get('host')}/api`,
      vercelSettings: 'Ensure VITE_API_URL is set in Vercel environment variables',
      corsNote: req.get('origin') 
        ? `Your origin (${req.get('origin')}) ${req.get('origin')?.includes('.vercel.app') ? 'should be allowed' : 'may need to be added to CORS'}`
        : 'No origin header - direct request (should work)'
    }
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
    // Railway requires binding to 0.0.0.0, not just localhost
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Claude Skills Factory API running on port ${PORT}`);
      console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
      console.log(`📚 API docs: http://0.0.0.0:${PORT}/`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      if (!process.env.CLAUDE_API_KEY) {
        console.log('⚠️  Warning: CLAUDE_API_KEY not set - API will not work');
      }
      
      if (process.env.FRONTEND_URL) {
        console.log(`✅ CORS configured for: ${process.env.FRONTEND_URL}`);
      } else {
        console.log('⚠️  Warning: FRONTEND_URL not set - CORS may block requests');
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
