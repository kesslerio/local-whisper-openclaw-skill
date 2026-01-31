#!/usr/bin/env node
/**
 * Test: Verify local-whisper skill structure
 * - No API-based or broken scripts
 * - No hardcoded user paths
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const SKILL_FILE = path.join(ROOT_DIR, 'transcribe.js');

// Scripts that should NOT exist (API-based or broken)
const FORBIDDEN_SCRIPTS = [
  'scripts/transcribe.js',        // Issue #1: expects JSON but gets plain text
  'scripts/transcribe_auto.js'    // Issue #2: uses langdetect on audio bytes
];

// Patterns that indicate hardcoded user-specific paths (not comments)
const HARDCODED_PATH_PATTERNS = [
  /\/home\/[a-zA-Z0-9_-]+\//,       // /home/username/ (actual path)
  /\/Users\/[a-zA-Z0-9_]+\//,       // /Users/username/ (macOS actual path)
  /C:\\\\Users\\\\[a-zA-Z0-9_]+\\/, // C:\\Users\\username\\ (Windows actual path)
];

function checkForHardcodedPaths(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];
  const lines = content.split('\n');
  let inBlockComment = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Track block comment state
    if (trimmed.startsWith('/*')) {
      inBlockComment = true;
    }
    if (trimmed.endsWith('*/')) {
      inBlockComment = false;
      continue;
    }
    
    // Skip comment lines
    if (inBlockComment || trimmed.startsWith('//') || trimmed.startsWith('*')) {
      continue;
    }
    
    for (const pattern of HARDCODED_PATH_PATTERNS) {
      const matches = line.match(pattern);
      if (matches) {
        issues.push(`Line ${i + 1}: Found hardcoded path: ${matches[0]}`);
      }
    }
  }
  
  return issues;
}

function runTests() {
  let passed = 0;
  let failed = 0;

  console.log('🧪 Testing local-whisper skill structure...\n');

  // Test 1: Forbidden scripts should not exist
  console.log('Test 1: Checking for forbidden scripts (API-based)...');
  for (const script of FORBIDDEN_SCRIPTS) {
    const scriptPath = path.join(ROOT_DIR, script);
    if (fs.existsSync(scriptPath)) {
      console.log(`  ❌ FAIL: Forbidden script exists: ${script}`);
      failed++;
    } else {
      console.log(`  ✅ PASS: ${script} removed`);
      passed++;
    }
  }

  // Test 2: Main transcribe.js should exist
  console.log('\nTest 2: Checking for consolidated transcribe.js...');
  if (fs.existsSync(SKILL_FILE)) {
    console.log(`  ✅ PASS: transcribe.js exists`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: transcribe.js missing`);
    failed++;
  }

  // Test 3: No hardcoded user paths in transcribe.js
  console.log('\nTest 3: Checking for hardcoded user paths...');
  if (fs.existsSync(SKILL_FILE)) {
    const issues = checkForHardcodedPaths(SKILL_FILE);
    if (issues.length > 0) {
      console.log(`  ❌ FAIL: transcribe.js:`);
      for (const issue of issues) {
        console.log(`       ${issue}`);
      }
      failed++;
    } else {
      console.log('  ✅ PASS: No hardcoded user paths found');
      passed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('✅ All tests passed! Skill is LOCAL-ONLY and portable.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed.');
    process.exit(1);
  }
}

runTests();
