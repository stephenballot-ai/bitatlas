import { Router } from 'express';
import { AuthController } from '../../controllers/authController';
import { authMiddleware } from '../../middleware/auth';
import { rateLimiter } from '../../middleware/rateLimiter';

const router = Router();
const authController = new AuthController();

// Apply rate limiting to auth endpoints
const authRateLimit = rateLimiter.authLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes

// Public routes
router.post('/register', authRateLimit, authController.register);
router.post('/login', authRateLimit, authController.login);
router.post('/refresh', rateLimiter.endpointLimiter('auth/refresh', 60 * 1000, 10), authController.refresh);
router.post('/logout', authController.logout);

// Protected routes
router.get('/profile', authMiddleware.authenticate, authController.profile);

export { router as authRoutes };