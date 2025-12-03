import { FileContextChat } from '../src/chat-interface';
import * as path from 'path';

describe('FileContextChat', () => {
  const testDataDir = path.join(__dirname, 'test-data');

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Mock Mode', () => {
    let chat: FileContextChat;

    beforeEach(() => {
      chat = new FileContextChat(true); // Enable mock mode
    });

    it('should initialize in mock mode', () => {
      expect(chat).toBeInstanceOf(FileContextChat);
      // Mock mode should not require API key file
    });

    it('should test connection successfully in mock mode', async () => {
      const result = await chat.testConnection();
      expect(result).toBe(true);
    });

    it('should generate mock responses for greetings', async () => {
      const response = await chat.chat('Hello there!');
      
      expect(response).toBeTruthy();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should generate mock responses with file operations', async () => {
      const response = await chat.chat('What files are in my current directory?');
      
      expect(response).toBeTruthy();
      expect(typeof response).toBe('string');
      expect(response).toContain('processed');
    });

    it('should detect and execute file operations', async () => {
      // Spy on console.log to check if function execution is logged
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await chat.chat('list directory .');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔧 Executing: list_directory')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle different question types', async () => {
      const questions = [
        'analyze my project',
        'what is in this folder?'
      ];

      for (const question of questions) {
        const response = await chat.chat(question);
        expect(response).toBeTruthy();
        expect(typeof response).toBe('string');
      }
    }, 15000); // Increase timeout for multiple operations
  });

  describe('Function Detection', () => {
    let chat: FileContextChat;

    beforeEach(() => {
      chat = new FileContextChat(true);
    });

    it('should detect list directory operations', async () => {
      const response = await chat.chat('what folder are you looking at?');
      expect(response).toBeTruthy();
      expect(typeof response).toBe('string');
    }, 10000);

    it('should detect read file operations', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const testCases = [
        'read package.json',
        'show me the content of README.md',
        'what is in test.txt'
      ];

      for (const testCase of testCases) {
        await chat.chat(testCase);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('read_file')
        );
      }
      
      consoleSpy.mockRestore();
    });

    it('should detect search operations', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const testCases = [
        'search for .ts files',
        'find package.json',
        'search for test'
      ];

      for (const testCase of testCases) {
        await chat.chat(testCase);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('search_files')
        );
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('Real API Mode', () => {
    it('should handle API connection test with mock', async () => {
      // Skip real API tests in mock environment
      const chat = new FileContextChat(true); // Use mock mode for testing
      const result = await chat.testConnection();
      expect(result).toBe(true);
    });

    it('should handle API errors gracefully in mock mode', async () => {
      const chat = new FileContextChat(true); // Use mock mode
      const response = await chat.chat('test message');
      expect(response).toBeTruthy();
      expect(typeof response).toBe('string');
    });
  });

  describe('File Operations Integration', () => {
    let chat: FileContextChat;

    beforeEach(() => {
      chat = new FileContextChat(true); // Use mock mode for reliable testing
    });

    it('should execute file operations and provide responses', async () => {
      const response = await chat.chat('what files are in the tests directory?');
      
      // Response should be generated
      expect(response).toBeTruthy();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should handle file operation errors gracefully', async () => {
      const response = await chat.chat('read /nonexistent/file.txt');
      
      // Should still provide a response even if file operation fails
      expect(response).toBeTruthy();
      expect(typeof response).toBe('string');
    });
  });
});