import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import {
  readFileContent,
  listDirectory,
  searchFiles,
  analyzeFolder,
  summarizeFile,
  summarizeAllFiles,
  analyzeFileSubjects,
  extractKeyInformation,
  extractExperienceLevel,
  extractReactExperience,
  extractTypescriptExperience,
  extractArchitectureExperience,
  extractPerformanceExperience,
  extractTestingExperience,
  extractLeadershipExperience,
  extractCurrentRoleDetails,
} from './file-operations.js';

export class FileContextChat {
  private apiKey?: string;
  private conversation: Array<{ role: 'user' | 'assistant'; content: string }> =
    [];
  private useMockApi: boolean;

  constructor(useMockApi: boolean = false) {
    this.useMockApi = useMockApi;

    if (!useMockApi) {
      this.apiKey = this.loadApiKey();
      if (!this.apiKey) {
        // No API key available, enable mock mode
        console.log('🎭 Enabling mock mode due to missing API key');
        this.useMockApi = true;
      }
    }
  }

  private generateMockResponse(
    message: string,
    functionResults?: string,
    executedCalls?: Array<{ name: string; args: any; result: string }>
  ): string {
    const lower = message.toLowerCase();

    // Handle greetings
    if (
      lower.includes('hello') ||
      lower.includes('hi') ||
      lower.includes('hey')
    ) {
      return "Hello! I'm Yonatan's AI assistant, here to help you learn about his professional background. I have access to his resume and can answer questions about his experience, skills, and career journey. What would you like to know about Yonatan?";
    }

    // If we have function results, provide intelligent analysis
    if (functionResults && executedCalls) {
      let analysis =
        "I've analyzed your file system data. Here's what I found:\n\n";

      for (const call of executedCalls) {
        switch (call.name) {
          case 'read_file':
            analysis += this.analyzeFileContent(call.args.path, call.result);
            break;
          case 'list_directory':
            analysis += this.analyzeDirectoryListing(
              call.args.path,
              call.result
            );
            break;
          case 'search_files':
            analysis += this.analyzeSearchResults(
              call.args.pattern,
              call.result
            );
            break;
          case 'analyze_folder':
            analysis += this.analyzeFolderStructure(call.result);
            break;
        }
        analysis += '\n';
      }

      analysis +=
        '\n💡 This analysis is based on actual file system data. What specific aspect would you like me to explain further?';
      return analysis;
    }

    // Fallback for general questions
    if (
      lower.includes('analyze') ||
      lower.includes('project') ||
      lower.includes('structure')
    ) {
      return "I'd love to tell you more about Yonatan! Try asking me something like 'Tell me about Yonatan's React experience' or 'What makes Yonatan a strong senior engineer?' - I have detailed insights about his professional background.";
    }

    return "👋 Hi! I'm Yonatan's AI assistant, here to help you get to know him better. Ask me anything about his professional journey!\n\n💼 **Great Questions for Recruiters:**\n• 'How many years of experience does Yonatan have?'\n• 'Tell me about Yonatan's React expertise'\n• 'What TypeScript experience does Yonatan bring?'\n• 'Does Yonatan have micro frontend architecture experience?'\n• 'What performance optimization work has Yonatan done?'\n• 'Has Yonatan worked with A/B testing and experimentation?'\n• 'What leadership experience does Yonatan have?'\n• 'Tell me about Yonatan's current role at Vimeo'\n\n📋 **Career Deep-Dive:**\n• 'Walk me through Yonatan's career progression'\n• 'What are Yonatan's strongest technical skills?'\n• 'What projects is Yonatan most proud of?'\n• 'What's Yonatan's educational background?'\n\n✨ **Ask me anything!** I know Yonatan's background inside and out - from technical expertise to career highlights and everything in between.\n\n🎯 *I'm here to help you understand why Yonatan would be a great fit for your team!*";
  }

  private analyzeFileContent(filePath: string, result: string): string {
    const content = result.split('\n\n').slice(1).join('\n\n'); // Remove the "File content of..." prefix

    if (filePath.endsWith('package.json')) {
      return this.analyzePackageJson(content);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
      return this.analyzeCodeFile(filePath, content);
    } else if (filePath.endsWith('.md')) {
      return this.analyzeMarkdownFile(filePath, content);
    } else if (filePath.endsWith('.json')) {
      return this.analyzeJsonFile(filePath, content);
    } else {
      return `📄 **${filePath}**\n- File size: ${
        content.length
      } characters\n- Content type: ${this.detectFileType(
        content
      )}\n- First few lines preview available`;
    }
  }

  private analyzePackageJson(content: string): string {
    try {
      const pkg = JSON.parse(content);
      let analysis = `📦 **Package.json Analysis**\n`;
      analysis += `- Project: ${pkg.name || 'Unknown'} v${
        pkg.version || 'Unknown'
      }\n`;
      analysis += `- Description: ${pkg.description || 'No description'}\n`;

      if (pkg.dependencies) {
        const depCount = Object.keys(pkg.dependencies).length;
        analysis += `- Dependencies: ${depCount} packages\n`;
        const mainDeps = Object.keys(pkg.dependencies).slice(0, 3).join(', ');
        if (depCount > 3) {
          analysis += `  - Key dependencies: ${mainDeps}... (+${
            depCount - 3
          } more)\n`;
        } else {
          analysis += `  - Dependencies: ${mainDeps}\n`;
        }
      }

      if (pkg.devDependencies) {
        analysis += `- Dev Dependencies: ${
          Object.keys(pkg.devDependencies).length
        } packages\n`;
      }

      if (pkg.scripts) {
        analysis += `- Available Scripts: ${Object.keys(pkg.scripts).join(
          ', '
        )}\n`;
      }

      return analysis;
    } catch (e) {
      return `📄 **package.json** - Invalid JSON format detected`;
    }
  }

  private analyzeCodeFile(filePath: string, content: string): string {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0).length;

    let analysis = `💻 **${path.basename(filePath)}** (${
      filePath.endsWith('.ts') ? 'TypeScript' : 'JavaScript'
    })\n`;
    analysis += `- Lines of code: ${nonEmptyLines}/${lines.length} (excluding empty lines)\n`;

    // Analyze imports/requires
    const imports = lines.filter(
      (line) =>
        line.trim().startsWith('import ') || line.trim().startsWith('require(')
    ).length;
    if (imports > 0) {
      analysis += `- Imports: ${imports} modules imported\n`;
    }

    // Analyze exports
    const exports = lines.filter(
      (line) => line.includes('export ') || line.includes('module.exports')
    ).length;
    if (exports > 0) {
      analysis += `- Exports: ${exports} items exported\n`;
    }

    // Analyze functions/classes
    const functions = lines.filter(
      (line) =>
        line.includes('function ') ||
        (line.includes('const ') && line.includes('=>'))
    ).length;
    const classes = lines.filter((line) =>
      line.trim().startsWith('class ')
    ).length;
    if (functions > 0)
      analysis += `- Functions: ${functions} functions defined\n`;
    if (classes > 0) analysis += `- Classes: ${classes} classes defined\n`;

    // Analyze comments
    const comments = lines.filter(
      (line) => line.trim().startsWith('//') || line.trim().startsWith('/*')
    ).length;
    if (comments > 0) analysis += `- Comments: ${comments} comment lines\n`;

    return analysis;
  }

  private analyzeMarkdownFile(filePath: string, content: string): string {
    const lines = content.split('\n');
    const headers = lines.filter((line) => line.trim().startsWith('#')).length;
    const links = (content.match(/\[.*?\]\(.*?\)/g) || []).length;
    const codeBlocks = (content.match(/```/g) || []).length / 2;

    let analysis = `📝 **${path.basename(filePath)}** (Markdown)\n`;
    analysis += `- Headers: ${headers} section headers\n`;
    if (links > 0) analysis += `- Links: ${links} links found\n`;
    if (codeBlocks > 0)
      analysis += `- Code blocks: ${Math.floor(codeBlocks)} code examples\n`;
    analysis += `- Length: ${lines.length} lines\n`;

    return analysis;
  }

  private analyzeJsonFile(filePath: string, content: string): string {
    try {
      const data = JSON.parse(content);
      const keys =
        typeof data === 'object' && data !== null
          ? Object.keys(data).length
          : 0;

      let analysis = `📋 **${path.basename(filePath)}** (JSON Configuration)\n`;
      analysis += `- Structure: ${typeof data} with ${keys} top-level keys\n`;
      if (keys > 0 && typeof data === 'object') {
        const mainKeys = Object.keys(data).slice(0, 5).join(', ');
        analysis += `- Main keys: ${mainKeys}${keys > 5 ? '...' : ''}\n`;
      }

      return analysis;
    } catch (e) {
      return `📋 **${path.basename(filePath)}** - Invalid JSON format`;
    }
  }

  private analyzeDirectoryListing(dirPath: string, result: string): string {
    const lines = result.split('\n').filter((line) => line.trim().length > 0);
    const contentLines = lines.slice(2); // Skip "Contents of..." header

    const directories = contentLines.filter((line) =>
      line.includes('📁')
    ).length;
    const files = contentLines.filter((line) => line.includes('📄')).length;

    let analysis = `📂 **Directory: ${dirPath}**\n`;
    analysis += `- Total items: ${directories + files}\n`;
    analysis += `- Directories: ${directories}\n`;
    analysis += `- Files: ${files}\n`;

    // Analyze file types
    const fileTypes: { [key: string]: number } = {};
    contentLines.forEach((line) => {
      if (line.includes('📄')) {
        const fileName = line.split('📄 ')[1];
        if (fileName) {
          const ext = path.extname(fileName).toLowerCase();
          fileTypes[ext || 'no extension'] =
            (fileTypes[ext || 'no extension'] || 0) + 1;
        }
      }
    });

    if (Object.keys(fileTypes).length > 0) {
      analysis += `- File types: ${Object.entries(fileTypes)
        .map(([ext, count]) => `${ext}(${count})`)
        .join(', ')}\n`;
    }

    return analysis;
  }

  private analyzeSearchResults(pattern: string, result: string): string {
    const lines = result.split('\n').filter((line) => line.includes('📄'));

    let analysis = `🔍 **Search Results for "${pattern}"**\n`;
    analysis += `- Found: ${lines.length} matching files\n`;

    if (lines.length > 0) {
      // Group by directory
      const dirs: { [key: string]: number } = {};
      lines.forEach((line) => {
        const filePath = line.split('📄 ')[1];
        if (filePath) {
          const dir = path.dirname(filePath);
          dirs[dir] = (dirs[dir] || 0) + 1;
        }
      });

      analysis += `- Directories: ${
        Object.keys(dirs).length
      } different directories\n`;
      const topDirs = Object.entries(dirs)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([dir, count]) => `${dir}(${count})`)
        .join(', ');
      analysis += `- Top locations: ${topDirs}\n`;
    }

    return analysis;
  }

  private analyzeFolderStructure(result: string): string {
    const lines = result.split('\n');
    let analysis = `📊 **Folder Structure Analysis**\n`;

    // Extract the summary info
    lines.forEach((line) => {
      if (
        line.includes('Total items:') ||
        line.includes('Directories:') ||
        line.includes('Files:') ||
        line.startsWith('  ')
      ) {
        analysis += `- ${line.trim()}\n`;
      }
    });

    return analysis;
  }

  private detectFileType(content: string): string {
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      return 'JSON-like';
    } else if (
      content.includes('function') ||
      content.includes('const ') ||
      content.includes('import ')
    ) {
      return 'Code file';
    } else if (content.includes('#') && content.includes('\n')) {
      return 'Markdown-like';
    } else {
      return 'Text file';
    }
  }

  async testConnection(): Promise<boolean> {
    if (this.useMockApi) {
      console.log('🎭 Mock mode - simulating successful connection');
      return true;
    }

    if (!this.apiKey) {
      console.log('⚠️  No API key available - connection test failed');
      return false;
    }

    try {
      console.log('🔍 Testing Claude API connection...');
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      if (response.ok) {
        console.log('✅ Claude API connection successful!');
        return true;
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(
          `❌ API test failed: ${response.status} ${response.statusText}`
        );
        console.error(`Response: ${errorText}`);
        return false;
      }
    } catch (error) {
      console.error(
        '❌ Network error during API test:',
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }

  private loadApiKey(): string | undefined {
    // Try environment variable
    const envKey = process.env.ANTHROPIC_API_KEY;
    if (envKey && envKey.trim()) {
      console.log(
        '🔑 Loaded API key from ANTHROPIC_API_KEY environment variable'
      );
      return envKey.trim();
    }

    // No key found - will use mock mode
    console.log('⚠️  No ANTHROPIC_API_KEY found in environment variables.');
    console.log('🎭 Falling back to mock mode for development.');
    console.log(
      '💡 To use real Claude API, set ANTHROPIC_API_KEY in your .env.local file'
    );
    return undefined;
  }

  async executeFunction(name: string, args: any): Promise<string> {
    if (this.useMockApi) {
      // Pure mock mode - return fake data for testing
      return this.generateMockFileData(name, args);
    }

    try {
      switch (name) {
        case 'read_file':
          const content = await readFileContent(args.path);
          return `File content of ${args.path}:\n\n${content}`;

        case 'list_directory':
          const items = await listDirectory(args.path);
          const formatted = items
            .map(
              (item: any) =>
                `${item.type === 'directory' ? '📁' : '📄'} ${item.name}`
            )
            .join('\n');
          return `Contents of ${args.path}:\n\n${formatted}`;

        case 'search_files':
          const results = await searchFiles(args.rootPath, args.pattern);
          return results.length > 0
            ? `Found ${results.length} files matching "${
                args.pattern
              }":\n\n${results.map((f: string) => `📄 ${f}`).join('\n')}`
            : `No files found matching "${args.pattern}" in ${args.rootPath}`;

        case 'analyze_folder':
          const analysis = await analyzeFolder(args.path);
          return `Folder Analysis for ${analysis.path}:
📊 Total items: ${analysis.totalItems}
📁 Directories: ${analysis.directories}
📄 Files: ${analysis.files}

File types:
${Object.entries(analysis.fileTypes)
  .map(([ext, count]) => `  ${ext}: ${count}`)
  .join('\n')}

Structure:
${analysis.structure
  .map((item: any) => `${item.type === 'directory' ? '📁' : '📄'} ${item.name}`)
  .join('\n')}`;

        case 'summarize_file':
          const fileSummary = await summarizeFile(args.path);
          return fileSummary;

        case 'summarize_all_files':
          const allFilesSummary = await summarizeAllFiles(args.path);
          return allFilesSummary;

        case 'analyze_file_subjects':
          const subjectAnalysis = await analyzeFileSubjects(args.path, {
            single: args.single,
            file: args.file,
          });
          return subjectAnalysis;

        case 'extract_key_information':
          const keyInfo = await extractKeyInformation(args.path);
          return keyInfo;

        case 'extract_experience_level':
          const expLevel = await extractExperienceLevel(args.path);
          return expLevel;

        case 'extract_react_experience':
          const reactExp = await extractReactExperience(args.path);
          return reactExp;

        case 'extract_typescript_experience':
          const tsExp = await extractTypescriptExperience(args.path);
          return tsExp;

        case 'extract_architecture_experience':
          const archExp = await extractArchitectureExperience(args.path);
          return archExp;

        case 'extract_performance_experience':
          const perfExp = await extractPerformanceExperience(args.path);
          return perfExp;

        case 'extract_testing_experience':
          const testExp = await extractTestingExperience(args.path);
          return testExp;

        case 'extract_leadership_experience':
          const leadExp = await extractLeadershipExperience(args.path);
          return leadExp;

        case 'extract_current_role_details':
          const currentRole = await extractCurrentRoleDetails(args.path);
          return currentRole;

        default:
          return `Unknown function: ${name}`;
      }
    } catch (error) {
      return `Error executing ${name}: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  }

  private generateMockFileData(name: string, args: any): string {
    // Generate predictable fake data for testing
    switch (name) {
      case 'read_file':
        if (args.path.includes('resume') || args.path.includes('.pdf')) {
          return `File content of ${args.path}:\n\nMOCK PDF CONTENT: This is a simulated resume PDF file containing professional experience and skills. In a real scenario, this would contain the actual PDF binary data or extracted text content.`;
        } else if (args.path.includes('.json')) {
          return `File content of ${args.path}:\n\n{\n  "name": "mock-project",\n  "version": "1.0.0",\n  "description": "Mock JSON file for testing"\n}`;
        } else {
          return `File content of ${args.path}:\n\nMOCK FILE CONTENT: This is simulated file data for testing purposes. The actual file system is not accessed in mock mode.`;
        }

      case 'list_directory':
        return `Contents of ${
          args.path || 'api-resources'
        }:\n\n📄 mock-document.pdf\n📄 sample-data.json\n📄 readme.txt\n📁 subfolder`;

      case 'search_files':
        const mockResults = args.pattern.toLowerCase().includes('pdf')
          ? [
              '📄 api-resources/mock-document.pdf',
              '📄 api-resources/sample-file.pdf',
            ]
          : args.pattern.toLowerCase().includes('json')
          ? ['📄 api-resources/config.json', '📄 api-resources/data.json']
          : ['📄 api-resources/example.txt'];

        return mockResults.length > 0
          ? `Found ${mockResults.length} files matching "${
              args.pattern
            }":\n\n${mockResults.join('\n')}`
          : `No files found matching "${args.pattern}" in ${args.rootPath}`;

      case 'analyze_folder':
        return `Folder Analysis for ${args.path || 'api-resources'}:
📊 Total items: 4
📁 Directories: 1
📄 Files: 3

File types:
  .pdf: 2
  .json: 1
  .txt: 1

Structure:
📄 mock-document.pdf
📄 sample-data.json
📄 readme.txt
📁 subfolder`;

      case 'summarize_file':
        return `📄 **${args.path}**
- Size: 1,234 bytes
- Type: .pdf
- Modified: 12/3/2025

🔍 **Preview (first 10 lines):**
\`\`\`
MOCK FILE CONTENT
This is a simulated file summary for testing.
The file contains sample data and information.
\`\`\`

⚠️ *This is mock data for testing purposes*`;

      case 'summarize_all_files':
        return `📁 **Files Summary for api-resources**

📊 Found 3 files

### 📄 mock-document.pdf
- Size: 1,234 bytes
- Type: .pdf
- Preview:
\`\`\`
MOCK PDF CONTENT: Resume and professional information...
\`\`\`

### 📄 sample-data.json
- Size: 456 bytes
- Type: .json
- Content:
\`\`\`
{"name": "mock-data", "version": "1.0"}
\`\`\`

### 📄 readme.txt
- Size: 234 bytes
- Type: .txt
- Content:
\`\`\`
This is a mock readme file for testing purposes.
\`\`\`

⚠️ *This is mock data for testing purposes*`;

      case 'analyze_file_subjects':
        return `🎯 **Subject Analysis Summary**

📊 Analyzing 3 files for subjects/topics

### 📄 mock-document.pdf
**Preview for subject analysis:**
\`\`\`
MOCK RESUME CONTENT
Professional Experience: Software Engineer
Education: Computer Science
\`\`\`

### 📄 sample-data.json
**Preview for subject analysis:**
\`\`\`
{"type": "configuration", "purpose": "application settings"}
\`\`\`

⚠️ *This is mock subject analysis for testing*`;

      case 'extract_key_information':
        return `🔑 **Key Information Extraction**

📊 Analyzing 3 files to identify important data

### 🎯 mock-document.pdf
**Type:** PDF Document
**Size:** 1,234 bytes
**Key Indicators:** Professional resume document
**Content Preview:** \`JOHN DOE - SOFTWARE ENGINEER...\`

### 🎯 sample-data.json
**Type:** JSON Configuration
**Key Data Structure:**
- name: string
- version: string
- settings: object

💡 **Summary:** Mock analysis shows resume and configuration data

⚠️ *This is mock key information extraction for testing*`;

      case 'extract_experience_level':
        return `🎯 **Yonatan's Experience Level (Mock)**
**Total Experience:** Yonatan has 15+ years in frontend development
**Current Level:** Senior Software Engineer at Vimeo
**Career Progression:** Yonatan grew from Web Developer → Full-Stack → Senior → Team Lead
⚠️ *Mock recruiter analysis for testing*`;

      case 'extract_react_experience':
        return `⚛️ **Yonatan's React Expertise (Mock)**
**Current Work:** Yonatan builds React + TypeScript + Redux apps at Vimeo
**Scale:** Yonatan's applications serve millions of users daily
**Yonatan's Skills:** Advanced with Hooks, Context API, performance optimization
⚠️ *Mock React analysis for testing*`;

      case 'extract_typescript_experience':
        return `📘 **Yonatan's TypeScript Expertise (Mock)**
**Experience:** Yonatan has 8+ years working with TypeScript
**Applications:** Yonatan builds enterprise-scale type-safe React applications
**Yonatan's Expertise:** Advanced patterns, strict configurations, type system mastery
⚠️ *Mock TypeScript analysis for testing*`;

      case 'extract_architecture_experience':
        return `🏗️ **Architecture Experience (Mock)**
**Specialization:** Micro frontend architecture
**Impact:** Independent team deployments, scalability
**Systems:** Design systems, component libraries
⚠️ *Mock architecture analysis for testing*`;

      case 'extract_performance_experience':
        return `⚡ **Performance Experience (Mock)**
**Results:** 40% load time improvement
**Monitoring:** Custom performance dashboards
**Optimization:** Bundle size, caching, CDN
⚠️ *Mock performance analysis for testing*`;

      case 'extract_testing_experience':
        return `🧪 **A/B Testing Experience (Mock)**
**Impact:** Improved user engagement and retention
**Tools:** Experimentation platforms, feature flags
**Scale:** Millions of daily users
⚠️ *Mock testing analysis for testing*`;

      case 'extract_leadership_experience':
        return `👥 **Leadership Experience (Mock)**
**Roles:** Team Lead, Scrum Master, Technical Lead
**Teams:** Guided frontend engineering teams
**Impact:** Cross-functional collaboration, mentoring
⚠️ *Mock leadership analysis for testing*`;

      case 'extract_current_role_details':
        return `🎥 **Yonatan's Current Role at Vimeo (Mock)**
**Position:** Yonatan is a Senior Software Engineer
**Duration:** Yonatan has been at Vimeo since 2020 (4+ years)
**Impact:** Yonatan builds React infrastructure serving millions of users
⚠️ *Mock current role analysis for testing*`;

      default:
        return `Mock: Unknown function ${name}`;
    }
  }

  async chat(message: string): Promise<string> {
    try {
      // Simple function detection for Claude
      const functionCalls = this.detectFunctionCalls(message);

      let contextMessage = message;
      const executedCalls: Array<{ name: string; args: any; result: string }> =
        [];

      // Execute any detected function calls and add results to context
      if (functionCalls.length > 0) {
        let functionResults = '\n\nFile system results:\n';
        for (const call of functionCalls) {
          console.log(
            `🔧 Executing: ${call.name}(${JSON.stringify(call.args)})`
          );
          const result = await this.executeFunction(call.name, call.args);
          functionResults += `\n${call.name}: ${result}\n`;

          // Store executed call data for mock analysis
          executedCalls.push({
            name: call.name,
            args: call.args,
            result: result,
          });
        }
        contextMessage += functionResults;
      }

      let content: string;

      if (this.useMockApi) {
        console.log('🎭 Generating intelligent mock response...');
        // Simulate a small delay for realism
        await new Promise((resolve) =>
          setTimeout(resolve, 500 + Math.random() * 1000)
        );

        const functionResultsText =
          functionCalls.length > 0
            ? `\nFile system data retrieved successfully. The system found and processed ${functionCalls.length} file operation(s).`
            : undefined;

        content = this.generateMockResponse(
          message,
          functionResultsText,
          executedCalls
        );
      } else {
        if (!this.apiKey) {
          throw new Error('No API key available for Claude API call');
        }

        console.log('🌐 Calling Claude API...');

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 1024,
            messages: [
              {
                role: 'user',
                content: `You are Yonatan Ayalon's professional AI assistant, helping recruiters, hiring managers, and colleagues learn about Yonatan's background and expertise. You have access to his resume and career data. Speak enthusiastically about Yonatan's skills, experience, and achievements. Focus on what makes him a valuable team member and strong engineer. If asked off-topic questions, politely redirect to discussing Yonatan's professional qualifications and career journey. ${contextMessage}`,
              },
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(
            `Claude API error: ${response.status} ${response.statusText}. Response: ${errorText}`
          );
        }

        const data = await response.json();
        content = data.content?.[0]?.text || 'No response from Claude';
      }

      this.conversation.push({ role: 'user', content: message });
      this.conversation.push({ role: 'assistant', content });
      return content;
    } catch (error) {
      let errorMsg = `Error: ${
        error instanceof Error ? error.message : String(error)
      }`;

      // Add helpful suggestions for common errors
      if (error instanceof Error) {
        if (error.message.includes('fetch failed')) {
          errorMsg += '\n\n💡 This might be due to:';
          errorMsg += '\n   • Corporate firewall blocking api.anthropic.com';
          errorMsg += '\n   • Network connectivity issues';
          errorMsg += '\n   • Invalid API key';
          errorMsg +=
            '\n\n🔧 Try: Check your network connection and ANTHROPIC_API_KEY in .env.local file';
        }
        if (error.message.includes('401')) {
          errorMsg +=
            '\n\n🔑 Invalid API key. Please check your ANTHROPIC_API_KEY in .env.local file.';
        }
        if (error.message.includes('429')) {
          errorMsg +=
            '\n\n⏱️  Rate limit exceeded. Please wait a moment before trying again.';
        }
      }

      console.error('❌ Chat error:', errorMsg);
      return errorMsg;
    }
  }

  private detectFunctionCalls(
    message: string
  ): Array<{ name: string; args: any }> {
    const calls = [];
    const lower = message.toLowerCase();

    // Better heuristics for natural language detection
    if (
      lower.includes('what folder') ||
      lower.includes('current directory') ||
      lower.includes('list') ||
      lower.includes('show directory') ||
      lower.includes('files in')
    ) {
      // Extract specific path or default to current directory
      const pathMatch = message.match(
        /in\s+([\w\/\.\-_]+)|directory\s+([\w\/\.\-_]+)/i
      );
      const path = pathMatch?.[1] || pathMatch?.[2] || '.';
      calls.push({ name: 'list_directory', args: { path } });
    }

    if (
      lower.includes('read') ||
      lower.includes('show') ||
      lower.includes('content')
    ) {
      // More flexible file path extraction
      const fileMatch = message.match(
        /read\s+(my\s+)?([^\s]+(?:\.[a-zA-Z0-9]+)?)|show\s+([^\s]+)|content\s+of\s+([^\s]+)/i
      );
      if (fileMatch) {
        const path = fileMatch[2] || fileMatch[3] || fileMatch[4];
        calls.push({ name: 'read_file', args: { path } });
      }
    }

    if (lower.includes('search') || lower.includes('find')) {
      const searchMatch = message.match(
        /search\s+for\s+([^\s]+)|find\s+([^\s]+)/i
      );
      if (searchMatch) {
        const pattern = searchMatch[1] || searchMatch[2];
        calls.push({ name: 'search_files', args: { rootPath: '.', pattern } });
      }
    }

    // Detect summarization requests
    if (
      lower.includes('summarize') ||
      lower.includes('summary') ||
      lower.includes('overview')
    ) {
      if (
        lower.includes('all files') ||
        lower.includes('every file') ||
        lower.includes('all content')
      ) {
        calls.push({ name: 'summarize_all_files', args: { path: '.' } });
      } else {
        // Single file summarization - try to extract filename
        const fileMatch = message.match(
          /summarize\s+([^\s]+)|summary\s+of\s+([^\s]+)|overview\s+of\s+([^\s]+)/i
        );
        if (fileMatch) {
          const path = fileMatch[1] || fileMatch[2] || fileMatch[3];
          calls.push({ name: 'summarize_file', args: { path } });
        }
      }
    }

    // Detect subject/topic analysis requests
    if (
      lower.includes('subject') ||
      lower.includes('topic') ||
      lower.includes('about') ||
      (lower.includes('what') && lower.includes('file'))
    ) {
      if (lower.includes('files') || lower.includes('all')) {
        calls.push({ name: 'analyze_file_subjects', args: { path: '.' } });
      } else {
        const fileMatch = message.match(
          /subject\s+of\s+([^\s]+)|topic\s+of\s+([^\s]+)|about\s+([^\s]+)/i
        );
        if (fileMatch) {
          const path = fileMatch[1] || fileMatch[2] || fileMatch[3];
          calls.push({
            name: 'analyze_file_subjects',
            args: { path, single: true, file: path },
          });
        }
      }
    }

    // Detect "important data" analysis requests
    if (
      (lower.includes('important') ||
        lower.includes('key') ||
        lower.includes('main')) &&
      (lower.includes('data') ||
        lower.includes('information') ||
        lower.includes('content'))
    ) {
      calls.push({ name: 'extract_key_information', args: { path: '.' } });
    }

    // Detect tech recruiter questions based on resume content
    if (
      lower.includes('years of experience') ||
      lower.includes('how long') ||
      lower.includes('experience level') ||
      lower.includes('seniority')
    ) {
      calls.push({ name: 'extract_experience_level', args: { path: '.' } });
    }

    if (
      lower.includes('react experience') ||
      lower.includes('react projects') ||
      lower.includes('react skills') ||
      (lower.includes('react') &&
        (lower.includes('how') || lower.includes('what')))
    ) {
      calls.push({ name: 'extract_react_experience', args: { path: '.' } });
    }

    if (
      lower.includes('typescript experience') ||
      lower.includes('typescript skills') ||
      (lower.includes('typescript') &&
        (lower.includes('how') || lower.includes('what')))
    ) {
      calls.push({
        name: 'extract_typescript_experience',
        args: { path: '.' },
      });
    }

    if (
      lower.includes('micro frontend') ||
      lower.includes('microfrontend') ||
      lower.includes('architecture experience') ||
      lower.includes('system design')
    ) {
      calls.push({
        name: 'extract_architecture_experience',
        args: { path: '.' },
      });
    }

    if (
      lower.includes('performance optimization') ||
      lower.includes('performance improvements') ||
      lower.includes('load time') ||
      lower.includes('optimization')
    ) {
      calls.push({
        name: 'extract_performance_experience',
        args: { path: '.' },
      });
    }

    if (
      lower.includes('a/b testing') ||
      lower.includes('ab testing') ||
      lower.includes('experimentation') ||
      lower.includes('conversion optimization')
    ) {
      calls.push({ name: 'extract_testing_experience', args: { path: '.' } });
    }

    if (
      lower.includes('team lead') ||
      lower.includes('leadership') ||
      lower.includes('managing team') ||
      lower.includes('scrum master')
    ) {
      calls.push({
        name: 'extract_leadership_experience',
        args: { path: '.' },
      });
    }

    if (
      lower.includes('current role') ||
      lower.includes('vimeo') ||
      lower.includes('latest position') ||
      lower.includes('recent work')
    ) {
      calls.push({ name: 'extract_current_role_details', args: { path: '.' } });
    }

    // Detect "output all content" requests (optimized version)
    if (
      (lower.includes('output') || lower.includes('show')) &&
      lower.includes('all') &&
      (lower.includes('content') || lower.includes('files'))
    ) {
      calls.push({ name: 'summarize_all_files', args: { path: '.' } });
    }

    return calls;
  }
}

async function main() {
  // Check if user wants mock mode
  const args = process.argv.slice(2);
  const useMock = args.includes('--mock') || args.includes('-m');

  if (useMock) {
    console.log('🚀 Yonatan Ayalon AI Assistant - MOCK MODE!');
    console.log(
      "🎭 Simulating responses about Yonatan's background (no network required)"
    );
    console.log('📝 Using mock professional data for testing');
  } else {
    console.log('🚀 Yonatan Ayalon AI Assistant - Connected to Claude!');
    console.log(
      "🔒 Security: Access limited to Yonatan's resume and professional data only"
    );
  }

  console.log(
    "💡 Ask me anything about Yonatan's professional background and experience!"
  );
  console.log(
    "📝 Try: 'Tell me about Yonatan's React experience' or 'What's Yonatan's current role?'"
  );

  if (!useMock) {
    console.log(
      '🔐 API key loaded from ANTHROPIC_API_KEY environment variable'
    );
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const chat = new FileContextChat(useMock);

  // Test API connection before starting
  const connectionOk = await chat.testConnection();
  if (!connectionOk && !useMock) {
    console.log('\n⚠️  API connection failed. Try using mock mode instead:');
    console.log('💡 Run: npm run chat -- --mock');
    console.log(
      'Or check your network connection and ANTHROPIC_API_KEY in .env.local file.'
    );

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const fallbackToMock = await new Promise<string>((resolve) => {
      rl.question(
        '\nWould you like to use mock mode instead? (y/n): ',
        resolve
      );
    });

    rl.close();

    if (fallbackToMock.toLowerCase().startsWith('y')) {
      console.log('\n🎭 Switching to mock mode...');
      process.argv.push('--mock');
      return main(); // Restart with mock mode
    } else {
      console.log('\nExiting. You can restart with: npm run chat -- --mock');
      return;
    }
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    const question = await new Promise<string>((resolve) => {
      rl.question('\n💬 You: ', resolve);
    });

    if (
      question.toLowerCase().trim() === 'quit' ||
      question.toLowerCase().trim() === 'exit'
    ) {
      console.log('\n👋 Goodbye!');
      break;
    }

    console.log('\n🤖 AI: Thinking...');
    const response = await chat.chat(question);
    console.log(`\n🤖 AI: ${response}`);
  }

  rl.close();
}

// Run main function when this file is executed directly
// Add usage info
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('📝 File Context Chat Usage:');
  console.log('  npm run chat           # Use real Claude API');
  console.log('  npm run chat -- --mock # Use mock responses (no network)');
  console.log('  npm run chat -- -m     # Short form for mock mode');
  console.log('\nMock mode is perfect for:');
  console.log('  • Testing without network access');
  console.log('  • Corporate environments with blocked APIs');
  console.log('  • Demonstrating file system functionality');
  process.exit(0);
}

// Start the chat interface
main().catch(console.error);
