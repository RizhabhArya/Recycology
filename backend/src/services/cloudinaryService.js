import cloudinary from '../config/cloudinary.js';
import { InternalServerError } from '../utils/ApiError.js';

/**
 * Upload file to Cloudinary
 */
export const uploadToCloudinary = async (file, folder = 'recyweb') => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: folder,
      resource_type: 'auto',
    });
    return result.secure_url;
  } catch (error) {
    throw new InternalServerError(`Cloudinary upload failed: ${error.message}`);
  }
};

/**
 * Delete file from Cloudinary
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new InternalServerError(`Cloudinary delete failed: ${error.message}`);
  }
};

