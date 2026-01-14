// Type definitions for shared-config.js

interface CorsOptions {
  origin: string[];
  credentials: boolean;
  optionsSuccessStatus: number;
  methods: string[];
  allowedHeaders: string[];
}

export const isDevelopment: boolean;
export const corsOptions: CorsOptions;
export const allowedOrigins: string[];
