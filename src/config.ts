// Import shared configuration - SINGLE SOURCE OF TRUTH
// This file re-exports the shared config for TypeScript compatibility
import {
  isDevelopment as _isDevelopment,
  corsOptions as _corsOptions,
  allowedOrigins as _allowedOrigins,
} from '../shared-config.js';

export const isDevelopment = _isDevelopment;
export const corsOptions = _corsOptions;
export const allowedOrigins = _allowedOrigins;

console.log(`🔧 Environment: ${isDevelopment ? 'Development' : 'Production'}`);
console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
