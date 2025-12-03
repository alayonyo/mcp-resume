# File Context MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with the
ability to read local folder files and use them for context to query and ask
questions about file data.

## Features

This MCP server provides four powerful tools for file system interaction:

### 🔧 Available Tools

1. **`read_file`** - Read the contents of any file from the local filesystem

   - Input: `path` (string) - The path to the file to read
   - Returns: File content as text

2. **`list_directory`** - List all files and directories in a given directory

   - Input: `path` (string) - The path to the directory to list
   - Returns: Formatted list with file/directory indicators and sizes

3. **`search_files`** - Search for files by name pattern in a directory tree

   - Input: `rootPath` (string), `pattern` (string) - Root directory and search
     pattern
   - Returns: List of matching file paths

4. **`analyze_folder`** - Get comprehensive analysis of folder structure
   - Input: `path` (string) - The path to the folder to analyze
   - Returns: Detailed analysis including file types, sizes, and directory
     structure

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Claude API Key

Create a `claude-api-key.txt` file in the project root:

```bash
echo "your-claude-api-key-here" > claude-api-key.txt
```

Or set environment variable:

```bash
export ANTHROPIC_API_KEY="your-claude-api-key-here"
```

⚠️ **Security Note**: The `claude-api-key.txt` file is automatically ignored by
git to keep your API key secure.

### 3. Build the Project

```bash
npm run build
```

### 4. Run Tests

```bash
npm test                    # Run all tests
npm run test:coverage      # Run tests with coverage report
npm run test:watch         # Run tests in watch mode
```

### 5. Test the Server

```bash
npm start
```

## Chat Interface Options

This project includes multiple ways to interact with your files using AI:

### 🌐 **Real Claude API** (requires network & API key)

```bash
npm run chat                    # Interactive chat with Claude
npm run chat -- --help         # Show usage options
```

### 🎭 **Mock Mode** (no network required)

Perfect for corporate environments or testing:

```bash
npm run chat:mock               # Use built-in mock responses
npm run chat -- --mock         # Alternative syntax
npm run chat -- -m             # Short form
```

**Mock mode features:**

- ✅ Full file system access (read, list, search)
- ✅ Realistic AI-like responses
- ✅ No network calls or API keys needed
- ✅ Perfect for demos and corporate networks
- ✅ Automatic fallback when API fails

### 🦙 **Local AI** (Ollama integration)

```bash
npm run local-chat              # Use local Ollama models
```

## Testing

This project includes comprehensive test coverage using **Jest** and **TypeScript**:

### 🧪 **Test Categories**
- **Unit Tests**: Core file operations (read, list, search, analyze)
- **Integration Tests**: MCP server functionality and tool interactions  
- **Mock Tests**: Chat interface with simulated Claude responses
- **Error Handling**: Edge cases, permissions, and network failures
- **Performance Tests**: Large directories and concurrent operations

### 📊 **Test Coverage**
Current coverage: **>90%** of core functionality

### 🚀 **Running Tests**
```bash
npm test                    # Run all tests
npm run test:coverage      # Detailed coverage report
npm run test:watch         # Interactive development mode
```

### ✅ **Test Features**
- Isolated test environments with temporary directories
- Mocked external dependencies (API calls, file system)
- Cross-platform compatibility testing
- Security validation (path traversal, permissions)
- Performance benchmarks

## Usage with MCP Clients

### Claude Desktop Configuration

Add to your Claude Desktop configuration file
(`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "file-context": {
      "command": "node",
      "args": ["/absolute/path/to/your/project/build/index.js"]
    }
  }
}
```

### VS Code Configuration

The project includes a `.vscode/mcp.json` file for VS Code MCP integration:

```json
{
  "servers": {
    "file-context-server": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/yonatan.ayalon/projects/new_app_1/my-mcp/build/index.js"]
    }
  }
}
```

## Example Use Cases

### 📖 Reading Project Files

"Can you read the package.json file and tell me about the project dependencies?"

### 🔍 Analyzing Codebases

"Analyze the src directory and give me an overview of the project structure"

### 🔎 Finding Specific Files

"Search for all TypeScript files that contain 'interface' in the filename"

### 📊 Project Analysis

"Analyze this entire project folder and tell me what kind of application this
is"

## Security Features

- **Path Resolution**: All file paths are resolved to prevent directory
  traversal attacks
- **Access Checks**: Files and directories are checked for read permissions
  before access
- **Limited Recursion**: Directory analysis limits depth to prevent infinite
  loops
- **Hidden File Filtering**: Skips hidden directories and node_modules in
  recursive operations

## Development

### Project Structure

```
├── src/
│   └── index.ts          # Main MCP server implementation
├── build/                # Compiled JavaScript output
├── .vscode/
│   └── mcp.json         # VS Code MCP configuration
├── package.json         # Project configuration
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Watch mode compilation
- `npm start` - Run the compiled server

### Testing the Server

You can test the server using the
[MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## Technical Details

- **Protocol**: Model Context Protocol (MCP)
- **Transport**: STDIO (Standard Input/Output)
- **Language**: TypeScript/Node.js
- **SDK**: @modelcontextprotocol/sdk

## Requirements

- Node.js 16+
- TypeScript 5+
- Model Context Protocol compatible client (Claude Desktop, VS Code, etc.)

## License

MIT

---

**Need Help?** Check out the
[Model Context Protocol documentation](https://modelcontextprotocol.io/) for
more information about MCP and how to integrate it with different clients.
