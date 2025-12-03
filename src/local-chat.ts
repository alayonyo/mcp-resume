import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Your file operation functions (same as before)
async function readFileContent(filePath: string): Promise<string> {
  const resolvedPath = path.resolve(filePath);
  await fs.promises.access(resolvedPath, fs.constants.R_OK);
  return await fs.promises.readFile(resolvedPath, 'utf-8');
}

async function listDirectory(dirPath: string) {
  const resolvedPath = path.resolve(dirPath);
  await fs.promises.access(resolvedPath, fs.constants.R_OK);
  const entries = await fs.promises.readdir(resolvedPath, {
    withFileTypes: true,
  });

  return entries.map((entry) => ({
    name: entry.name,
    type: entry.isDirectory() ? 'directory' : 'file',
    path: path.join(resolvedPath, entry.name),
  }));
}

async function searchFiles(
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
    } catch {}
  }

  await search(path.resolve(rootPath));
  return results;
}

class LocalFileContextChat {
  private conversation: string[] = [];

  constructor() {
    console.log('🦙 Using Local Ollama AI (no API key required!)');
    console.log('📋 Make sure you have Ollama installed:');
    console.log('   curl -fsSL https://ollama.ai/install.sh | sh');
    console.log('   ollama pull llama2');
  }

  async executeFunction(name: string, args: any): Promise<string> {
    try {
      switch (name) {
        case 'read_file':
          const content = await readFileContent(args.path);
          return `File content of ${args.path}:\n\n${content.substring(
            0,
            1000
          )}${content.length > 1000 ? '...(truncated)' : ''}`;

        case 'list_directory':
          const items = await listDirectory(args.path);
          const formatted = items
            .map(
              (item) =>
                `${item.type === 'directory' ? '📁' : '📄'} ${item.name}`
            )
            .join('\n');
          return `Contents of ${args.path}:\n\n${formatted}`;

        case 'search_files':
          const results = await searchFiles(args.rootPath, args.pattern);
          return results.length > 0
            ? `Found ${results.length} files matching "${
                args.pattern
              }":\n\n${results
                .slice(0, 10)
                .map((f) => `📄 ${f}`)
                .join('\n')}`
            : `No files found matching "${args.pattern}" in ${args.rootPath}`;

        default:
          return `Unknown function: ${name}`;
      }
    } catch (error) {
      return `Error executing ${name}: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  }

  async callOllama(prompt: string): Promise<string> {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama2',
          prompt: prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || 'No response from Ollama';
    } catch (error) {
      return `❌ Ollama Error: ${
        error instanceof Error ? error.message : String(error)
      }\n\n💡 Make sure Ollama is running: ollama serve`;
    }
  }

  async chat(message: string): Promise<string> {
    // Simple function detection
    const functionCalls = this.detectFunctionCalls(message);

    let context = `You are a helpful AI assistant with access to file system tools. The user asked: "${message}"\n\n`;

    // Execute any detected function calls
    if (functionCalls.length > 0) {
      context += 'File system results:\n';
      for (const call of functionCalls) {
        console.log(`🔧 Executing: ${call.name}(${JSON.stringify(call.args)})`);
        const result = await this.executeFunction(call.name, call.args);
        context += `\n${call.name}: ${result}\n`;
      }
      context +=
        "\nBased on this file system information, please provide a helpful response to the user's question.";
    }

    return await this.callOllama(context);
  }

  private detectFunctionCalls(
    message: string
  ): Array<{ name: string; args: any }> {
    const calls = [];
    const lower = message.toLowerCase();

    // Simple heuristics to detect file operations
    if (
      lower.includes('list') ||
      lower.includes('show') ||
      lower.includes('directory') ||
      lower.includes('folder')
    ) {
      const pathMatch = message.match(
        /in\s+([^\s]+)|directory\s+([^\s]+)|folder\s+([^\s]+)/i
      );
      const path = pathMatch?.[1] || pathMatch?.[2] || pathMatch?.[3] || '.';
      calls.push({ name: 'list_directory', args: { path } });
    }

    if (
      lower.includes('read') ||
      lower.includes('show') ||
      lower.includes('content')
    ) {
      const fileMatch = message.match(
        /read\s+([^\s]+)|show\s+([^\s]+)|content\s+of\s+([^\s]+)/i
      );
      if (fileMatch) {
        const path = fileMatch[1] || fileMatch[2] || fileMatch[3];
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

    return calls;
  }
}

async function main() {
  console.log('🚀 File Context AI Chat - Local Ollama Version!');
  console.log(
    '💡 I can read your files, list directories, and search for files.'
  );
  console.log("📝 Try: 'list current directory' or 'read package.json'");
  console.log('🦙 Using local Ollama (no corporate restrictions!)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const chat = new LocalFileContextChat();
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

main().catch(console.error);
