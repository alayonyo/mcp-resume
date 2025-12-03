// Global test setup
import * as fs from 'fs';
import * as path from 'path';

// Create test directories and files for testing
const testDataDir = path.join(process.cwd(), 'api-resources');

// Store original working directory
const originalCwd = process.cwd();

beforeAll(async () => {
  // Ensure api-resources directory exists
  fs.mkdirSync(testDataDir, { recursive: true });

  // Create test files
  fs.writeFileSync(
    path.join(testDataDir, 'test-file.txt'),
    'This is a test file content.\nLine 2 of test content.'
  );

  fs.writeFileSync(
    path.join(testDataDir, 'package.json'),
    JSON.stringify(
      {
        name: 'test-package',
        version: '1.0.0',
        description: 'Test package for MCP server',
      },
      null,
      2
    )
  );

  // Create subdirectory
  const subDir = path.join(testDataDir, 'subdir');
  fs.mkdirSync(subDir, { recursive: true });
  fs.writeFileSync(
    path.join(subDir, 'nested-file.ts'),
    'export const testFunction = () => "test";'
  );

  // Wait a bit to ensure file system operations complete
  await new Promise((resolve) => setTimeout(resolve, 100));
});

beforeEach(() => {
  // Ensure we're in the right directory for each test
  process.chdir(originalCwd);
});

afterAll(async () => {
  // Clean up only test files, keep resume
  try {
    const testFiles = [
      path.join(testDataDir, 'test-file.txt'),
      path.join(testDataDir, 'package.json'),
      path.join(testDataDir, 'test-data'),
      path.join(testDataDir, 'subdir'),
      path.join(testDataDir, 'empty'),
      path.join(testDataDir, 'empty.txt'),
      path.join(testDataDir, 'special-chars-üñíçøðé.txt'),
    ];

    for (const file of testFiles) {
      if (fs.existsSync(file)) {
        const stat = fs.statSync(file);
        if (stat.isDirectory()) {
          fs.rmSync(file, { recursive: true, force: true });
        } else {
          fs.unlinkSync(file);
        }
      }
    }
  } catch (error) {
    // Ignore cleanup errors in tests
  }
});

// Mock fetch for API tests
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock console methods to reduce test noise
const originalError = console.error;
const originalLog = console.log;
beforeEach(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterEach(() => {
  console.error = originalError;
  console.log = originalLog;
});
