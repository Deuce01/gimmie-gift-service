import { Router } from 'express';
import { searchController } from '../controllers/search.controller';
import { recommendationController } from '../controllers/recommendation.controller';
import { eventController } from '../controllers/event.controller';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'gimmie-gift-service',
    });
});

/**
 * Search endpoint with caching
 * GET /api/search
 */
router.get('/search', cacheMiddleware, (req, res, next) =>
    searchController.search(req, res, next)
);

/**
 * Recommendation endpoint
 * POST /api/recommendations
 */
router.post('/recommendations', (req, res, next) =>
    recommendationController.getRecommendations(req, res, next)
);

/**
 * Event tracking endpoint
 * POST /api/events
 */
router.post('/events', (req, res, next) =>
    eventController.trackEvent(req, res, next)
);

export default router;
