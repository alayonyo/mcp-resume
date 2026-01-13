# File Context MCP Server with Recruitment Assistant

A comprehensive Model Context Protocol (MCP) server with integrated Claude AI
recruitment assistant. This application provides AI-powered file operations with
a specialized focus on candidate evaluation and technical assessment, featuring
secure API endpoints and professional profile management.

## Features

### 🤖 AI Recruitment Assistant

- **Claude AI Integration**: Powered by Anthropic's Claude for intelligent
  candidate evaluation
- **Professional Profile Analysis**: Specialized context using Yonatan Ayalon's
  15+ years of senior engineering experience
- **Technical Assessment**: Expert evaluation of candidates across frontend,
  backend, and full-stack technologies
- **Secure API Access**: CORS-protected endpoints for third-party integrations

### 🔧 File System Tools

1. **`read_file`** - Read any file from the local filesystem

   - Input: `path` (string) - File path to read
   - Returns: File content with syntax highlighting support

2. **`list_directory`** - List directory contents with metadata

   - Input: `path` (string) - Directory path to list
   - Returns: Files and folders with sizes and type indicators

3. **`search_files`** - Advanced file pattern matching

   - Input: `rootPath` (string), `pattern` (string) - Search location and
     pattern
   - Returns: Matching file paths across directory tree

4. **`analyze_folder`** - Comprehensive project analysis
   - Input: `path` (string) - Folder to analyze
   - Returns: Structure analysis, file types, and project insights

### 🌐 API Endpoints

- **`/api/chat`** - Claude AI chat interface with file context
- **`/api/tools`** - Direct file operations API
- **`/api/evaluate-candidate`** - Public recruitment evaluation endpoint
- **CORS Security**: Restricted to `localhost:3000` and
  `https://yonatan-ayalon.com`

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

**For corporate firewalls:** If you're behind a corporate proxy/firewall (like
Zscaler), configure npm to use a mirror registry:

```bash
# Configure npm to use mirror registry (for corporate firewalls)
npm config set registry https://registry.npmmirror.com
```

### 2. Configure Claude API Key

Set your Anthropic/Claude API key as an environment variable. Create a
`.env.local` file in the project root:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-api03-your-actual-api-key-here" > .env.local
```

**Note**: This project works exclusively with **Anthropic's Claude API**. You'll
need an API key from [Anthropic](https://console.anthropic.com/) for full
functionality.

Alternatively, set the environment variable directly:

```bash
export ANTHROPIC_API_KEY="your-claude-api-key-here"
```

⚠️ **Security Note**: The `.env.local` file is automatically ignored by git to
keep your API key secure. The application will run with limited functionality
without an API key.

### 3. Build the Project

```bash
npm run build
```

### 4. Launch the Application

#### 🚀 Production Server (Recommended)

```bash
npm run start:http
```

**Access Points:**

- **Web Interface**: http://localhost:3000
- **API Endpoints**: http://localhost:3000/api/\*
- **MCP Server**: http://localhost:3000/mcp

#### 🛠️ Development Mode

```bash
npm run start:http:prod    # Production build
npm run start             # HTTP server mode
npm run dev              # Development with watch mode
```

### 5. Run Tests

```bash
npm test                    # Run all tests
npm run test:coverage      # Run tests with coverage report
npm run test:watch         # Run tests in watch mode
```

## Application Interfaces

### 🎨 **Interactive Web UI** (Primary Interface)

Access the full-featured web interface at **http://localhost:3000**

**Key Features:**

- **🤖 AI Recruitment Assistant**: Claude-powered candidate evaluation with
  professional context
- **🗂️ File Operations Dashboard**: Visual file management with drag-and-drop
  support
- **💬 Natural Language Queries**: Ask questions about code, files, and project
  structure
- **📊 Real-time Analysis**: Live project analysis and code insights
- **🔒 Secure API Access**: CORS-protected endpoints for third-party
  integrations
- **📱 Responsive Design**: Optimized for desktop, tablet, and mobile devices

### 🔗 **API Endpoints**

#### Chat & AI Features

```bash
POST /api/chat              # Claude AI conversation with file context
GET  /api/evaluate-candidate # Public recruitment evaluation endpoint
```

#### File Operations

```bash
POST /api/tools             # Direct access to all file system tools
                           # Supports: read_file, list_directory, search_files, analyze_folder
```

#### CORS Security

- **Allowed Origins**: `http://localhost:3000`, `https://yonatan-ayalon.com`
- **Third-party Integration**: Use `/api/evaluate-candidate` for external
  recruitment tools

### 💬 **Command Line Interfaces**

#### Interactive Terminal Chat

```bash
npm run chat                # Claude AI chat in terminal
npm run chat:mock          # Mock mode (no API key required)
npm run local-chat         # Local Ollama integration
```

#### MCP Protocol Support

```bash
npm run start:stdio        # Standard MCP server mode
```

## Third-Party Integration

### 🔗 **Public API Usage**

For external recruitment tools and applications:

```javascript
// Candidate evaluation endpoint
const response = await fetch('http://localhost:3000/api/evaluate-candidate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'https://yonatan-ayalon.com' // Must be from allowed origins
  },
  body: JSON.stringify({
    candidateData: {
      name: "Candidate Name",
      resume: "resume content...",
      portfolio: "portfolio links..."
    },
    evaluationCriteria: ["technical skills", "experience", "culture fit"]
  })
});

const evaluation = await response.json();
```

### 🛡️ **Security & CORS**

- **Restricted Access**: Only `localhost:3000` and `https://yonatan-ayalon.com`
- **API Security**: All endpoints protected with CORS validation
- **File Access**: Limited to markdown files in `/api-resources/` directory
- **Rate Limiting**: Built-in protection against abuse

## Testing & Development

### 🧪 **Comprehensive Test Suite**

```bash
npm test                    # Run all tests
npm run test:coverage      # Coverage report (>90% coverage)
npm run test:watch         # Development watch mode
```

**Test Categories:**

- **Unit Tests**: File operations and API endpoints
- **Integration Tests**: Claude AI integration and MCP functionality
- **Security Tests**: CORS, path validation, access controls
- **Performance Tests**: Large file handling and concurrent operations
- **Mock Tests**: Offline functionality without API keys

## MCP Client Integration

### Claude Desktop Configuration

Add to your Claude Desktop configuration file
(`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "file-context-recruitment": {
      "command": "node",
      "args": ["/absolute/path/to/your/project/build/index.js"]
    }
  }
}
```

### VS Code MCP Extension

Configure the VS Code MCP extension with `.vscode/mcp.json`:

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

### Alternative: HTTP MCP Mode

For network-based MCP connections:

```bash
npm run start:http
# Connect MCP clients to: http://localhost:3000/mcp
```

## Use Cases & Examples

### 🤖 **AI Recruitment Assistant**

**Candidate Evaluation:**

- "Evaluate this candidate's React experience based on their portfolio"
- "Assess technical skills for a senior frontend position"
- "Compare multiple candidates for full-stack developer role"

**Technical Assessment:**

- "Review this code sample and provide feedback"
- "What's missing from this candidate's skillset for our team?"
- "Rate this developer's experience with modern JavaScript frameworks"

### 🗂️ **File Operations**

**Project Analysis:**

- "Analyze this codebase and identify the tech stack"
- "What's the overall architecture of this application?"
- "Find all configuration files in this project"

**Code Review:**

- "Read the main components and explain the application structure"
- "Search for all test files and assess coverage"
- "Analyze the API endpoints in this project"

### 🔍 **Natural Language Queries**

**Simple Operations:**

- "What files are in the src directory?"
- "Read the package.json and explain the dependencies"
- "Find all TypeScript files with interfaces"

**Complex Analysis:**

- "Compare the frontend and backend code quality"
- "Identify potential security issues in the codebase"
- "Suggest improvements for performance optimization"

## Security Features

### 🛡️ **API Security**

- **CORS Protection**: Restricted to `localhost:3000` and
  `https://yonatan-ayalon.com`
- **Path Validation**: All file paths resolved to prevent directory traversal
- **File Access Control**: Limited to markdown files in `/api-resources/`
- **Environment Isolation**: Development/production mode security controls

### 🔒 **File System Security**

- **Permission Checks**: Read permissions validated before file access
- **Recursive Limits**: Directory analysis depth limited to prevent loops
- **Hidden File Filtering**: Automatic exclusion of system/hidden files
- **Sanitized Paths**: All inputs sanitized and validated

## Development

### 📁 **Project Structure**

```
├── api/
│   └── index.js          # Express API server with Claude integration
├── src/
│   ├── index.ts          # Main MCP server implementation
│   ├── http-server.ts    # HTTP server with UI
│   ├── chat-interface.ts # Terminal chat interface
│   ├── local-chat.ts     # Local Ollama integration
│   └── file-operations.ts # Core file system tools
├── api-resources/
│   ├── yonatan-profile.md # Professional recruitment profile
│   └── projects-achievements.md # Technical achievements
├── build/                # Compiled JavaScript output
├── ui/                   # Web interface assets
├── tests/               # Comprehensive test suite
└── coverage/           # Test coverage reports
```

### 🔧 **Available Scripts**

**Production:**

- `npm run build` - Build server and UI components
- `npm run start:http` - Launch production HTTP server
- `npm run start:http:prod` - Production mode with optimizations

**Development:**

- `npm run dev` - TypeScript watch mode
- `npm run chat` - Terminal chat interface
- `npm run local-chat` - Local AI integration

**Testing:**

- `npm test` - Run complete test suite
- `npm run test:coverage` - Generate coverage reports
- `npm run test:watch` - Interactive test development

### 🔍 **Testing & Debugging**

Use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) for
protocol debugging:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## Technical Specifications

### 🏗️ **Architecture**

- **Core Protocol**: Model Context Protocol (MCP) v1.24.2
- **Transport Layers**: STDIO, HTTP REST API
- **Backend**: Node.js + Express with TypeScript
- **Frontend**: Vanilla JavaScript with modern CSS
- **AI Integration**: Anthropic Claude API
- **Database**: File-based (markdown profiles)

### 🔧 **Technology Stack**

- **Runtime**: Node.js 16+
- **Language**: TypeScript 5+
- **Framework**: Express.js with CORS
- **Testing**: Jest with TypeScript support
- **Build**: Native TypeScript compiler
- **Security**: Path validation, CORS, environment controls

### 📋 **System Requirements**

- **Node.js**: 16.0.0 or higher
- **Memory**: 512MB RAM minimum
- **Storage**: 100MB for dependencies and build artifacts
- **Network**: Internet access for Claude API (optional for file operations)
- **OS**: macOS, Linux, or Windows with Node.js support

### 🌐 **Deployment**

- **Local Development**: `npm run start:http`
- **Production Ready**: Environment variable configuration
- **Docker Support**: Containerization ready
- **Cloud Deployment**: Compatible with Vercel, Heroku, AWS

## License

MIT License - Open source recruitment assistant and file context server.

---

## Support & Documentation

- **MCP Protocol**:
  [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- **Claude API**: [Anthropic API Documentation](https://docs.anthropic.com/)
- **Issues**: Create GitHub issues for bug reports and feature requests
- **Professional Contact**: Integration support available through
  [yonatan-ayalon.com](https://yonatan-ayalon.com)

### 🚀 **Quick Deploy**

1. **Clone & Install**: `git clone [repo] && npm install`
2. **Configure API**: Add `ANTHROPIC_API_KEY` to `.env.local`
3. **Build & Run**: `npm run build && npm run start:http`
4. **Access**: Open http://localhost:3000
