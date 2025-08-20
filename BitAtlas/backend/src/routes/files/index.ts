import { Router } from 'express';
import multer from 'multer';
import { FileController } from '../../controllers/fileController';
import { authMiddleware } from '../../middleware/auth';
import { rateLimiter } from '../../middleware/rateLimiter';

const router = Router();
const fileController = new FileController();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow most common file types
    const allowedTypes = [
      'text/', 'image/', 'application/', 'audio/', 'video/'
    ];
    
    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
    
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'));
    }
  }
});

// Apply authentication to all file routes
router.use(authMiddleware.authenticate);

// Apply rate limiting
const fileRateLimit = rateLimiter.userLimiter(15 * 60 * 1000, 1000); // 1000 requests per 15 minutes per user

// File CRUD operations
router.post('/', 
  fileRateLimit,
  authMiddleware.requireScopes(['files:write']),
  fileController.createFile
);

router.get('/:id', 
  fileRateLimit,
  authMiddleware.requireScopes(['files:read']),
  fileController.getFile
);

router.put('/:id', 
  fileRateLimit,
  authMiddleware.requireScopes(['files:write']),
  fileController.updateFile
);

router.delete('/:id', 
  fileRateLimit,
  authMiddleware.requireScopes(['files:delete']),
  fileController.deleteFile
);

// File listing and search
router.get('/', 
  fileRateLimit,
  authMiddleware.requireScopes(['files:read']),
  fileController.listFiles
);

// File upload endpoint
router.post('/upload', 
  upload.single('file'),
  fileRateLimit,
  authMiddleware.requireScopes(['files:write']),
  fileController.uploadFile
);

// Search endpoint
router.get('/search/query', 
  rateLimiter.endpointLimiter('files/search', 60 * 1000, 60), // 60 searches per minute
  authMiddleware.requireScopes(['files:read']),
  fileController.searchFiles
);

export { router as fileRoutes };