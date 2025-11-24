import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import dotenv from 'dotenv';

// Ensure environment variables are loaded when this module is imported.
// App-level `dotenv.config()` may run too late because ES module imports
// are evaluated before the importing module's top-level code executes.
dotenv.config();

// Read credentials early
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

const cloudinaryConfigured = Boolean(
  CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
);

if (cloudinaryConfigured) {
  // Configure Cloudinary only when credentials are present
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
} else {
  // Log a clear warning — avoid throwing here so the app can start and we can
  // surface a more helpful error when uploads are attempted.
  console.warn(
    'Cloudinary credentials missing: file uploads will fail. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in your .env'
  );
}

// Custom Multer storage for Cloudinary v2
class CloudinaryStorage {
  constructor(options = {}) {
    this.cloudinary = options.cloudinary || cloudinary;
    this.params = options.params || (() => ({}));
  }

  _handleFile(req, file, cb) {
    if (!cloudinaryConfigured) {
      return cb(new Error('Cloudinary not configured: missing CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET/CLOUDINARY_CLOUD_NAME'));
    }
    const paramsPromise = Promise.resolve(this.params(req, file));
    
    paramsPromise
      .then((params) => {
        const uploadOptions = {
          folder: params.folder || 'recyweb',
          allowed_formats: params.allowed_formats || ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'],
          resource_type: params.resource_type || (file.mimetype.startsWith('video/') ? 'video' : 'image'),
          transformation: params.transformation || [
            { width: 1000, height: 1000, crop: 'limit' },
            { quality: 'auto' }
          ],
        };

        // Convert file stream to buffer
        const chunks = [];
        file.stream.on('data', (chunk) => chunks.push(chunk));
        file.stream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          
          // Upload to Cloudinary
          const uploadStream = this.cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) {
                return cb(error);
              }
              cb(null, {
                fieldname: file.fieldname,
                originalname: file.originalname,
                encoding: file.encoding,
                mimetype: file.mimetype,
                size: result.bytes,
                url: result.secure_url,
                public_id: result.public_id,
                format: result.format,
                resource_type: result.resource_type,
              });
            }
          );

          // Pipe buffer to upload stream
          const bufferStream = new Readable();
          bufferStream.push(buffer);
          bufferStream.push(null);
          bufferStream.pipe(uploadStream);
        });

        file.stream.on('error', (error) => {
          cb(error);
        });
      })
      .catch((error) => {
        cb(error);
      });
  }

  _removeFile(req, file, cb) {
    if (file.public_id) {
      this.cloudinary.uploader.destroy(file.public_id, (error) => {
        cb(error);
      });
    } else {
      cb(null);
    }
  }
}

// Create Cloudinary storage for Multer
export const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'recyweb',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'],
      resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' },
        { quality: 'auto' }
      ]
    };
  },
});

export default cloudinary;

