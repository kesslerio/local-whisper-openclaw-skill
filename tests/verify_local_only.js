#!/usr/bin/env node
/**
 * Test: Verify only local scripts exist
 * Ensures no API-based or broken scripts are present
 * Ensures no hardcoded user paths
 */

const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts');
const TESTS_DIR = path.join(__dirname, '..', 'tests');

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

// Patterns that indicate hardcoded user-specific paths (not comments)
// These require a trailing slash or end of string to avoid matching regex examples
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

  // Test 3: No hardcoded user paths in any JS file
  console.log('\nTest 3: Checking for hardcoded user paths...');
  const allJsFiles = [
    ...fs.readdirSync(SCRIPTS_DIR).map(f => path.join(SCRIPTS_DIR, f)),
    ...fs.readdirSync(TESTS_DIR).map(f => path.join(TESTS_DIR, f))
  ].filter(f => f.endsWith('.js') && !f.includes('verify_local_only.js')); // Exclude this test file
  
  let hardcodedFound = false;
  for (const file of allJsFiles) {
    const issues = checkForHardcodedPaths(file);
    if (issues.length > 0) {
      console.log(`  ❌ FAIL: ${path.basename(file)}:`);
      for (const issue of issues) {
        console.log(`       ${issue}`);
      }
      failed++;
      hardcodedFound = true;
    }
  }
  
  if (!hardcodedFound) {
    console.log('  ✅ PASS: No hardcoded user paths found');
    passed++;
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
