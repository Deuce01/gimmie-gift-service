import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import { rateLimiter } from './middleware/rate-limit.middleware';
import { errorHandler } from './middleware/error.middleware';
import routes from './routes';

// Initialize Express app
const app: Application = express();

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files from public directory (UI Dashboard)
app.use(express.static(path.join(__dirname, '../public')));

// Apply rate limiting to API routes only
app.use('/api', rateLimiter);

// API Routes
app.use('/api', routes);

// Root endpoint - serve dashboard or API info
app.get('/', (_req, res) => {
    // If there's an index.html, it will be served by static middleware
    // This is a fallback for API info
    res.json({
        message: 'Welcome to Gimmie Gift Service API',
        version: '1.0.0',
        dashboard: 'Visit /index.html for the UI dashboard',
        endpoints: {
            health: 'GET /api/health',
            search: 'GET /api/search',
            recommendations: 'POST /api/recommendations',
            diagnostics: 'GET /api/recommendations/diagnostics',
            events: 'POST /api/events',
        },
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = env.PORT;

const server = app.listen(PORT, () => {
    console.log('Gimmie Gift Service started successfully!');
    console.log(`   Server running on http://localhost:${PORT}`);
    console.log(`   Dashboard: http://localhost:${PORT}/index.html`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    console.log(`   Environment: ${env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\nSIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

export default app;
