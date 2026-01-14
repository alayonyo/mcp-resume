// Shared configuration for CORS and environment settings
// Used by both api/index.js (Vercel) and src/config.ts (local) - SINGLE SOURCE OF TRUTH

export const isDevelopment = process.env.NODE_ENV !== 'production';

export const corsOptions = isDevelopment
  ? {
      origin: [
        'http://localhost:3000',
        'http://localhost:3500',
        'http://localhost:8080',
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

export const allowedOrigins = isDevelopment
  ? [
      'http://localhost:3000',
      'http://localhost:3500',
      'http://localhost:8080',
      'https://localhost:3000',
      'https://localhost:3500',
    ]
  : ['https://yonatan-ayalon.com', 'https://www.yonatan-ayalon.com'];
