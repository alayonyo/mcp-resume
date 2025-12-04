import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// Environment detection
const isDevelopment = process.env.NODE_ENV !== 'production';

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
  app.use(cors());
  app.use(express.json());

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

          // Restrict to api-resources folder only for security
          let restrictedFilePath = params.path;
          if (!restrictedFilePath.startsWith('api-resources/')) {
            restrictedFilePath = `api-resources/${restrictedFilePath}`;
          }

          result = await readFileContent(restrictedFilePath);
          break;

        case 'list_directory':
          if (!params.path) {
            return res.status(400).json({ error: 'Missing path parameter' });
          }

          // Restrict to api-resources folder only
          let restrictedPath = params.path;
          if (
            restrictedPath === '.' ||
            restrictedPath === '' ||
            restrictedPath === '/'
          ) {
            restrictedPath = 'api-resources';
          } else if (
            !restrictedPath.startsWith('api-resources/') &&
            restrictedPath !== 'api-resources'
          ) {
            restrictedPath = `api-resources/${restrictedPath}`;
          }

          const items = await listDirectory(restrictedPath);
          result = items
            .map(
              (item) =>
                `${item.type === 'directory' ? '📁' : '📄'} ${item.name}${
                  item.size !== undefined ? ` (${item.size} bytes)` : ''
                }`
            )
            .join('\\n');
          break;

        case 'search_files':
          if (!params.rootPath || !params.pattern) {
            return res.status(400).json({
              error: 'Missing rootPath or pattern parameter',
            });
          }

          // Restrict to api-resources folder only
          let restrictedRootPath = params.rootPath;
          if (
            restrictedRootPath === '.' ||
            restrictedRootPath === '' ||
            restrictedRootPath === '/'
          ) {
            restrictedRootPath = 'api-resources';
          } else if (
            !restrictedRootPath.startsWith('api-resources/') &&
            restrictedRootPath !== 'api-resources'
          ) {
            restrictedRootPath = `api-resources/${restrictedRootPath}`;
          }

          const files = await searchFiles(restrictedRootPath, params.pattern);
          result =
            files.length > 0
              ? files.map((f) => `📄 ${f}`).join('\\n')
              : `No files found matching "${params.pattern}" in ${restrictedRootPath}`;
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

  // Claude chat endpoint
  app.post('/api/chat', async (req, res) => {
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

      // Automatically load all files from api-resources as context
      let contextMessage = message;
      try {
        const apiResourcesPath = path.resolve('api-resources');
        if (fs.existsSync(apiResourcesPath)) {
          const files = await fs.promises.readdir(apiResourcesPath);
          const fileContents = [];

          for (const file of files) {
            if (file.startsWith('.')) continue; // Skip hidden files

            const filePath = path.join(apiResourcesPath, file);
            const stats = await fs.promises.stat(filePath);

            if (stats.isFile()) {
              try {
                const content = await readFileContent(filePath);
                fileContents.push(`=== File: ${file} ===\\n${content}\\n`);
              } catch (error) {
                console.log(`Could not read ${file}:`, error);
              }
            }
          }

          if (fileContents.length > 0) {
            contextMessage = `${message}\\n\\nAvailable documents and resources:\\n${fileContents.join(
              '\\n'
            )}`;
          }
        }
      } catch (error) {
        console.log('Could not load api-resources context:', error);
      }

      // Call Claude API
      const requestBody = JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `You are an AI assistant for Yonatan Ayalon's professional profile. 

STRICT RULES:
- Maximum 150 characters for main response
- One key highlight only
- End with: "More details? Ask: [topic1, topic2]"

Format: "[Key point]. More details? Ask: [specific areas]"

${contextMessage}`,
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
      const aiResponse = data.content?.[0]?.text || 'No response from Claude';

      res.json({
        response: aiResponse,
        usage: {
          promptTokens: data.usage?.input_tokens,
          completionTokens: data.usage?.output_tokens,
          totalTokens:
            (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
      });
    } catch (error) {
      console.error('Chat API Error:', error);

      // Provide fallback response for network issues
      const fallbackResponse = `Hi! I'm Yonatan's AI assistant. I can help you explore his professional profile and projects. More details? Ask: [experience, skills, projects]`;

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
  });

  return app;
}

// Export for Vercel
export default createApp();
