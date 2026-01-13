// Shared configuration for CORS and environment settings
// Used by both api/index.js (Vercel) and src/http-server.ts (local)

export const isDevelopment = process.env.NODE_ENV !== 'production';

interface CorsOptions {
  origin: string[];
  credentials: boolean;
  optionsSuccessStatus: number;
  methods: string[];
  allowedHeaders: string[];
}

// CORS configuration - only enabled in development
export const corsOptions: CorsOptions = isDevelopment
  ? {
      origin: [
        'http://localhost:3000',
        'http://localhost:3500',
        'https://localhost:3000',
        'https://localhost:3500',
      ],
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-api-key',
        'anthropic-version',
      ],
    }
  : {
      // Production: strict CORS for production domains only
      origin: ['https://yonatan-ayalon.com', 'https://www.yonatan-ayalon.com'],
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-api-key',
        'anthropic-version',
      ],
    };

// Allowed origins for validation
export const allowedOrigins: string[] = isDevelopment
  ? [
      'http://localhost:3000',
      'http://localhost:3500',
      'https://localhost:3000',
      'https://localhost:3500',
    ]
  : ['https://yonatan-ayalon.com', 'https://www.yonatan-ayalon.com'];

console.log(`🔧 Environment: ${isDevelopment ? 'Development' : 'Production'}`);
console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
