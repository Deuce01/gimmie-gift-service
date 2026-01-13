import express, { Application } from 'express';
import cors from 'cors';
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

// Apply rate limiting to all routes
app.use(rateLimiter);

// API Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (_req, res) => {
    res.json({
        message: 'Welcome to Gimmie Gift Service API',
        version: '1.0.0',
        endpoints: {
            health: 'GET /api/health',
            search: 'GET /api/search',
            recommendations: 'POST /api/recommendations',
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
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`API docs available at root: http://localhost:${PORT}`);
    console.log(`\nEnvironment: ${env.NODE_ENV}`);
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
