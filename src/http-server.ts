import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import cors from 'cors';

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

// Main function - support both STDIO and HTTP
async function main() {
  const mode = process.argv[2] || 'stdio';

  if (mode === 'http') {
    // HTTP mode for browser access
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Serve a simple test page
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>File Context MCP Server</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .tool { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .endpoint { color: #0066cc; font-family: monospace; }
            .status { color: #28a745; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>🗂️ File Context MCP Server</h1>
          <p><strong>Status:</strong> <span class="status">✅ Running on HTTP</span></p>
          <p><strong>MCP Endpoint:</strong> <span class="endpoint">http://localhost:3000/mcp</span></p>
          
          <h2>Available Tools:</h2>
          <div class="tool">
            <h3>📖 read_file</h3>
            <p>Read the contents of any file from the local filesystem</p>
            <code>Input: {"path": "/path/to/file.txt"}</code>
          </div>
          <div class="tool">
            <h3>📁 list_directory</h3>
            <p>List all files and directories in a given directory</p>
            <code>Input: {"path": "/path/to/directory"}</code>
          </div>
          <div class="tool">
            <h3>🔍 search_files</h3>
            <p>Search for files by name pattern in a directory tree</p>
            <code>Input: {"rootPath": "/path/to/search", "pattern": "*.js"}</code>
          </div>
          <div class="tool">
            <h3>📊 analyze_folder</h3>
            <p>Get comprehensive analysis of folder structure, file types, and sizes</p>
            <code>Input: {"path": "/path/to/analyze"}</code>
          </div>
          
          <h2>Connect to Browser-Based MCP Clients:</h2>
          <ul>
            <li><strong><a href="https://claude.ai" target="_blank">Claude.ai</a></strong> - Add as remote MCP server</li>
            <li><strong><a href="https://modelcontextchat.com" target="_blank">ModelContextChat</a></strong> - Web MCP client</li>
            <li><strong><a href="https://glama.ai/chat" target="_blank">Glama Chat</a></strong> - MCP-enabled chat</li>
          </ul>
          
          <h2>How to Connect:</h2>
          <ol>
            <li>Copy this URL: <code>http://localhost:3000/mcp</code></li>
            <li>Paste it into your MCP client's server configuration</li>
            <li>Start asking questions about your files!</li>
          </ol>
        </body>
        </html>
      `);
    });

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

    const port = 3000;
    app.listen(port, () => {
      console.log(
        `🚀 File Context MCP Server running on http://localhost:${port}`
      );
      console.log(`📡 MCP endpoint: http://localhost:${port}/mcp`);
      console.log(`🌐 Open http://localhost:${port} in your browser`);
      console.log(
        `\n💡 Note: For full functionality, use STDIO mode with: npm run start:stdio`
      );
    });
  } else {
    // STDIO mode for local clients
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('File Context MCP Server running on stdio');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down gracefully...');
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
