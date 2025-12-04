// Vercel serverless function entry point for the HTTP server
import { createExpressApp } from '../build/http-server.js';

// Export the Express app for Vercel
export default createExpressApp();
