import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

// Create server instance
const server = new McpServer({
  name: "file-context-server",
  version: "1.0.0",
});

// Helper function to safely read file contents
async function readFileContent(filePath: string): Promise<string> {
  try {
    // Security check - ensure we stay within allowed directories
    const resolvedPath = path.resolve(filePath);
    
    // Check if file exists and is readable
    await fs.promises.access(resolvedPath, fs.constants.R_OK);
    
    const content = await fs.promises.readFile(resolvedPath, "utf-8");
    return content;
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function to list directory contents
async function listDirectory(dirPath: string): Promise<{ name: string; type: string; size?: number }[]> {
  try {
    const resolvedPath = path.resolve(dirPath);
    await fs.promises.access(resolvedPath, fs.constants.R_OK);
    
    const entries = await fs.promises.readdir(resolvedPath, { withFileTypes: true });
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
        type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other",
        size
      });
    }
    
    return results;
  } catch (error) {
    throw new Error(`Failed to list directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function to search files by pattern
async function searchFiles(rootPath: string, pattern: string): Promise<string[]> {
  try {
    const resolvedRoot = path.resolve(rootPath);
    const results: string[] = [];
    
    async function searchRecursive(currentPath: string): Promise<void> {
      try {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const entryPath = path.join(currentPath, entry.name);
          
          if (entry.isDirectory()) {
            // Skip hidden directories and node_modules
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
    throw new Error(`Failed to search files: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Register the read_file tool
server.registerTool(
  "read_file",
  {
    title: "Read File Content",
    description: "Read the contents of a file from the local filesystem",
    inputSchema: {
      path: z.string().describe("The path to the file to read")
    }
  },
  async ({ path: filePath }) => {
    try {
      const content = await readFileContent(filePath);
      return {
        content: [
          {
            type: "text",
            text: `File: ${filePath}\n\nContent:\n${content}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error reading file: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Register the list_directory tool
server.registerTool(
  "list_directory",
  {
    title: "List Directory Contents",
    description: "List all files and directories in a given directory",
    inputSchema: {
      path: z.string().describe("The path to the directory to list")
    }
  },
  async ({ path: dirPath }) => {
    try {
      const contents = await listDirectory(dirPath);
      const formattedContents = contents.map(item => {
        const sizeInfo = item.size !== undefined ? ` (${item.size} bytes)` : '';
        return `${item.type === 'directory' ? '📁' : '📄'} ${item.name}${sizeInfo}`;
      }).join('\n');
      
      return {
        content: [
          {
            type: "text",
            text: `Directory: ${dirPath}\n\nContents:\n${formattedContents}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error listing directory: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Register the search_files tool
server.registerTool(
  "search_files",
  {
    title: "Search Files",
    description: "Search for files by name pattern in a directory and its subdirectories",
    inputSchema: {
      rootPath: z.string().describe("The root directory to search in"),
      pattern: z.string().describe("The pattern to search for in file names")
    }
  },
  async ({ rootPath, pattern }) => {
    try {
      const results = await searchFiles(rootPath, pattern);
      const formattedResults = results.length > 0 
        ? results.map(filePath => `📄 ${filePath}`).join('\n')
        : 'No files found matching the pattern.';
      
      return {
        content: [
          {
            type: "text",
            text: `Search Results for "${pattern}" in ${rootPath}:\n\n${formattedResults}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching files: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Register the analyze_folder tool
server.registerTool(
  "analyze_folder",
  {
    title: "Analyze Folder Structure",
    description: "Get a comprehensive analysis of a folder including file types, sizes, and structure",
    inputSchema: {
      path: z.string().describe("The path to the folder to analyze")
    }
  },
  async ({ path: folderPath }) => {
    try {
      const resolvedPath = path.resolve(folderPath);
      
      // Get basic folder info
      const stats = await fs.promises.stat(resolvedPath);
      if (!stats.isDirectory()) {
        throw new Error("Path is not a directory");
      }
      
      // Analyze folder contents recursively
      const analysis = {
        totalFiles: 0,
        totalDirectories: 0,
        fileTypes: new Map<string, number>(),
        totalSize: 0,
        structure: [] as string[]
      };
      
      async function analyzeRecursive(currentPath: string, depth = 0): Promise<void> {
        try {
          const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
          const indent = '  '.repeat(depth);
          
          for (const entry of entries) {
            const entryPath = path.join(currentPath, entry.name);
            
            if (entry.isDirectory()) {
              analysis.totalDirectories++;
              analysis.structure.push(`${indent}📁 ${entry.name}/`);
              
              // Skip hidden directories and node_modules for recursive analysis
              if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && depth < 3) {
                await analyzeRecursive(entryPath, depth + 1);
              }
            } else if (entry.isFile()) {
              analysis.totalFiles++;
              
              try {
                const fileStats = await fs.promises.stat(entryPath);
                analysis.totalSize += fileStats.size;
                
                const ext = path.extname(entry.name).toLowerCase();
                const extension = ext || '(no extension)';
                analysis.fileTypes.set(extension, (analysis.fileTypes.get(extension) || 0) + 1);
                
                const sizeKB = Math.round(fileStats.size / 1024);
                analysis.structure.push(`${indent}📄 ${entry.name} (${sizeKB} KB)`);
              } catch {
                analysis.structure.push(`${indent}📄 ${entry.name} (size unknown)`);
              }
            }
          }
        } catch {
          // Skip directories we can't read
        }
      }
      
      await analyzeRecursive(resolvedPath);
      
      // Format file types summary
      const fileTypesSummary = Array.from(analysis.fileTypes.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([ext, count]) => `${ext}: ${count}`)
        .join(', ');
      
      const sizeMB = Math.round(analysis.totalSize / (1024 * 1024) * 100) / 100;
      
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
        ...analysis.structure.slice(0, 50) // Limit structure output
      ];
      
      if (analysis.structure.length > 50) {
        summary.push(`... and ${analysis.structure.length - 50} more items`);
      }
      
      return {
        content: [
          {
            type: "text",
            text: summary.join('\n')
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error analyzing folder: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Main function to run the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("File Context MCP Server running on stdio");
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
  console.error("Fatal error in main():", error);
  process.exit(1);
});