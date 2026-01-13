#!/usr/bin/env node

/**
 * Test script to verify api/index.js loads without errors
 * Run: node test-api-load.js
 */

console.log('🧪 Testing API module load...\n');

try {
  // Set production environment
  process.env.NODE_ENV = 'production';

  console.log('📦 Importing api/index.js...');
  const apiModule = await import('./api/index.js');

  console.log('✅ Module imported successfully!');
  console.log('📋 Module exports:', Object.keys(apiModule));

  if (apiModule.default) {
    console.log('✅ Default export exists');
    console.log('📝 Type:', typeof apiModule.default);

    // Check if it's an Express app
    if (typeof apiModule.default === 'function') {
      console.log('✅ Export is a function (likely Express app)');
    }
  } else {
    console.error('❌ No default export found!');
    process.exit(1);
  }

  console.log('\n🎉 All checks passed! API should work in Vercel.');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Error loading API module:');
  console.error(error);
  process.exit(1);
}
