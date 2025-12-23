/**
 * Configuration for API and media URLs
 * These are set from environment variables with fallbacks for development
 */

// Get the API base URL from environment, fallback to localhost for development
export const API_BASE_URL = 
  process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Get the media base URL (everything before /media/)
// This is used for images and other media files
const getMediaBaseURL = () => {
  // Extract the base domain from API URL
  // If API_URL is "https://yourdomain.com/api", we want "https://yourdomain.com"
  if (API_BASE_URL.includes('/api')) {
    return API_BASE_URL.replace('/api', '');
  }
  // Fallback: if API_URL is just "http://localhost:8000", use it as-is
  return API_BASE_URL;
};

export const MEDIA_BASE_URL = getMediaBaseURL();

/**
 * Helper function to build complete image URLs
 * Handles three URL formats:
 * 1. Full URLs (http/https) - returns as-is
 * 2. Paths with /media/ prefix - adds only domain
 * 3. Relative paths - adds full domain and /media/
 */
export const buildImageUrl = (url) => {
  if (!url) return null;
  
  // Already a full URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Already has /media/ prefix
  if (url.startsWith('/media/')) {
    return `${MEDIA_BASE_URL}${url}`;
  }
  
  // Relative path - add full prefix
  return `${MEDIA_BASE_URL}/media/${url}`;
};

export default {
  API_BASE_URL,
  MEDIA_BASE_URL,
  buildImageUrl,
};
