import multer from 'multer';
import { storage } from '../config/cloudinary.js';
import { BadRequestError } from '../utils/ApiError.js';

// Configure multer with Cloudinary storage
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new BadRequestError('Only image and video files are allowed'), false);
    }
  },
});

// Middleware for single file upload
export const uploadSingle = (fieldName = 'file') => {
  return upload.single(fieldName);
};

// Middleware for multiple files upload
export const uploadMultiple = (fieldName = 'files', maxCount = 5) => {
  return upload.array(fieldName, maxCount);
};

