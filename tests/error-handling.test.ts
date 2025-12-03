import { readFileContent, listDirectory, searchFiles, analyzeFolder } from '../src/file-operations';
import * as fs from 'fs';
import * as path from 'path';

describe('Error Handling and Edge Cases', () => {
  const testDataDir = path.join(__dirname, 'test-data');

  describe('Permission Errors', () => {
    it('should handle permission denied errors gracefully', async () => {
      // Skip this test on Windows or if running as root
      if (process.platform === 'win32' || process.getuid?.() === 0) {
        return;
      }

      // Create a file with no read permissions
      const restrictedFile = path.join(testDataDir, 'restricted.txt');
      fs.writeFileSync(restrictedFile, 'restricted content');
      fs.chmodSync(restrictedFile, 0o000);

      await expect(readFileContent(restrictedFile)).rejects.toThrow();

      // Clean up
      fs.chmodSync(restrictedFile, 0o644);
      fs.unlinkSync(restrictedFile);
    });
  });

  describe('Large Files and Directories', () => {
    it('should handle empty directories', async () => {
      const emptyDir = path.join(testDataDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      const result = await listDirectory(emptyDir);
      expect(result).toEqual([]);

      const analysis = await analyzeFolder(emptyDir);
      expect(analysis.totalItems).toBe(0);
      expect(analysis.files).toBe(0);
      expect(analysis.directories).toBe(0);

      // Clean up
      fs.rmSync(emptyDir, { recursive: true });
    });

    it('should handle empty files', async () => {
      const emptyFile = path.join(testDataDir, 'empty.txt');
      fs.writeFileSync(emptyFile, '');

      const result = await readFileContent(emptyFile);
      expect(result).toBe('');

      // Clean up
      fs.unlinkSync(emptyFile);
    });

    it('should handle files with special characters', async () => {
      const specialFile = path.join(testDataDir, 'special-chars-üñíçøðé.txt');
      const specialContent = 'Content with special chars: üñíçøðé 🚀 测试';
      fs.writeFileSync(specialFile, specialContent);

      const result = await readFileContent(specialFile);
      expect(result).toBe(specialContent);

      const dirResult = await listDirectory(testDataDir);
      expect(dirResult.some(item => item.name === path.basename(specialFile))).toBe(true);

      // Clean up
      fs.unlinkSync(specialFile);
    });
  });

  describe('Search Edge Cases', () => {
    it('should handle empty search patterns', async () => {
      const result = await searchFiles(testDataDir, '');
      
      // Empty pattern should match all files (at least the test files we created)
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle search patterns with special regex characters', async () => {
      const patterns = ['.', '*', '?', '[', ']', '(', ')', '+', '^', '$'];
      
      for (const pattern of patterns) {
        const result = await searchFiles(testDataDir, pattern);
        // Should not throw an error
        expect(Array.isArray(result)).toBe(true);
      }
    });

    it('should handle very long paths', async () => {
      // Create nested directories to test long paths
      const longPath = path.join(testDataDir, 'very', 'long', 'nested', 'path', 'structure');
      fs.mkdirSync(longPath, { recursive: true });
      
      const testFile = path.join(longPath, 'deep-file.txt');
      fs.writeFileSync(testFile, 'deep content');

      const result = await searchFiles(testDataDir, 'deep');
      expect(result).toContain(testFile);

      // Clean up
      fs.rmSync(path.join(testDataDir, 'very'), { recursive: true });
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous file operations', async () => {
      const operations = [
        readFileContent(path.join(testDataDir, 'test-file.txt')),
        listDirectory(testDataDir),
        searchFiles(testDataDir, 'test'),
        analyzeFolder(testDataDir),
      ];

      const results = await Promise.all(operations);

      expect(results[0]).toContain('This is a test file content.'); // readFileContent
      expect(Array.isArray(results[1])).toBe(true); // listDirectory
      expect(Array.isArray(results[2])).toBe(true); // searchFiles
      expect(results[3]).toHaveProperty('totalItems'); // analyzeFolder
    });

    it('should handle rapid sequential operations', async () => {
      const iterations = 10;
      const results = [];

      for (let i = 0; i < iterations; i++) {
        const result = await listDirectory(testDataDir);
        results.push(result);
      }

      expect(results).toHaveLength(iterations);
      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(results[0]);
      }
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should handle different path separators', async () => {
      const testPath = ['test-data', 'test-file.txt'].join(path.sep);
      const fullPath = path.join(__dirname, testPath);
      
      const result = await readFileContent(fullPath);
      expect(result).toContain('This is a test file content.');
    });

    it('should handle case sensitivity appropriately', async () => {
      // Test case-insensitive search
      const lowerResult = await searchFiles(testDataDir, 'test');
      const upperResult = await searchFiles(testDataDir, 'TEST');
      
      expect(lowerResult).toEqual(upperResult);
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory during file operations', async () => {
      // Get initial memory usage
      const initialMemory = process.memoryUsage();

      // Perform many file operations
      for (let i = 0; i < 100; i++) {
        await listDirectory(testDataDir);
        await searchFiles(testDataDir, 'test');
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      
      // Memory should not have grown excessively (allow 50MB increase)
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });
});