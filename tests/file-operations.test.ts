import * as fs from 'fs';
import * as path from 'path';
import { readFileContent, listDirectory, searchFiles } from '../src/file-operations';

describe('File Operations', () => {
  const testDataDir = path.join(__dirname, 'test-data');

  describe('readFileContent', () => {
    it('should read file content successfully', async () => {
      const filePath = path.join(testDataDir, 'test-file.txt');
      const content = await readFileContent(filePath);
      
      expect(content).toContain('This is a test file content.');
      expect(content).toContain('Line 2 of test content.');
    });

    it('should throw error for non-existent file', async () => {
      const filePath = path.join(testDataDir, 'non-existent.txt');
      
      await expect(readFileContent(filePath)).rejects.toThrow();
    });

    it('should handle relative paths', async () => {
      const relativePath = path.relative(process.cwd(), path.join(testDataDir, 'test-file.txt'));
      const content = await readFileContent(relativePath);
      
      expect(content).toContain('This is a test file content.');
    });
  });

  describe('listDirectory', () => {
    it('should list directory contents successfully', async () => {
      const items = await listDirectory(testDataDir);
      
      expect(items.length).toBeGreaterThanOrEqual(3); // test-file.txt, package.json, subdir (and possibly others)
      
      const fileNames = items.map(item => item.name);
      expect(fileNames).toContain('test-file.txt');
      expect(fileNames).toContain('package.json');
      expect(fileNames).toContain('subdir');
      
      const testFile = items.find(item => item.name === 'test-file.txt');
      expect(testFile?.type).toBe('file');
      
      const subDir = items.find(item => item.name === 'subdir');
      expect(subDir?.type).toBe('directory');
    });

    it('should throw error for non-existent directory', async () => {
      const dirPath = path.join(testDataDir, 'non-existent-dir');
      
      await expect(listDirectory(dirPath)).rejects.toThrow();
    });

    it('should handle current directory', async () => {
      const items = await listDirectory('.');
      
      expect(items.length).toBeGreaterThan(0);
      const fileNames = items.map(item => item.name);
      expect(fileNames).toContain('package.json');
    });
  });

  describe('searchFiles', () => {
    it('should find files by pattern', async () => {
      const results = await searchFiles(testDataDir, 'test');
      
      expect(results).toContain(path.join(testDataDir, 'test-file.txt'));
    });

    it('should find files in subdirectories', async () => {
      const results = await searchFiles(testDataDir, '.ts');
      
      expect(results).toContain(path.join(testDataDir, 'subdir', 'nested-file.ts'));
    });

    it('should return empty array when no matches found', async () => {
      const results = await searchFiles(testDataDir, 'nonexistent-pattern');
      
      expect(results).toEqual([]);
    });

    it('should be case insensitive', async () => {
      const results = await searchFiles(testDataDir, 'TEST');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results).toContain(path.join(testDataDir, 'test-file.txt'));
    });

    it('should handle non-existent root directory gracefully', async () => {
      const results = await searchFiles('/non-existent-path', 'test');
      
      expect(results).toEqual([]);
    });
  });
});