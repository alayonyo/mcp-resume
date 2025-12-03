import {
  readFileContent,
  listDirectory,
  searchFiles,
  analyzeFolder,
  summarizeFile,
  extractExperienceLevel,
  extractReactExperience,
  extractCurrentRoleDetails,
} from '../src/file-operations';
import { FileContextChat } from '../src/chat-interface';

describe('Core MCP Functionality', () => {
  describe('File Operations with Real Resume', () => {
    it('should list api-resources directory successfully', async () => {
      const items = await listDirectory('api-resources');

      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      const fileNames = items.map((item) => item.name);
      expect(fileNames).toContain('yonatan-ayalon-resume.pdf');
    });

    it('should read resume PDF file', async () => {
      const content = await readFileContent(
        'api-resources/yonatan-ayalon-resume.pdf'
      );

      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(1000);
      expect(content).toContain('%PDF'); // PDF header
    });

    it('should analyze api-resources folder', async () => {
      const analysis = await analyzeFolder('api-resources');

      expect(analysis.path).toContain('api-resources');
      expect(analysis).toHaveProperty('totalItems');
      expect(analysis).toHaveProperty('files');
      expect(analysis).toHaveProperty('directories');
      expect(analysis).toHaveProperty('fileTypes');
      expect(analysis.files).toBeGreaterThan(0);
    });

    it('should search for PDF files', async () => {
      const results = await searchFiles('api-resources', 'pdf');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some((file) => file.includes('yonatan-ayalon-resume.pdf'))
      ).toBe(true);
    });
  });

  describe('Resume Analysis Functions', () => {
    it('should summarize resume file', async () => {
      const summary = await summarizeFile(
        'api-resources/yonatan-ayalon-resume.pdf'
      );

      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(100);
      expect(summary).toContain('yonatan-ayalon-resume.pdf');
    });

    it('should extract experience level from resume', async () => {
      const experience = await extractExperienceLevel('api-resources');

      expect(typeof experience).toBe('string');
      expect(experience.length).toBeGreaterThan(100);
      expect(experience.toLowerCase()).toContain('experience');
    });

    it('should extract React experience', async () => {
      const reactExp = await extractReactExperience('api-resources');

      expect(typeof reactExp).toBe('string');
      expect(reactExp.length).toBeGreaterThan(100);
      expect(reactExp.toLowerCase()).toContain('react');
    });

    it('should extract current role details', async () => {
      const currentRole = await extractCurrentRoleDetails('api-resources');

      expect(typeof currentRole).toBe('string');
      expect(currentRole.length).toBeGreaterThan(100);
      expect(currentRole.toLowerCase()).toContain('vimeo');
    });
  });

  describe('Personal Chat Interface', () => {
    it('should handle greetings in mock mode', async () => {
      const chat = new FileContextChat(true); // Mock mode
      const response = await chat.chat('hello');

      expect(response).toContain('Yonatan');
      expect(response).toContain('assistant');
      expect(response).toContain('professional background');
    });

    it('should provide personal help message', async () => {
      const chat = new FileContextChat(true);
      const response = await chat.chat('help');

      expect(response).toContain('Yonatan');
      expect(response).toContain('Great Questions for Recruiters');
      expect(response).toContain('React expertise');
      expect(response).toContain('great fit for your team');
    });

    it('should detect and execute recruiter questions', async () => {
      const chat = new FileContextChat(true);
      const response = await chat.chat(
        "Tell me about Yonatan's React experience"
      );

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(50);
    });
  });

  describe('Security Validation', () => {
    it('should reject access outside api-resources', async () => {
      // Test that files outside api-resources are not accessible
      await expect(readFileContent('package.json')).rejects.toThrow();
      await expect(readFileContent('/etc/passwd')).rejects.toThrow();
      await expect(listDirectory('..')).rejects.toThrow();
    });

    it('should handle non-existent files gracefully', async () => {
      await expect(
        readFileContent('api-resources/non-existent.txt')
      ).rejects.toThrow();
    });
  });
});
