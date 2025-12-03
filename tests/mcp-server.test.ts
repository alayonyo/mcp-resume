import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  readFileContent,
  listDirectory,
  searchFiles,
  analyzeFolder,
} from '../src/file-operations';
import * as path from 'path';

describe('MCP Server Integration', () => {
  const testDataDir = path.join(process.cwd(), 'api-resources');

  describe('MCP Tools', () => {
    it('should provide read_file tool functionality', async () => {
      const filePath = path.join(testDataDir, 'test-file.txt');
      const result = await readFileContent(filePath);

      expect(result).toContain('This is a test file content.');
      expect(typeof result).toBe('string');
    });

    it('should provide list_directory tool functionality', async () => {
      const result = await listDirectory(testDataDir);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('path');
    });

    it('should provide search_files tool functionality', async () => {
      const result = await searchFiles(testDataDir, 'test');

      expect(Array.isArray(result)).toBe(true);
      expect(result.some((file) => file.includes('test-file.txt'))).toBe(true);
    });

    it('should provide analyze_folder tool functionality', async () => {
      const result = await analyzeFolder(testDataDir);

      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('totalItems');
      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('directories');
      expect(result).toHaveProperty('fileTypes');
      expect(result).toHaveProperty('structure');

      expect(typeof result.totalItems).toBe('number');
      expect(typeof result.files).toBe('number');
      expect(typeof result.directories).toBe('number');
      expect(Array.isArray(result.structure)).toBe(true);
    });
  });

  describe('Tool Parameter Validation', () => {
    it('should handle invalid paths in read_file', async () => {
      const invalidPath = '/absolutely/nonexistent/path/file.txt';

      await expect(readFileContent(invalidPath)).rejects.toThrow();
    });

    it('should handle invalid paths in list_directory', async () => {
      const invalidPath = '/absolutely/nonexistent/path';

      await expect(listDirectory(invalidPath)).rejects.toThrow();
    });

    it('should handle invalid paths in analyze_folder', async () => {
      const invalidPath = '/absolutely/nonexistent/path';

      await expect(analyzeFolder(invalidPath)).rejects.toThrow();
    });

    it('should handle file instead of directory in analyze_folder', async () => {
      const filePath = path.join(testDataDir, 'test-file.txt');

      await expect(analyzeFolder(filePath)).rejects.toThrow('not a directory');
    });
  });

  describe('Security Considerations', () => {
    it('should resolve relative paths safely', async () => {
      // Test that relative paths are resolved relative to current working directory
      const relativePath = path.relative(
        process.cwd(),
        path.join(testDataDir, 'test-file.txt')
      );
      const result = await readFileContent(relativePath);

      expect(result).toContain('This is a test file content.');
    });

    it('should handle paths with .. safely', async () => {
      // Test that parent directory access works as expected (not blocked, but resolved properly)
      const parentPath = path.join(
        testDataDir,
        '..',
        path.basename(testDataDir),
        'test-file.txt'
      );
      const result = await readFileContent(parentPath);

      expect(result).toContain('This is a test file content.');
    });
  });

  describe('Performance', () => {
    it('should handle search in large directories efficiently', async () => {
      const startTime = Date.now();
      const result = await searchFiles('.', 'package');
      const endTime = Date.now();

      // Search should complete within reasonable time (5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle directory listing efficiently', async () => {
      const startTime = Date.now();
      const result = await listDirectory('.');
      const endTime = Date.now();

      // Directory listing should be very fast (under 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
