#!/usr/bin/env node
/**
 * Test: Verify only local scripts exist
 * Ensures no API-based or broken scripts are present
 */

const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts');

// Scripts that should NOT exist (API-based or broken)
const FORBIDDEN_SCRIPTS = [
  'transcribe.js',        // Issue #1: expects JSON but gets plain text
  'transcribe_auto.js'    // Issue #2: uses langdetect on audio bytes
];

// Scripts that SHOULD exist (local-only)
const REQUIRED_SCRIPTS = [
  'transcribe_local.js',
  'transcribe_nixos.js'
];

function runTests() {
  let passed = 0;
  let failed = 0;

  console.log('🧪 Testing local-whisper skill structure...\n');

  // Test 1: Forbidden scripts should not exist
  console.log('Test 1: Checking for forbidden scripts (API-based)...');
  for (const script of FORBIDDEN_SCRIPTS) {
    const scriptPath = path.join(SCRIPTS_DIR, script);
    if (fs.existsSync(scriptPath)) {
      console.log(`  ❌ FAIL: Forbidden script exists: ${script}`);
      failed++;
    } else {
      console.log(`  ✅ PASS: ${script} removed`);
      passed++;
    }
  }

  // Test 2: Required local scripts should exist
  console.log('\nTest 2: Checking for required local scripts...');
  for (const script of REQUIRED_SCRIPTS) {
    const scriptPath = path.join(SCRIPTS_DIR, script);
    if (fs.existsSync(scriptPath)) {
      console.log(`  ✅ PASS: ${script} exists`);
      passed++;
    } else {
      console.log(`  ❌ FAIL: Required script missing: ${script}`);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('✅ All tests passed! Skill is LOCAL-ONLY.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed.');
    process.exit(1);
  }
}

runTests();
