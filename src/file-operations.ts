import * as fs from 'fs';
import * as path from 'path';

export async function readFileContent(filePath: string): Promise<string> {
  const resolvedPath = path.resolve(filePath);
  await fs.promises.access(resolvedPath, fs.constants.R_OK);
  return await fs.promises.readFile(resolvedPath, 'utf-8');
}

export async function listDirectory(dirPath: string) {
  const resolvedPath = path.resolve(dirPath);
  await fs.promises.access(resolvedPath, fs.constants.R_OK);
  const entries = await fs.promises.readdir(resolvedPath, {
    withFileTypes: true,
  });

  return entries.map((entry) => ({
    name: entry.name,
    type: entry.isDirectory() ? 'directory' : 'file' as const,
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
    await search(path.resolve(rootPath));
  } catch {
    // If root path doesn't exist, return empty array
  }
  
  return results;
}

export async function analyzeFolder(folderPath: string) {
  const resolvedPath = path.resolve(folderPath);
  await fs.promises.access(resolvedPath, fs.constants.R_OK);
  
  const stats = await fs.promises.stat(resolvedPath);
  if (!stats.isDirectory()) {
    throw new Error(`${folderPath} is not a directory`);
  }

  const items = await listDirectory(resolvedPath);
  const analysis = {
    path: resolvedPath,
    totalItems: items.length,
    files: items.filter(item => item.type === 'file').length,
    directories: items.filter(item => item.type === 'directory').length,
    fileTypes: {} as Record<string, number>,
    structure: items,
  };

  // Count file extensions
  items
    .filter(item => item.type === 'file')
    .forEach(item => {
      const ext = path.extname(item.name).toLowerCase() || 'no-extension';
      analysis.fileTypes[ext] = (analysis.fileTypes[ext] || 0) + 1;
    });

  return analysis;
}