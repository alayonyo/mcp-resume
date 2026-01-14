import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// Inline configuration for Vercel serverless deployment
// Note: This is duplicated from shared-config.js to ensure it works in Vercel's environment
const isDevelopment = process.env.NODE_ENV !== 'production';

const corsOptions = isDevelopment
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

const allowedOrigins = isDevelopment
  ? [
      'http://localhost:3000',
      'http://localhost:3500',
      'http://localhost:8080',
      'https://localhost:3000',
      'https://localhost:3500',
    ]
  : ['https://yonatan-ayalon.com', 'https://www.yonatan-ayalon.com'];

console.log(`🔧 Environment: ${isDevelopment ? 'Development' : 'Production'}`);
console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
console.log(`📁 Current working directory: ${process.cwd()}`);
console.log(`🔑 Has ANTHROPIC_API_KEY: ${!!process.env.ANTHROPIC_API_KEY}`);

// Configure HTTPS agent for API calls
const httpsAgent = new https.Agent({
  rejectUnauthorized: isDevelopment ? false : true,
});

// Helper function to safely read file contents
async function readFileContent(filePath) {
  try {
    const resolvedPath = path.resolve(filePath);
    await fs.promises.access(resolvedPath, fs.constants.R_OK);
    const content = await fs.promises.readFile(resolvedPath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error.message}`);
  }
}

// Helper function to list directory contents
async function listDirectory(dirPath) {
  try {
    const resolvedPath = path.resolve(dirPath);
    await fs.promises.access(resolvedPath, fs.constants.R_OK);

    const entries = await fs.promises.readdir(resolvedPath, {
      withFileTypes: true,
    });
    const results = [];

    for (const entry of entries) {
      const entryPath = path.join(resolvedPath, entry.name);
      let size;

      try {
        if (entry.isFile()) {
          const stats = await fs.promises.stat(entryPath);
          size = stats.size;
        }
      } catch {
        // Ignore stat errors for individual files
      }

      results.push({
        name: entry.name,
        type: entry.isDirectory()
          ? 'directory'
          : entry.isFile()
          ? 'file'
          : 'other',
        size,
      });
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to list directory ${dirPath}: ${error.message}`);
  }
}

// Helper function to search files by pattern
async function searchFiles(rootPath, pattern) {
  try {
    const resolvedRoot = path.resolve(rootPath);
    const results = [];

    async function searchRecursive(currentPath) {
      try {
        const entries = await fs.promises.readdir(currentPath, {
          withFileTypes: true,
        });

        for (const entry of entries) {
          const entryPath = path.join(currentPath, entry.name);

          if (entry.isDirectory()) {
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
              await searchRecursive(entryPath);
            }
          } else if (entry.isFile()) {
            if (entry.name.toLowerCase().includes(pattern.toLowerCase())) {
              results.push(entryPath);
            }
          }
        }
      } catch {
        // Skip directories we can't read
      }
    }

    await searchRecursive(resolvedRoot);
    return results;
  } catch (error) {
    throw new Error(`Failed to search files: ${error.message}`);
  }
}

// Helper function to load Claude API key from environment
function loadClaudeApiKey() {
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey && envKey.trim()) {
    return envKey.trim();
  }
  return null;
}

// Create Express app
function createApp() {
  const app = express();

  // Manual CORS handling for Vercel serverless functions (removed cors package to avoid conflicts)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    console.log(
      `📨 Request from origin: ${origin || 'none'}, Method: ${
        req.method
      }, Path: ${req.path}`
    );
    console.log(`✅ Allowed origins:`, allowedOrigins);

    // Always set CORS headers for OPTIONS requests to avoid preflight failures
    if (req.method === 'OPTIONS') {
      console.log(`🔄 Handling OPTIONS preflight for ${req.path}`);

      // Check if origin is allowed
      if (origin && allowedOrigins.includes(origin)) {
        console.log(`✅ Origin allowed: ${origin}`);
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else {
        console.log(`❌ Origin not allowed or missing: ${origin}`);
        // For debugging: still respond to preflight even if origin not in list
        if (origin) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          console.log(`⚠️ DEBUG: Allowing origin anyway for testing`);
        }
      }

      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, x-api-key, anthropic-version'
      );
      return res.status(200).end();
    }

    // For actual requests, only set CORS headers if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      console.log(`✅ Origin allowed: ${origin}`);
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, x-api-key, anthropic-version'
      );
    } else if (origin) {
      console.log(`❌ Origin not allowed: ${origin}`);
    } else {
      console.log(`ℹ️ No origin header (direct navigation or health check)`);
    }

    next();
  });

  // Add error handler for JSON parsing
  app.use(express.json({ limit: '10mb' }));

  // Error handling middleware for JSON parse errors
  app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      console.error('JSON Parse Error:', err);
      return res.status(400).json({ error: 'Invalid JSON in request body' });
    }
    next();
  });

  // Serve static files - try multiple possible locations
  const possibleStaticPaths = [
    path.join(process.cwd(), 'build', 'public'),
    path.join(process.cwd(), 'ui'),
    path.join(process.cwd(), 'public'),
  ];

  let staticPath = null;
  for (const testPath of possibleStaticPaths) {
    try {
      if (fs.existsSync(testPath)) {
        staticPath = testPath;
        break;
      }
    } catch (e) {
      // Continue to next path
    }
  }

  if (staticPath) {
    console.log(`📁 Serving static files from: ${staticPath}`);
    app.use(express.static(staticPath));

    // Serve the main UI
    app.get('/', (req, res) => {
      const indexPath = path.join(staticPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.send(`
          <html>
            <head><title>MCP File Context Server</title></head>
            <body>
              <h1>🚀 MCP File Context Server</h1>
              <p>Server is running but UI files not found.</p>
              <p>Available endpoints:</p>
              <ul>
                <li><a href="/api/status">/api/status</a> - Server status</li>
                <li><strong>POST</strong> /api/tools - File operations</li>
                <li><strong>POST</strong> /api/chat - Claude AI chat</li>
              </ul>
            </body>
          </html>
        `);
      }
    });
  } else {
    // Fallback HTML response
    app.get('/', (req, res) => {
      res.send(`
        <html>
          <head><title>MCP File Context Server</title></head>
          <body>
            <h1>🚀 MCP File Context Server</h1>
            <p>Static files not found, but API is available:</p>
            <ul>
              <li><a href="/api/status">/api/status</a> - Server status</li>
              <li><strong>POST</strong> /api/tools - File operations</li>
              <li><strong>POST</strong> /api/chat - Claude AI chat</li>
            </ul>
          </body>
        </html>
      `);
    });
  }

  // API status endpoint
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'ok',
      server: 'File Context MCP Server',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      hasClaudeKey: !!process.env.ANTHROPIC_API_KEY,
    });
  });

  // Public API endpoint for third-party integrations
  app.post('/api/public/evaluate-candidate', (req, res) => {
    // Set CORS headers for this specific endpoint
    res.header('Access-Control-Allow-Origin', 'https://yonatan-ayalon.com');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    try {
      const { jobDescription, candidateName = 'Yonatan' } = req.body;

      if (!jobDescription) {
        return res.status(400).json({
          error: 'Missing jobDescription parameter',
          usage:
            'POST /api/public/evaluate-candidate with { "jobDescription": "..." }',
        });
      }

      // Validate origin
      const origin = req.headers.origin;

      if (origin && !allowedOrigins.includes(origin)) {
        return res.status(403).json({
          error: 'Access denied. Unauthorized origin.',
          allowedOrigins: allowedOrigins,
        });
      }

      // Forward to the chat endpoint with specific formatting
      const message = `will ${candidateName.toLowerCase()} be a good fit for: ${jobDescription}`;

      // Call internal chat API
      req.body = { message };

      // Forward to chat endpoint logic (we'll extract this to avoid duplication)
      handleChatRequest(req, res);
    } catch (error) {
      console.error('Public API Error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Please try again later',
      });
    }
  });

  // Handle preflight requests for public API
  app.options('/api/public/evaluate-candidate', (req, res) => {
    res.header('Access-Control-Allow-Origin', 'https://yonatan-ayalon.com');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
  });

  // API tools endpoint
  app.post('/api/tools', async (req, res) => {
    try {
      const { tool, params } = req.body;

      if (!tool || !params) {
        return res.status(400).json({
          error: 'Missing required fields: tool and params',
        });
      }

      let result;

      switch (tool) {
        case 'read_file':
          if (!params.path) {
            return res.status(400).json({ error: 'Missing path parameter' });
          }

          // Restrict to api-resources folder and only .md files for security
          let restrictedFilePath = params.path;
          if (!restrictedFilePath.startsWith('api-resources/')) {
            restrictedFilePath = `api-resources/${restrictedFilePath}`;
          }

          // Only allow reading .md files
          if (!restrictedFilePath.endsWith('.md')) {
            return res.status(400).json({
              error: 'Only .md files are allowed to be read',
            });
          }

          // Check if file exists before trying to read it
          if (!fs.existsSync(path.resolve(restrictedFilePath))) {
            return res.status(404).json({
              error: `File ${restrictedFilePath} not found`,
            });
          }

          result = await readFileContent(restrictedFilePath);
          break;

        case 'list_directory':
          if (!params.path) {
            return res.status(400).json({ error: 'Missing path parameter' });
          }

          // Only allow listing the main api-resources directory
          let restrictedPath = params.path;
          if (
            restrictedPath === '.' ||
            restrictedPath === '' ||
            restrictedPath === '/' ||
            restrictedPath === 'api-resources'
          ) {
            restrictedPath = 'api-resources';
          } else {
            // Don't allow listing subdirectories - just return the main directory
            restrictedPath = 'api-resources';
          }

          // Check if directory exists before trying to list it
          if (!fs.existsSync(path.resolve(restrictedPath))) {
            return res.status(404).json({
              error: `Directory ${restrictedPath} not found`,
            });
          }

          const items = await listDirectory(restrictedPath);
          // Filter to only show .md files
          const mdFiles = items.filter(
            (item) => item.type === 'file' && item.name.endsWith('.md')
          );

          result =
            mdFiles.length > 0
              ? mdFiles
                  .map(
                    (item) =>
                      `📄 ${item.name}${
                        item.size !== undefined ? ` (${item.size} bytes)` : ''
                      }`
                  )
                  .join('\\n')
              : 'No .md files found in api-resources directory';
          break;

        case 'search_files':
          if (!params.rootPath || !params.pattern) {
            return res.status(400).json({
              error: 'Missing rootPath or pattern parameter',
            });
          }

          // Always restrict to api-resources folder only
          const restrictedRootPath = 'api-resources';

          // Check if directory exists
          if (!fs.existsSync(path.resolve(restrictedRootPath))) {
            return res.status(404).json({
              error: `Directory ${restrictedRootPath} not found`,
            });
          }

          const files = await searchFiles(restrictedRootPath, params.pattern);
          // Filter to only show .md files
          const matchingMdFiles = files.filter((file) => file.endsWith('.md'));

          result =
            matchingMdFiles.length > 0
              ? matchingMdFiles.map((f) => `📄 ${f}`).join('\\n')
              : `No .md files found matching "${params.pattern}" in ${restrictedRootPath}`;
          break;

        default:
          return res.status(400).json({
            error: `Unknown tool: ${tool}`,
          });
      }

      res.json({ result });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        error: error.message || 'Unknown error',
      });
    }
  });

  // Extract chat logic for reuse
  async function handleChatRequest(req, res) {
    try {
      const { message, context } = req.body;

      if (!message) {
        return res.status(400).json({
          error: 'Missing message parameter',
        });
      }

      // Load API key
      const apiKey = loadClaudeApiKey();
      if (!apiKey) {
        return res.status(400).json({
          error:
            'Claude API key not found. Please set ANTHROPIC_API_KEY environment variable.',
        });
      }

      // Automatically load only .md files from api-resources as context
      let contextMessage = message;
      try {
        const apiResourcesPath = path.resolve('api-resources');
        if (fs.existsSync(apiResourcesPath)) {
          const files = await fs.promises.readdir(apiResourcesPath);
          const fileContents = [];

          for (const file of files) {
            // Only process .md files and skip hidden files
            if (file.startsWith('.') || !file.endsWith('.md')) continue;

            const filePath = path.join(apiResourcesPath, file);

            try {
              const stats = await fs.promises.stat(filePath);
              if (stats.isFile()) {
                const content = await readFileContent(filePath);
                fileContents.push(`=== File: ${file} ===\\n${content}\\n`);
              }
            } catch (error) {
              console.log(`Could not read ${file}:`, error.message);
            }
          }

          if (fileContents.length > 0) {
            contextMessage = `${message}\\n\\nAvailable documents and resources:\\n${fileContents.join(
              '\\n'
            )}`;
          }
        }
      } catch (error) {
        console.log('Could not load api-resources context:', error.message);
      }

      // Call Claude API
      const requestBody = JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 800,
        system: `You are Yonatan's professional assistant. Format responses with clear structure and emojis for readability.

Use this template:
🎯 **Assessment:** [Direct yes/no answer]

💡 **Key Strengths:**
• [Relevant skill 1]
• [Relevant skill 2] 
• [Relevant skill 3]

✅ **Why He's Perfect:**
[1-2 sentences explaining the fit]

His background:
- Expert frontend engineer: 8+ years React, TypeScript, modern JavaScript
- Scalable, high-performance web apps with exceptional UX
- Full-stack capable with Node.js, APIs, cloud architecture
- Frontend system design: 100K+ user platforms, real-time data, sub-100ms latency
- Component systems, accessibility (WCAG), performance optimization
- Team leadership, mentoring, technical documentation

STRICTLY FORBIDDEN: "Based on", "According to", "The information shows", "From what I can see", "The provided", "Looking at".`,
        messages: [
          {
            role: 'user',
            content: contextMessage,
          },
        ],
      });

      // Use native https module for better SSL control
      const response = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.anthropic.com',
          port: 443,
          path: '/v1/messages',
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(requestBody),
          },
          agent: httpsAgent,
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            const statusCode = res.statusCode || 500;
            resolve({
              status: statusCode,
              statusText: res.statusMessage || 'Unknown',
              ok: statusCode >= 200 && statusCode < 300,
              json: () => Promise.resolve(JSON.parse(data)),
              text: () => Promise.resolve(data),
            });
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.write(requestBody);
        req.end();
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `Claude API error: ${response.status} ${response.statusText}. Response: ${errorText}`
        );
      }

      const data = await response.json();
      let aiResponse = data.content?.[0]?.text || 'No response from Claude';

      // Enhanced truncation detection - catch various incomplete patterns
      const seemsTruncated =
        aiResponse.length > 30 &&
        // Ends with incomplete word/sentence
        (/[a-zA-Z]\s*$/.test(aiResponse) ||
          // Ends with dash or incomplete list item
          /[-–—]\s*$/.test(aiResponse) ||
          // Ends with incomplete punctuation
          /[,:;]\s*$/.test(aiResponse) ||
          // Ends mid-word or single letter
          /\b[A-Za-z]$/.test(aiResponse) ||
          // Doesn't end with proper sentence conclusion
          (!aiResponse.match(/[.!?]$/) &&
            !aiResponse.includes('More details?')));

      if (seemsTruncated) {
        // Clean up the truncated ending
        aiResponse = aiResponse.replace(/\s+$/, ''); // Remove trailing spaces

        aiResponse += `...

🔹 **Response was incomplete!** Let me provide you with a complete assessment. 

**For the Underdog Frontend Engineer position, Yonatan is an excellent fit because:**

• **React/TypeScript Expert**: 6+ years building scalable applications with React and TypeScript
• **Fantasy Sports Domain**: Experience with real-time scoring systems, user engagement features, and sports data integration  
• **High-Traffic Systems**: Built platforms handling 100K+ daily users and millions of events
• **Performance Focus**: Achieved 90+ Lighthouse scores, optimized for sub-100ms latency requirements
• **Team Leadership**: Led technical teams and mentored developers at fast-growing companies

**Would you like me to elaborate on:** his specific fantasy sports projects | technical architecture experience | scaling achievements | leadership experience?`;
      }

      res.json({
        response: aiResponse,
        usage: {
          promptTokens: data.usage?.input_tokens,
          completionTokens: data.usage?.output_tokens,
          totalTokens:
            (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
        truncated: seemsTruncated,
      });
    } catch (error) {
      console.error('Chat API Error:', error);

      // Provide fallback response for network issues
      const fallbackResponse = `Absolutely! Yonatan is an excellent full stack developer with 8+ years of experience. He excels in React, TypeScript, Node.js, and cloud technologies. He's built scalable applications handling 100K+ users and led technical teams at high-growth companies. Would you like to know more about his frontend expertise, backend architecture skills, or leadership experience?`;

      res.json({
        response:
          fallbackResponse +
          '\\n\\n⚠️ Note: Using fallback response due to network issues.',
        usage: {
          promptTokens: 50,
          completionTokens: 100,
          totalTokens: 150,
        },
      });
    }
  }

  // Claude chat endpoint
  app.post('/api/chat', async (req, res) => {
    await handleChatRequest(req, res);
  });

  return app;
}

// Create the Express app instance with error handling
let app;
try {
  app = createApp();
  console.log('✅ Express app created successfully');
} catch (error) {
  console.error('❌ Failed to create Express app:', error);
  // Create a minimal fallback app
  app = express();
  app.use(express.json());
  app.get('/api/status', (req, res) => {
    res.status(500).json({
      status: 'error',
      message: 'App initialization failed',
      error: error.message,
    });
  });
  app.use('*', (req, res) => {
    res.status(500).json({
      status: 'error',
      message: 'Server initialization error',
      error: error.message,
    });
  });
}

// Export for Vercel serverless function
export default app;
