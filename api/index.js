// Load environment variables from .env.local file for serverless environment
function loadEnvFile() {
  try {
    // In serverless environment, environment variables should be set via Vercel dashboard
    // This is a fallback for local testing
    console.log('📋 Environment variables loaded from Vercel configuration');
  } catch (error) {
    console.warn('⚠️  Could not load .env.local file:', error);
  }
}

// Load environment variables at startup
loadEnvFile();

import { createExpressApp } from '../build/http-server.js';

// Export the Express app for Vercel serverless functions
export default createExpressApp();
