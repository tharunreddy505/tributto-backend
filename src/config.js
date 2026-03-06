
// Central configuration for API endpoints
// To deploy in production, set VITE_API_URL in your environment variables (e.g. Vercel, Netlify)
// Example: VITE_API_URL=https://api.yourdomain.com

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper to get full API path
export const getApiUrl = (endpoint) => {
    const baseUrl = API_URL.replace(/\/$/, ''); // remove trailing slash if present
    const path = endpoint.replace(/^\//, '');   // remove leading slash if present
    return `${baseUrl}/${path}`;
};

// Helper for media URLs (Local vs S3)
export const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const baseUrl = API_URL.replace(/\/$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};
