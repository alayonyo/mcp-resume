import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import express from 'express';
import cors from 'cors';

// Load environment variables from .env.local file (for local development only)
function loadEnvFile() {
  // Skip file loading in production/serverless environments
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    console.log('📋 Using environment variables from platform configuration');
    return;
  }

  try {
    const envPath = path.resolve('.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=');
          if (key && value) {
            process.env[key] = value;
          }
        }
      }
      console.log('📋 Loaded environment variables from .env.local');
    }
  } catch (error) {
    console.warn('⚠️  Could not load .env.local file:', error);
  }
}

// Load environment variables at startup
loadEnvFile();

// Environment detection
const isDevelopment = process.env.NODE_ENV !== 'production';
const isLocalhost =
  process.env.NODE_ENV !== 'production' ||
  process.argv.includes('--dev') ||
  process.cwd().includes('/Users/') || // Mac development path
  process.cwd().includes('/home/'); // Linux development path

// For development, disable SSL verification globally to work with Node.js fetch
// This is safe for local development but should never be used in production
if (isDevelopment) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Configure HTTPS agent for API calls (for libraries that support it)
const httpsAgent = new https.Agent({
  // For local development, disable SSL verification to avoid certificate issues
  // In production, always validate SSL certificates for security
  rejectUnauthorized: isDevelopment ? false : true,
});

console.log(`🔧 Environment: ${isDevelopment ? 'Development' : 'Production'}`);
console.log(
  `🔐 SSL Verification: ${isDevelopment ? 'Disabled (Dev Mode)' : 'Enabled'}`
);

// Create server instance
const server = new McpServer({
  name: 'file-context-server',
  version: '1.0.0',
});

// Helper function to safely read file contents
async function readFileContent(filePath: string): Promise<string> {
  try {
    const resolvedPath = path.resolve(filePath);
    await fs.promises.access(resolvedPath, fs.constants.R_OK);
    const content = await fs.promises.readFile(resolvedPath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(
      `Failed to read file ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Helper function to list directory contents
async function listDirectory(
  dirPath: string
): Promise<{ name: string; type: string; size?: number }[]> {
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
    throw new Error(
      `Failed to list directory ${dirPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Helper function to search files by pattern
async function searchFiles(
  rootPath: string,
  pattern: string
): Promise<string[]> {
  try {
    const resolvedRoot = path.resolve(rootPath);
    const results: string[] = [];

    async function searchRecursive(currentPath: string): Promise<void> {
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
    throw new Error(
      `Failed to search files: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Register all tools
server.registerTool(
  'read_file',
  {
    title: 'Read File Content',
    description: 'Read the contents of a file from the local filesystem',
    inputSchema: {
      path: z.string().describe('The path to the file to read'),
    },
  },
  async ({ path: filePath }) => {
    try {
      const content = await readFileContent(filePath);
      return {
        content: [
          {
            type: 'text',
            text: `File: ${filePath}\n\nContent:\n${content}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reading file: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

server.registerTool(
  'list_directory',
  {
    title: 'List Directory Contents',
    description: 'List all files and directories in a given directory',
    inputSchema: {
      path: z.string().describe('The path to the directory to list'),
    },
  },
  async ({ path: dirPath }) => {
    try {
      const contents = await listDirectory(dirPath);
      const formattedContents = contents
        .map((item) => {
          const sizeInfo =
            item.size !== undefined ? ` (${item.size} bytes)` : '';
          return `${item.type === 'directory' ? '📁' : '📄'} ${
            item.name
          }${sizeInfo}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Directory: ${dirPath}\n\nContents:\n${formattedContents}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing directory: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

server.registerTool(
  'search_files',
  {
    title: 'Search Files',
    description:
      'Search for files by name pattern in a directory and its subdirectories',
    inputSchema: {
      rootPath: z.string().describe('The root directory to search in'),
      pattern: z.string().describe('The pattern to search for in file names'),
    },
  },
  async ({ rootPath, pattern }) => {
    try {
      const results = await searchFiles(rootPath, pattern);
      const formattedResults =
        results.length > 0
          ? results.map((filePath) => `📄 ${filePath}`).join('\n')
          : 'No files found matching the pattern.';

      return {
        content: [
          {
            type: 'text',
            text: `Search Results for "${pattern}" in ${rootPath}:\n\n${formattedResults}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error searching files: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

server.registerTool(
  'analyze_folder',
  {
    title: 'Analyze Folder Structure',
    description:
      'Get a comprehensive analysis of a folder including file types, sizes, and structure',
    inputSchema: {
      path: z.string().describe('The path to the folder to analyze'),
    },
  },
  async ({ path: folderPath }) => {
    try {
      const resolvedPath = path.resolve(folderPath);
      const stats = await fs.promises.stat(resolvedPath);
      if (!stats.isDirectory()) {
        throw new Error('Path is not a directory');
      }

      const analysis = {
        totalFiles: 0,
        totalDirectories: 0,
        fileTypes: new Map<string, number>(),
        totalSize: 0,
        structure: [] as string[],
      };

      async function analyzeRecursive(
        currentPath: string,
        depth = 0
      ): Promise<void> {
        try {
          const entries = await fs.promises.readdir(currentPath, {
            withFileTypes: true,
          });
          const indent = '  '.repeat(depth);

          for (const entry of entries) {
            const entryPath = path.join(currentPath, entry.name);

            if (entry.isDirectory()) {
              analysis.totalDirectories++;
              analysis.structure.push(`${indent}📁 ${entry.name}/`);

              if (
                !entry.name.startsWith('.') &&
                entry.name !== 'node_modules' &&
                depth < 3
              ) {
                await analyzeRecursive(entryPath, depth + 1);
              }
            } else if (entry.isFile()) {
              analysis.totalFiles++;

              try {
                const fileStats = await fs.promises.stat(entryPath);
                analysis.totalSize += fileStats.size;

                const ext = path.extname(entry.name).toLowerCase();
                const extension = ext || '(no extension)';
                analysis.fileTypes.set(
                  extension,
                  (analysis.fileTypes.get(extension) || 0) + 1
                );

                const sizeKB = Math.round(fileStats.size / 1024);
                analysis.structure.push(
                  `${indent}📄 ${entry.name} (${sizeKB} KB)`
                );
              } catch {
                analysis.structure.push(
                  `${indent}📄 ${entry.name} (size unknown)`
                );
              }
            }
          }
        } catch {
          // Skip directories we can't read
        }
      }

      await analyzeRecursive(resolvedPath);

      const fileTypesSummary = Array.from(analysis.fileTypes.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([ext, count]) => `${ext}: ${count}`)
        .join(', ');

      const sizeMB =
        Math.round((analysis.totalSize / (1024 * 1024)) * 100) / 100;

      const summary = [
        `Folder Analysis: ${folderPath}`,
        ``,
        `📊 Summary:`,
        `• Total Files: ${analysis.totalFiles}`,
        `• Total Directories: ${analysis.totalDirectories}`,
        `• Total Size: ${sizeMB} MB`,
        ``,
        `📁 File Types: ${fileTypesSummary}`,
        ``,
        `🌳 Structure:`,
        ...analysis.structure.slice(0, 50),
      ];

      if (analysis.structure.length > 50) {
        summary.push(`... and ${analysis.structure.length - 50} more items`);
      }

      return {
        content: [
          {
            type: 'text',
            text: summary.join('\n'),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing folder: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

// Create Express app (separate from server startup for Vercel compatibility)
function createExpressApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Serve static UI files
  app.use(express.static(path.join(process.cwd(), 'build', 'public')));

  // Serve the main UI
  app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'build', 'public', 'index.html'));
  });

  // API status endpoint
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'ok',
      server: 'File Context MCP Server',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
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

          // Restrict to api-resources folder only
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

          // Check if path exists before trying to list it
          try {
            await fs.promises.access(restrictedPath, fs.constants.R_OK);
          } catch (error) {
            // Return empty result instead of error for non-existent paths
            result = `Directory not found: ${restrictedPath}`;
            break;
          }

          const items = await listDirectory(restrictedPath);
          result = items
            .map(
              (item) =>
                `${item.type === 'directory' ? '📁' : '📄'} ${item.name}${
                  item.size !== undefined ? ` (${item.size} bytes)` : ''
                }`
            )
            .join('\n');
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
              ? files.map((f) => `📄 ${f}`).join('\n')
              : `No files found matching "${params.pattern}" in ${restrictedRootPath}`;
          break;

        case 'analyze_folder':
          if (!params.path) {
            return res.status(400).json({ error: 'Missing path parameter' });
          }

          // Restrict to api-resources folder only
          let restrictedAnalyzePath = params.path;
          if (
            restrictedAnalyzePath === '.' ||
            restrictedAnalyzePath === '' ||
            restrictedAnalyzePath === '/'
          ) {
            restrictedAnalyzePath = 'api-resources';
          } else if (
            !restrictedAnalyzePath.startsWith('api-resources/') &&
            restrictedAnalyzePath !== 'api-resources'
          ) {
            restrictedAnalyzePath = `api-resources/${restrictedAnalyzePath}`;
          }

          // Reuse the analyze_folder logic from the MCP tool
          const resolvedPath = path.resolve(restrictedAnalyzePath);
          const stats = await fs.promises.stat(resolvedPath);
          if (!stats.isDirectory()) {
            throw new Error('Path is not a directory');
          }

          const analysis = {
            totalFiles: 0,
            totalDirectories: 0,
            fileTypes: new Map<string, number>(),
            totalSize: 0,
            structure: [] as string[],
          };

          async function analyzeRecursive(
            currentPath: string,
            depth = 0
          ): Promise<void> {
            try {
              const entries = await fs.promises.readdir(currentPath, {
                withFileTypes: true,
              });
              const indent = '  '.repeat(depth);

              for (const entry of entries) {
                const entryPath = path.join(currentPath, entry.name);

                if (entry.isDirectory()) {
                  analysis.totalDirectories++;
                  analysis.structure.push(`${indent}📁 ${entry.name}/`);

                  if (
                    !entry.name.startsWith('.') &&
                    entry.name !== 'node_modules' &&
                    depth < 3
                  ) {
                    await analyzeRecursive(entryPath, depth + 1);
                  }
                } else if (entry.isFile()) {
                  analysis.totalFiles++;

                  try {
                    const fileStats = await fs.promises.stat(entryPath);
                    analysis.totalSize += fileStats.size;

                    const ext = path.extname(entry.name).toLowerCase();
                    const extension = ext || '(no extension)';
                    analysis.fileTypes.set(
                      extension,
                      (analysis.fileTypes.get(extension) || 0) + 1
                    );

                    const sizeKB = Math.round(fileStats.size / 1024);
                    analysis.structure.push(
                      `${indent}📄 ${entry.name} (${sizeKB} KB)`
                    );
                  } catch {
                    analysis.structure.push(
                      `${indent}📄 ${entry.name} (size unknown)`
                    );
                  }
                }
              }
            } catch {
              // Skip directories we can't read
            }
          }

          await analyzeRecursive(resolvedPath);

          const fileTypesSummary = Array.from(analysis.fileTypes.entries())
            .sort(([, a], [, b]) => b - a)
            .map(([ext, count]) => `${ext}: ${count}`)
            .join(', ');

          const sizeMB =
            Math.round((analysis.totalSize / (1024 * 1024)) * 100) / 100;

          const summary = [
            `Folder Analysis: ${params.path}`,
            ``,
            `📊 Summary:`,
            `• Total Files: ${analysis.totalFiles}`,
            `• Total Directories: ${analysis.totalDirectories}`,
            `• Total Size: ${sizeMB} MB`,
            ``,
            `📁 File Types: ${fileTypesSummary}`,
            ``,
            `🌳 Structure:`,
            ...analysis.structure.slice(0, 50),
          ];

          if (analysis.structure.length > 50) {
            summary.push(
              `... and ${analysis.structure.length - 50} more items`
            );
          }

          result = summary.join('\n');
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
        error: error instanceof Error ? error.message : 'Unknown error',
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
            'Claude API key not found. Please set ANTHROPIC_API_KEY environment variable in your .env.local file.',
        });
      }

      // Automatically load all files from api-resources as context
      let contextMessage = message;
      try {
        const apiResourcesPath = path.resolve('api-resources');
        const files = await fs.promises.readdir(apiResourcesPath);
        const fileContents: string[] = [];

        for (const file of files) {
          if (file.startsWith('.')) continue; // Skip hidden files

          const filePath = path.join(apiResourcesPath, file);
          const stats = await fs.promises.stat(filePath);

          if (stats.isFile()) {
            try {
              const content = await readFileContent(filePath);
              fileContents.push(`=== File: ${file} ===\n${content}\n`);
            } catch (error) {
              console.log(`Could not read ${file}:`, error);
            }
          }
        }

        if (fileContents.length > 0) {
          contextMessage = `${message}\n\nAvailable documents and resources:\n${fileContents.join(
            '\n'
          )}`;
        }
      } catch (error) {
        console.log('Could not load api-resources context:', error);
      }

      // Call Claude API with SSL handling using manual HTTPS request
      let response;
      try {
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
        const responsePromise = new Promise<any>((resolve, reject) => {
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

        response = await responsePromise;
      } catch (fetchError: any) {
        // Log the exact error for debugging
        console.error('❌ Claude API fetch error:', {
          message: fetchError.message,
          code: fetchError.code,
          cause: fetchError.cause,
          stack: fetchError.stack,
          name: fetchError.name,
        });

        // Handle SSL certificate errors by providing mock response
        if (
          fetchError.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' ||
          fetchError.cause?.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' ||
          fetchError.message?.includes('certificate') ||
          fetchError.message?.includes('SSL') ||
          fetchError.message?.includes('TLS') ||
          fetchError.code === 'ECONNREFUSED'
        ) {
          console.warn(
            '⚠️  Network/SSL issue detected. Providing mock response. NODE_TLS_REJECT_UNAUTHORIZED is set to:',
            process.env.NODE_TLS_REJECT_UNAUTHORIZED
          );

          // Generate intelligent mock response based on context
          let mockResponse =
            "I can see you're working with a file system project. ";

          if (context) {
            mockResponse += `Based on the directory listing, I can see files like ${
              context.includes('package.json')
                ? 'package.json (Node.js project), '
                : ''
            }${context.includes('README.md') ? 'README.md, ' : ''}${
              context.includes('.git') ? 'and a Git repository. ' : ''
            }This appears to be a well-organized development project.`;
          } else {
            if (message.toLowerCase().includes('directory')) {
              mockResponse +=
                "To help you explore your files, you can use commands like 'list current directory' or ask about specific files.";
            } else {
              mockResponse +=
                "I'm here to help you explore and understand your files. What would you like to know about your project?";
            }
          }

          mockResponse +=
            '\n\n⚠️ Note: This is a mock response due to SSL certificate issues. To get real Claude responses, please check your network configuration.';

          return res.json({
            response: mockResponse,
            usage: {
              promptTokens: 50,
              completionTokens: 100,
              totalTokens: 150,
            },
          });
        }
        throw fetchError;
      }

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
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Helper function to load Claude API key from environment
  function loadClaudeApiKey(): string | null {
    const envKey = process.env.ANTHROPIC_API_KEY;
    if (envKey && envKey.trim()) {
      return envKey.trim();
    }
    return null;
  }

  // Simple JSON-RPC over HTTP handler
  app.post('/mcp', async (req, res) => {
    try {
      // For now, create a simple HTTP transport simulation
      const transport = new StdioServerTransport();
      await server.connect(transport);

      res.json({
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message:
            'HTTP transport not fully implemented yet. Use STDIO mode for now.',
        },
        id: req.body.id || null,
      });
    } catch (error) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
        },
        id: req.body.id || null,
      });
    }
  });

  // For serverless functions (like Vercel), just return the app
  // Don't call app.listen() - that's handled by the serverless platform
  console.log('🚀 Express app created for serverless deployment');

  return app;
}

// Function to start the server locally (with app.listen)
async function startServer() {
  const app = createExpressApp();
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    const host = `localhost:${port}`;
    console.log(
      `🚀 File Context MCP Server with Interactive UI running on http://${host}`
    );
    console.log(`📡 MCP endpoint: http://${host}/mcp`);
    console.log(`🎨 Interactive UI: http://${host}`);
    console.log(`📋 API endpoint: http://${host}/api/tools`);
    console.log(
      `\n💡 Open http://localhost:${port} in your browser to use the interactive interface!`
    );
    console.log(
      `\n🔧 For MCP clients, use STDIO mode with: npm run start:stdio`
    );
  });
}

// Main function - support both STDIO and HTTP
async function main() {
  const mode = process.argv[2] || 'stdio';

  if (mode === 'http') {
    // HTTP mode for browser access
    await startServer();
  } else {
    // STDIO mode for local clients
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('File Context MCP Server running on stdio');
  }
}

// Export the app creation function for Vercel
export { createExpressApp };

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down gracefully...');
  process.exit(0);
});

// Only run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
  });
}
