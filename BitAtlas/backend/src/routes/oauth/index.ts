import { Router } from 'express';
import { OAuthController } from '../../controllers/oauthController';
import { authMiddleware } from '../../middleware/auth';
import { rateLimiter } from '../../middleware/rateLimiter';

const router = Router();
const oauthController = new OAuthController();

// OAuth authorization flow
router.get('/authorize', 
  rateLimiter.endpointLimiter('oauth/authorize', 60 * 1000, 30), // 30 requests per minute
  authMiddleware.optional, // Make auth optional for initial display
  oauthController.authorize
);

router.post('/authorize',
  rateLimiter.endpointLimiter('oauth/authorize_submit', 60 * 1000, 10), // 10 submissions per minute
  authMiddleware.authenticate, // Require authentication for authorization
  oauthController.handleAuthorization
);

// Token exchange endpoint
router.post('/token',
  rateLimiter.endpointLimiter('oauth/token', 60 * 1000, 20), // 20 token requests per minute
  oauthController.token
);

// Token management endpoints (authenticated)
router.get('/tokens',
  authMiddleware.authenticate,
  oauthController.listTokens
);

router.delete('/tokens/:token',
  authMiddleware.authenticate,
  oauthController.revokeToken
);

export { router as oauthRoutes };