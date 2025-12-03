import { FileContextChat } from './build/chat-interface.js';

async function testEnhancedMock() {
  console.log('🧪 Testing Enhanced Mock Chat with Real File Analysis\n');

  const chat = new FileContextChat(true); // Mock mode

  console.log('=== Test 1: Smart Package.json Analysis ===');
  const response1 = await chat.chat('read package.json');
  console.log('Response:', response1);
  console.log('\n' + '='.repeat(60) + '\n');

  console.log('=== Test 2: Intelligent Directory Analysis ===');
  const response2 = await chat.chat('list current directory');
  console.log('Response:', response2);
  console.log('\n' + '='.repeat(60) + '\n');

  console.log('=== Test 3: Code File Analysis ===');
  const response3 = await chat.chat('read src/index.ts');
  console.log('Response:', response3);
  console.log('\n' + '='.repeat(60) + '\n');

  console.log('=== Test 4: Search Analysis ===');
  const response4 = await chat.chat('search for .json files');
  console.log('Response:', response4);

  process.exit(0);
}

testEnhancedMock().catch(console.error);
