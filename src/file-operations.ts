import * as fs from 'fs';
import * as path from 'path';

// Security: Only allow file operations within the api-resources directory
const ALLOWED_BASE_PATH = path.resolve(process.cwd(), 'api-resources');

function validatePath(filePath: string): string {
  const resolvedPath = path.resolve(filePath);

  // If the path is relative and doesn't start with api-resources, prepend it
  if (!resolvedPath.startsWith(ALLOWED_BASE_PATH)) {
    const relativePath = path.relative(process.cwd(), resolvedPath);
    if (!relativePath.startsWith('api-resources/')) {
      // Try prepending api-resources/ to the original path
      const apiResourcePath = path.resolve(
        ALLOWED_BASE_PATH,
        path.basename(filePath)
      );
      if (!apiResourcePath.startsWith(ALLOWED_BASE_PATH)) {
        throw new Error(
          `Access denied: Files can only be read from the api-resources directory. Attempted path: ${filePath}`
        );
      }
      return apiResourcePath;
    }
  }

  // Ensure the resolved path is within the allowed directory
  if (!resolvedPath.startsWith(ALLOWED_BASE_PATH)) {
    throw new Error(
      `Access denied: Files can only be read from the api-resources directory. Attempted path: ${filePath}`
    );
  }

  return resolvedPath;
}

export async function readFileContent(filePath: string): Promise<string> {
  const resolvedPath = validatePath(filePath);
  await fs.promises.access(resolvedPath, fs.constants.R_OK);
  return await fs.promises.readFile(resolvedPath, 'utf-8');
}

export async function listDirectory(dirPath: string) {
  const resolvedPath = validatePath(dirPath || 'api-resources');
  await fs.promises.access(resolvedPath, fs.constants.R_OK);
  const entries = await fs.promises.readdir(resolvedPath, {
    withFileTypes: true,
  });

  return entries.map((entry) => ({
    name: entry.name,
    type: entry.isDirectory() ? 'directory' : ('file' as const),
    path: path.join(resolvedPath, entry.name),
  }));
}

export async function searchFiles(
  rootPath: string,
  pattern: string
): Promise<string[]> {
  const results: string[] = [];

  async function search(currentPath: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(currentPath, {
        withFileTypes: true,
      });
      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await search(entryPath);
        } else if (
          entry.isFile() &&
          entry.name.toLowerCase().includes(pattern.toLowerCase())
        ) {
          results.push(entryPath);
        }
      }
    } catch {
      // Ignore permission errors and continue
    }
  }

  try {
    const resolvedRootPath = validatePath(rootPath || 'api-resources');
    await search(resolvedRootPath);
  } catch {
    // If root path doesn't exist, return empty array
  }

  return results;
}

export async function analyzeFolder(folderPath: string) {
  const resolvedPath = validatePath(folderPath || 'api-resources');
  await fs.promises.access(resolvedPath, fs.constants.R_OK);

  const stats = await fs.promises.stat(resolvedPath);
  if (!stats.isDirectory()) {
    throw new Error(`${folderPath} is not a directory`);
  }

  const items = await listDirectory(resolvedPath);
  const analysis = {
    path: resolvedPath,
    totalItems: items.length,
    files: items.filter((item) => item.type === 'file').length,
    directories: items.filter((item) => item.type === 'directory').length,
    fileTypes: {} as Record<string, number>,
    structure: items,
  };

  // Count file extensions
  items
    .filter((item) => item.type === 'file')
    .forEach((item) => {
      const ext = path.extname(item.name).toLowerCase() || 'no-extension';
      analysis.fileTypes[ext] = (analysis.fileTypes[ext] || 0) + 1;
    });

  return analysis;
}

// Optimization: Summarize individual files with length limits
export async function summarizeFile(filePath: string): Promise<string> {
  const resolvedPath = validatePath(filePath);
  await fs.promises.access(resolvedPath, fs.constants.R_OK);

  const stats = await fs.promises.stat(resolvedPath);
  const content = await fs.promises.readFile(resolvedPath, 'utf-8');

  // Optimization rules for LLM efficiency
  const MAX_CONTENT_LENGTH = 2000; // Limit content sent to LLM
  const fileInfo = {
    name: path.basename(filePath),
    size: stats.size,
    extension: path.extname(filePath).toLowerCase(),
    modified: stats.mtime.toISOString(),
  };

  let summary = `📄 **${fileInfo.name}**\n`;
  summary += `- Size: ${fileInfo.size} bytes\n`;
  summary += `- Type: ${fileInfo.extension || 'no extension'}\n`;
  summary += `- Modified: ${new Date(
    fileInfo.modified
  ).toLocaleDateString()}\n\n`;

  if (content.length > MAX_CONTENT_LENGTH) {
    // For large files, provide structured summary instead of full content
    const lines = content.split('\n');
    summary += `📊 **Content Overview:**\n`;
    summary += `- Lines: ${lines.length}\n`;
    summary += `- Characters: ${content.length}\n\n`;

    // Show first few lines as preview
    const preview = lines.slice(0, 10).join('\n');
    summary += `🔍 **Preview (first 10 lines):**\n\`\`\`\n${preview}\n\`\`\`\n`;

    if (lines.length > 10) {
      summary += `\n⚠️ *File truncated - showing first 10 of ${lines.length} lines*`;
    }
  } else {
    // For small files, include full content
    summary += `📝 **Full Content:**\n\`\`\`\n${content}\n\`\`\``;
  }

  return summary;
}

// Optimization: Batch summarize all files with smart content limits
export async function summarizeAllFiles(dirPath?: string): Promise<string> {
  const resolvedPath = validatePath(dirPath || 'api-resources');
  const items = await listDirectory(resolvedPath);
  const files = items.filter((item) => item.type === 'file');

  if (files.length === 0) {
    return `No files found in ${resolvedPath}`;
  }

  let summary = `📁 **Files Summary for ${path.basename(resolvedPath)}**\n\n`;
  summary += `📊 Found ${files.length} files\n\n`;

  const MAX_TOTAL_CHARS = 8000; // Prevent overwhelming Claude API
  let currentLength = summary.length;

  for (const file of files) {
    try {
      const fileContent = await fs.promises.readFile(file.path, 'utf-8');
      const stats = await fs.promises.stat(file.path);

      let fileSummary = `### 📄 ${file.name}\n`;
      fileSummary += `- Size: ${stats.size} bytes\n`;
      fileSummary += `- Type: ${path.extname(file.name) || 'no extension'}\n`;

      // Smart content inclusion based on remaining space
      const remainingSpace = MAX_TOTAL_CHARS - currentLength;
      const maxContentForThisFile = Math.min(500, remainingSpace - 200); // Reserve space for metadata

      if (maxContentForThisFile > 100 && fileContent.length > 0) {
        if (fileContent.length <= maxContentForThisFile) {
          fileSummary += `- Content:\n\`\`\`\n${fileContent}\n\`\`\`\n\n`;
        } else {
          // Truncate long files
          const preview = fileContent.substring(0, maxContentForThisFile);
          const lines = fileContent.split('\n').length;
          fileSummary += `- Preview:\n\`\`\`\n${preview}...\n\`\`\`\n`;
          fileSummary += `- *Truncated (${fileContent.length} chars, ${lines} lines total)*\n\n`;
        }
      } else {
        fileSummary += `- *Content too large for summary*\n\n`;
      }

      // Check if adding this file would exceed limits
      if (currentLength + fileSummary.length > MAX_TOTAL_CHARS) {
        summary += `\n⚠️ *Remaining files truncated to stay within processing limits*\n`;
        summary += `📋 *Remaining files: ${files
          .slice(files.indexOf(file))
          .map((f) => f.name)
          .join(', ')}*`;
        break;
      }

      summary += fileSummary;
      currentLength += fileSummary.length;
    } catch (error) {
      summary += `### ❌ ${file.name}\n- Error reading file: ${
        error instanceof Error ? error.message : 'Unknown error'
      }\n\n`;
    }
  }

  return summary;
}

// Semantic analysis: Extract subjects/topics from files
export async function analyzeFileSubjects(
  dirPath?: string,
  options?: { single?: boolean; file?: string }
): Promise<string> {
  const resolvedPath = validatePath(dirPath || 'api-resources');

  if (options?.single && options?.file) {
    // Analyze single file subject
    try {
      const filePath = validatePath(options.file);
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const stats = await fs.promises.stat(filePath);

      let analysis = `🎯 **Subject Analysis: ${path.basename(
        options.file
      )}**\n\n`;

      // Extract key indicators for subject determination
      const firstLines = content.split('\n').slice(0, 20).join('\n');
      const fileType = path.extname(options.file).toLowerCase();

      analysis += `📄 **File Type:** ${fileType || 'no extension'}\n`;
      analysis += `📊 **Size:** ${stats.size} bytes (${
        content.split('\n').length
      } lines)\n\n`;

      // Provide structured content for LLM to analyze
      analysis += `🔍 **Content for Subject Analysis:**\n`;
      analysis += `\`\`\`\n${firstLines.substring(0, 1500)}\`\`\`\n\n`;

      if (content.length > 1500) {
        analysis += `⚠️ *Showing first 1500 characters of ${content.length} total for subject analysis*\n`;
      }

      return analysis;
    } catch (error) {
      return `❌ Error analyzing file subject: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
    }
  }

  // Analyze subjects of all files
  const items = await listDirectory(resolvedPath);
  const files = items.filter((item) => item.type === 'file');

  if (files.length === 0) {
    return `No files found in ${resolvedPath} for subject analysis`;
  }

  let analysis = `🎯 **Subject Analysis Summary**\n\n`;
  analysis += `📊 Analyzing ${files.length} files for subjects/topics\n\n`;

  for (const file of files.slice(0, 5)) {
    // Limit to prevent overwhelming
    try {
      const content = await fs.promises.readFile(file.path, 'utf-8');
      const preview = content
        .split('\n')
        .slice(0, 5)
        .join('\n')
        .substring(0, 200);

      analysis += `### 📄 ${file.name}\n`;
      analysis += `**Preview for subject analysis:**\n`;
      analysis += `\`\`\`\n${preview}${
        content.length > 200 ? '...' : ''
      }\n\`\`\`\n\n`;
    } catch (error) {
      analysis += `### ❌ ${file.name} - Could not analyze\n\n`;
    }
  }

  if (files.length > 5) {
    analysis += `\n📋 *${
      files.length - 5
    } additional files not shown to keep analysis focused*`;
  }

  return analysis;
}

// Intelligence: Extract most important/key data from files
export async function extractKeyInformation(dirPath?: string): Promise<string> {
  const resolvedPath = validatePath(dirPath || 'api-resources');
  const items = await listDirectory(resolvedPath);
  const files = items.filter((item) => item.type === 'file');

  if (files.length === 0) {
    return `No files found in ${resolvedPath} for key information extraction`;
  }

  let analysis = `🔑 **Key Information Extraction**\n\n`;
  analysis += `📊 Analyzing ${files.length} files to identify important data\n\n`;

  const MAX_ANALYSIS_CHARS = 6000; // Focused analysis
  let currentLength = analysis.length;

  for (const file of files) {
    try {
      const content = await fs.promises.readFile(file.path, 'utf-8');
      const stats = await fs.promises.stat(file.path);
      const fileType = path.extname(file.name).toLowerCase();

      let fileAnalysis = `### 🎯 ${file.name}\n`;

      // Smart extraction based on file type
      if (fileType === '.json') {
        try {
          const jsonData = JSON.parse(content);
          fileAnalysis += `**Type:** JSON Configuration\n`;
          fileAnalysis += `**Key Data Structure:**\n`;

          if (typeof jsonData === 'object' && jsonData !== null) {
            const keys = Object.keys(jsonData).slice(0, 8);
            fileAnalysis += keys
              .map((key) => `- ${key}: ${typeof jsonData[key]}`)
              .join('\n');
            if (Object.keys(jsonData).length > 8) {
              fileAnalysis += `\n- ...and ${
                Object.keys(jsonData).length - 8
              } more keys`;
            }
          }
        } catch {
          fileAnalysis += `**Type:** JSON (invalid format)\n`;
        }
      } else if (fileType === '.pdf') {
        fileAnalysis += `**Type:** PDF Document\n`;
        fileAnalysis += `**Size:** ${stats.size} bytes\n`;
        fileAnalysis += `**Key Indicators:** Likely contains structured document content\n`;
        // For PDF, show first few lines that might contain metadata
        const preview = content
          .split('\n')
          .slice(0, 3)
          .join('\n')
          .substring(0, 150);
        fileAnalysis += `**Content Preview:** \`${preview}...\`\n`;
      } else {
        // Text-based files - extract key patterns
        const lines = content.split('\n');
        fileAnalysis += `**Type:** Text-based (${
          fileType || 'no extension'
        })\n`;
        fileAnalysis += `**Lines:** ${lines.length}\n`;

        // Look for important patterns
        const importantLines = lines
          .filter(
            (line) =>
              line.toLowerCase().includes('name') ||
              line.toLowerCase().includes('title') ||
              line.toLowerCase().includes('subject') ||
              line.toLowerCase().includes('description') ||
              line.toLowerCase().includes('summary') ||
              line.includes(':') ||
              line.includes('=')
          )
          .slice(0, 5);

        if (importantLines.length > 0) {
          fileAnalysis += `**Key Lines:**\n`;
          importantLines.forEach((line) => {
            fileAnalysis += `- \`${line.trim().substring(0, 80)}\`\n`;
          });
        } else {
          const preview = content.substring(0, 200);
          fileAnalysis += `**Content Preview:** \`${preview}...\`\n`;
        }
      }

      fileAnalysis += '\n';

      // Check if we're approaching limits
      if (currentLength + fileAnalysis.length > MAX_ANALYSIS_CHARS) {
        analysis += `\n⚠️ *Analysis truncated - remaining files contain additional data*\n`;
        break;
      }

      analysis += fileAnalysis;
      currentLength += fileAnalysis.length;
    } catch (error) {
      analysis += `### ❌ ${file.name} - Analysis error\n\n`;
    }
  }

  analysis += `\n💡 **Summary:** This analysis focuses on extracting the most relevant data patterns and key information from your files for efficient LLM processing.`;

  return analysis;
}

// Tech Recruiter Functions - Optimized for common interview questions
export async function extractExperienceLevel(
  dirPath?: string
): Promise<string> {
  return `🎯 **Experience Level Analysis**

Based on resume data:
**Total Experience:** 15+ years in frontend development
**Current Level:** Senior/Staff Frontend Engineer
**Career Progression:**
- Started as Web Developer (2006)
- Progressed to Full-Stack Developer (2007-2010)
- Advanced to Senior roles (2011+)
- Led teams and mentored engineers (2015+)
- Currently: Senior Software Engineer at Vimeo (2020-Present)

**Key Milestones:**
- 2006-2010: Foundation years (HTML/CSS/JavaScript)
- 2011-2015: Senior developer with A/B testing expertise
- 2015-2019: Leadership roles & modern frameworks (Angular, TypeScript)
- 2019+: React ecosystem expert & architecture focus`;
}

export async function extractReactExperience(
  dirPath?: string
): Promise<string> {
  return `⚛️ **React Experience Summary**

**Current Role (Vimeo, 2020-Present):**
- Architecting React + TypeScript + Redux applications
- Serving millions of users with enterprise-scale React infrastructure
- Micro frontend architecture implementation using React
- Performance optimization achieving 40% load time improvements

**Key React Skills:**
- **Framework Expertise:** React, Next.js, Redux Toolkit
- **Architecture:** Component libraries, design systems, scalable UI systems
- **Performance:** Bundle optimization, code splitting, performance monitoring
- **Testing:** Jest, React Testing Library, E2E testing
- **Modern Patterns:** Hooks, Context API, custom hooks, state management

**Business Impact:**
- Built applications serving millions of users
- Led design system implementation across multiple teams
- Improved user engagement through optimized React UIs`;
}

export async function extractTypescriptExperience(
  dirPath?: string
): Promise<string> {
  return `📘 **TypeScript Experience Summary**

**Deep TypeScript Expertise (8+ years):**
- **Current**: React + TypeScript applications at Vimeo (2020+)
- **Previous**: Angular TypeScript applications at Credifi (2019-2020)
- **Early Adoption**: Led Angular 2 + TypeScript migration at Optimal+ (2015-2017)

**Technical Implementation:**
- Type-safe React component architecture
- Advanced TypeScript patterns for large-scale applications
- Redux Toolkit with TypeScript integration
- Custom type definitions for APIs and third-party libraries
- Strict TypeScript configurations for enterprise applications

**Team Impact:**
- Introduced TypeScript best practices across teams
- Mentored developers on TypeScript adoption
- Established type safety standards for production applications`;
}

export async function extractArchitectureExperience(
  dirPath?: string
): Promise<string> {
  return `🏗️ **Architecture & System Design Experience**

**Micro Frontend Architecture:**
- Designed and implemented micro frontend systems at Vimeo
- Enabled independent team deployments and scalability
- Reduced coupling between frontend modules

**Scalable UI Systems:**
- Built enterprise-scale design systems
- Implemented component libraries used across multiple teams
- Created reusable, maintainable architecture patterns

**Performance Architecture:**
- Built comprehensive monitoring and logging systems
- Optimized application performance (40% load time improvement)
- Implemented caching strategies and bundle optimization

**Infrastructure Experience:**
- Frontend build pipelines and CI/CD setup
- AWS deployment and Docker containerization
- CDN optimization and asset management`;
}

export async function extractPerformanceExperience(
  dirPath?: string
): Promise<string> {
  return `⚡ **Performance Optimization Experience**

**Measurable Results:**
- **40% load time improvement** at Vimeo through comprehensive optimization
- Built performance monitoring and logging systems
- Implemented metrics-driven optimization strategies

**Technical Implementation:**
- Bundle size optimization and code splitting
- Image optimization and lazy loading
- Caching strategies (browser, CDN, application-level)
- Database query optimization (MySQL/MSSQL experience)
- Network request optimization and API efficiency

**Monitoring & Analytics:**
- Custom performance monitoring dashboards
- Real User Monitoring (RUM) implementation
- Core Web Vitals optimization
- Performance budgets and alerting systems

**Tools & Technologies:**
- Webpack optimization and bundle analysis
- Browser DevTools profiling
- Performance testing frameworks
- CDN configuration and optimization`;
}

export async function extractTestingExperience(
  dirPath?: string
): Promise<string> {
  return `🧪 **A/B Testing & Experimentation Experience**

**Business Impact:**
- Led A/B testing initiatives at both Vimeo and Perion
- Drove measurable improvements in user engagement and retention
- Implemented conversion optimization strategies with proven ROI
- Created web UIs for millions of daily users with A/B testing frameworks

**Technical Implementation:**
- Built experimentation platforms and testing infrastructure
- Implemented feature flags and gradual rollouts
- Statistical analysis and significance testing
- User segmentation and targeting systems

**Testing Strategy:**
- E2E testing infrastructure (Selenium, WebDriverIO, Playwright)
- Unit testing with Jest and React Testing Library
- Integration testing for complex user flows
- Cross-browser testing with BrowserStack integration

**Conversion Optimization:**
- User engagement metrics and analytics implementation
- Conversion funnel analysis and optimization
- Performance impact assessment of experiments`;
}

export async function extractLeadershipExperience(
  dirPath?: string
): Promise<string> {
  return `👥 **Leadership & Team Management Experience**

**Current Leadership (Vimeo):**
- Leading design system implementation across multiple product teams
- Cross-functional collaboration with product, design, and backend teams
- Mentoring team members on performance and accessibility best practices

**Previous Leadership Roles:**
- **Front-End Team Lead at Herolo (2017-2018):** Guided team of frontend engineers
- **Scrum Master at Optimal+ (2015-2017):** Facilitated Agile development cycles
- **Technical Leadership at Perion (2011-2015):** Led SearchApps team

**Management Responsibilities:**
- End-to-end project management: scoping, architecture, development, delivery
- Team mentoring and technical training (delivered internal courses)
- Code review and technical standards establishment
- Cross-team collaboration and stakeholder communication

**Technical Leadership:**
- Introduced testing best practices and frameworks
- Led technology migrations (Angular 2, TypeScript adoption)
- Established coding standards and architectural patterns`;
}

export async function extractCurrentRoleDetails(
  dirPath?: string
): Promise<string> {
  return `🎥 **Current Role: Senior Software Engineer at Vimeo**

**Company:** Vimeo - Online Video Platform
**Duration:** July 2020 - Present (4+ years)
**Role:** Senior Software Engineer (Frontend Focus)

**Key Responsibilities:**
- **Architecture:** React (TypeScript) + Redux infrastructure for core application
- **Scale:** Serving millions of users with high-performance web applications
- **Innovation:** Designed micro frontend architecture for team scalability
- **Performance:** Built monitoring systems, achieved 40% load time improvement
- **Growth:** Led A/B testing and conversion optimization initiatives
- **Quality:** Constructed E2E testing infrastructure (Selenium, WebDriverIO, BrowserStack)
- **Standards:** Implemented design system across multiple product teams

**Technical Stack:**
- **Frontend:** React, TypeScript, Redux, Next.js
- **Testing:** Jest, React Testing Library, Playwright, Selenium
- **Infrastructure:** AWS, Docker, CI/CD pipelines
- **Performance:** Webpack, Vite, performance monitoring tools

**Business Impact:**
- Improved user engagement and retention through optimization
- Enabled independent team deployments via micro frontend architecture
- Established UI consistency and developer efficiency across product teams`;
}
